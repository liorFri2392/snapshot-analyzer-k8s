from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from datetime import datetime, timezone
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
import httpx

router = APIRouter()

class ClusterInfoRequest(BaseModel):
    cluster_id: str
    api_key: str
    region: str = "US"

def calculate_duration(start_date_str):
    """Calculate duration in days"""
    if not start_date_str:
        return None
    
    # Parse the input date and ensure it's timezone aware
    start_date = parse(start_date_str)
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    
    # Get current time in UTC
    now = datetime.now(timezone.utc)
    
    # Calculate total days
    diff = now - start_date
    return f"{diff.days} days"

def format_date(date_str):
    """Format date as 'Month Day, Year HH:MM:SS UTC'"""
    if not date_str:
        return "N/A"
    dt = parse(date_str)
    return dt.strftime("%B %d, %Y %H:%M:%S UTC")

async def get_cluster_info(cluster_id: str, api_token: str, region: str = 'US'):
    """Fetch cluster information from CAST.AI API"""
    # Determine the API endpoint based on region
    base_url = 'https://api.eu.cast.ai' if region.upper() == 'EU' else 'https://api.cast.ai'
    url = f'{base_url}/v1/kubernetes/external-clusters/{cluster_id}'
    
    headers = {
        'accept': 'application/json',
        'X-API-Key': api_token
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cluster/info")
async def get_cluster_information(request: ClusterInfoRequest):
    # Get cluster information
    cluster_info = await get_cluster_info(request.cluster_id, request.api_key, request.region)
    
    # Get relevant timestamps
    created_at = cluster_info.get('createdAt')
    first_operation_at = cluster_info.get('firstOperationAt')
    is_phase2 = cluster_info.get('isPhase2', False)

    if not is_phase2:
        raise HTTPException(status_code=400, detail="Cluster is not in Phase 2")

    # Calculate durations
    duration_since_creation = calculate_duration(created_at) if created_at else "N/A"
    duration_in_phase2 = calculate_duration(first_operation_at) if first_operation_at else "N/A"

    # Calculate time between creation and Phase 2
    phase1_duration = "N/A"
    if created_at and first_operation_at:
        created_date = parse(created_at)
        first_op_date = parse(first_operation_at)
        diff = first_op_date - created_date
        phase1_duration = f"{diff.days} days"

    # Format dates for display
    created_at_formatted = format_date(created_at)
    first_operation_formatted = format_date(first_operation_at)

    # Prepare response data
    response_data = {
        'phase1': {
            'date': created_at_formatted,
            'data_available': {
                'to': first_operation_formatted,
                'duration': phase1_duration
            }
        },
        'phase2': {
            'date': first_operation_formatted,
            'data_available': {
                'to': 'Current',
                'duration': duration_in_phase2
            }
        },
        'is_phase2': is_phase2,
        'region': request.region
    }

    return response_data 