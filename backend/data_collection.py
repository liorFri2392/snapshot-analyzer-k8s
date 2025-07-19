import os
import json
import logging
from datetime import datetime, timedelta
import httpx
from typing import Dict, Any, List
from urllib.parse import quote
from cluster_info import get_cluster_info

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to be safe for all operating systems."""
    # Replace any non-alphanumeric characters (except dots and hyphens) with underscores
    sanitized = ''.join(c if c.isalnum() or c in '.-' else '_' for c in filename)
    # Ensure the filename doesn't start with a dot or hyphen
    sanitized = sanitized.lstrip('.-')
    return sanitized

def get_output_path(cluster_id: str, data_type: str) -> str:
    """
    Get the output path for the data file.
    
    Args:
        cluster_id: The ID of the cluster
        data_type: Type of data ('cost' or 'efficiency')
        
    Returns:
        str: The full path where the data should be saved
    """
    # Create the directory structure
    base_dir = os.path.join('reports', cluster_id, data_type)
    os.makedirs(base_dir, exist_ok=True)
    
    # Use a simple filename without date
    filename = f"{data_type}_data.json"
    return os.path.join(base_dir, filename)

def get_monthly_date_ranges(start_date: datetime, end_date: datetime) -> List[tuple]:
    """Generate monthly date ranges between start and end dates."""
    date_ranges = []
    current_start = start_date
    
    while current_start < end_date:
        # Calculate the end of the current month
        if current_start.month == 12:
            current_end = current_start.replace(year=current_start.year + 1, month=1, day=1)
        else:
            current_end = current_start.replace(month=current_start.month + 1, day=1)
        
        # If the calculated end date is beyond our target end date, use the target end date
        if current_end > end_date:
            current_end = end_date
            
        date_ranges.append((current_start, current_end))
        current_start = current_end
    
    return date_ranges

async def collect_cost_data_for_period(
    client: httpx.AsyncClient,
    cluster_id: str,
    api_key: str,
    start_date: datetime,
    end_date: datetime,
    region: str
) -> Dict[str, Any]:
    """Collect cost data for a specific time period."""
    base_url = "https://api.cast.ai/v1" if region == "US" else "https://api.eu.cast.ai/v1"
    
    start_str = quote(start_date.strftime('%Y-%m-%dT%H:%M:%S.000Z'))
    end_str = quote(end_date.strftime('%Y-%m-%dT%H:%M:%S.000Z'))
    url = f"{base_url}/cost-reports/clusters/{cluster_id}/cost?startTime={start_str}&endTime={end_str}&stepSeconds=86400"
    
    try:
        response = await client.get(
            url,
            headers={"X-API-Key": api_key}
        )
        response.raise_for_status()
        data = response.json()
        
        # Remove summary section if it exists
        if 'summary' in data:
            del data['summary']
            
        return data
    except httpx.HTTPError as e:
        logger.error(f"HTTP error occurred for period {start_date} to {end_date}: {e}")
        raise

async def collect_efficiency_data_for_period(
    client: httpx.AsyncClient,
    cluster_id: str,
    api_key: str,
    start_date: datetime,
    end_date: datetime,
    region: str
) -> Dict[str, Any]:
    """Collect efficiency data for a specific time period."""
    base_url = "https://api.cast.ai/v1" if region == "US" else "https://api.eu.cast.ai/v1"
    
    start_str = quote(start_date.strftime('%Y-%m-%dT%H:%M:%S.000Z'))
    end_str = quote(end_date.strftime('%Y-%m-%dT%H:%M:%S.000Z'))
    url = f"{base_url}/cost-reports/clusters/{cluster_id}/efficiency?startTime={start_str}&endTime={end_str}&stepSeconds=86400"
    
    try:
        response = await client.get(
            url,
            headers={"X-API-Key": api_key}
        )
        response.raise_for_status()
        data = response.json()
        
        # Remove current section if it exists
        if 'current' in data:
            del data['current']
            
        return data
    except httpx.HTTPError as e:
        logger.error(f"HTTP error occurred for period {start_date} to {end_date}: {e}")
        raise

async def collect_cluster_cost_data(cluster_id: str, api_key: str, region: str = "US") -> Dict[str, Any]:
    """Collect cost data for a specific cluster in monthly chunks."""
    # Get cluster info to determine the start date
    cluster_info = await get_cluster_info(cluster_id, api_key, region)
    if not cluster_info:
        raise Exception("Cluster not found")

    # Get phase 1 start date (createdAt) and set to start of day
    phase1_start = datetime.strptime(cluster_info['createdAt'], '%Y-%m-%dT%H:%M:%S.%fZ')
    phase1_start = phase1_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Set current date to start of next day
    current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    # Get monthly date ranges
    date_ranges = get_monthly_date_ranges(phase1_start, current_date)
    
    # Collect data for each period
    all_items = []
    async with httpx.AsyncClient() as client:
        for start_date, end_date in date_ranges:
            try:
                data = await collect_cost_data_for_period(client, cluster_id, api_key, start_date, end_date, region)
                if 'items' in data:
                    all_items.extend(data['items'])
            except Exception as e:
                logger.error(f"Error collecting cost data for period {start_date} to {end_date}: {e}")
                continue
    
    # Combine all data
    combined_data = {
        'items': sorted(all_items, key=lambda x: x['timestamp'])
    }
    
    # Save the combined data
    output_path = get_output_path(cluster_id, 'cost')
    with open(output_path, 'w') as f:
        json.dump(combined_data, f, indent=2)
    
    return combined_data

async def collect_cluster_efficiency_data(cluster_id: str, api_key: str, region: str = "US") -> Dict[str, Any]:
    """Collect efficiency data for a specific cluster in monthly chunks."""
    # Get cluster info to determine the start date
    cluster_info = await get_cluster_info(cluster_id, api_key, region)
    if not cluster_info:
        raise Exception("Cluster not found")

    # Get phase 1 start date (createdAt) and set to start of day
    phase1_start = datetime.strptime(cluster_info['createdAt'], '%Y-%m-%dT%H:%M:%S.%fZ')
    phase1_start = phase1_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Set current date to start of next day
    current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    # Get monthly date ranges
    date_ranges = get_monthly_date_ranges(phase1_start, current_date)
    
    # Collect data for each period
    all_items = []
    async with httpx.AsyncClient() as client:
        for start_date, end_date in date_ranges:
            try:
                data = await collect_efficiency_data_for_period(client, cluster_id, api_key, start_date, end_date, region)
                if 'items' in data:
                    all_items.extend(data['items'])
            except Exception as e:
                logger.error(f"Error collecting efficiency data for period {start_date} to {end_date}: {e}")
                continue
    
    # Combine all data
    combined_data = {
        'items': sorted(all_items, key=lambda x: x['timestamp'])
    }
    
    # Save the combined data
    output_path = get_output_path(cluster_id, 'efficiency')
    with open(output_path, 'w') as f:
        json.dump(combined_data, f, indent=2)
    
    return combined_data

async def collect_cluster_data(cluster_id: str, api_key: str, region: str = "US") -> Dict[str, Any]:
    """
    Collect all data for a specific cluster.

    Args:
        cluster_id: The ID of the cluster
        api_key: The API key for authentication
        region: The region (US or EU)

    Returns:
        Dict[str, Any]: The combined data
    """
    try:
        # Collect cost and efficiency data
        cost_data = await collect_cluster_cost_data(cluster_id, api_key, region)
        efficiency_data = await collect_cluster_efficiency_data(cluster_id, api_key, region)
        
        return {
            "status": "success",
            "cost_data": cost_data,
            "efficiency_data": efficiency_data
        }
    except Exception as e:
        logger.error(f"Error collecting cluster data: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def get_latest_report_dates(cluster_id: str, region: str = 'US') -> Dict[str, Any]:
    """
    Check the latest available dates for cost and efficiency reports.

    Args:
        cluster_id (str): The ID of the cluster
        region (str): The region of the cluster ('US' or 'EU')

    Returns:
        Dict[str, Any]: Dictionary containing the latest dates for each report type
    """
    try:
        # Sanitize the cluster ID
        safe_cluster_id = sanitize_filename(cluster_id)
        
        # Initialize result structure
        result = {
            'cluster_id': cluster_id,
            'region': region,
            'cost': None,
            'efficiency': None
        }
        
        # Check cost data
        cost_path = os.path.join('reports', safe_cluster_id, 'cost', 'cost_data.json')
        if os.path.exists(cost_path):
            try:
                with open(cost_path, 'r') as f:
                    data = json.load(f)
                    if 'items' in data:
                        result['cost'] = max(item['timestamp'] for item in data['items'])
            except Exception as e:
                logger.error(f"Error reading cost data: {str(e)}")
        
        # Check efficiency data
        efficiency_path = os.path.join('reports', safe_cluster_id, 'efficiency', 'efficiency_data.json')
        if os.path.exists(efficiency_path):
            try:
                with open(efficiency_path, 'r') as f:
                    data = json.load(f)
                    if 'items' in data:
                        result['efficiency'] = max(item['timestamp'] for item in data['items'])
            except Exception as e:
                logger.error(f"Error reading efficiency data: {str(e)}")
        
        return result

    except Exception as e:
        raise Exception(f"Failed to get latest report dates: {str(e)}")
