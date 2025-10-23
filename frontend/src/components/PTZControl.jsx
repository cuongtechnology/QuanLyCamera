import React, { useState } from 'react';
import { ptzAPI } from '../api/api';
import { 
  FiChevronUp, 
  FiChevronDown, 
  FiChevronLeft, 
  FiChevronRight,
  FiZoomIn,
  FiZoomOut,
  FiCircle
} from 'react-icons/fi';

const PTZControl = ({ cameraId }) => {
  const [isMoving, setIsMoving] = useState(false);

  const handlePTZMove = async (direction) => {
    if (isMoving) return;
    
    try {
      setIsMoving(true);
      await ptzAPI.move(cameraId, direction, 0.5);
    } catch (error) {
      console.error('PTZ move error:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handlePTZStop = async () => {
    try {
      await ptzAPI.stop(cameraId);
      setIsMoving(false);
    } catch (error) {
      console.error('PTZ stop error:', error);
    }
  };

  return (
    <div className="ptz-control">
      {/* Direction controls */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div></div>
        <button
          className="ptz-button"
          onMouseDown={() => handlePTZMove('up')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Move Up"
        >
          <FiChevronUp />
        </button>
        <div></div>

        <button
          className="ptz-button"
          onMouseDown={() => handlePTZMove('left')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Move Left"
        >
          <FiChevronLeft />
        </button>
        <button
          className="ptz-button"
          onClick={handlePTZStop}
          title="Stop"
        >
          <FiCircle className="w-3 h-3" />
        </button>
        <button
          className="ptz-button"
          onMouseDown={() => handlePTZMove('right')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Move Right"
        >
          <FiChevronRight />
        </button>

        <div></div>
        <button
          className="ptz-button"
          onMouseDown={() => handlePTZMove('down')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Move Down"
        >
          <FiChevronDown />
        </button>
        <div></div>
      </div>

      {/* Zoom controls */}
      <div className="flex gap-1">
        <button
          className="ptz-button flex-1"
          onMouseDown={() => handlePTZMove('zoom-out')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Zoom Out"
        >
          <FiZoomOut />
        </button>
        <button
          className="ptz-button flex-1"
          onMouseDown={() => handlePTZMove('zoom-in')}
          onMouseUp={handlePTZStop}
          onMouseLeave={handlePTZStop}
          title="Zoom In"
        >
          <FiZoomIn />
        </button>
      </div>
    </div>
  );
};

export default PTZControl;
