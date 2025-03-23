'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from '../utils/supabase';
import './components/styles.css';

// Components
import DraggableNote from './components/DraggableNote';
import EditableNote from './components/EditableNote';
import FloatingBar, { EmojiPickerComponent } from './components/FloatingBar';
import DraggableEmoji from './components/DraggableEmoji';
import DraggableSticker from './components/DraggableSticker';
import Header from './components/Header';
import Login from './components/Login';
import DraggableImage from './components/DraggableImage';
import FriendNote from './components/FriendNote';

// Dynamic imports for browser-only components
const ContactNote = dynamic(() => import('./components/ContactNote'), { ssr: false });
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

// Default notes for new users
const defaultNotes = [
  {
    id: 1,
    title: 'Buy Milk',
    content: "Don't forget to pick up milk on the way home!",
    color: 'orange',
    x: 100,
    y: 100,
    rotate: 'rotate(2deg)',
    shadowHeight: 15,
    shadowBlur: 30,
  },
  {
    id: 2,
    title: 'Pay Bills',
    content: "Electricity bill due on Friday",
    color: 'blue',
    x: 400,
    y: 150, 
    rotate: 'rotate(-3deg)',
    shadowHeight: 12,
    shadowBlur: 25,
  },
  {
    id: 3,
    title: 'Call Mom',
    content: "Call mom to wish her happy birthday",
    color: 'purple',
    x: 200,
    y: 300,
    rotate: 'rotate(1.5deg)',
    shadowHeight: 14,
    shadowBlur: 28,
  }
];

