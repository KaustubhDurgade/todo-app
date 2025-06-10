import React, { useState, useEffect } from 'react';
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
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

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

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          completed: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTitle('');
      setNewDescription('');
    } catch (error) {
      console.error('Failed to add todo:', error);
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

  useEffect(() => {
    fetchTodos();
  }, []);

  if (loading) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <div className="app">
      <div className="container">
        <h1>Simple Todo App</h1>
        
        <form onSubmit={addTodo} className="add-form">
          <div className="form-group">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Todo title"
              required
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
          <button type="submit">Add Todo</button>
        </form>

        <div className="todos">
          {todos.length === 0 ? (
            <p>No todos yet. Add one above!</p>
          ) : (
            todos.map(todo => (
              <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <div className="todo-content">
                  <h3>{todo.title}</h3>
                  {todo.description && <p>{todo.description}</p>}
                </div>
                <div className="todo-actions">
                  <button 
                    onClick={() => todo.id && toggleTodo(todo.id)}
                    className={todo.completed ? 'uncomplete' : 'complete'}
                  >
                    {todo.completed ? 'Undo' : 'Complete'}
                  </button>
                  <button 
                    onClick={() => todo.id && deleteTodo(todo.id)}
                    className="delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
