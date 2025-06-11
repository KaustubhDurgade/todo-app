import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface Todo {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
}

const API_BASE_URL = 'http://localhost:5001/todos/';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'title' | 'description'>('title');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // Track last known mouse position
  const lastMousePosition = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const fetchTodos = async () => {
    try {
      console.log('Fetching todos from:', API_BASE_URL);
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched todos:', data);
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const response = await fetch(`${API_BASE_URL}${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...todo,
          completed: !todo.completed,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTodo = await response.json();
      setTodos(todos.map(t => t.id === id ? updatedTodo : t));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  // Add keyboard event listener for 'N' key and track mouse position
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if not typing in an input field and modal is not already open
      if (event.key.toLowerCase() === 'n' && 
          !showModal && 
          !(event.target as HTMLElement).matches('input, textarea')) {
        event.preventDefault();
        openModal();
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
      // Only track mouse when modal is not open
      if (!showModal) {
        lastMousePosition.current = { x: event.clientX, y: event.clientY };
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showModal]);

  const openModal = () => {
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
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep('title');
    setModalTitle('');
    setModalDescription('');
  };

  const handleModalNext = () => {
    if (modalStep === 'title' && modalTitle.trim()) {
      setModalStep('description');
    }
  };

  const handleModalSubmit = async () => {
    if (!modalTitle.trim()) return;

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: modalTitle,
          description: modalDescription,
          completed: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      
      setShowModal(false);
      setModalStep('title');
      setModalTitle('');
      setModalDescription('');
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleModalKeyDown = (event: React.KeyboardEvent, inputType: 'title' | 'description') => {
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
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  if (loading) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <div className="app">
      <div className="ambient-water-effect"></div>
      <div className="container">
        <div className="todos">
          {todos.length === 0 ? (
            <p className="empty-state">Press N to add a todo</p>
          ) : (
            todos.map(todo => (
              <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <div className="todo-content">
                  <span className="todo-title">{todo.title}</span>
                </div>
                <div className="todo-actions">
                  <button 
                    onClick={() => todo.id && toggleTodo(todo.id)}
                    className="toggle-btn"
                    title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {todo.completed ? '↶' : '✓'}
                  </button>
                  <button
                    onClick={() => todo.id && deleteTodo(todo.id)}
                    className="delete-btn"
                    title="Delete todo"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div 
            className="modal-energy-ring modal-energy-ring-1"
            style={{
              left: modalPosition.x - 100,
              top: modalPosition.y - 100
            }}
          />
          <div 
            className="modal-energy-ring modal-energy-ring-2"
            style={{
              left: modalPosition.x - 150,
              top: modalPosition.y - 150
            }}
          />
          <div 
            className="modal-energy-ring modal-energy-ring-3"
            style={{
              left: modalPosition.x - 200,
              top: modalPosition.y - 200
            }}
          />
          <div 
            className="modal-overlay-minimal"
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
              className="modal-content-minimal" 
              style={{
                left: Math.min(Math.max(modalPosition.x - 160, 10), window.innerWidth - 330),
                top: Math.min(Math.max(modalPosition.y - 28, 10), window.innerHeight - 66)
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
