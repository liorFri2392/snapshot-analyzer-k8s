import subprocess
import tempfile
import httpx
import requests
import yaml

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import json
import os
import logging
from cluster_explorer import ClusterExplorer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
from debug_logger import debug_log
from cluster_info import router as cluster_info, get_cluster_info
from data_collection import collect_cluster_data, get_latest_report_dates, sanitize_filename

BUCKET_MAPPING = {
    "US": "prod-master-console-cluster-snapshots-snapshotstore",
    "EU": "prod-eu-console-cluster-snapshots-snapshotstore"
}

API_ENDPOINTS = {
    "US": "https://api.cast.ai",
    "EU": "https://api.eu.cast.ai"
}

GCP_AUTH_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
GCP_AUTH_CMD = "gcloud auth application-default login"
PROD_PROJECT = "prod-master-scl0"

app = FastAPI()

# Set up logging
logger = logging.getLogger('cluster_explorer')
logger.setLevel(logging.INFO)
logger.info("Logging setup completed")

# Global variables
current_explorer = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include the cluster info router
app.include_router(cluster_info)

class ClusterRequest(BaseModel):
    cluster_id: str
    region: str = "US"
    date: Optional[str] = None  # Expected format: "YYYY-MM-DDTHH:MM:SSZ"
    api_key: Optional[str] = None


class ResourceSearchRequest(BaseModel):
    components: List[str]
    resource_types: List[str]
    mode: str = "include"  # "include" or "exclude"


class ReportRequest(BaseModel):
    components: List[str]
    resource_types: List[str]


class ClusterDataRequest(BaseModel):
    api_key: str
    region: str = "US"  # Default to US if not specified


async def fetch_from_cast_api(cluster_id: str, region: str, api_key: str, endpoint: str):
    base_url = API_ENDPOINTS.get(region.upper(), API_ENDPOINTS["US"])
    url = f"{base_url}/v1/kubernetes/clusters/{cluster_id}/{endpoint}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={
                "accept": "application/json",
                "X-API-Key": api_key
            }
        )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Resource not found")
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"CAST AI API error: {response.text}"
            )

        return response.json()

def list_cluster_snapshots_filenames(cluster_id: str, region: str, day: str):
    bucket = BUCKET_MAPPING.get(region.upper(), BUCKET_MAPPING["US"])
    cmd = f"gsutil ls gs://{bucket}/{cluster_id}/{day}*-snapshot.json.gz"

    try:
        output = subprocess.check_output(cmd, text=True, shell=True)
        files = output.strip().split('\n')
        return files
    except subprocess.CalledProcessError as e:
        logger.error(f"Error listing bucket files: {e}")
        return []


def find_closest_snapshot_filename(cluster_id: str, region: str, requested_datetime_str: str) -> str:
    """
    Finds the snapshot file name closest to the requested date in the bucket.
    The requested_datetime_str should be in the format "YYYY-MM-DDTHH:MM:SSZ".
    Snapshot files are expected to have names like:
      "YYYY-MM-DDTHH:MM:SS.<fraction>Z-snapshot.json.gz"
    Returns the matching snapshot file name.
    """
    # Listing all snapshot file names in the bucket is very slow for clusters with many snapshots.
    # To optimize, first look for a snapshots from the specific hour. If not found, fall back to the day level.
    day_with_hour = requested_datetime_str[:14]
    bucket_file_names = list_cluster_snapshots_filenames(cluster_id, region, day_with_hour)
    if not bucket_file_names:
        day = requested_datetime_str[:10]
        bucket_file_names = list_cluster_snapshots_filenames(cluster_id, region, day)
        if not bucket_file_names:
            raise FileNotFoundError("No snapshot files found in the bucket for a given day.")

    try:
        requested_datetime = datetime.strptime(requested_datetime_str, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as ve:
        raise ValueError(f"Requested date format is invalid: {ve}")

    # Regex pattern to capture the full timestamp from file names.
    pattern = r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)-snapshot\.json\.gz'

    selected_snapshot_filename = None
    smallest_time_diff = None

    for file_path in bucket_file_names:
        match = re.search(pattern, file_path)
        if match:
            full_timestamp_str = match.group(1)  # e.g., "2025-02-19T10:08:15.53152323Z"
            # Remove the trailing 'Z' to use fromisoformat, which supports variable fractional seconds.
            iso_timestamp = full_timestamp_str[:-1]
            try:
                file_datetime = datetime.fromisoformat(iso_timestamp)
            except ValueError:
                # If parsing fails, skip this file.
                continue
            time_diff = abs((file_datetime - requested_datetime).total_seconds())
            if smallest_time_diff is None or time_diff < smallest_time_diff:
                smallest_time_diff = time_diff
                selected_snapshot_filename = f"{full_timestamp_str}-snapshot.json.gz"

    if selected_snapshot_filename is None:
        raise FileNotFoundError("No matching snapshot file found.")

    return selected_snapshot_filename

