import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';

interface Todo {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  position?: { x: number; y: number };
}

interface FloatingTodo extends Todo {
  position: { x: number; y: number };
  isDragging?: boolean;
  zIndex?: number;
}

const API_BASE_URL = 'http://localhost:5001/todos/';

function App() {
  const [todos, setTodos] = useState<FloatingTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [highestZIndex, setHighestZIndex] = useState(1000);
  const [windowSize, setWindowSize] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [updatingTodoId, setUpdatingTodoId] = useState<number | null>(null);
  const [hoveredTodoId, setHoveredTodoId] = useState<number | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [modalStep, setModalStep] = useState<'title' | 'description'>('title');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // Track last known mouse position
  const lastMousePosition = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // Calculate dynamic todo dimensions based on window size (memoized)
  const getTodoDimensions = useCallback(() => {
    const width = Math.max(200, Math.min(350, windowSize.width * 0.25));
    const height = Math.max(100, Math.min(200, windowSize.height * 0.15));
    return { width, height };
  }, [windowSize.width, windowSize.height]);

  const fetchTodos = useCallback(async () => {
    try {
      console.log('Fetching todos from:', API_BASE_URL);
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched todos:', data);
      
      // Calculate dynamic todo size based on window size
      const dimensions = getTodoDimensions();
      
      // Convert to floating todos with positions from backend or random if not set
      const floatingTodos: FloatingTodo[] = data.map((todo: any, index: number) => {
        // Use backend position if available, otherwise generate random position
        let position;
        if (todo.position_x !== null && todo.position_y !== null) {
          position = { x: todo.position_x, y: todo.position_y };
        } else {
          position = {
            x: Math.random() * (windowSize.width - dimensions.width) + 50,
            y: Math.random() * (windowSize.height - dimensions.height) + 50
          };
        }
        
        return {
          ...todo,
          position,
          zIndex: 1000 + index
        };
      });
      
      setTodos(floatingTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  }, [windowSize.width, windowSize.height, getTodoDimensions]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTodo = useCallback(async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Set updating state for visual feedback
    setUpdatingTodoId(id);

    try {
      const response = await fetch(`${API_BASE_URL}${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...todo,
          completed: !todo.completed,
          position_x: todo.position.x,
          position_y: todo.position.y,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTodo = await response.json();
      
      // Preserve position and zIndex data when updating
      setTodos(todos.map(t => t.id === id ? {
        ...updatedTodo,
        position: t.position, // Keep original position
        zIndex: t.zIndex      // Keep original zIndex
      } : t));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    } finally {
      // Clear updating state
      setUpdatingTodoId(null);
    }
  }, [todos]);

  // Dragging functionality
  const handleMouseDown = useCallback((event: React.MouseEvent, todo: FloatingTodo) => {
    if (!todo.id) return;
    
    // Calculate offset based on current todo position and mouse position
    setDragOffset({
      x: event.clientX - todo.position.x,
      y: event.clientY - todo.position.y
    });
    setSelectedTodoId(todo.id);
    setIsDragging(true);
    
    // Bring to front
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setTodos(prev => prev.map(t => 
      t.id === todo.id ? { ...t, zIndex: newZIndex } : t
    ));
    
    event.preventDefault();
  }, [highestZIndex]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !selectedTodoId) return;
    
    // Get current window dimensions directly from the DOM
    const currentWindowWidth = window.innerWidth;
    const currentWindowHeight = window.innerHeight;
    
    // Calculate fresh dimensions for this drag operation
    const dimensions = getTodoDimensions();
    
    const newPosition = {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y
    };
    
    // Keep within screen bounds using fresh dimensions
    const boundedPosition = {
      x: Math.max(0, Math.min(currentWindowWidth - dimensions.width, newPosition.x)),
      y: Math.max(0, Math.min(currentWindowHeight - dimensions.height, newPosition.y))
    };
    
    setTodos(prev => prev.map(todo => 
      todo.id === selectedTodoId 
        ? { ...todo, position: boundedPosition }
        : todo
    ));
  }, [isDragging, selectedTodoId, dragOffset, getTodoDimensions]);

  const handleMouseUp = useCallback(() => {
    // Save position to backend if we were dragging
    if (isDragging && selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo) {
        updateTodoPosition(selectedTodoId, todo.position);
      }
    }
    
    setIsDragging(false);
    setSelectedTodoId(null);
  }, [isDragging, selectedTodoId, todos]);

  const updateTodoPosition = useCallback(async (id: number, position: { x: number; y: number }) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      await fetch(`${API_BASE_URL}${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...todo,
          position_x: position.x,
          position_y: position.y,
        }),
      });
    } catch (error) {
      console.error('Failed to update todo position:', error);
    }
  }, [todos]);

  const handleDoubleClick = useCallback(async (todo: FloatingTodo) => {
    if (!todo.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}${todo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTodos(todos.filter(t => t.id !== todo.id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }, [todos]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, selectedTodoId, dragOffset]);

  // Add keyboard event listener for 'N' key, 'X' key for completion, and track mouse position
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input field and modal is not already open
      if (event.key.toLowerCase() === 'n' && 
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        openModal();
      }
      
      // X key to toggle completion of the hovered todo
      if (event.key.toLowerCase() === 'x' && 
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        
        // Only proceed if there's a hovered todo
        if (hoveredTodoId) {
          toggleTodo(hoveredTodoId);
        }
      }
      
      // D key to toggle debug mode
      if (event.key.toLowerCase() === 'd' && 
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        setShowDebugMode(prev => !prev);
      }
      
      // ESC key to close modal - but only if not focused on modal inputs
      if (event.key === 'Escape' && showModal) {
        const target = event.target as HTMLElement;
        const isModalInput = target.matches('.modal-input-minimal, .modal-textarea-minimal');
        if (!isModalInput) {
          closeModal();
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Only track mouse when modal is not open and not dragging
      if (!showModal && !isDragging) {
        lastMousePosition.current = { x: event.clientX, y: event.clientY };
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showModal, todos, isDragging, hoveredTodoId]);

  const openModal = useCallback(() => {
    // Use last known mouse position
    const position = {
      x: lastMousePosition.current.x,
      y: lastMousePosition.current.y
    };
    setModalPosition(position);
    setShowModal(true);
    setModalStep('title');
    setModalTitle('');
    setModalDescription('');
  }, []);

  const closeModal = useCallback(() => {
    setModalClosing(true);
    
    // Wait for animation to complete before hiding modal
    setTimeout(() => {
      setShowModal(false);
      setModalClosing(false);
      setModalStep('title');
      setModalTitle('');
      setModalDescription('');
    }, 300); // Match the animation duration
  }, []);

  const handleModalNext = useCallback(() => {
    if (modalStep === 'title' && modalTitle.trim()) {
      setModalStep('description');
    }
  }, [modalStep, modalTitle]);

  const handleModalSubmit = useCallback(async () => {
    if (!modalTitle.trim()) return;

    try {
      // Create floating todo at modal position using dynamic dimensions
      const dimensions = getTodoDimensions();
      const newPosition = {
        x: Math.max(0, Math.min(windowSize.width - dimensions.width, modalPosition.x - dimensions.width/2)),
        y: Math.max(0, Math.min(windowSize.height - dimensions.height, modalPosition.y - dimensions.height/2))
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: modalTitle,
          description: modalDescription,
          completed: false,
          position_x: newPosition.x,
          position_y: newPosition.y,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTodo = await response.json();
      
      const newFloatingTodo: FloatingTodo = {
        ...newTodo,
        position: newPosition,
        zIndex: highestZIndex + 1
      };
      
      setHighestZIndex(prev => prev + 1);
      setTodos(prev => [...prev, newFloatingTodo]);
      
      // Use closing animation
      setModalClosing(true);
      setTimeout(() => {
        setShowModal(false);
        setModalClosing(false);
        setModalStep('title');
        setModalTitle('');
        setModalDescription('');
      }, 300);
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }, [modalTitle, modalDescription, modalPosition, windowSize, getTodoDimensions, highestZIndex]);

  const handleModalKeyDown = useCallback((event: React.KeyboardEvent, inputType: 'title' | 'description') => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputType === 'title' && modalTitle.trim()) {
        handleModalNext();
      } else if (inputType === 'description') {
        // Allow submission even with empty description
        handleModalSubmit();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    }
  }, [modalTitle, handleModalNext, handleModalSubmit, closeModal]);

  // Memoize dimensions for performance
  const todoDimensions = useMemo(() => getTodoDimensions(), [getTodoDimensions]);

  // Memoize sorted todos for consistent z-index rendering
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [todos]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  if (loading) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <div className="app">
      <div className="ambient-water-effect"></div>
      
      {/* Debug info */}
      {showDebugMode && (
        <div className="debug-info">
          <div>Window: {windowSize.width}x{windowSize.height}</div>
          <div>Todo size: {todoDimensions.width}x{todoDimensions.height}</div>
          <div>Todos: {todos.length}</div>
          <div>Press D to toggle debug</div>
        </div>
      )}
      
      {/* Floating Todos */}
      {sortedTodos.map(todo => {
        return (
          <div
            key={todo.id}
            className={`floating-todo ${todo.completed ? 'completed' : ''} ${selectedTodoId === todo.id ? 'dragging' : ''} ${updatingTodoId === todo.id ? 'updating' : ''}`}
            style={{
              left: todo.position.x,
              top: todo.position.y,
              width: todoDimensions.width,
              minHeight: todoDimensions.height,
              zIndex: todo.zIndex || 1000
            }}
            onMouseDown={(e) => handleMouseDown(e, todo)}
            onDoubleClick={() => handleDoubleClick(todo)}
            onMouseEnter={() => setHoveredTodoId(todo.id || null)}
            onMouseLeave={() => setHoveredTodoId(null)}
          >
            <div className="floating-todo-content">
              <div className="floating-todo-title">{todo.title}</div>
              {todo.description && (
                <div className="floating-todo-description">{todo.description}</div>
              )}
            </div>
            
            {/* Glass shimmer effect */}
            <div className="floating-todo-shimmer"></div>
            
            {/* Completion indicator */}
            {todo.completed && <div className="completion-indicator">✓</div>}
            
            {/* Debug rectangle */}
            {showDebugMode && (
              <>
                <div 
                  className="debug-rectangle"
                  style={{
                    width: todoDimensions.width,
                    height: todoDimensions.height
                  }}
                />
                <div className="debug-coordinates">
                  ID: {todo.id}<br/>
                  X: {Math.round(todo.position.x)}<br/>
                  Y: {Math.round(todo.position.y)}<br/>
                  Z: {todo.zIndex}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Empty state when no todos */}
      {todos.length === 0 && !loading && (
        <div className="floating-empty-state">
          <div className="empty-state-content">
            <div className="empty-state-title">Your floating workspace awaits</div>
            <div className="empty-state-subtitle">Press N to create your first floating task</div>
            <div className="empty-state-hint">Press X to complete • Double-click to delete • Press D for debug</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div 
            className={`modal-energy-ring modal-energy-ring-1 ${modalClosing ? 'closing' : ''}`}
            style={{
              left: modalPosition.x - 100,
              top: modalPosition.y - 100
            }}
          />
          <div 
            className={`modal-energy-ring modal-energy-ring-2 ${modalClosing ? 'closing' : ''}`}
            style={{
              left: modalPosition.x - 150,
              top: modalPosition.y - 150
            }}
          />
          <div 
            className={`modal-energy-ring modal-energy-ring-3 ${modalClosing ? 'closing' : ''}`}
            style={{
              left: modalPosition.x - 200,
              top: modalPosition.y - 200
            }}
          />
          <div 
            className={`modal-overlay-minimal ${modalClosing ? 'closing' : ''}`}
            style={{
              background: `radial-gradient(circle at ${modalPosition.x}px ${modalPosition.y}px, 
                rgba(0, 150, 255, 0.08) 0%, 
                rgba(0, 200, 150, 0.05) 20%,
                rgba(100, 180, 255, 0.04) 40%,
                rgba(255, 255, 255, 0.02) 60%,
                transparent 80%)`
            }}
          >
            <div 
              className={`modal-content-minimal ${modalClosing ? 'closing' : ''}`}
              style={{
                left: Math.min(Math.max(modalPosition.x - 160, 10), windowSize.width - 330),
                top: Math.min(Math.max(modalPosition.y - 28, 10), windowSize.height - 66)
              }}
            >
            {modalStep === 'title' ? (
              <input
                type="text"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                onKeyDown={(e) => handleModalKeyDown(e, 'title')}
                placeholder="What needs to be done?"
                autoFocus
                className="modal-input-minimal"
              />
            ) : (
              <textarea
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                onKeyDown={(e) => handleModalKeyDown(e, 'description')}
                placeholder="Add details (optional)"
                autoFocus
                className="modal-textarea-minimal"
              />
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default App;