export default function Home() {
  // Auth state from context
  const { user, loading: authLoading, logout } = useAuth();
  
  // UI state
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#FF5B14');
  const [lineWidth, setLineWidth] = useState(3);
  const [showFriendNoteModal, setShowFriendNoteModal] = useState(false);
  
  // Content state
  const [notes, setNotes] = useState<any[]>([]);
  const [emojis, setEmojis] = useState<{id: number, emoji: string, x: number, y: number}[]>([]);
  const [stickers, setStickers] = useState<{id: number, url: string, x: number, y: number}[]>([]);
  const [images, setImages] = useState<{id: number, url: string, x: number, y: number}[]>([]);
  const [nextNoteId, setNextNoteId] = useState(100);
  const [loading, setLoading] = useState(true);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // Random colors for new notes
  const noteColors = ['orange', 'blue', 'purple', 'green'];
  const getRandomColor = () => {
    return noteColors[Math.floor(Math.random() * noteColors.length)];
  };

  // Random rotation for new notes
  const getRandomRotation = () => {
    const angle = Math.random() * 6 - 3; // -3 to 3 degrees
    return `rotate(${angle}deg)`;
  };

  // Handle zoom changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    const container = document.querySelector('.container') as HTMLElement;
    if (container) {
      container.style.transform = `scale(${newZoom / 100})`;
      container.style.transformOrigin = 'center top';
      container.style.height = `${Math.max(100, 100 * (100 / newZoom))}vh`;
    }
  };

  // Handle wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        const newZoom = Math.max(50, Math.min(150, zoom + (delta * 10)));
        handleZoomChange(newZoom);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoom]);
  
  // Set client state after mount
  useEffect(() => {
    setIsClient(true);
    
    // Ensure notes table exists
    ensureNotesTableExists();
  }, []);

  // Create notes table if it doesn't exist
  const ensureNotesTableExists = async () => {
    try {
      // בדיקה מקיפה של מבנה הטבלה בסופאבייס
      console.log('DEBUG: Checking table structure in Supabase...');
      
      // First, check if the table exists by trying to select from it
      const { data: tableInfo, error: tableError } = await supabase
        .from('Notes Table')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') { // Table doesn't exist error code
        console.log('Notes table does not exist. Will create when user logs in.');
        return;
      } else if (tableError) {
        console.error('Error checking if notes table exists:', tableError);
      } else {
        console.log('Notes table already exists');
        
        // עכשיו נבדוק את המבנה המדויק של הטבלה
        // נייצר רשומת בדיקה
        if (user) {
          const testNote = {
            id: 999999, // מספר גדול שלא סביר שקיים
            user_id: user.id,
            test_field: 'This is a test',
            test_title: 'Test Title',
            test_content: 'Test Content'
          };
          
          try {
            // ננסה להכניס את הרשומה הזו לטבלה ונראה אילו שדות מתקבלים
            const { data: insertData, error: insertError } = await supabase
              .from('Notes Table')
              .insert(testNote)
              .select();
            
            if (insertError) {
              if (insertError.message && insertError.message.includes('column')) {
                // מצאנו מידע על עמודות הטבלה מתוך שגיאה
                console.log('DEBUG: TABLE STRUCTURE INFO from error:', insertError.message);
              } else {
                console.error('Error during table test:', insertError);
              }
            } else if (insertData && insertData.length > 0) {
              console.log('DEBUG: TEST NOTE STRUCTURE:', JSON.stringify(insertData[0], null, 2));
              
              // מחיקת רשומת הבדיקה
              await supabase
                .from('Notes Table')
                .delete()
                .eq('id', 999999);
            }
          } catch (testError) {
            console.error('Error testing table structure:', testError);
          }
        }
      }
    } catch (error) {
      console.error('Error in ensureNotesTableExists:', error);
    }
  };

  // Load user notes when authenticated
  useEffect(() => {
    if (user && !authLoading) {
      fetchUserNotes(user.id);
    }
  }, [user, authLoading]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const picker = document.querySelector('.emoji-picker-container');
      if (picker && !picker.contains(e.target as Node) && 
          !(e.target as Element).closest('.floating-bar__button')) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Fetch user notes from database
  const fetchUserNotes = async (userId: string) => {
    try {
      setLoading(true);
      
      console.log('=== FETCHING NOTES ===');
      console.log('User ID:', userId);
      
      // בדיקת הרשאות
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Current auth state:', authData?.user?.id, authError);
      
      // Try to fetch notes from Supabase
      const { data: fetchedNotes, error } = await supabase
        .from('Notes Table')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('ERROR FETCHING NOTES:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('Fetched notes count:', fetchedNotes?.length || 0);
      
      // If we have notes in the database, use them
      if (fetchedNotes && fetchedNotes.length > 0) {
        console.log('First note raw data:', JSON.stringify(fetchedNotes[0], null, 2));
        
        // בדיקה של כל שמות השדות
        const firstNote = fetchedNotes[0];
        console.log('ALL FIELDS IN NOTE:',
          Object.keys(firstNote).map(key => `${key}: ${firstNote[key] !== null ? typeof firstNote[key] : 'NULL'}`).join(', ')
        );
        
        // התמרה פשוטה של הנתונים מהבסיס לפורמט של האפליקציה
        const transformedNotes = fetchedNotes.map(note => ({
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          color: note.color || 'yellow',
          x: note.x || note.position_x || 0,
          y: note.y || note.position_y || 0,
          rotate: note.rotate || 'rotate(0deg)',
          shadowHeight: note.shadowHeight || note.shadow_height || 10,
          shadowBlur: note.shadowBlur || note.shadow_blur || 30,
          user_id: note.user_id
        }));
        
        console.log('Transformed notes sample:', JSON.stringify(transformedNotes[0], null, 2));
        
        setNotes(transformedNotes);
        
        // Find the highest ID to continue from there
        const maxId = Math.max(...fetchedNotes.map(note => Number(note.id)));
        setNextNoteId(Math.max(100, maxId + 1));
      } else {
        // If no notes found, create default notes and save them to Supabase
        console.log('No notes found for user, creating defaults');
        const newNotes = defaultNotes.map(note => ({
          ...note,
          user_id: userId
        }));
        
        // Save default notes to Supabase
        for (const note of newNotes) {
          await saveNoteToSupabase(note);
        }
        
        setNotes(newNotes);
        setNextNoteId(100 + newNotes.length);
      }
    } catch (error) {
      console.error('Error in fetchUserNotes:', error);
      // Fall back to default notes if there's an error
      const newNotes = defaultNotes.map(note => ({
        ...note,
        user_id: userId
      }));
      setNotes(newNotes);
    } finally {
      setLoading(false);
    }
  };

  // Save note to Supabase - SIMPLIFIED VERSION
  const saveNoteToSupabase = async (note) => {
    if (!user) {
      console.error('ERROR: No user logged in, cannot save note');
      return;
    }
    
    try {
      console.log('=== SAVING NOTE TO SUPABASE ===');
      console.log('User ID:', user.id);
      console.log('Note ID:', note.id);
      console.log('Title:', note.title);
      console.log('Content:', note.content);
      console.log('Position:', note.x, note.y);
      
      // פישוט מוחלט - רק השדות החיוניים ביותר
      const simplifiedNote = {
        id: note.id,
        user_id: user.id,
        title: note.title || '',
        content: note.content || '',
        x: note.x,
        y: note.y,
        color: note.color || 'yellow'
      };
      
      console.log('Sending simplified note to Supabase:', JSON.stringify(simplifiedNote, null, 2));
      
      // נסה לשמור בטבלה החדשה
      const { data, error } = await supabase
        .from('Notes Table')
        .upsert(simplifiedNote, { onConflict: 'id' });
      
      if (error) {
        console.error('ERROR SAVING NOTE:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        
        // בדיקת הרשאות
        console.log('=== CHECKING PERMISSIONS ===');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('Current auth state:', authData, authError);
      } else {
        console.log('SUCCESS: Note saved successfully:', note.id);
        if (data) {
          console.log('Returned data:', JSON.stringify(data, null, 2));
        }
      }
      
      // לצורך בדיקה, גם ננסה לקרוא את הפתק שזה עתה שמרנו
      console.log('=== TRYING TO READ BACK THE NOTE ===');
      const { data: readData, error: readError } = await supabase
        .from('Notes Table')
        .select('*')
        .eq('id', note.id)
        .eq('user_id', user.id);
      
      if (readError) {
        console.error('ERROR READING BACK NOTE:', readError);
      } else {
        console.log('Read back note:', JSON.stringify(readData, null, 2));
      }
      
    } catch (error) {
      console.error('EXCEPTION in saveNoteToSupabase:', error);
    }
  };

  // Delete note from Supabase
  const deleteNoteFromSupabase = async (noteId) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('Notes Table')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error deleting note from Supabase:', error);
      }
    } catch (error) {
      console.error('Unexpected error deleting note:', error);
    }
  };

  // Handle content change in editable notes
  const handleNoteContentChange = (noteId: number, data: { title: string, content: string }) => {
    console.log('DEBUG: Content changed for note:', noteId, JSON.stringify(data));
    
    const updatedNotes = notes.map(note => 
      note.id === noteId ? { ...note, title: data.title, content: data.content } : note
    );
    
    console.log('DEBUG: Updated notes state with:', 
      updatedNotes.find(note => note.id === noteId));
    
    setNotes(updatedNotes);
    
    // Get the updated note and save it to Supabase
    const updatedNote = updatedNotes.find(note => note.id === noteId);
    if (updatedNote) {
      saveNoteToSupabase(updatedNote);
    }
  };
  
  // Handle note deletion
  const handleDeleteNote = (noteId: number) => {
    setNotes(notes.filter(note => note.id !== noteId));
    deleteNoteFromSupabase(noteId);
  };
  
  // Handle image deletion
  const handleDeleteImage = (imageId: number) => {
    setImages(images.filter(image => image.id !== imageId));
  };
  
  // Add a new note
  const handleAddNote = () => {
    const newNote = {
      id: nextNoteId,
      title: 'New Note',
      content: 'Click to edit...',
      color: getRandomColor(),
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      rotate: getRandomRotation(),
      shadowHeight: 14,
      shadowBlur: 28,
      user_id: user?.id
    };
    
    setNotes([...notes, newNote]);
    setNextNoteId(nextNoteId + 1);
    
    // Save the new note to Supabase
    saveNoteToSupabase(newNote);
  };
  
  // Handle emoji selection from picker
  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    const newEmoji = {
      id: Date.now(),
      emoji: emojiData.emoji,
      x: window.innerWidth / 2 - 30 + Math.random() * 50,
      y: window.innerHeight / 2 - 30 + Math.random() * 50
    };
    
    setEmojis([...emojis, newEmoji]);
    setShowEmojiPicker(false);
  };
  
  // Toggle emoji picker
  const handleAddEmoji = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };
  
  // Add a sticker
  const handleAddSticker = () => {
    // Implementation for adding stickers
  };
  
  // Add an image from file
  const handleAddImage = (file: File) => {
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const newImage = {
            id: Date.now(),
            url: e.target.result.toString(),
            x: window.innerWidth / 2 - 100,
            y: window.innerHeight / 2 - 100
          };
          
          setImages([...images, newImage]);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Reset the board
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the board? This will clear all notes.')) {
      setNotes([]);
      setEmojis([]);
      setImages([]);
      setStickers([]);
    }
  };

  // Handle drawing mode toggle
  const handleDrawingToggle = () => {
    setIsDrawing(!isDrawing);
    setIsDrawingActive(false);
    
    // אם עוברים למצב ציור, מכינים את הקנבס
    if (!isDrawing) {
      console.log('Drawing mode turned on');
      setTimeout(() => {
        initCanvas();
      }, 100); // קצת זמן כדי לוודא שהקנבס כבר קיים בDOM
    } else {
      console.log('Drawing mode turned off, clearing canvas');
      // אפשר להשאיר את הציור או למחוק אותו כשמכבים את המצב
    }
  };

  // אתחול הקנבס לציור
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // התאמת גודל הקנבס למסך
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // קבלת הקונטקסט לציור
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = drawingColor;
      context.lineWidth = lineWidth;
      drawingContextRef.current = context;
    }
  };

  // אירועי ציור
  const startDrawing = (e) => {
    if (!drawingContextRef.current) return;
    
    const { offsetX, offsetY } = getDrawPosition(e);
    drawingContextRef.current.beginPath();
    drawingContextRef.current.moveTo(offsetX, offsetY);
    setIsDrawingActive(true);
  };

  const draw = (e) => {
    if (!isDrawingActive || !drawingContextRef.current) return;
    
    const { offsetX, offsetY } = getDrawPosition(e);
    drawingContextRef.current.lineTo(offsetX, offsetY);
    drawingContextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!drawingContextRef.current) return;
    
    drawingContextRef.current.closePath();
    setIsDrawingActive(false);
  };

  // עזרה: מיקום נכון לאירועי מגע וגם עכבר
  const getDrawPosition = (e) => {
    let offsetX, offsetY;
    
    if (e.touches) { // מגע
      const rect = canvasRef.current.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
    } else { // עכבר
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }
    
    // התאמה לזום
    offsetX = offsetX * (100 / zoom);
    offsetY = offsetY * (100 / zoom);
    
    return { offsetX, offsetY };
  };

  // שינוי צבע הציור
  const changeDrawingColor = (color) => {
    setDrawingColor(color);
    if (drawingContextRef.current) {
      drawingContextRef.current.strokeStyle = color;
    }
  };

  // שינוי עובי הקו
  const changeLineWidth = (width) => {
    setLineWidth(width);
    if (drawingContextRef.current) {
      drawingContextRef.current.lineWidth = width;
    }
  };

  // ניקוי הקנבס
  const clearCanvas = () => {
    if (drawingContextRef.current && canvasRef.current) {
      drawingContextRef.current.clearRect(
        0, 0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  };

  // If not authenticated, show login screen
  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Login />;
  }

  // Main app rendering
  return (
    <div className="app">
      <Header 
        user={user} 
        notes={notes} 
        onLogout={logout}
      />
      
      <main className="main">
        <div className="container" ref={boardRef}>
          {/* Notes */}
          {notes.map(note => (
            <EditableNote 
              key={note.id}
              id={note.id}
              note={note}
              initialPosition={{ x: note.x, y: note.y }}
              onContentChange={(data) => handleNoteContentChange(note.id, data)}
              onDelete={() => handleDeleteNote(note.id)}
              zoom={zoom}
              onPositionChange={(id, position) => {
                const updatedNotes = notes.map(n => 
                  n.id === id ? { ...n, x: position.x, y: position.y } : n
                );
                setNotes(updatedNotes);
                
                // Get the updated note and save it to Supabase
                const updatedNote = updatedNotes.find(n => n.id === id);
                if (updatedNote) {
                  saveNoteToSupabase(updatedNote);
                }
              }}
            />
          ))}
          
          {/* Emojis */}
          {emojis.map(emoji => (
            <DraggableEmoji
              key={emoji.id}
              id={emoji.id}
              emoji={emoji.emoji}
              initialPosition={{ x: emoji.x, y: emoji.y }}
              zoom={zoom}
              onPositionChange={(id, pos) => {
                setEmojis(prev => prev.map(e => e.id === id ? {...e, x: pos.x, y: pos.y} : e));
              }}
            />
          ))}
          
          {/* Stickers */}
          {stickers.map(sticker => (
            <DraggableSticker
              key={sticker.id}
              id={sticker.id}
              url={sticker.url}
              initialPosition={{ x: sticker.x, y: sticker.y }}
              zoom={zoom}
              onPositionChange={(id, pos) => {
                setStickers(prev => prev.map(s => s.id === id ? {...s, x: pos.x, y: pos.y} : s));
              }}
            />
          ))}
          
          {/* Images */}
          {images.map(image => (
            <DraggableImage
              key={image.id}
              id={image.id}
              imageUrl={image.url}
              initialPosition={{ x: image.x, y: image.y }}
              zoom={zoom}
              onDelete={handleDeleteImage}
            />
          ))}

          {/* Drawing canvas, visible only when drawing mode is active */}
          {isDrawing && (
            <>
              <canvas
                ref={canvasRef}
                className="drawing-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              
              {/* Drawing controls */}
              <div className="drawing-controls">
                <button 
                  className="drawing-control-button" 
                  onClick={clearCanvas}
                  title="Clear Drawing"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 5L19 19M5 19L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                
                <div className="color-picker">
                  {['#FF5B14', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#000000'].map(color => (
                    <div
                      key={color}
                      className={`color-option ${color === drawingColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => changeDrawingColor(color)}
                    />
                  ))}
                </div>
                
                <div className="line-width-control">
                  {[1, 3, 5, 8].map(width => (
                    <button
                      key={width}
                      className={`drawing-control-button ${width === lineWidth ? 'active' : ''}`}
                      onClick={() => changeLineWidth(width)}
                    >
                      <div style={{ 
                        width: `${width * 2}px`, 
                        height: `${width * 2}px`, 
                        borderRadius: '50%', 
                        backgroundColor: drawingColor 
                      }} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Floating action buttons */}
      <FloatingBar 
        onAddNote={handleAddNote}
        onAddEmoji={handleAddEmoji}
        onAddSticker={handleDrawingToggle}
        onAddImage={(files) => files && files[0] && handleAddImage(files[0])}
        onReset={handleReset}
        onAddFriendNote={() => setShowFriendNoteModal(true)}
        onZoomChange={handleZoomChange}
        isDrawing={isDrawing}
        currentZoom={zoom}
      />
      
      {/* Render emoji picker as a separate component */}
      <EmojiPickerComponent 
        showEmojiPicker={showEmojiPicker}
        onEmojiPickerClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
      
      {/* Share note modal */}
      {showFriendNoteModal && (
        <FriendNote 
          onClose={() => setShowFriendNoteModal(false)}
        />
      )}
    </div>
  );
}
