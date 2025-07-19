import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ClusterExplorer from './components/ClusterExplorer';
import { SearchProvider } from './context/SearchContext';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <SearchProvider>
          <ClusterExplorer />
        </SearchProvider>
      </div>
    </BrowserRouter>
  );
}

export default App;