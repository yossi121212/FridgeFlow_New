import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { MdDelete } from 'react-icons/md';

export default function DraggableImage({ id, imageUrl, initialPosition, zoom = 100, onDelete }) {
  const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const nodeRef = useRef(null);
  
  // Handle start of drag
  const handleStart = (e, data) => {
    e.stopPropagation();
    setIsDragging(true);
    setZIndex(20);
  };
  
  // Handle end of drag
  const handleStop = (e, data) => {
    e.stopPropagation();
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
    setZIndex(10);
  };

  // Handle drag
  const handleDrag = (e, data) => {
    e.stopPropagation();
    setPosition({ x: data.x, y: data.y });
  };
  
  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };
  
  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
      bounds={null}
      scale={zoom / 100}
      defaultClassNameDragging="image--dragging"
    >
      <div 
        ref={nodeRef}
        className="draggable-image"
        style={{ 
          zIndex: zIndex,
          boxShadow: isDragging 
            ? '0 20px 40px rgba(0,0,0,0.3)' 
            : '0 10px 30px rgba(0,0,0,0.2)',
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
      >
        <button 
          className="image-delete-button" 
          title="Delete Image"
          onClick={handleDelete}
        >
          <MdDelete size={16} />
        </button>
        <div className="image-container">
          <img src={imageUrl} alt="User uploaded" />
        </div>
      </div>
    </Draggable>
  );
} 