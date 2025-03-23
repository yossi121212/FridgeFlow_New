'use client';

import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import Pin3D from './Pin3D';
import { MdDelete } from 'react-icons/md';

export default function EditableNote({ id, note, initialPosition, zoom = 100, onContentChange, onDelete, onPositionChange }) {
  const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const nodeRef = useRef(null);
  const titleInputRef = useRef(null);
  const contentInputRef = useRef(null);
  
  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current.focus();
        adjustHeight();
      }, 10);
    }
    if (editingContent && contentInputRef.current) {
      setTimeout(() => {
        contentInputRef.current.focus();
        adjustHeight();
      }, 10);
    }
  }, [editingTitle, editingContent]);

  // Get style based on color and rotation
  const getNoteStyle = () => {
    const noteStyle = {
      transform: note.rotate && !isDragging ? note.rotate : 'rotate(0deg)',
      zIndex: zIndex,
      boxShadow: isDragging 
        ? '0 20px 40px rgba(0,0,0,0.2)' 
        : `0 ${note.shadowHeight || 10}px ${note.shadowBlur || 30}px rgba(0,0,0,0.1)`,
      touchAction: 'none', // Prevents touch scrolling while dragging
      cursor: isDragging ? 'grabbing' : 'grab',
    };
    
    return noteStyle;
  };
  
  // Handle start of drag
  const handleStart = (e, data) => {
    // If clicking on a textarea or input, don't start dragging
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
      return false;
    }
    e.stopPropagation();
    setIsDragging(true);
    setZIndex(100);
  };
  
  // Handle end of drag
  const handleStop = (e, data) => {
    e.stopPropagation();
    setIsDragging(false);
    
    // Update position
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);
    
    // Notify parent component
    if (onPositionChange) {
      onPositionChange(id, newPosition);
    }
    
    setZIndex(10);
  };

  // Handle drag
  const handleDrag = (e, data) => {
    e.stopPropagation();
    setPosition({ x: data.x, y: data.y });
  };

  // Handle title edit
  const handleTitleClick = () => {
    if (!isDragging) {
      setEditingTitle(true);
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 0);
    }
  };
  
  // Handle content edit
  const handleContentClick = () => {
    if (!isDragging) {
      setEditingContent(true);
      setTimeout(() => {
        if (contentInputRef.current) {
          contentInputRef.current.focus();
        }
      }, 0);
    }
  };
  
  // Handle title input blur
  const handleTitleBlur = () => {
    setEditingTitle(false);
    
    if (onContentChange) {
      console.log('DEBUG: TITLE BLUR - Sending update to parent:');
      console.log('- ID:', id);
      console.log('- Title:', title);
      console.log('- Content:', content);
      onContentChange({ title, content });
    }
  };
  
  // Handle content input blur
  const handleContentBlur = () => {
    setEditingContent(false);
    
    if (onContentChange) {
      console.log('DEBUG: CONTENT BLUR - Sending update to parent:');
      console.log('- ID:', id);
      console.log('- Title:', title);
      console.log('- Content:', content);
      onContentChange({ title, content });
    }
  };
  
  // Handle title input key down
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (contentInputRef.current) {
        contentInputRef.current.focus();
        setEditingTitle(false);
        setEditingContent(true);
      } else {
        handleTitleBlur();
      }
    }
  };
  
  // Handle content input key down
  const handleContentKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Allow multiline with Shift+Enter
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleContentBlur();
    }
  };
  
  // Handle click outside note
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nodeRef.current && !nodeRef.current.contains(event.target)) {
        if (editingTitle || editingContent) {
          setEditingTitle(false);
          setEditingContent(false);
          
          if (onContentChange) {
            console.log('Sending update from outside click:', id, title, content);
            onContentChange({ title, content });
          }
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [title, content, onContentChange]);

  // Auto-resize textarea
  const adjustHeight = () => {
    if (contentInputRef.current) {
      contentInputRef.current.style.height = 'auto';
      contentInputRef.current.style.height = contentInputRef.current.scrollHeight + 'px';
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
      defaultClassNameDragging="note--dragging"
      disabled={false}
      positionOffset={{ x: 0, y: 0 }}
      grid={[1, 1]} // Optional - can help with smoother movements
    >
      <div 
        ref={nodeRef}
        className={`note note--${note.color}`} 
        style={getNoteStyle()}
      >
        <Pin3D color={note.color} />
        <button 
          className="edit-note-button" 
          title="Delete Note"
          onClick={() => onDelete(id)}
        >
          <MdDelete size={16} />
        </button>
        <div className="note__inner">
          <div className="note__content-wrapper">
            {/* Number removed */}
            
            {editingTitle ? (
              <input
                ref={titleInputRef}
                className="editable-note__content-text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title"
              />
            ) : (
              <h2 className="note__title editable" onClick={handleTitleClick}>{title}</h2>
            )}
            
            <div className="editable-note__content">
              {editingContent ? (
                <textarea
                  ref={contentInputRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    adjustHeight();
                  }}
                  className="editable-note__content-text"
                  rows={3}
                  onFocus={adjustHeight}
                  onBlur={handleContentBlur}
                  onKeyDown={handleContentKeyDown}
                />
              ) : (
                <p className="note__content editable" onClick={handleContentClick}>{content}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
} 