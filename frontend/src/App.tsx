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
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSelectedTodos, setSearchSelectedTodos] = useState<Set<number>>(new Set());
  const [highlightedTodos, setHighlightedTodos] = useState<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Lasso tool state
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [lassoedTodos, setLassoedTodos] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [initialDragPositions, setInitialDragPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  
  // Spaces feature state
  interface Space {
    id: string;
    name: string;
    color: string;
    gradient: string;
  }
  
  const defaultSpaces: Space[] = [
    { id: 'all', name: 'All', color: '#4a90e2', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'work', name: 'Work', color: '#e74c3c', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
    { id: 'home', name: 'Home', color: '#2ecc71', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { id: 'school', name: 'School', color: '#f39c12', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  ];
  
  const [spaces] = useState<Space[]>(defaultSpaces);
  const [currentSpace, setCurrentSpace] = useState<string>('all');
  const [todoSpaces, setTodoSpaces] = useState<Map<number, string>>(new Map()); // Map todo ID to space ID
  
  // Undo/Redo state
  interface UndoAction {
    type: 'create' | 'delete' | 'toggle';
    todo: FloatingTodo;
    previousState?: boolean; // For toggle actions
  }
  
  const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]);
  const [redoHistory, setRedoHistory] = useState<UndoAction[]>([]);
  const MAX_HISTORY_SIZE = 50;
  
  // Momentum/inertia tracking
  const [todoMomentum, setTodoMomentum] = useState<Map<number, { vx: number; vy: number; animationId?: number }>>(new Map());
  const mouseVelocity = useRef({ x: 0, y: 0 });
  const lastMouseTime = useRef(Date.now());
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Track last known mouse position
  const lastMousePosition = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  // Repulsion system refs
  const repulsionAnimationFrame = useRef<number | null>(null);

  // Physics constants for task repulsion
  const GENTLE_REPULSION_FORCE = 15; // Subtle force to prevent stacking
  const GENTLE_REPULSION_RADIUS = 180; // Distance for gentle repulsion
  const DRAG_REPULSION_FORCE = 45; // Stronger force when dragging
  const DRAG_REPULSION_RADIUS = 250; // Larger radius when dragging
  const REPULSION_SMOOTHING = 0.1; // How quickly tasks move apart (0-1)

  // Physics constants for momentum/inertia
  const MOMENTUM_FRICTION = 0.92; // How quickly momentum decays (0-1, closer to 1 = less friction)
  const MOMENTUM_MIN_SPEED = 0.5; // Minimum speed before momentum stops
  const MOMENTUM_SCALE = 0.3; // How much of the mouse velocity to apply as momentum
  const VELOCITY_SMOOTHING = 0.7; // Smoothing factor for velocity calculation

  // Lasso utility functions
  const pointInPolygon = useCallback((point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    if (polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  const getTodoCenter = useCallback((todo: FloatingTodo) => {
    return {
      x: todo.position.x + 150, // Half of todo width (300px)
      y: todo.position.y + 75   // Half of todo height (150px)
    };
  }, []);

  const getTodoBoundingPoints = useCallback((todo: FloatingTodo) => {
    const x = todo.position.x;
    const y = todo.position.y;
    const w = 300; // width
    const h = 150; // height
    return [
      { x, y }, // top-left
      { x: x + w, y }, // top-right
      { x, y: y + h }, // bottom-left
      { x: x + w, y: y + h }, // bottom-right
      { x: x + w / 2, y }, // top-mid
      { x: x + w / 2, y: y + h }, // bottom-mid
      { x, y: y + h / 2 }, // left-mid
      { x: x + w, y: y + h / 2 }, // right-mid
    ];
  }, []);

  const clearLassoSelection = useCallback(() => {
    setLassoedTodos(new Set());
    setIsLassoing(false);
    setLassoPath([]);
  }, []);

  // Space management functions
  const assignTodoToSpace = useCallback((todoId: number, spaceId: string) => {
    setTodoSpaces(prev => {
      const newMap = new Map(prev);
      if (spaceId === 'all') {
        newMap.delete(todoId); // Remove from map if assigning to "all"
      } else {
        newMap.set(todoId, spaceId);
      }
      
      // Persist to localStorage
      const spaceData = Object.fromEntries(newMap);
      localStorage.setItem('todoSpaces', JSON.stringify(spaceData));
      
      return newMap;
    });
  }, []);

  // Load space assignments from localStorage on mount
  useEffect(() => {
    const savedSpaces = localStorage.getItem('todoSpaces');
    if (savedSpaces) {
      try {
        const spaceData = JSON.parse(savedSpaces);
        setTodoSpaces(new Map(Object.entries(spaceData).map(([k, v]) => [parseInt(k), v as string])));
      } catch (error) {
        console.error('Failed to load space assignments:', error);
      }
    }
  }, []);

  const getCurrentSpaceTodos = useCallback(() => {
    if (currentSpace === 'all') {
      return todos;
    }
    return todos.filter(todo => todo.id && todoSpaces.get(todo.id) === currentSpace);
  }, [todos, currentSpace, todoSpaces]);

  // Undo/Redo helper functions
  const addUndoAction = useCallback((action: UndoAction) => {
    setUndoHistory(prev => {
      const newHistory = [...prev, action];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift(); // Remove oldest action
      }
      return newHistory;
    });
    // Clear redo history when new action is performed
    setRedoHistory([]);
  }, []);

  const performUndo = useCallback(async () => {
    if (undoHistory.length === 0) return;
    
    const lastAction = undoHistory[undoHistory.length - 1];
    
    try {
      if (lastAction.type === 'create') {
        // Undo create: delete the todo
        const response = await fetch(`${API_BASE_URL}${lastAction.todo.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setTodos(prev => prev.filter(t => t.id !== lastAction.todo.id));
        }
      } else if (lastAction.type === 'delete') {
        // Undo delete: recreate the todo
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: lastAction.todo.title,
            description: lastAction.todo.description,
            completed: lastAction.todo.completed,
            position_x: lastAction.todo.position.x,
            position_y: lastAction.todo.position.y
          }),
        });
        if (response.ok) {
          const newTodo = await response.json();
          setTodos(prev => [...prev, {
            ...newTodo,
            position: lastAction.todo.position,
            zIndex: highestZIndex + 1
          }]);
          setHighestZIndex(prev => prev + 1);
        }
      } else if (lastAction.type === 'toggle') {
        // Undo toggle: restore previous completion state
        const newCompleted = lastAction.previousState!;
        const response = await fetch(`${API_BASE_URL}${lastAction.todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: newCompleted }),
        });
        if (response.ok) {
          setTodos(prev => prev.map(t => 
            t.id === lastAction.todo.id ? { ...t, completed: newCompleted } : t
          ));
        }
      }
      
      // Move action to redo history
      setRedoHistory(prev => [...prev, lastAction]);
      setUndoHistory(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }, [undoHistory, highestZIndex]);

  const performRedo = useCallback(async () => {
    if (redoHistory.length === 0) return;
    
    const lastRedoAction = redoHistory[redoHistory.length - 1];
    
    try {
      if (lastRedoAction.type === 'create') {
        // Redo create: recreate the todo
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: lastRedoAction.todo.title,
            description: lastRedoAction.todo.description,
            completed: lastRedoAction.todo.completed,
            position_x: lastRedoAction.todo.position.x,
            position_y: lastRedoAction.todo.position.y
          }),
        });
        if (response.ok) {
          const newTodo = await response.json();
          setTodos(prev => [...prev, {
            ...newTodo,
            position: lastRedoAction.todo.position,
            zIndex: highestZIndex + 1
          }]);
          setHighestZIndex(prev => prev + 1);
        }
      } else if (lastRedoAction.type === 'delete') {
        // Redo delete: delete the todo again
        const response = await fetch(`${API_BASE_URL}${lastRedoAction.todo.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setTodos(prev => prev.filter(t => t.id !== lastRedoAction.todo.id));
        }
      } else if (lastRedoAction.type === 'toggle') {
        // Redo toggle: toggle to the new state
        const newCompleted = !lastRedoAction.previousState!;
        const response = await fetch(`${API_BASE_URL}${lastRedoAction.todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: newCompleted }),
        });
        if (response.ok) {
          setTodos(prev => prev.map(t => 
            t.id === lastRedoAction.todo.id ? { ...t, completed: newCompleted } : t
          ));
        }
      }
      
      // Move action back to undo history
      setUndoHistory(prev => [...prev, lastRedoAction]);
      setRedoHistory(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Redo failed:', error);
    }
  }, [redoHistory, highestZIndex]);

  // Calculate dynamic todo dimensions based on window size (memoized)
  const getTodoDimensions = useCallback(() => {
    const width = Math.max(200, Math.min(350, windowSize.width * 0.25));
    const height = Math.max(100, Math.min(200, windowSize.height * 0.15));
    return { width, height };
  }, [windowSize.width, windowSize.height]);

  // Generate test todos for debugging
  const generateTestTodos = useCallback(async () => {
    const testTodos = [
      { title: "Buy groceries", description: "Milk, eggs, bread, and coffee" },
      { title: "Walk the dog", description: "30 minute walk around the neighborhood" },
      { title: "Finish presentation", description: "Complete slides for Monday meeting" },
      { title: "Call dentist", description: "Schedule cleaning appointment" },
      { title: "Read a book", description: "Continue reading 'The Great Gatsby'" },
      { title: "Exercise", description: "45 minutes cardio and strength training" },
      { title: "Plan vacation", description: "Research destinations for summer trip" },
      { title: "Fix sink", description: "Replace leaky faucet in kitchen" },
      { title: "Learn TypeScript", description: "Complete online course modules" },
      { title: "Write journal", description: "Daily reflection and gratitude notes" }
    ];

    const dimensions = getTodoDimensions();
    
    try {
      for (const todo of testTodos) {
        const position = {
          x: Math.random() * (windowSize.width - dimensions.width),
          y: Math.random() * (windowSize.height - dimensions.height)
        };

        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: todo.title,
            description: todo.description,
            completed: Math.random() > 0.7, // 30% chance of being completed
            position_x: position.x,
            position_y: position.y,
          }),
        });

        if (response.ok) {
          const newTodo = await response.json();
          const newFloatingTodo: FloatingTodo = {
            ...newTodo,
            position: position,
            zIndex: highestZIndex + 1
          };
          
          setHighestZIndex(prev => prev + 1);
          setTodos(prev => [...prev, newFloatingTodo]);
          
          // Add small delay between creations for visual effect
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Failed to generate test todos:', error);
    }
  }, [getTodoDimensions, windowSize, highestZIndex]);

  // Calculate repulsion force between two todos
  const calculateRepulsionBetweenTodos = useCallback((
    todo1: FloatingTodo,
    todo2: FloatingTodo,
    dimensions: { width: number; height: number },
    isDraggingMode: boolean = false
  ): { x: number; y: number } => {
    // Calculate centers of both todos
    const center1 = {
      x: todo1.position.x + dimensions.width / 2,
      y: todo1.position.y + dimensions.height / 2
    };
    const center2 = {
      x: todo2.position.x + dimensions.width / 2,
      y: todo2.position.y + dimensions.height / 2
    };
    
    // Vector from todo2 to todo1
    const deltaX = center1.x - center2.x;
    const deltaY = center1.y - center2.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Choose force and radius based on drag mode
    const force = isDraggingMode ? DRAG_REPULSION_FORCE : GENTLE_REPULSION_FORCE;
    const radius = isDraggingMode ? DRAG_REPULSION_RADIUS : GENTLE_REPULSION_RADIUS;
    
    // No repulsion if outside radius or too close
    if (distance > radius || distance < 1) {
      return { x: 0, y: 0 };
    }
    
    // Normalize direction vector
    const normalizedX = deltaX / distance;
    const normalizedY = deltaY / distance;
    
    // Calculate force strength (inverse square with falloff)
    const falloff = 1 - (distance / radius);
    const forceStrength = force * falloff * falloff;
    
    return {
      x: normalizedX * forceStrength,
      y: normalizedY * forceStrength
    };
  }, []);

  // Apply repulsion forces to all todos
  const applyRepulsionForces = useCallback(() => {
    const dimensions = getTodoDimensions();
    const dragMode = isDragging;
    
    setTodos(prevTodos => {
      if (prevTodos.length < 2) return prevTodos; // No repulsion needed for single todo
      
      const newTodos = [...prevTodos];
      
      // Calculate repulsion forces for each todo
      for (let i = 0; i < newTodos.length; i++) {
        let totalForceX = 0;
        let totalForceY = 0;
        
        // Calculate repulsion from all other todos
        for (let j = 0; j < newTodos.length; j++) {
          if (i === j) continue;
          
          const force = calculateRepulsionBetweenTodos(
            newTodos[i],
            newTodos[j],
            dimensions,
            dragMode
          );
          
          totalForceX += force.x;
          totalForceY += force.y;
        }
        
        // Apply the force with smoothing
        if (totalForceX !== 0 || totalForceY !== 0) {
          const currentPos = newTodos[i].position;
          const newX = currentPos.x + (totalForceX * REPULSION_SMOOTHING);
          const newY = currentPos.y + (totalForceY * REPULSION_SMOOTHING);
          
          // Keep within screen bounds
          const boundedX = Math.max(0, Math.min(windowSize.width - dimensions.width, newX));
          const boundedY = Math.max(0, Math.min(windowSize.height - dimensions.height, newY));
          
          newTodos[i] = {
            ...newTodos[i],
            position: { x: boundedX, y: boundedY }
          };
        }
      }
      
      return newTodos;
    });
  }, [getTodoDimensions, isDragging, calculateRepulsionBetweenTodos, windowSize]);

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

    // If this todo is lassoed, toggle all lassoed todos
    if (lassoedTodos.has(id)) {
      const todosToToggle = todos.filter(t => t.id && lassoedTodos.has(t.id));
      
      try {
        // Toggle all lassoed todos
        await Promise.all(todosToToggle.map(async (todoToToggle) => {
          const previousCompleted = todoToToggle.completed;
          
          const response = await fetch(`${API_BASE_URL}${todoToToggle.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...todoToToggle,
              completed: !todoToToggle.completed,
              position_x: todoToToggle.position.x,
              position_y: todoToToggle.position.y,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const updatedTodo = await response.json();
          
          // Update state for this todo
          setTodos(prev => prev.map(t => t.id === todoToToggle.id ? {
            ...updatedTodo,
            position: t.position, // Keep original position
            zIndex: t.zIndex      // Keep original zIndex
          } : t));

          // Add undo action for toggle
          addUndoAction({
            type: 'toggle',
            todo: { ...todoToToggle },
            previousState: previousCompleted
          });
        }));
        
        // Clear lasso selection after toggling
        clearLassoSelection();
      } catch (error) {
        console.error('Failed to toggle lassoed todos:', error);
      }
    } else {
      // Toggle single todo
      const previousCompleted = todo.completed;

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

        // Add undo action for toggle
        addUndoAction({
          type: 'toggle',
          todo: { ...todo },
          previousState: previousCompleted
        });
      } catch (error) {
        console.error('Failed to toggle todo:', error);
      } finally {
        // Clear updating state
        setUpdatingTodoId(null);
      }
    }
  }, [todos, addUndoAction, lassoedTodos, clearLassoSelection]);

  // Apply momentum to a todo
  const applyMomentum = useCallback((todoId: number, velocity: { x: number; y: number }) => {
    if (!todoId) return;
    
    // Cancel any existing momentum animation for this todo
    setTodoMomentum(prev => {
      const current = prev.get(todoId);
      if (current?.animationId) {
        cancelAnimationFrame(current.animationId);
      }
      return prev;
    });
    
    // Apply momentum scaling and ensure minimum threshold
    const scaledVx = velocity.x * MOMENTUM_SCALE;
    const scaledVy = velocity.y * MOMENTUM_SCALE;
    const speed = Math.sqrt(scaledVx * scaledVx + scaledVy * scaledVy);
    
    if (speed < MOMENTUM_MIN_SPEED) return; // Too slow, no momentum
    
    let currentVx = scaledVx;
    let currentVy = scaledVy;
    
    const animate = () => {
      // Apply friction
      currentVx *= MOMENTUM_FRICTION;
      currentVy *= MOMENTUM_FRICTION;
      
      const currentSpeed = Math.sqrt(currentVx * currentVx + currentVy * currentVy);
      
      // Stop if too slow
      if (currentSpeed < MOMENTUM_MIN_SPEED) {
        setTodoMomentum(prev => {
          const newMap = new Map(prev);
          newMap.delete(todoId);
          return newMap;
        });
        return;
      }
      
      // Update todo position
      setTodos(prevTodos => {
        return prevTodos.map(todo => {
          if (todo.id === todoId) {
            const dimensions = getTodoDimensions();
            const newX = Math.max(0, Math.min(windowSize.width - dimensions.width, todo.position.x + currentVx));
            const newY = Math.max(0, Math.min(windowSize.height - dimensions.height, todo.position.y + currentVy));
            
            return {
              ...todo,
              position: { x: newX, y: newY }
            };
          }
          return todo;
        });
      });
      
      // Continue animation
      const animationId = requestAnimationFrame(animate);
      setTodoMomentum(prev => {
        const newMap = new Map(prev);
        newMap.set(todoId, { vx: currentVx, vy: currentVy, animationId });
        return newMap;
      });
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    setTodoMomentum(prev => {
      const newMap = new Map(prev);
      newMap.set(todoId, { vx: currentVx, vy: currentVy, animationId });
      return newMap;
    });
  }, [getTodoDimensions, windowSize]);

  // Dragging functionality
  const handleMouseDown = useCallback((event: React.MouseEvent, todo: FloatingTodo) => {
    if (!todo.id) return;
    
    // Clear lasso selection when clicking on a todo (unless it's part of the lasso and we're not shift-clicking)
    if (!lassoedTodos.has(todo.id) || !event.shiftKey) {
      if (lassoedTodos.size > 0 && !lassoedTodos.has(todo.id)) {
        clearLassoSelection();
      }
    }
    
    // Initialize mouse tracking for momentum
    lastMouseTime.current = Date.now();
    lastMousePos.current = { x: event.clientX, y: event.clientY };
    mouseVelocity.current = { x: 0, y: 0 };
    
    // Cancel any existing momentum for this todo
    setTodoMomentum(prev => {
      const current = prev.get(todo.id!);
      if (current?.animationId) {
        cancelAnimationFrame(current.animationId);
      }
      const newMap = new Map(prev);
      newMap.delete(todo.id!);
      return newMap;
    });
    
    // Calculate offset based on current todo position and mouse position
    setDragOffset({
      x: event.clientX - todo.position.x,
      y: event.clientY - todo.position.y
    });
    setSelectedTodoId(todo.id);
    setIsDragging(true);

    // Store initial positions for group dragging
    if (lassoedTodos.has(todo.id)) {
      const initialPositions = new Map<number, { x: number; y: number }>();
      todos.forEach(t => {
        if (t.id && lassoedTodos.has(t.id)) {
          initialPositions.set(t.id, { x: t.position.x, y: t.position.y });
        }
      });
      setInitialDragPositions(initialPositions);
    } else {
      setInitialDragPositions(new Map());
    }
    
    // Bring to front
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setTodos(prev => prev.map(t => 
      t.id === todo.id ? { ...t, zIndex: newZIndex } : t
    ));
    
    event.preventDefault();
  }, [highestZIndex, lassoedTodos, clearLassoSelection, todos]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isLassoing) {
      // Update lasso path
      const newPoint = { x: event.clientX, y: event.clientY };
      setLassoPath(prev => [...prev, newPoint]);
      
      // Check which todos are inside the lasso using the complete path including current point
      const completePath = [...lassoPath, newPoint];
      const newLassoedTodos = new Set<number>();
      
      // Add existing lassoed todos if shift is held
      if (isShiftPressed) {
        lassoedTodos.forEach(id => newLassoedTodos.add(id));
      }
      
      todos.forEach(todo => {
        if (todo.id) {
          const points = getTodoBoundingPoints(todo);
          if (points.some(pt => pointInPolygon(pt, completePath))) {
            newLassoedTodos.add(todo.id);
          }
        }
      });
      
      setLassoedTodos(newLassoedTodos);
      return;
    }
    
    if (!isDragging || !selectedTodoId) return;
    
    // Calculate velocity for momentum
    const currentTime = Date.now();
    const deltaTime = currentTime - lastMouseTime.current;
    
    if (deltaTime > 0) {
      const deltaX = event.clientX - lastMousePos.current.x;
      const deltaY = event.clientY - lastMousePos.current.y;
      
      const currentVelocity = {
        x: deltaX / deltaTime * 16.67, // Convert to pixels per frame (60fps)
        y: deltaY / deltaTime * 16.67
      };
      
      // Smooth velocity calculation
      mouseVelocity.current = {
        x: mouseVelocity.current.x * VELOCITY_SMOOTHING + currentVelocity.x * (1 - VELOCITY_SMOOTHING),
        y: mouseVelocity.current.y * VELOCITY_SMOOTHING + currentVelocity.y * (1 - VELOCITY_SMOOTHING)
      };
    }
    
    lastMouseTime.current = currentTime;
    lastMousePos.current = { x: event.clientX, y: event.clientY };
    
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

    // If this todo is lassoed, move all lassoed todos together
    if (lassoedTodos.has(selectedTodoId) && initialDragPositions.size > 0) {
      const selectedInitialPos = initialDragPositions.get(selectedTodoId);
      if (selectedInitialPos) {
        // Calculate delta from the selected todo's initial position
        const deltaX = boundedPosition.x - selectedInitialPos.x;
        const deltaY = boundedPosition.y - selectedInitialPos.y;
        
        setTodos(prev => prev.map(todo => {
          if (todo.id && lassoedTodos.has(todo.id)) {
            const initialPos = initialDragPositions.get(todo.id);
            if (initialPos) {
              const newPos = {
                x: Math.max(0, Math.min(currentWindowWidth - dimensions.width, initialPos.x + deltaX)),
                y: Math.max(0, Math.min(currentWindowHeight - dimensions.height, initialPos.y + deltaY))
              };
              return { ...todo, position: newPos };
            }
          }
          return todo;
        }));
      }
    } else {
      setTodos(prev => prev.map(todo => 
        todo.id === selectedTodoId 
          ? { ...todo, position: boundedPosition }
          : todo
      ));
    }
  }, [isDragging, selectedTodoId, dragOffset, getTodoDimensions, isLassoing, lassoPath, setLassoPath, todos, getTodoCenter, pointInPolygon, lassoedTodos, isShiftPressed, initialDragPositions]);

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

  const handleMouseUp = useCallback(() => {
    // Complete lasso selection
    if (isLassoing) {
      setIsLassoing(false);
      setLassoPath([]);
      return;
    }
    
    // Save position to backend if we were dragging
    if (isDragging && selectedTodoId) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo) {
        // If dragging a lassoed todo, update positions for all lassoed todos
        if (lassoedTodos.has(selectedTodoId)) {
          lassoedTodos.forEach(todoId => {
            const lassoedTodo = todos.find(t => t.id === todoId);
            if (lassoedTodo) {
              updateTodoPosition(todoId, lassoedTodo.position);
            }
          });
        } else {
          updateTodoPosition(selectedTodoId, todo.position);
        }
        
        // Apply momentum based on mouse velocity
        const speed = Math.sqrt(mouseVelocity.current.x ** 2 + mouseVelocity.current.y ** 2);
        if (speed > MOMENTUM_MIN_SPEED) {
          applyMomentum(selectedTodoId, mouseVelocity.current);
        }
      }
    }
    
    // Reset dragging state and velocity
    setIsDragging(false);
    setSelectedTodoId(null);
    setInitialDragPositions(new Map());
    mouseVelocity.current = { x: 0, y: 0 };
  }, [isDragging, selectedTodoId, todos, applyMomentum, isLassoing, lassoedTodos, updateTodoPosition]);

  const handleDoubleClick = useCallback(async (todo: FloatingTodo) => {
    if (!todo.id) return;
    
    // If this todo is lassoed, delete all lassoed todos
    if (lassoedTodos.has(todo.id)) {
      const todosToDelete = todos.filter(t => t.id && lassoedTodos.has(t.id));
      
      try {
        // Delete all lassoed todos
        await Promise.all(todosToDelete.map(async (todoToDelete) => {
          const response = await fetch(`${API_BASE_URL}${todoToDelete.id}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }));

        // Remove from state
        setTodos(prev => prev.filter(t => !t.id || !lassoedTodos.has(t.id)));
        
        // Add undo actions for all deleted todos
        todosToDelete.forEach(deletedTodo => {
          addUndoAction({
            type: 'delete',
            todo: { ...deletedTodo }
          });
        });
        
        // Clear lasso selection
        clearLassoSelection();
      } catch (error) {
        console.error('Failed to delete lassoed todos:', error);
      }
    } else {
      // Delete single todo
      try {
        const response = await fetch(`${API_BASE_URL}${todo.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setTodos(todos.filter(t => t.id !== todo.id));
        
        // Add undo action for delete
        addUndoAction({
          type: 'delete',
          todo: { ...todo }
        });
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    }
  }, [todos, addUndoAction, lassoedTodos, clearLassoSelection]);

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
      
      // Cmd+Z for undo
      if (event.key.toLowerCase() === 'z' && 
          (event.metaKey || event.ctrlKey) && 
          !event.shiftKey &&
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        performUndo();
      }
      
      // Cmd+Shift+Z for redo
      if (event.key.toLowerCase() === 'z' && 
          (event.metaKey || event.ctrlKey) && 
          event.shiftKey &&
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        performRedo();
      }
      
      // T key to generate test todos (only in debug mode)
      if (event.key.toLowerCase() === 't' && 
          showDebugMode &&
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        generateTestTodos();
      }
      
      // ESC key to close modal or clear lasso selection
      if (event.key === 'Escape') {
        if (showModal) {
          const target = event.target as HTMLElement;
          const isModalInput = target.matches('.modal-input-minimal, .modal-textarea-minimal');
          if (!isModalInput) {
            closeModal();
          }
        } else if (lassoedTodos.size > 0) {
          // Clear lasso selection if ESC is pressed
          clearLassoSelection();
        }
      }
      
      // Track shift key state for lasso functionality
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Only track mouse when modal is not open and not dragging
      if (!showModal && !isDragging) {
        lastMousePos.current = { x: event.clientX, y: event.clientY };
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Track shift key release for lasso functionality
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showModal, showSearch, todos, isDragging, hoveredTodoId, toggleTodo, handleDoubleClick, performUndo, performRedo, showDebugMode, generateTestTodos, clearLassoSelection, lassoedTodos]);

  // Lasso mouse event listeners
  useEffect(() => {
    if (isLassoing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isLassoing, handleMouseMove, handleMouseUp]);

  // Continuous repulsion animation loop
  useEffect(() => {
    if (todos.length < 2) return; // No need for repulsion with less than 2 todos
    
    const animate = () => {
      applyRepulsionForces();
      repulsionAnimationFrame.current = requestAnimationFrame(animate);
    };
    
    repulsionAnimationFrame.current = requestAnimationFrame(animate);
    
    return () => {
      if (repulsionAnimationFrame.current) {
        cancelAnimationFrame(repulsionAnimationFrame.current);
      }
    };
  }, [todos.length, applyRepulsionForces]);

  const openModal = useCallback(() => {
    // Use last known mouse position
    const position = {
      x: lastMousePos.current.x,
      y: lastMousePos.current.y
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
      
      // Automatically assign the new todo to the current space (if not "all")
      if (currentSpace !== 'all' && newTodo.id) {
        assignTodoToSpace(newTodo.id, currentSpace);
      }
      
      // Add undo action for create
      addUndoAction({
        type: 'create',
        todo: newFloatingTodo
      });
      
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
  }, [modalTitle, modalDescription, modalPosition, windowSize, getTodoDimensions, highestZIndex, addUndoAction, currentSpace, assignTodoToSpace]);

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

  // Search functionality
  const openSearch = useCallback(() => {
    setShowSearch(true);
    setSearchQuery('');
    setSearchSelectedTodos(new Set());
    setHighlightedTodos(new Set());
    // Focus the search input after a brief delay for animation
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchClosing(true);
    // Wait for animation to complete before hiding search
    setTimeout(() => {
      setShowSearch(false);
      setSearchClosing(false);
      setSearchQuery('');
      setSearchSelectedTodos(new Set());
    }, 100);
  }, []);

  // Calculate dynamic todo dimensions based on window size (memoized)
  const todoDimensions = useMemo(() => getTodoDimensions(), [getTodoDimensions]);

  // Memoize sorted todos for consistent z-index rendering and space filtering
  const sortedTodos = useMemo(() => {
    let filteredBySpace = todos;
    
    // Filter by current space if not "all"
    if (currentSpace !== 'all') {
      filteredBySpace = todos.filter(todo => 
        todo.id && todoSpaces.get(todo.id) === currentSpace
      );
    }
    
    return [...filteredBySpace].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [todos, currentSpace, todoSpaces]);

  // Calculate filtered todos based on search query
  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return todos.filter(todo => {
      const titleMatch = todo.title.toLowerCase().includes(query);
      const descriptionMatch = todo.description?.toLowerCase().includes(query);
      return titleMatch || descriptionMatch;
    });
  }, [todos, searchQuery]);

  // Calculate search grid positions for filtered todos
  const searchGridPositions = useMemo(() => {
    if (!filteredTodos.length) return new Map();
    
    const positions = new Map<number, { x: number; y: number }>();
    const dimensions = getTodoDimensions();
    const padding = 20;
    const startY = 120; // Below search bar
    const gridCols = Math.floor((windowSize.width - padding * 2) / (dimensions.width + padding));
    
    filteredTodos.forEach((todo, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      const x = padding + col * (dimensions.width + padding);
      const y = startY + row * (dimensions.height + padding);
      
      if (todo.id) {
        positions.set(todo.id, { x, y });
      }
    });
    
    return positions;
  }, [filteredTodos, getTodoDimensions, windowSize]);

  const handleSearchSubmit = useCallback(() => {
    if (searchSelectedTodos.size === 0) {
      // No selection: select all filtered todos
      const allFilteredIds = new Set(filteredTodos.map(todo => todo.id).filter(id => id !== undefined) as number[]);
      setSearchSelectedTodos(allFilteredIds);
    } else if (searchSelectedTodos.size === filteredTodos.length) {
      // All selected: highlight them and close search
      setHighlightedTodos(new Set(searchSelectedTodos));
      closeSearch();
    } else {
      // Some selected: highlight selected ones and close search
      setHighlightedTodos(new Set(searchSelectedTodos));
      closeSearch();
    }
  }, [searchSelectedTodos, filteredTodos, closeSearch]);

  const toggleSearchTodoSelection = useCallback((todoId: number) => {
    setSearchSelectedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  }, []);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleSearchSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeSearch();
    }
  }, [handleSearchSubmit, closeSearch]);

  // Keyboard event handling (after all functions are defined)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Spacebar to open search
      if (event.key === ' ' && 
          !showModal && !showSearch &&
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        openSearch();
      }
      
      // ESC key to close search
      if (event.key === 'Escape' && showSearch) {
        const target = event.target as HTMLElement;
        const isSearchInput = target.matches('.search-input');
        if (!isSearchInput || searchQuery.trim() === '') {
          closeSearch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showModal, showSearch, searchQuery, openSearch, closeSearch]);

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Lasso functionality
  const handleBackgroundMouseDown = useCallback((event: React.MouseEvent) => {
    // Only start lasso on right-click (button 2) and not on todos
    if (event.button !== 2) return; // Only right mouse button
    if (showModal || showSearch) return;
    if ((event.target as HTMLElement).closest('.floating-todo')) return;
    
    // Clear any existing lasso selection unless shift is held
    if (!event.shiftKey) {
      clearLassoSelection();
    }
    
    setIsLassoing(true);
    setLassoPath([{ x: event.clientX, y: event.clientY }]);
    
    event.preventDefault();
  }, [showModal, showSearch, clearLassoSelection]);

  if (loading) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <div 
      className="app"
      onMouseDown={handleBackgroundMouseDown}
      onContextMenu={(e) => {
        // Prevent default context menu when right-clicking for lasso
        if (!showModal && !showSearch) {
          e.preventDefault();
        }
      }}
      style={{ position: 'relative' }}
    >
      <div className="ambient-water-effect"></div>
      
      {/* Spaces tabs */}
      <div className="spaces-container">
        {spaces.map(space => (
          <div
            key={space.id}
            className={`space-tab ${currentSpace === space.id ? 'active' : ''}`}
            style={{
              background: currentSpace === space.id ? space.gradient : 'rgba(255, 255, 255, 0.1)',
              borderColor: space.color,
            }}
            onClick={() => setCurrentSpace(space.id)}
          >
            <span className="space-name">{space.name}</span>
            <span className="space-count">
              {space.id === 'all' 
                ? todos.length 
                : todos.filter(todo => todo.id && todoSpaces.get(todo.id) === space.id).length
              }
            </span>
          </div>
        ))}
      </div>

      {/* Debug info */}
      {showDebugMode && (
        <div className="debug-info">
          <div>Window: {windowSize.width}x{windowSize.height}</div>
          <div>Todo size: {todoDimensions.width}x{todoDimensions.height}</div>
          <div>Todos: {todos.length}</div>
          <div>Press D to toggle debug</div>
          <div>Right-click + drag for lasso selection</div>
        </div>
      )}
      
      {/* Floating Todos */}
      {sortedTodos.map(todo => {
        const isHighlighted = highlightedTodos.has(todo.id || 0);
        const isLassoed = lassoedTodos.has(todo.id || 0);
        const shouldShowInSearch = showSearch && searchQuery.trim() && filteredTodos.some(ft => ft.id === todo.id);
        
        return (
          <div
            key={todo.id}
            className={`floating-todo ${todo.completed ? 'completed' : ''} ${selectedTodoId === todo.id ? 'dragging' : ''} ${updatingTodoId === todo.id ? 'updating' : ''} ${isHighlighted ? 'highlighted' : ''} ${isLassoed ? 'lassoed' : ''} ${showSearch && !shouldShowInSearch ? 'search-hidden' : ''}`}
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
            onClick={() => {
              // Clear highlights when clicking a todo outside of search
              if (!showSearch && highlightedTodos.size > 0) {
                setHighlightedTodos(new Set());
              }
              // Handle lasso selection with shift-click
              if (todo.id && isShiftPressed) {
                setLassoedTodos(prev => {
                  const newLassoed = new Set(prev);
                  if (newLassoed.has(todo.id!)) {
                    newLassoed.delete(todo.id!); // un-highlight if already selected
                  } else {
                    newLassoed.add(todo.id!); // add if not selected
                  }
                  return newLassoed;
                });
                return;
              }
              // Clear lasso selection if clicking a non-lassoed todo without shift
              if (lassoedTodos.size > 0 && (!todo.id || !lassoedTodos.has(todo.id))) {
                clearLassoSelection();
              }
            }}
          >
            <div className="floating-todo-content">
              <div className="floating-todo-title">{todo.title}</div>
              {todo.description && (
                <div className="floating-todo-description">{todo.description}</div>
              )}
              
              {/* Space indicator and selector */}
              <div className="todo-space-indicator">
                <div 
                  className="current-space-dot"
                  style={{ 
                    backgroundColor: spaces.find(s => s.id === (todoSpaces.get(todo.id!) || 'all'))?.color || '#4a90e2' 
                  }}
                ></div>
                
                {/* Space selector dropdown (shows on hover) */}
                <div className="space-selector">
                  {spaces.map(space => (
                    <div
                      key={space.id}
                      className={`space-option ${(todoSpaces.get(todo.id!) || 'all') === space.id ? 'selected' : ''}`}
                      style={{ 
                        background: space.gradient,
                        borderColor: space.color 
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (todo.id) {
                          assignTodoToSpace(todo.id, space.id);
                        }
                      }}
                    >
                      {space.name}
                    </div>
                  ))}
                </div>
              </div>
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
            <div className="empty-state-hint">Press X to complete • Double-click to delete • Spacebar to search • Press D for debug</div>
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

      {/* Search bar */}
      {showSearch && (
        <div className={`search-bar ${searchClosing ? 'closing' : ''}`}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search todos..."
            className="search-input"
            onKeyDown={handleSearchKeyDown}
          />
          <button onClick={closeSearch} className="search-close-button">✕</button>
        </div>
      )}

      {/* Search results grid */}
      {showSearch && filteredTodos.length > 0 && (
        <div className="search-results-grid">
          {filteredTodos.map(todo => {
            const isSelected = searchSelectedTodos.has(todo.id || 0);
            const position = searchGridPositions.get(todo.id || 0);
            
            return (
              <div
                key={todo.id}
                className={`search-result-item ${isSelected ? 'selected' : ''}`}
                style={{
                  left: position?.x,
                  top: position?.y,
                  width: todoDimensions.width,
                  height: todoDimensions.height,
                  zIndex: 1000
                }}
                onClick={() => toggleSearchTodoSelection(todo.id || 0)}
              >
                <div className="search-result-content">
                  <div className="search-result-title">{todo.title}</div>
                  {todo.description && (
                    <div className="search-result-description">{todo.description}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lasso selection visual */}
      {isLassoing && lassoPath.length > 1 && (
        <svg 
          className="lasso-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <path
            d={`M ${lassoPath.map(point => `${point.x},${point.y}`).join(' L ')}`}
            fill="rgba(74, 144, 226, 0.1)"
            stroke="rgba(74, 144, 226, 0.6)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </svg>
      )}
    </div>
  );
}

export default App;
