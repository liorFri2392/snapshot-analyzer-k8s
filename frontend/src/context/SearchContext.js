import React, { createContext, useState, useContext } from 'react';

// Create the search context
const SearchContext = createContext();

// Custom hook to use the search context
export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};

// Provider component that wraps your app and makes search state available everywhere
export const SearchProvider = ({ children }) => {
  // Search mode state
  const [searchMode, setSearchMode] = useState('include');
  
  // Component and resource type selections
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState([]);
  
  // Search results and errors
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Expanded results tracking
  const [expandedResults, setExpandedResults] = useState({});
  const [resourceDetails, setResourceDetails] = useState({});
  
  // Report generation state
  const [reportData, setReportData] = useState(null);
  
  // Store the entire search state in a single object for easy persistence
  const clearSearchState = () => {
    setSelectedComponents([]);
    setSelectedResourceTypes([]);
    setSearchResults(null);
    setError(null);
    setExpandedResults({});
    setResourceDetails({});
    setReportData(null);
  };
  
  // Provide the search context value
  const contextValue = {
    // Search parameters
    searchMode,
    setSearchMode,
    selectedComponents,
    setSelectedComponents,
    selectedResourceTypes,
    setSelectedResourceTypes,
    
    // Search results
    searchResults,
    setSearchResults,
    error,
    setError,
    
    // Expanded results state
    expandedResults,
    setExpandedResults,
    resourceDetails,
    setResourceDetails,
    
    // Report data
    reportData,
    setReportData,
    
    // Helper function
    clearSearchState
  };
  
  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}; 