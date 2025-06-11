import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [showDebugBoundary, setShowDebugBoundary] = useState(true);
  const [showCollisionBoxes, setShowCollisionBoxes] = useState(false);
  const [cachedDimensions, setCachedDimensions] = useState<Record<number, { width: number; height: number }>>({});
  const [windowDimensions, setWindowDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [containerDimensions, setContainerDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight // Use full window height for full-screen dragging
  });
  
  const quickInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const todoRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Get actual dimensions of a specific todo (including dynamic height)
  const getActualTodoDimensions = (todoId: number): { width: number; height: number } => {
    // If this todo is being dragged and we have cached dimensions, use those
    if (draggedTodo === todoId && cachedDimensions[todoId]) {
      console.log(`Todo ${todoId} using cached dimensions (being dragged):`, cachedDimensions[todoId]);
      return cachedDimensions[todoId];
    }
    
    const todoElement = todoRefs.current[todoId];
    if (todoElement) {
      const rect = todoElement.getBoundingClientRect();
      const dimensions = {
        width: rect.width,
        height: rect.height
      };
      
      // Cache dimensions when not dragging
      if (draggedTodo !== todoId) {
        setCachedDimensions(prev => ({
          ...prev,
          [todoId]: dimensions
        }));
      }
      
      console.log(`Todo ${todoId} actual dimensions:`, dimensions);
      return dimensions;
    }
    
    // If we have cached dimensions, use those as fallback
    if (cachedDimensions[todoId]) {
      console.log(`Todo ${todoId} using cached dimensions (no DOM element):`, cachedDimensions[todoId]);
      return cachedDimensions[todoId];
    }
    
    // Final fallback to estimated dimensions
    console.log(`Todo ${todoId} using fallback dimensions (no DOM element)`);
    return getTodoDimensions();
  };

  // Refresh cached dimensions for all todos (call when content changes)
  const refreshCachedDimensions = useCallback(() => {
    console.log('Refreshing cached dimensions for all todos');
    todos.forEach(todo => {
      if (todo.id && todoRefs.current[todo.id] && draggedTodo !== todo.id) {
        const todoElement = todoRefs.current[todo.id];
        const rect = todoElement!.getBoundingClientRect();
        const dimensions = {
          width: rect.width,
          height: rect.height
        };
        setCachedDimensions(prev => ({
          ...prev,
          [todo.id!]: dimensions
        }));
        console.log(`Cached dimensions for todo ${todo.id}:`, dimensions);
      }
    });
  }, [draggedTodo]); // Remove todos from dependency to avoid infinite loop

  // Dynamic todo box dimensions based on screen size (for positioning calculations)
  const getTodoDimensions = () => {
    const dimensions = windowDimensions.width <= 480 
      ? { width: 240, height: 120 } 
      : windowDimensions.width <= 768 
        ? { width: 270, height: 120 } 
        : { width: 320, height: 120 };
    
    console.log('getTodoDimensions:', { windowDimensions, dimensions });
    return dimensions;
  };

  // Calculate safe area bounds (with padding from edges)
  const getSafeAreaBounds = () => {
    const dimensions = getTodoDimensions();
    const padding = 20; // Padding from screen edges
    return {
      minX: padding,
      minY: padding,
      maxX: window.innerWidth - dimensions.width - padding,
      maxY: window.innerHeight - dimensions.height - padding
    };
  };

  // Calculate drag area bounds (full screen area)
  const getDragAreaBounds = () => {
    const dimensions = getTodoDimensions();
    return {
      minX: 0,
      minY: 0,
      maxX: window.innerWidth - dimensions.width,
      maxY: window.innerHeight - dimensions.height
    };
  };

  useEffect(() => {
    fetchTodos();
    
    // Measure actual container dimensions after mount
    const updateContainerDimensions = () => {
      // Use full window dimensions for full-screen dragging
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      console.log('Container dimensions set to full window:', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    // Initial measurement
    setTimeout(updateContainerDimensions, 100); // Small delay to ensure layout is complete
    
    // Handle window resize
    const handleResize = () => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      setWindowDimensions(newDimensions);
      
      // Update container dimensions on resize
      setTimeout(updateContainerDimensions, 50);
      
      // Adjust todo positions to fit within new boundaries
      setTodoPositions(prev => {
        const updated = { ...prev };
        const dimensions = { 
          width: newDimensions.width <= 768 ? 270 : 320, 
          height: 120 
        };
        console.log('Adjusting positions for new dimensions:', dimensions);
        Object.keys(updated).forEach(id => {
          const pos = updated[parseInt(id)];
          if (pos) {
            const oldPos = { ...pos };
            // Keep within drag bounds but allow repositioning
            const dragBounds = {
              minX: 0,
              minY: 0,
              maxX: newDimensions.width - dimensions.width,
              maxY: newDimensions.height - dimensions.height
            };
            updated[parseInt(id)] = {
              x: Math.max(dragBounds.minX, Math.min(dragBounds.maxX, pos.x)),
              y: Math.max(dragBounds.minY, Math.min(dragBounds.maxY, pos.y))
            };
            console.log(`Todo ${id} position adjusted:`, { oldPos, newPos: updated[parseInt(id)] });
          }
        });
        return updated;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Force re-render of collision boxes after todos are loaded and DOM is ready
  useEffect(() => {
    if (todos.length > 0) {
      // Wait a tick for DOM to be fully rendered
      setTimeout(() => {
        // Only refresh dimensions if we don't have cached dimensions yet
        const needsRefresh = todos.some(todo => todo.id && !cachedDimensions[todo.id]);
        if (needsRefresh) {
          refreshCachedDimensions();
        }
        console.log('Dimensions ready, collision boxes should now use actual sizes');
      }, 100);
    }
  }, [todos.length]); // Only depend on todos.length, not the full todos array

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
      
      // Press 'D' to toggle debug boundary
      if (e.key.toLowerCase() === 'd' && !showQuickAdd) {
        e.preventDefault();
        setShowDebugBoundary(prev => !prev);
      }
      
      // Press 'C' to toggle collision boxes
      if (e.key.toLowerCase() === 'c' && !showQuickAdd) {
        e.preventDefault();
        setShowCollisionBoxes(prev => !prev);
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
      
      // Manual hover detection for X key functionality
      let currentHoveredTodo: number | null = null;
      
      todos.forEach(todo => {
        if (!todo.id || !todoPositions[todo.id]) return;
        
        const position = todoPositions[todo.id];
        const actualDimensions = getActualTodoDimensions(todo.id);
        
        if (
          e.clientX >= position.x &&
          e.clientX <= position.x + actualDimensions.width &&
          e.clientY >= position.y &&
          e.clientY <= position.y + actualDimensions.height
        ) {
          currentHoveredTodo = todo.id;
        }
      });
      
      // Only update if hover changed to prevent unnecessary re-renders
      if (currentHoveredTodo !== hoveredTodo) {
        setHoveredTodo(currentHoveredTodo);
      }
      
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
        // Sync all positions to database after push operation
        syncAllPositionsToDatabase();
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
  }, [isPushing, todoPositions, todos, hoveredTodo]);

  // Push nearby todos away from cursor
  const pushNearbyTodos = (mouseX: number, mouseY: number) => {
    const pushRadius = 50; // Distance from todo edge within which todos get pushed
    const pushForce = 15; // How much to push them
    
    setTodoPositions(prev => {
      const newPositions = { ...prev };
      
      todos.forEach(todo => {
        if (!todo.id || !newPositions[todo.id]) return;
        
        const todoPos = newPositions[todo.id];
        const actualDimensions = getActualTodoDimensions(todo.id);
        
        // Check if mouse is within the todo rectangle or nearby
        const todoLeft = todoPos.x;
        const todoRight = todoPos.x + actualDimensions.width;
        const todoTop = todoPos.y;
        const todoBottom = todoPos.y + actualDimensions.height;
        
        // Calculate distance from mouse to closest point on todo rectangle
        const closestX = Math.max(todoLeft, Math.min(mouseX, todoRight));
        const closestY = Math.max(todoTop, Math.min(mouseY, todoBottom));
        
        const distance = Math.sqrt(
          Math.pow(mouseX - closestX, 2) + Math.pow(mouseY - closestY, 2)
        );
        
        if (distance < pushRadius) {
          // Calculate push direction based on todo center for consistent behavior
          const todoCenterX = todoPos.x + actualDimensions.width / 2;
          const todoCenterY = todoPos.y + actualDimensions.height / 2;
          
          let pushX, pushY;
          
          if (distance === 0) {
            // Mouse is exactly on the todo, push away from center
            pushX = (todoCenterX - mouseX) === 0 ? pushForce : Math.sign(todoCenterX - mouseX) * pushForce;
            pushY = (todoCenterY - mouseY) === 0 ? pushForce : Math.sign(todoCenterY - mouseY) * pushForce;
          } else {
            // Push away from the closest point on the rectangle
            const directionX = (todoCenterX - mouseX) / distance;
            const directionY = (todoCenterY - mouseY) / distance;
            pushX = directionX * pushForce;
            pushY = directionY * pushForce;
          }
          
          // Apply push with safe area bounds checking
          const safeBounds = getSafeAreaBounds();
          const newX = Math.max(safeBounds.minX, Math.min(safeBounds.maxX, todoPos.x + pushX));
          const newY = Math.max(safeBounds.minY, Math.min(safeBounds.maxY, todoPos.y + pushY));
          
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

  // Apply dragging class to body
  useEffect(() => {
    if (draggedTodo !== null) {
      document.body.classList.add('dragging');
    } else {
      document.body.classList.remove('dragging');
    }
    
    return () => {
      document.body.classList.remove('dragging');
    };
  }, [draggedTodo]);

  // Sync all todo positions to database
  const syncAllPositionsToDatabase = async () => {
    try {
      const updatePromises = todos.map(async (todo) => {
        if (todo.id && todoPositions[todo.id]) {
          const position = todoPositions[todo.id];
          return todoApi.updateTodo(todo.id, {
            position_x: position.x,
            position_y: position.y
          });
        }
      });
      
      await Promise.all(updatePromises.filter(Boolean));
    } catch (error) {
      console.error('Error syncing positions to database:', error);
    }
  };

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
      const dimensions = getTodoDimensions();
      const safeBounds = getSafeAreaBounds();
      
      // Position the todo near the modal, but ensure it's within safe bounds
      const baseX = modalPosition.x - dimensions.width / 2;
      const baseY = modalPosition.y - dimensions.height / 2;
      
      const position_x = Math.max(safeBounds.minX, Math.min(safeBounds.maxX, baseX));
      const position_y = Math.max(safeBounds.minY, Math.min(safeBounds.maxY, baseY));
      
      const newTodo = await todoApi.createTodo({
        title: quickTitle.trim(),
        description: quickDescription.trim() || undefined,
        completed: false,
        position_x,
        position_y
      });
      
      setTodos(prevTodos => [...prevTodos, newTodo]);
      
      // Set initial position for new todo using the calculated values
      if (newTodo.id) {
        setTodoPositions(prev => ({
          ...prev,
          [newTodo.id!]: {
            x: newTodo.position_x || position_x,
            y: newTodo.position_y || position_y
          }
        }));
      }
      
      closeQuickAdd();
      
      // Refresh cached dimensions after new todo is created
      setTimeout(() => {
        refreshCachedDimensions();
      }, 100);
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  // Drag functionality
  const handleTodoMouseDown = (e: React.MouseEvent, todoId: number) => {
    if (e.target instanceof HTMLButtonElement) return; // Don't drag when clicking delete button
    if (e.metaKey || isPushing) return; // Don't drag when Command is held (for pushing)
    
    e.preventDefault();
    e.stopPropagation(); // Prevent any toggle behavior
    
    const currentPosition = todoPositions[todoId] || { x: 0, y: 0 };
    const dragBounds = getDragAreaBounds();
    
    // Ensure the current position is within bounds before starting drag
    const clampedX = Math.max(dragBounds.minX, Math.min(dragBounds.maxX, currentPosition.x));
    const clampedY = Math.max(dragBounds.minY, Math.min(dragBounds.maxY, currentPosition.y));
    
    // Update position if it was out of bounds
    if (clampedX !== currentPosition.x || clampedY !== currentPosition.y) {
      setTodoPositions(prev => ({
        ...prev,
        [todoId]: { x: clampedX, y: clampedY }
      }));
    }
    
    setDraggedTodo(todoId);
    
    // Calculate offset from mouse position to clamped element position
    setDragOffset({
      x: e.clientX - clampedX,
      y: e.clientY - clampedY
    });
  };

  const handleTodoDoubleClick = (e: React.MouseEvent, todoId: number) => {
    // Only toggle on double-click to avoid conflicts with dragging
    if (draggedTodo !== null) return; // Don't toggle if we're dragging
    e.stopPropagation();
    toggleTodo(todoId);
  };

  const handleDragMouseMove = (e: MouseEvent) => {
    if (draggedTodo === null) return;
    
    const dragBounds = getDragAreaBounds();
    const rawX = e.clientX - dragOffset.x;
    const rawY = e.clientY - dragOffset.y;
    
    const currentPos = todoPositions[draggedTodo];
    if (!currentPos) return;
    
    // Determine which boundaries are being hit with the raw position
    const wouldHitLeftBound = rawX <= dragBounds.minX;
    const wouldHitRightBound = rawX >= dragBounds.maxX;
    const wouldHitTopBound = rawY <= dragBounds.minY;
    const wouldHitBottomBound = rawY >= dragBounds.maxY;
    
    // Calculate new position with selective constraint
    let newX = rawX;
    let newY = rawY;
    
    // Only constrain X if hitting left or right boundary
    if (wouldHitLeftBound) {
      newX = dragBounds.minX;
    } else if (wouldHitRightBound) {
      newX = dragBounds.maxX;
    }
    
    // Only constrain Y if hitting top or bottom boundary  
    if (wouldHitTopBound) {
      newY = dragBounds.minY;
    } else if (wouldHitBottomBound) {
      newY = dragBounds.maxY;
    }
    
    // Only update position if it actually changed (prevents unnecessary re-renders)
    if (Math.abs(currentPos.x - newX) > 0.1 || Math.abs(currentPos.y - newY) > 0.1) {
      setTodoPositions(prev => ({
        ...prev,
        [draggedTodo]: { x: newX, y: newY }
      }));
    }
  };

  const handleDragMouseUp = async () => {
    if (draggedTodo !== null) {
      // Immediately sync final position to database
      const finalPosition = todoPositions[draggedTodo];
      if (finalPosition) {
        try {
          await todoApi.updateTodo(draggedTodo, {
            position_x: finalPosition.x,
            position_y: finalPosition.y
          });
        } catch (error) {
          console.error('Error syncing position:', error);
        }
      }
      
      // Refresh cached dimensions after drag ends
      setTimeout(() => {
        refreshCachedDimensions();
      }, 50);
    }
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
    const dimensions = getTodoDimensions();
    console.log('Initializing todo positions with dimensions:', dimensions);
    
    todos.forEach((todo, index) => {
      if (todo.id && !todoPositions[todo.id]) {
        // Calculate responsive grid layout for fallback positions
        const padding = 20;
        const todosPerRow = Math.floor((containerDimensions.width - padding * 2) / dimensions.width);
        const actualTodosPerRow = Math.max(1, todosPerRow); // At least 1 per row
        
        const gridX = (index % actualTodosPerRow) * dimensions.width + padding;
        const gridY = Math.floor(index / actualTodosPerRow) * (dimensions.height + 20) + padding;
        
        // Ensure fallback positions are within bounds
        const fallbackX = Math.max(0, Math.min(containerDimensions.width - dimensions.width, gridX));
        const fallbackY = Math.max(0, Math.min(containerDimensions.height - dimensions.height, gridY));
        
        const finalX = todo.position_x !== null && todo.position_x !== undefined 
           ? Math.max(0, Math.min(containerDimensions.width - dimensions.width, todo.position_x))
           : fallbackX;
        const finalY = todo.position_y !== null && todo.position_y !== undefined
           ? Math.max(0, Math.min(containerDimensions.height - dimensions.height, todo.position_y))
           : fallbackY;
        
        console.log(`Todo ${todo.id} position calculation:`, {
          dbPos: { x: todo.position_x, y: todo.position_y },
          gridPos: { x: gridX, y: gridY },
          fallbackPos: { x: fallbackX, y: fallbackY },
          finalPos: { x: finalX, y: finalY },
          bounds: { maxX: containerDimensions.width - dimensions.width, maxY: containerDimensions.height - dimensions.height }
        });
        
        setTodoPositions(prev => ({
          ...prev,
          [todo.id!]: { x: finalX, y: finalY }
        }));
      }
    });
  }, [todos, containerDimensions]);

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const updatedTodo = await todoApi.updateTodo(id, { 
        completed: !todo.completed 
      });
      setTodos(todos.map(t => t.id === id ? updatedTodo : t));
      
      // Refresh cached dimensions after completion toggle (in case text decoration affects size)
      setTimeout(() => {
        refreshCachedDimensions();
      }, 50);
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await todoApi.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
      // Clean up position data and cached dimensions
      setTodoPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[id];
        return newPositions;
      });
      setCachedDimensions(prev => {
        const newDimensions = { ...prev };
        delete newDimensions[id];
        return newDimensions;
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
          Press <kbd>N</kbd> to add todo • <kbd>X</kbd> to toggle hovered task • <kbd>D</kbd> to toggle debug • <kbd>C</kbd> to toggle collision boxes • Double-click to toggle • Hold <kbd>Cmd</kbd> to push
        </div>
        {showDebugBoundary && (
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#666',
            fontFamily: 'monospace',
            background: '#f0f0f0',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            🐛 DEBUG: Window {windowDimensions.width}×{windowDimensions.height} | 
            🟡 Drag: {getDragAreaBounds().maxX}×{getDragAreaBounds().maxY} |
            🟢 Safe: {getSafeAreaBounds().maxX - getSafeAreaBounds().minX}×{getSafeAreaBounds().maxY - getSafeAreaBounds().minY} |
            Todo: {getTodoDimensions().width}×{getTodoDimensions().height}
          </div>
        )}
      </div>

      <div className="todo-list" ref={containerRef}>
        {/* Debug boundary visualization - now shows full screen */}
        {showDebugBoundary && (
          <>
            {/* Drag area boundary - extended to screen edges */}
            <div 
              className="debug-boundary-drag"
              style={{
                position: 'fixed',
                top: getDragAreaBounds().minY,
                left: getDragAreaBounds().minX,
                width: getDragAreaBounds().maxX - getDragAreaBounds().minX + getTodoDimensions().width,
                height: getDragAreaBounds().maxY - getDragAreaBounds().minY + getTodoDimensions().height,
                border: '2px dashed #ff9500',
                backgroundColor: 'rgba(255, 149, 0, 0.02)',
                pointerEvents: 'none',
                zIndex: 40
              }}
            >
              <div style={{
                position: 'absolute',
                top: 5,
                left: 5,
                background: '#ff9500',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                🟡 DRAG AREA: {getDragAreaBounds().maxX}×{getDragAreaBounds().maxY}px
              </div>
            </div>
            
            {/* Safe area boundary - with padding from edges */}
            <div 
              className="debug-boundary-safe"
              style={{
                position: 'fixed',
                top: getSafeAreaBounds().minY,
                left: getSafeAreaBounds().minX,
                width: getSafeAreaBounds().maxX - getSafeAreaBounds().minX + getTodoDimensions().width,
                height: getSafeAreaBounds().maxY - getSafeAreaBounds().minY + getTodoDimensions().height,
                border: '2px dashed #00C851',
                backgroundColor: 'rgba(0, 200, 81, 0.02)',
                pointerEvents: 'none',
                zIndex: 50
              }}
            >
              <div style={{
                position: 'absolute',
                top: 5,
                left: 5,
                background: '#00C851',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                🟢 SAFE AREA: {getSafeAreaBounds().maxX - getSafeAreaBounds().minX + getTodoDimensions().width}×{getSafeAreaBounds().maxY - getSafeAreaBounds().minY + getTodoDimensions().height}px
              </div>
            </div>
          </>
        )}
        
        {todos.map(todo => {
          const position = todoPositions[todo.id!] || { x: 0, y: 0 };
          const actualDimensions = getActualTodoDimensions(todo.id!);
          return (
            <div key={todo.id}>
              {/* Main todo item */}
              <div 
                ref={(el) => {
                  if (todo.id) {
                    todoRefs.current[todo.id] = el;
                  }
                }}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${
                  draggedTodo === todo.id ? 'dragging' : ''
                } ${hoveredTodo === todo.id ? 'hovered' : ''}`}
                style={{
                  left: position.x,
                  top: position.y
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
              
              {/* Debug box around todo - uses actual dimensions */}
              <div 
                style={{
                  position: 'fixed',
                  left: position.x - 2,
                  top: position.y - 2,
                  width: actualDimensions.width + 4,
                  height: actualDimensions.height + 4,
                  border: '1px solid #666',
                  backgroundColor: 'transparent',
                  pointerEvents: 'none',
                  zIndex: 999,
                  borderRadius: '10px',
                  opacity: 0.3
                }}
              />
              
              {/* Collision box visualization - uses actual dimensions */}
              {showCollisionBoxes && (
                <div 
                  style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y,
                    width: actualDimensions.width,
                    height: actualDimensions.height,
                    border: '2px solid #ff00ff',
                    backgroundColor: 'rgba(255, 0, 255, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    borderRadius: '8px'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: -20,
                    left: 0,
                    background: '#ff00ff',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontFamily: 'monospace'
                  }}>
                    ID:{todo.id} [{Math.round(position.x)},{Math.round(position.y)}] {Math.round(actualDimensions.width)}×{Math.round(actualDimensions.height)}
                  </div>
                </div>
              )}
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
