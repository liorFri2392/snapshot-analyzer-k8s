import React, {useState, useMemo} from 'react';
import {AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock} from 'lucide-react';
import EventDetails from '../EventDetails';

const EventsCard = ({items = [], isLoading, error}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage = 3; // Number of events to show per page

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    // Count warning events
    const warningEvents = useMemo(() => {
        return items.filter(event => event.type === 'Warning');
    }, [items]);

    const hasWarnings = warningEvents.length > 0;

    // Sort events by timestamp (newest first)
    const sortedEvents = useMemo(() => {
        return [...items].sort((a, b) => {
            const timeA = new Date(a.lastTimestamp || a.eventTime || a.metadata.creationTimestamp);
            const timeB = new Date(b.lastTimestamp || b.eventTime || b.metadata.creationTimestamp);
            return timeB - timeA;
        });
    }, [items]);

    // Calculate pagination
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = sortedEvents.slice(indexOfFirstEvent, indexOfLastEvent);
    const totalPages = Math.ceil(sortedEvents.length / eventsPerPage);

    // Page change handler
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6 min-h-[200px] flex items-center justify-center">
                <div className="text-gray-500">Loading events data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5"/>
                    <span>Error loading events: {error}</span>
                </div>
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5"/>
                    <span>No events found in the selected time range</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Events</h2>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        hasWarnings
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                    }`}>
                        <Clock className="w-4 h-4"/>
                        {hasWarnings ? `${warningEvents.length} Warnings` : 'No Warnings'}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="border rounded-lg">
                        <div
                            onClick={toggleExpanded}
                            className="flex items-center justify-between p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                            <h3 className="text-sm font-medium text-blue-700">
                                Cluster Events
                            </h3>
                            {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-blue-600"/>
                                : <ChevronDown className="w-4 h-4 text-blue-600"/>}
                        </div>
                        {isExpanded && (
                            <div className="p-4">
                                <div className="card-view-wrapper">
                                    <EventDetails
                                        items={currentEvents}
                                        isCardView={true}
                                    />

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="justify-center items-center space-x-2 space-y-2 mt-4">
                                            {Array.from({length: totalPages}, (_, i) => i + 1).map(pageNumber => (
                                                <button
                                                    key={pageNumber}
                                                    onClick={() => handlePageChange(pageNumber)}
                                                    className={`px-3 py-1 rounded ${
                                                        currentPage === pageNumber
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-blue-100 text-blue-600'
                                                    }`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventsCard;