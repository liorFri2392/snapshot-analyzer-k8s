// components/ProblematicNodesCard.js
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Server } from 'lucide-react';

const NodeList = ({ nodes }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const nodesPerPage = 5;

    // Calculate pagination
    const indexOfLastNode = currentPage * nodesPerPage;
    const indexOfFirstNode = indexOfLastNode - nodesPerPage;
    const currentNodes = nodes.slice(indexOfFirstNode, indexOfLastNode);
    const totalPages = Math.ceil(nodes.length / nodesPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="space-y-4">
            {currentNodes.map((node, index) => (
                <div
                    key={node.nodeId || `node-${index}`}
                    className="border rounded-lg p-4 bg-red-50"
                >
                    <div className="flex items-start gap-2 mb-2">
                        <div className="bg-red-100 p-2 rounded">
                            <Server className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-red-700 mb-1">
                                {node.name}
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                                {node.problems.map((problem, problemIndex) => (
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
                <div className="justify-center items-center space-x-2 mt-4">
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

const ProblematicNodesCard = ({ data, isLoading, error }) => {
    const [isNodesExpanded, setIsNodesExpanded] = useState(true);
    const hasNodeProblems = data?.nodes?.length > 0;

    const toggleNodesSection = () => {
        setIsNodesExpanded(!isNodesExpanded);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6 min-h-[200px] flex items-center justify-center">
                <div className="text-gray-500">Loading problematic nodes data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Error loading problematic nodes: {error}</span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-500">
                    No problematic nodes data available. API key might be missing.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Cluster Nodes Health Status</h2>
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

                {data.hasProblems && hasNodeProblems ? (
                    <div className="border rounded-lg">
                        <div
                            onClick={toggleNodesSection}
                            className="flex items-center justify-between p-4 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                        >
                            <h3 className="text-sm font-medium text-red-700">
                                Nodes with Issues
                            </h3>
                            {isNodesExpanded
                                ? <ChevronUp className="w-4 h-4 text-red-600" />
                                : <ChevronDown className="w-4 h-4 text-red-600" />}
                        </div>
                        {isNodesExpanded && (
                            <div className="p-4">
                                <NodeList nodes={data.nodes} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>No problematic nodes detected</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProblematicNodesCard;