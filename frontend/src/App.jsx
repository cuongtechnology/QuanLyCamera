import React, { useState, useEffect } from 'react';
import CameraGrid from './components/CameraGrid';
import { cameraAPI, discoveryAPI, streamAPI } from './api/api';
import { 
  FiGrid, 
  FiSearch, 
  FiPlus, 
  FiPlay, 
  FiSquare,
  FiSettings,
  FiMonitor
} from 'react-icons/fi';

function App() {
  const [gridSize, setGridSize] = useState(4);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [stats, setStats] = useState({ total: 0, online: 0, streaming: 0 });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await cameraAPI.getAll();
      const cameras = response.data.cameras || [];
      setStats({
        total: cameras.length,
        online: cameras.filter(c => c.status === 'online' || c.status === 'streaming').length,
        streaming: cameras.filter(c => c.status === 'streaming').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const response = await discoveryAPI.scan(10000);
      alert(`Discovered ${response.data.count} camera(s)`);
      console.log('Discovered cameras:', response.data.cameras);
    } catch (error) {
      alert('Discovery failed: ' + error.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleStartAll = async () => {
    try {
      await streamAPI.startAll();
      alert('Started all streams');
      setTimeout(fetchStats, 2000);
    } catch (error) {
      alert('Failed to start all streams: ' + error.message);
    }
  };

  const handleStopAll = async () => {
    try {
      await streamAPI.stopAll();
      alert('Stopped all streams');
      setTimeout(fetchStats, 2000);
    } catch (error) {
      alert('Failed to stop all streams: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiMonitor className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold text-white">VMS ONVIF System</h1>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 ml-8">
              <div className="text-sm">
                <span className="text-gray-400">Total: </span>
                <span className="text-white font-semibold">{stats.total}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Online: </span>
                <span className="text-green-400 font-semibold">{stats.online}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Streaming: </span>
                <span className="text-blue-400 font-semibold">{stats.streaming}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Grid Size Selector */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
              {[1, 4, 9, 16].map(size => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    gridSize === size
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FiGrid className="inline mr-1" />
                  {size === 1 ? '1x1' : size === 4 ? '2x2' : size === 9 ? '3x3' : '4x4'}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiSearch className={isDiscovering ? 'animate-spin' : ''} />
              {isDiscovering ? 'Discovering...' : 'Discover'}
            </button>

            <button
              onClick={handleStartAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FiPlay />
              Start All
            </button>

            <button
              onClick={handleStopAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <FiSquare />
              Stop All
            </button>

            <button
              onClick={() => setShowAddCamera(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiPlus />
              Add Camera
            </button>

            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <CameraGrid gridSize={gridSize} />
      </main>

      {/* Add Camera Modal */}
      {showAddCamera && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Add Camera</h2>
            <p className="text-gray-400 mb-4">
              Use the API or Discovery feature to add cameras.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddCamera(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
