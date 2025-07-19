// Function to generate CSV content from HPA data
export const generateCSVContent = (autoscalers, extractMetricsData, formatMemoryValue) => {
    const headers = [
        'Name',
        'Namespace',
        'Current Replicas',
        'Desired Replicas',
        'Min Replicas',
        'Max Replicas',
        'CPU Current (%)',
        'CPU Target (%)',
        'CPU Current Value',
        'Memory Current (%)',
        'Memory Target (%)',
        'Memory Current Value',
        'Scale Target Kind',
        'Scale Target Name',
        'Creation Timestamp',
        'Last Scale Time'
    ];

    const rows = autoscalers.map(hpa => {
        const metrics = extractMetricsData(hpa);
        return [
            hpa.metadata.name,
            hpa.metadata.namespace,
            hpa.status?.currentReplicas || 0,
            hpa.status?.desiredReplicas || 0,
            hpa.spec?.minReplicas || 1,
            hpa.spec?.maxReplicas || 0,
            metrics.cpu.current || 'N/A',
            metrics.cpu.target || 'N/A',
            metrics.cpu.currentValue || 'N/A',
            metrics.memory.current || 'N/A',
            metrics.memory.target || 'N/A',
            formatMemoryValue(metrics.memory.currentValue) || 'N/A',
            hpa.spec?.scaleTargetRef?.kind || 'N/A',
            hpa.spec?.scaleTargetRef?.name || 'N/A',
            hpa.metadata.creationTimestamp || 'N/A',
            hpa.status?.lastScaleTime || 'N/A'
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

// Function to trigger CSV download
export const downloadCSV = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};