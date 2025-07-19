// components/ProblematicWorkloadsCard.js
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Package, Box } from 'lucide-react';

const WorkloadList = ({ workloads, kind }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const workloadsPerPage = 5;

    // Calculate pagination
    const indexOfLastWorkload = currentPage * workloadsPerPage;
    const indexOfFirstWorkload = indexOfLastWorkload - workloadsPerPage;
    const currentWorkloads = workloads.slice(indexOfFirstWorkload, indexOfLastWorkload);
    const totalPages = Math.ceil(workloads.length / workloadsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="space-y-4">
            {currentWorkloads.map((workload, index) => (
                <div
                    key={`${kind}-${index}`}
                    className="border rounded-lg p-4 bg-red-50"
                >
                    <div className="flex items-start gap-2 mb-2">
                        <div className="bg-red-100 p-2 rounded">
                            {kind === 'Standalone Pods'
                                ? <Box className="w-4 h-4 text-red-600" />
                                : <Package className="w-4 h-4 text-red-600" />
                            }
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-red-700 mb-1">
                                {workload.kind ? `${workload.kind}: ${workload.name}` : workload.name}
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {workload.problems.map((problem, problemIndex) => (
                                    <li
                                        key={problemIndex}
                                        className="text-sm text-red-600"
                                    >
                                        {problem}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="justify-center items-center space-x-2 space-y-2 mt-4">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                        <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`px-3 py-1 rounded ${
                                currentPage === pageNumber 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-red-100 text-red-600'
                            }`}
                        >
                            {pageNumber}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProblematicWorkloadsCard = ({ data, isLoading, error }) => {
    const [expandedSections, setExpandedSections] = useState({
        controllers: true,
        standalonePods: true
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6 min-h-[200px] flex items-center justify-center">
                <div className="text-gray-500">Loading problematic workloads data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Error loading problematic workloads: {error}</span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">
                    No problematic workloads data available. API key might be missing.
                </div>
            </div>
        );
    }

    const hasControllerProblems = data.controllers?.length > 0;
    const hasPodProblems = data.standalonePods?.length > 0;

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Workload Health Status</h2>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        data.hasProblems 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-green-100 text-green-600'
                    }`}>
                        {data.hasProblems
                            ? <AlertTriangle className="w-4 h-4" />
                            : <CheckCircle className="w-4 h-4" />
                        }
                        {data.hasProblems ? 'Issues Detected' : 'Healthy'}
                    </div>
                </div>

                {data.hasProblems ? (
                    <div className="space-y-4">
                        {hasControllerProblems && (
                            <div className="border rounded-lg">
                                <div
                                    onClick={() => toggleSection('controllers')}
                                    className="flex items-center justify-between p-4 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                                >
                                    <h3 className="text-sm font-medium text-red-700">
                                        Controllers with Issues
                                    </h3>
                                    {expandedSections.controllers
                                        ? <ChevronUp className="w-4 h-4 text-red-600" />
                                        : <ChevronDown className="w-4 h-4 text-red-600" />}
                                </div>
                                {expandedSections.controllers && (
                                    <div className="p-4">
                                        <WorkloadList
                                            workloads={data.controllers}
                                            kind="Controllers"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {hasPodProblems && (
                            <div className="border rounded-lg">
                                <div
                                    onClick={() => toggleSection('standalonePods')}
                                    className="flex items-center justify-between p-4 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                                >
                                    <h3 className="text-sm font-medium text-red-700">
                                        Standalone Pods with Issues
                                    </h3>
                                    {expandedSections.standalonePods
                                        ? <ChevronUp className="w-4 h-4 text-red-600" />
                                        : <ChevronDown className="w-4 h-4 text-red-600" />}
                                </div>
                                {expandedSections.standalonePods && (
                                    <div className="p-4">
                                        <WorkloadList
                                            workloads={data.standalonePods}
                                            kind="Standalone Pods"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>No problematic workloads detected</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProblematicWorkloadsCard;