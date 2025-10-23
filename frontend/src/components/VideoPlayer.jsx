import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const VideoPlayer = ({ hlsUrl, cameraName, onError }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hlsUrl) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeMaxRetry: 10,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 6,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 6,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed for', cameraName);
        setIsLoading(false);
        
        // Auto play
        video.play().catch((err) => {
          console.warn('Autoplay failed:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          setError(`Stream error: ${data.type}`);
          setIsLoading(false);
          
          if (onError) {
            onError(data);
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable error');
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (isLoading) {
          setIsLoading(false);
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
      
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch((err) => {
          console.warn('Autoplay failed:', err);
        });
      });

      video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        setError('Failed to load video stream');
        setIsLoading(false);
        if (onError) {
          onError(e);
        }
      });
    } else {
      setError('HLS is not supported in this browser');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [hlsUrl, cameraName, onError, isLoading]);

  return (
    <div className="relative w-full h-full bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading stream...</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-red-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {!hlsUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No stream available</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="video-player"
        controls={false}
        muted
        playsInline
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'contain',
          display: (isLoading || error || !hlsUrl) ? 'none' : 'block'
        }}
      />
    </div>
  );
};

export default VideoPlayer;
