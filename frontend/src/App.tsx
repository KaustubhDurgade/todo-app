import React, { useState, useEffect, useRef } from 'react';
import { todoApi, type Todo } from './services/todoApi';
import './App.css';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Quick add modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddStep, setQuickAddStep] = useState<'title' | 'description'>('title');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // Drag state
  const [draggedTodo, setDraggedTodo] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [todoPositions, setTodoPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [isPushing, setIsPushing] = useState(false);
  const [hoveredTodo, setHoveredTodo] = useState<number | null>(null);
  
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not already typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Press 'N' to open quick add
      if (e.key.toLowerCase() === 'n' && !showQuickAdd) {
        e.preventDefault();
        openQuickAdd();
      }
      
      // Press 'X' to toggle completion of the hovered todo
      if (e.key.toLowerCase() === 'x' && !showQuickAdd && hoveredTodo) {
        e.preventDefault();
        toggleTodo(hoveredTodo);
      }
      
      // Press 'Escape' to close quick add
      if (e.key === 'Escape' && showQuickAdd) {
        closeQuickAdd();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showQuickAdd, cursorPosition, todos]);

  // Simple mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      
      // Push functionality when Command key is held
      if (isPushing) {
        pushNearbyTodos(e.clientX, e.clientY);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && !isPushing) { // Command key pressed
        setIsPushing(true);
        // Stop any current dragging when push mode starts
        if (draggedTodo !== null) {
          setDraggedTodo(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && isPushing) { // Command key released
        setIsPushing(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isPushing, todoPositions, todos]);

  // Push nearby todos away from cursor
  const pushNearbyTodos = (mouseX: number, mouseY: number) => {
    const pushRadius = 100; // Distance within which todos get pushed
    const pushForce = 15; // How much to push them
    
    setTodoPositions(prev => {
      const newPositions = { ...prev };
      
      todos.forEach(todo => {
        if (!todo.id || !newPositions[todo.id]) return;
        
        const todoPos = newPositions[todo.id];
        const todoCenterX = todoPos.x + 150; // Approximate center of todo box
        const todoCenterY = todoPos.y + 50;
        
        const distance = Math.sqrt(
          Math.pow(mouseX - todoCenterX, 2) + Math.pow(mouseY - todoCenterY, 2)
        );
        
        if (distance < pushRadius && distance > 0) {
          // Calculate push direction (away from cursor)
          const pushX = (todoCenterX - mouseX) / distance * pushForce;
          const pushY = (todoCenterY - mouseY) / distance * pushForce;
          
          // Apply push with bounds checking
          const newX = Math.max(0, Math.min(window.innerWidth - 300, todoPos.x + pushX));
          const newY = Math.max(0, Math.min(window.innerHeight - 200, todoPos.y + pushY));
          
          newPositions[todo.id] = { x: newX, y: newY };
        }
      });
      
      return newPositions;
    });
  };

  // Focus input when modal opens or step changes
  useEffect(() => {
    if (showQuickAdd && quickInputRef.current) {
      quickInputRef.current.focus();
    }
  }, [showQuickAdd, quickAddStep]);

  // Apply pushing class to body
  useEffect(() => {
    if (isPushing) {
      document.body.classList.add('pushing');
    } else {
      document.body.classList.remove('pushing');
    }
    
    return () => {
      document.body.classList.remove('pushing');
    };
  }, [isPushing]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const todosData = await todoApi.getAllTodos();
      setTodos(todosData);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openQuickAdd = () => {
    // Set modal position to current cursor position
    setModalPosition({ x: cursorPosition.x, y: cursorPosition.y });
    setShowQuickAdd(true);
    setQuickAddStep('title');
    setQuickTitle('');
    setQuickDescription('');
  };

  const closeQuickAdd = () => {
    setShowQuickAdd(false);
    setQuickAddStep('title');
    setQuickTitle('');
    setQuickDescription('');
  };

  const handleQuickAddKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (quickAddStep === 'title') {
        if (!quickTitle.trim()) {
          closeQuickAdd();
          return;
        }
        // Move to description step
        setQuickAddStep('description');
      } else if (quickAddStep === 'description') {
        // Create the todo (even if description is empty)
        await createQuickTodo();
      }
    } else if (e.key === 'Escape') {
      closeQuickAdd();
    } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      // Handle Command+A (Mac) or Ctrl+A (Windows/Linux) to select all text
      e.preventDefault();
      if (quickInputRef.current) {
        quickInputRef.current.select();
      }
    }
  };

  const createQuickTodo = async () => {
    if (!quickTitle.trim()) return;

    try {
      const newTodo = await todoApi.createTodo({
        title: quickTitle.trim(),
        description: quickDescription.trim() || undefined,
        completed: false
      });
      
      setTodos(prevTodos => [...prevTodos, newTodo]);
      
      // Set initial position for new todo at the modal position
      if (newTodo.id) {
        setTodoPositions(prev => ({
          ...prev,
          [newTodo.id!]: {
            x: modalPosition.x - 150, // Center the todo box (roughly 300px wide)
            y: modalPosition.y - 50   // Position it near the modal
          }
        }));
      }
      
      closeQuickAdd();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  // Drag functionality
  const handleTodoMouseDown = (e: React.MouseEvent, todoId: number) => {
    if (e.target instanceof HTMLButtonElement) return; // Don't drag when clicking delete button
    if (e.metaKey || isPushing) {
      return; // Don't drag when Command is held (for pushing)
    }
    
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering toggle
    setDraggedTodo(todoId);
    
    const currentPosition = todoPositions[todoId] || { x: 0, y: 0 };
    
    // Calculate offset from mouse position to current element position
    setDragOffset({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
  };

  const handleTodoDoubleClick = (e: React.MouseEvent, todoId: number) => {
    // Only toggle on double-click to avoid conflicts with dragging
    e.stopPropagation();
    toggleTodo(todoId);
  };

  const handleDragMouseMove = (e: MouseEvent) => {
    if (draggedTodo === null) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const boundedX = Math.max(0, Math.min(window.innerWidth - 300, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - 200, newY));
    
    setTodoPositions(prev => ({
      ...prev,
      [draggedTodo]: { x: boundedX, y: boundedY }
    }));
  };

  const handleDragMouseUp = () => {
    setDraggedTodo(null);
  };

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (draggedTodo !== null) {
      document.addEventListener('mousemove', handleDragMouseMove);
      document.addEventListener('mouseup', handleDragMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMouseMove);
        document.removeEventListener('mouseup', handleDragMouseUp);
      };
    }
  }, [draggedTodo, dragOffset]);

  // Initialize positions for existing todos
  useEffect(() => {
    todos.forEach((todo, index) => {
      if (todo.id && !todoPositions[todo.id]) {
        setTodoPositions(prev => ({
          ...prev,
          [todo.id!]: {
            x: 50 + (index % 3) * 320,
            y: 50 + Math.floor(index / 3) * 150
          }
        }));
      }
    });
  }, [todos]);

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const updatedTodo = await todoApi.updateTodo(id, { 
        completed: !todo.completed 
      });
      setTodos(todos.map(t => t.id === id ? updatedTodo : t));
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await todoApi.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
      // Clean up position data
      setTodoPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[id];
        return newPositions;
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <div className="header">
        <h1>Quick Todo</h1>
        <div className="keyboard-hint">
          Press <kbd>N</kbd> to add todo • <kbd>X</kbd> to toggle hovered task • Double-click to toggle • Hold <kbd>Cmd</kbd> to push
        </div>
      </div>

      <div className="todo-list">
        {todos.map(todo => {
          const position = todoPositions[todo.id!] || { x: 0, y: 0 };
          return (
            <div 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''} ${
                draggedTodo === todo.id ? 'dragging' : ''
              } ${hoveredTodo === todo.id ? 'hovered' : ''}`}
              style={{
                left: position.x,
                top: position.y,
                transform: draggedTodo === todo.id ? 'rotate(5deg) scale(1.05)' : 'none'
              }}
              onMouseDown={(e) => handleTodoMouseDown(e, todo.id!)}
              onMouseEnter={() => setHoveredTodo(todo.id!)}
              onMouseLeave={() => setHoveredTodo(null)}
            >
              <div 
                className="todo-content" 
                onDoubleClick={(e) => handleTodoDoubleClick(e, todo.id!)}
                style={{ cursor: isPushing ? 'crosshair' : 'move' }}
              >
                <div className="todo-title">{todo.title}</div>
                {todo.description && (
                  <div className="todo-description">{todo.description}</div>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  todo.id && deleteTodo(todo.id);
                }} 
                className="delete-button"
                title="Delete todo"
                style={{ cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="liquid-glass-overlay">
          <div 
            className="liquid-glass-modal"
            style={{
              left: modalPosition.x,
              top: modalPosition.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <input
              ref={quickInputRef}
              type="text"
              value={quickAddStep === 'title' ? quickTitle : quickDescription}
              onChange={(e) => {
                if (quickAddStep === 'title') {
                  setQuickTitle(e.target.value);
                } else {
                  setQuickDescription(e.target.value);
                }
              }}
              onKeyDown={handleQuickAddKeyPress}
              placeholder={
                quickAddStep === 'title' 
                  ? (quickTitle ? '' : 'Todo title')
                  : (quickDescription ? '' : 'Description')
              }
              className="liquid-glass-input"
            />
            
            {/* Show instructions only when input is empty */}
            {((quickAddStep === 'title' && !quickTitle) || (quickAddStep === 'description' && !quickDescription)) && (
              <div className="liquid-glass-hint">
                {quickAddStep === 'title' ? '↵ next' : '↵ create'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
