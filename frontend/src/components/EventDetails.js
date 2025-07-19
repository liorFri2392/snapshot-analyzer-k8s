import React, {useState, useMemo, useEffect} from 'react';
import {ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, AlertTriangle} from 'lucide-react';

// The EventStatus component stays the same
const EventStatus = ({type, count}) => {
    const getStatusColor = () => {
        switch (type) {
            case 'Normal':
                return 'text-green-600 bg-green-50';
            case 'Warning':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {type || 'Unknown'}
      </span>
            {count > 1 && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          × {count}
        </span>
            )}
        </div>
    );
};

// Add the EventCardView component
const EventCardView = ({event}) => {
    const getStatusColor = (type) => {
        switch (type) {
            case 'Normal':
                return 'text-green-600 bg-green-50';
            case 'Warning':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const formatTimestamp = (timestamp) => {
        return timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
    };

    return (
        <div className="border rounded-lg p-3 mb-3 last:mb-0 bg-white">
            <div className="flex items-start gap-2">
                <div className={`p-2 rounded ${getStatusColor(event.type)}`}>
                    <AlertTriangle className="w-4 h-4"/>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between">
                        <div className="font-medium">
                            {event.reason || 'Unknown Event'}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.type)}`}>
              {event.type || 'Unknown'}
            </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2 my-1">{event.message}</p>
                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <div>
                            {formatTimestamp(event.lastTimestamp || event.eventTime || event.metadata.creationTimestamp)}
                        </div>
                        <div>
                            {event.involvedObject?.kind}: {event.involvedObject?.name}
                        </div>
                        {event.count > 1 && (
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                × {event.count}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// The main EventDetails component
const EventDetails = ({items = [], isCardView = false}) => {
    // Keep all the existing state
    const [expandedEvents, setExpandedEvents] = useState({});
    const [activeTab, setActiveTab] = useState({});
    const [filters, setFilters] = useState({
        namespace: '',
        type: '',
        search: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Extract unique namespaces and types
    const namespaces = [...new Set(items.map(event => event.metadata.namespace))].sort();
    const types = [...new Set(items.map(event => event.type))].sort();

    // Filter and paginate events
    const filteredEvents = useMemo(() => {
        return items.filter(event => {
            const matchNamespace = !filters.namespace ||
                event.metadata.namespace === filters.namespace;
            const matchType = !filters.type ||
                event.type === filters.type;
            const matchSearch = !filters.search ||
                event.reason?.toLowerCase().includes(filters.search.toLowerCase()) ||
                event.message?.toLowerCase().includes(filters.search.toLowerCase()) ||
                event.involvedObject?.name?.toLowerCase().includes(filters.search.toLowerCase());

            return matchNamespace && matchType && matchSearch;
        });
    }, [items, filters]);

    // Paginate filtered events
    const paginatedEvents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEvents, currentPage, itemsPerPage]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

    // Reset current page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleEvent = (eventIndex) => {
        setExpandedEvents(prev => ({
            ...prev,
            [eventIndex]: !prev[eventIndex]
        }));
    };

    const getActiveTab = (eventIndex) => {
        return activeTab[eventIndex] || 'details';
    };

    const tabs = [
        {id: 'details', label: 'Details'},
        {id: 'involved-object', label: 'Involved Object'},
        {id: 'source', label: 'Source'},
        {id: 'timestamps', label: 'Timestamps'}
    ];

    // Card view render
    if (isCardView === true) {
        if (!items?.length) {
            return (
                <div className="text-center text-gray-500">
                    No events found
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {items.map((event, index) => (
                    <EventCardView key={event.metadata.uid || `event-${index}`} event={event}/>
                ))}
            </div>
        );
    }

    // Standard view render
    if (!items?.length) {
        return (
            <div className="bg-white p-4 rounded-lg text-center text-gray-500">
                No event details available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
                    <select
                        className="w-full border rounded-md py-2 px-3"
                        value={filters.namespace}
                        onChange={(e) => handleFilterChange('namespace', e.target.value)}
                    >
                        <option value="">All Namespaces</option>
                        {namespaces.map(namespace => (
                            <option key={namespace} value={namespace}>{namespace}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        className="w-full border rounded-md py-2 px-3"
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                        <option value="">All Types</option>
                        {types.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        className="w-full border rounded-md py-2 px-3"
                        placeholder="Search by reason, message, or object name..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>
            </div>

            <div className="text-sm text-gray-500 mb-2">
                Showing {paginatedEvents.length} of {filteredEvents.length} events
            </div>

            {/* Event List */}
            {paginatedEvents.map((event, eventIndex) => (
                <div key={event.metadata.uid || `event-${eventIndex}`} className="bg-white rounded-lg shadow">
                    <button
                        onClick={() => toggleEvent(eventIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                        <div className="flex-grow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium">{event.reason || 'Unknown Event'}</h3>
                                    <p className="text-sm text-gray-500">
                                        Namespace: {event.metadata.namespace}
                                    </p>
                                </div>
                                <EventStatus type={event.type} count={event.count}/>
                            </div>
                        </div>
                        {expandedEvents[eventIndex] ? (
                            <ChevronDown className="w-5 h-5 ml-4"/>
                        ) : (
                            <ChevronRight className="w-5 h-5 ml-4"/>
                        )}
                    </button>

                    {expandedEvents[eventIndex] && (
                        <div>
                            <div className="border-t border-gray-200">
                                <nav className="flex overflow-x-auto">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(prev => ({...prev, [eventIndex]: tab.id}))}
                                            className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(eventIndex) === tab.id
                                                ? 'border-b-2 border-blue-500 text-blue-600'
                                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                      `}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-6">
                                {getActiveTab(eventIndex) === 'details' && (
                                    <DetailsSection event={event}/>
                                )}
                                {getActiveTab(eventIndex) === 'involved-object' && (
                                    <InvolvedObjectSection object={event.involvedObject}/>
                                )}
                                {getActiveTab(eventIndex) === 'source' && (
                                    <SourceSection source={event.source}/>
                                )}
                                {getActiveTab(eventIndex) === 'timestamps' && (
                                    <TimestampsSection event={event}/>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Pagination Controls */}
            <div className="flex justify-center items-center space-x-4 mt-4">
                <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded disabled:opacity-50"
                >
                    <ChevronLeft className="w-5 h-5"/>
                </button>
                <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
                <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded disabled:opacity-50"
                >
                    <ChevronRightIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};

// Make sure to include the detail section components
const DetailsSection = ({event}) => {
    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Field</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Reason</td>
                    <td className="py-2 px-3">{event.reason || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Message</td>
                    <td className="py-2 px-3 break-words">{event.message || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Type</td>
                    <td className="py-2 px-3">{event.type || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Reporting Component</td>
                    <td className="py-2 px-3">{event.reportingComponent || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Reporting Instance</td>
                    <td className="py-2 px-3">{event.reportingInstance || 'N/A'}</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

const InvolvedObjectSection = ({object = {}}) => {
    if (!object || Object.keys(object).length === 0) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
                No involved object details available
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Field</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Kind</td>
                    <td className="py-2 px-3">{object.kind || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Namespace</td>
                    <td className="py-2 px-3">{object.namespace || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Name</td>
                    <td className="py-2 px-3">{object.name || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">API Version</td>
                    <td className="py-2 px-3">{object.apiVersion || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">UID</td>
                    <td className="py-2 px-3 break-all">{object.uid || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Resource Version</td>
                    <td className="py-2 px-3">{object.resourceVersion || 'N/A'}</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

const SourceSection = ({source = {}}) => {
    if (!source || Object.keys(source).length === 0) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
                No source details available
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Field</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Component</td>
                    <td className="py-2 px-3">{source.component || 'N/A'}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Host</td>
                    <td className="py-2 px-3">{source.host || 'N/A'}</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

const TimestampsSection = ({event}) => {
    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Field</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">First Timestamp</td>
                    <td className="py-2 px-3">
                        {event.firstTimestamp ? new Date(event.firstTimestamp).toLocaleString() : 'N/A'}
                    </td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Last Timestamp</td>
                    <td className="py-2 px-3">
                        {event.lastTimestamp ? new Date(event.lastTimestamp).toLocaleString() : 'N/A'}
                    </td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Creation Timestamp</td>
                    <td className="py-2 px-3">
                        {event.metadata?.creationTimestamp ?
                            new Date(event.metadata.creationTimestamp).toLocaleString() :
                            'N/A'}
                    </td>
                </tr>
                {event.eventTime && (
                    <tr className="border-t">
                        <td className="py-2 px-3 font-medium">Event Time</td>
                        <td className="py-2 px-3">
                            {new Date(event.eventTime).toLocaleString()}
                        </td>
                    </tr>
                )}
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Occurrence Count</td>
                    <td className="py-2 px-3">{event.count || 0}</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default EventDetails;