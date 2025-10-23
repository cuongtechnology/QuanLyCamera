import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import PTZControl from './PTZControl';
import { streamAPI, cameraAPI } from '../api/api';
import { FiVideo, FiVideoOff, FiMaximize2, FiSettings } from 'react-icons/fi';

const CameraGrid = ({ gridSize = 4 }) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [streamingCameras, setStreamingCameras] = useState(new Set());

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await cameraAPI.getAll();
      setCameras(response.data.cameras || []);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStream = async (camera) => {
    try {
      await streamAPI.start(camera.id);
      setStreamingCameras(prev => new Set(prev).add(camera.code));
      
      // Refresh camera data to get HLS URL
      setTimeout(() => fetchCameras(), 2000);
    } catch (error) {
      console.error('Error starting stream:', error);
      alert(`Failed to start stream: ${error.response?.data?.error || error.message}`);
    }
  };

  const stopStream = async (camera) => {
    try {
      await streamAPI.stop(camera.id);
      setStreamingCameras(prev => {
        const newSet = new Set(prev);
        newSet.delete(camera.code);
        return newSet;
      });
      fetchCameras();
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  };

  const getGridClass = () => {
    switch (gridSize) {
      case 1:
        return 'grid-1';
      case 4:
        return 'grid-4';
      case 9:
        return 'grid-9';
      case 16:
        return 'grid-16';
      default:
        return 'grid-4';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading cameras...</p>
        </div>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <FiVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No cameras found</p>
          <p className="text-sm">Add cameras to start monitoring</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`camera-grid ${getGridClass()}`}>
      {cameras.slice(0, gridSize).map((camera) => (
        <div
          key={camera.id}
          className={`camera-card ${selectedCamera?.id === camera.id ? 'selected' : ''}`}
          onClick={() => setSelectedCamera(camera)}
        >
          {/* Camera Overlay */}
          <div className="camera-overlay">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate">
                  {camera.name}
                </h3>
                <span
                  className={`status-badge ${
                    camera.status === 'streaming'
                      ? 'status-streaming'
                      : camera.status === 'online'
                      ? 'status-online'
                      : 'status-offline'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {camera.status}
                </span>
              </div>

              <div className="flex gap-1">
                {camera.status === 'streaming' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopStream(camera);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Stop Stream"
                  >
                    <FiVideoOff className="w-4 h-4 text-red-400" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startStream(camera);
                    }}
                    className="p-1 hover:bg-green-500/20 rounded transition-colors"
                    title="Start Stream"
                  >
                    <FiVideo className="w-4 h-4 text-green-400" />
                  </button>
                )}

                <button
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  title="Fullscreen"
                >
                  <FiMaximize2 className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  className="p-1 hover:bg-gray-500/20 rounded transition-colors"
                  title="Settings"
                >
                  <FiSettings className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mt-1 text-xs text-gray-300">
              <span>{camera.ip_address}</span>
              {camera.resolution && (
                <span className="ml-2">• {camera.resolution}</span>
              )}
            </div>
          </div>

          {/* Video Player */}
          <VideoPlayer
            hlsUrl={camera.status === 'streaming' ? `${process.env.REACT_APP_HLS_BASE_URL}/${camera.code}/index.m3u8` : null}
            cameraName={camera.name}
            onError={(error) => {
              console.error('Video player error for', camera.name, error);
            }}
          />

          {/* PTZ Control (if camera supports it) */}
          {selectedCamera?.id === camera.id && (
            <PTZControl cameraId={camera.id} />
          )}
        </div>
      ))}
    </div>
  );
};

export default CameraGrid;
