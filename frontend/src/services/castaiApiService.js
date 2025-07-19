// services/castApiService.js
export const fetchProblematicNodes = async (clusterId, region, apiKey) => {
    if (!apiKey) {
        return null;
    }

    const response = await fetch(
        `http://localhost:8000/clusters/${clusterId}/problematic-nodes?region=${region}&api_key=${apiKey}`,
        {
            headers: {
                'accept': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch problematic nodes');
    }

    return response.json();
};

export const fetchProblematicWorkloads = async (clusterId, region, apiKey, aggressiveMode = false) => {
    if (!apiKey) {
        return null;
    }

    const response = await fetch(
        `http://localhost:8000/clusters/${clusterId}/problematic-workloads?region=${region}&api_key=${apiKey}&aggressive_mode=${aggressiveMode}`,
        {
            headers: {
                'accept': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch problematic workloads');
    }

    return response.json();
};