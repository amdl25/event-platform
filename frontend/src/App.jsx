import React from 'react';
import DiscoveryFeed from './pages/DiscoveryFeed';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Event Platform MVP</h1>
      </header>
      
      <main>
        <DiscoveryFeed />
      </main>
    </div>
  );
}

export default App;