def get_raw_snapshot(cluster_id: str, region: str = "US", snapshot: str = "latest-snapshot.json.gz"):
    bucket = BUCKET_MAPPING.get(region.upper(), BUCKET_MAPPING["US"])
    snapshot_file = f"gs://{bucket}/{cluster_id}/{snapshot}"
    logger.info(f"Fetching snapshot from {snapshot_file}")

    temp_dir = tempfile.mkdtemp()
    local_dir = os.path.join(temp_dir, cluster_id)
    local_file = os.path.join(local_dir, snapshot)

    logger.info(f"Using local file: {local_file}")

    os.makedirs(local_dir, exist_ok=True)

    cmd = f"gcloud storage cp {snapshot_file} {local_file}"
    subprocess.check_output(cmd, text=True, shell=True)
    with open(local_file, 'r') as f:
        cluster_snapshot = json.load(f)

    cleanup_temp_file(local_file)
    return cluster_snapshot


def cleanup_temp_file(file_path: str):
    """Background task to clean up temporary files"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            os.rmdir(os.path.dirname(file_path))
    except Exception as e:
        print(f"Error cleaning up temporary file: {str(e)}")


@app.get("/resources/{resource_type}")
async def get_resources(resource_type: str):
    global current_explorer
    if current_explorer is None:
        raise HTTPException(status_code=400, detail="No snapshot uploaded yet")
    return current_explorer.get_resource_details(resource_type)


@app.post("/cluster/snapshot")
async def get_cluster_snapshot(request: ClusterRequest, background_tasks: BackgroundTasks):
    global current_explorer
    try:
        if not request.date:
            snapshot_filename = "latest-snapshot.json.gz"
        else:
            snapshot_filename = find_closest_snapshot_filename(request.cluster_id, request.region, request.date)

        current_explorer = ClusterExplorer(
            get_raw_snapshot(request.cluster_id, request.region, snapshot_filename)
        )
        return {
            "status": "success",
            "message": "Snapshot retrieved successfully",
            "data": current_explorer.get_resource_summary(),
            "snapshotFilename": snapshot_filename,
        }
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))
    except Exception as ex:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve snapshot: {str(ex)}"
        )

@app.get("/cluster/snapshot/raw")
async def get_cluster_snapshot_raw(
        cluster_id: str,
        region: str = "US",
        date: str = None
):
    try:
        if date:
            snapshot_store_filename = find_closest_snapshot_filename(cluster_id, region, date)
            snapshot_download_filename = f"{cluster_id}-{snapshot_store_filename.removesuffix('.gz')}"
        else:
            snapshot_store_filename = "latest-snapshot.json.gz"
            snapshot_download_filename = f"{cluster_id}-latest-snapshot.json"

        raw_snapshot = get_raw_snapshot(cluster_id, region, snapshot_store_filename)

        headers = {
            "Content-Disposition": f"attachment; filename=\"{snapshot_download_filename}\"",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
        raw_snapshot_json = json.dumps(raw_snapshot, indent=2)

        return Response(content=raw_snapshot_json, media_type="application/json", headers=headers)

    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))
    except Exception as ex:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve raw snapshot: {str(ex)}"
        )


@app.get("/clusters/{cluster_id}/problematic-nodes")
async def get_problematic_nodes(cluster_id: str, region: str = "US", api_key: str = None):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    try:
        return await fetch_from_cast_api(cluster_id, region, api_key, "problematic-nodes")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/clusters/{cluster_id}/problematic-workloads")
async def get_problematic_workloads(
        cluster_id: str,
        region: str = "US",
        api_key: str = None,
        aggressive_mode: bool = False
):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    try:
        return await fetch_from_cast_api(
            cluster_id,
            region,
            api_key,
            f"problematic-workloads?aggressiveMode={str(aggressive_mode).lower()}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/resources/search")
async def search_resources(request: ResourceSearchRequest):
    global current_explorer
    
    if current_explorer is None:
        raise HTTPException(status_code=400, detail="No snapshot uploaded yet")
    
    try:
        # Validate the search mode
        if request.mode not in ["include", "exclude"]:
            raise HTTPException(status_code=400, detail="Invalid search mode. Must be 'include' or 'exclude'")
        
        # Log the search request for debugging
        logger.info(f"Search request: components={request.components}, resource_types={request.resource_types}, mode={request.mode}")
        
        # Use the search_by_components method
        results = current_explorer.search_by_components(
            components=request.components,
            resource_types=request.resource_types,
            mode=request.mode
        )
        
        # Log the search results for debugging
        logger.info(f"Search results: {len(results.get('matches', []))} matches out of {results.get('totalResources', 0)} resources")
        
        return results
        
    except Exception as e:
        logger.error(f"Error searching resources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/resources/report")
async def generate_report(request: ReportRequest):
    global current_explorer
    
    if current_explorer is None:
        raise HTTPException(status_code=400, detail="No snapshot uploaded yet")
    
    try:
        # Log the report request for debugging
        logger.info(f"Report request: components={request.components}, resource_types={request.resource_types}")
        
        # Use the generate_component_report method
        results = current_explorer.generate_component_report(
            components=request.components,
            resource_types=request.resource_types
        )
        
        # Log the report generation results
        logger.info(f"Report generated for {len(results)} resource types")
        
        return results
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@app.get("/reports/best-practices-analysis")
async def get_best_practices_analysis():
    """
    Analyze the current snapshot against Kubernetes best practices.
    
    Returns:
        A JSON object with analysis results by category and an overall score
    """
    debug_log("API endpoint /reports/best-practices-analysis called", "INFO")
    global current_explorer
    
    if current_explorer is None:
        debug_log("No cluster snapshot available for best practices analysis", "WARNING")
        raise HTTPException(status_code=404, detail="No snapshot uploaded yet")
    
    try:
        # Perform the actual analysis using the cluster explorer
        debug_log("Calling analyze_best_practices on cluster explorer", "INFO")
        best_practices_analysis = current_explorer.analyze_best_practices()
        
        # Log a summary of the results
        overall_score = best_practices_analysis.get("overall_score", 0)
        category_scores = {
            category: details.get("score", 0) 
            for category, details in best_practices_analysis.get("categories", {}).items()
        }
        
        debug_log(f"Best practices analysis complete. Overall score: {overall_score}", "INFO")
        debug_log(f"Category scores: {category_scores}", "INFO")
        
        # Ensure we have the expected structure for the frontend
        if not best_practices_analysis or "overall_score" not in best_practices_analysis:
            debug_log("Invalid analysis results received, returning default structure", "WARNING")
            best_practices_analysis = {
                "overall_score": 0,
                "categories": {}
            }
        
        # Return the analysis results to the frontend
        return best_practices_analysis
        
    except Exception as e:
        debug_log(f"Error performing best practices analysis: {str(e)}", "ERROR")
        import traceback
        debug_log(f"Traceback: {traceback.format_exc()}", "ERROR")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/reports/node-pods")
async def get_node_pods_report():
    global current_explorer
    if current_explorer is None:
        raise HTTPException(status_code=400, detail="No snapshot uploaded yet")
    
    try:
        # Generate the report of pods running on each node
        node_pods_report = current_explorer.generate_node_pods_report()
        
        # Return the report
        return node_pods_report
    except Exception as ex:
        logger.error(f"Error generating node pods report: {str(ex)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate node pods report: {str(ex)}"
        )

@app.get("/helm-charts")
async def get_helm_charts():
    try:
        # Fetch the Helm chart index
        response = requests.get("https://castai.github.io/helm-charts/index.yaml")
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse YAML content
        data = yaml.safe_load(response.text)
        
        # Transform the data
        transformed_charts = {}
        for chart_name, chart_entries in data.get('entries', {}).items():
            transformed_charts[chart_name] = []
            for entry in chart_entries:
                transformed_entry = {
                    'imageVersion': entry.get('appVersion'),
                    'helmChartVersion': entry.get('version'),
                    'description': entry.get('description'),
                    'created': entry.get('created')
                }
                transformed_charts[chart_name].append(transformed_entry)
        
        return transformed_charts
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Helm charts: {str(e)}")
    except yaml.YAMLError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse YAML: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/clusters/{cluster_id}/data")
async def get_cluster_data(cluster_id: str, request: ClusterDataRequest):
    """
    Collect cluster data including cost and efficiency reports.
    """
    return await collect_cluster_data(cluster_id, request.api_key, request.region)

@app.get("/clusters/{cluster_id}/report-dates")
async def get_latest_report_dates_endpoint(cluster_id: str, region: str = 'US'):
    """
    Get the latest available dates for cost and efficiency reports.
    """
    return get_latest_report_dates(cluster_id, region)

@app.get("/clusters/{cluster_id}/cost-data")
async def get_cluster_cost_data(cluster_id: str):
    """
    Get cost data for a specific cluster from the saved JSON file.
    
    Args:
        cluster_id: The ID of the cluster
        
    Returns:
        Dict[str, Any]: The cost data from the JSON file
    """
    try:
        safe_cluster_id = sanitize_filename(cluster_id)
        cost_path = os.path.join('reports', safe_cluster_id, 'cost', 'cost_data.json')
        
        if not os.path.exists(cost_path):
            raise HTTPException(status_code=404, detail="Cost data not found for this cluster")
            
        with open(cost_path, 'r') as f:
            data = json.load(f)
            
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error reading cost data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cost data: {str(e)}")

@app.get("/clusters/{cluster_id}/efficiency-data")
async def get_cluster_efficiency_data(cluster_id: str):
    """
    Get efficiency data for a specific cluster from the saved JSON file.
    
    Args:
        cluster_id: The ID of the cluster
        
    Returns:
        Dict[str, Any]: The efficiency data from the JSON file
    """
    try:
        safe_cluster_id = sanitize_filename(cluster_id)
        efficiency_path = os.path.join('reports', safe_cluster_id, 'efficiency', 'efficiency_data.json')
        
        if not os.path.exists(efficiency_path):
            raise HTTPException(status_code=404, detail="Efficiency data not found for this cluster")
            
        with open(efficiency_path, 'r') as f:
            data = json.load(f)
            
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error reading efficiency data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get efficiency data: {str(e)}")