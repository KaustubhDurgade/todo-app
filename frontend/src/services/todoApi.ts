// Define types to match backend structure
interface Todo {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  position_x?: number;
  position_y?: number;
}

interface NewTodo {
  title: string;
  description?: string;
  completed?: boolean;
  position_x?: number;
  position_y?: number;
}

const API_BASE_URL = 'http://localhost:5002/todos/';

export const todoApi = {
  async getAllTodos(): Promise<Todo[]> {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async createTodo(todo: NewTodo): Promise<Todo> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(todo),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async updateTodo(id: number, todo: Partial<Todo>): Promise<Todo> {
    const response = await fetch(`${API_BASE_URL}${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(todo),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async deleteTodo(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  },
};

export type { Todo, NewTodo };
