# Professional Todo App

A modern, full-stack todo application with a Flask backend and React frontend. Built as a clean foundation for advanced todo management features.

![Todo App](https://img.shields.io/badge/Status-Active%20Development-green)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+** (with pip)
- **Node.js 18+** (with npm)
- **Git**

### One-Command Launch
```bash
git clone <your-repo-url>
cd pro-todo
./launch.sh
```

The app will automatically:
- Install all dependencies
- Start the Flask backend on `http://localhost:5001`
- Start the React frontend on `http://localhost:5173`
- Open your browser to the app

## 📁 Project Structure

```
pro-todo/
├── launch.sh                 # One-command launcher script
├── backend/                  # Flask REST API
│   └── flask-todo-api/
│       ├── src/
│       │   ├── app.py        # Main Flask application
│       │   ├── models/       # SQLAlchemy models
│       │   ├── routes/       # API endpoints
│       │   ├── schemas/      # Data validation schemas
│       │   └── database/     # Database configuration
│       ├── requirements.txt  # Python dependencies
│       └── todos.db          # SQLite database
└── frontend/                 # React application
    ├── src/
    │   ├── App.tsx          # Main React component
    │   ├── App.css          # Styling
    │   └── main.tsx         # App entry point
    ├── package.json         # Node.js dependencies
    └── vite.config.ts       # Vite configuration
```

## 🛠️ Technology Stack

### Backend
- **Flask 2.0.1** - Web framework
- **Flask-RESTX 0.5.1** - REST API with Swagger documentation
- **SQLAlchemy 1.4.23** - Database ORM
- **SQLite** - Database (file-based, no setup required)
- **Marshmallow 3.14.1** - Data serialization/validation

### Frontend
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 6.3.5** - Build tool and dev server
- **Axios** - HTTP client
- **Modern CSS** - Styling with CSS3 features

## 🔧 Manual Setup

### Backend Setup
```bash
cd backend/flask-todo-api

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_APP=src/app.py
export FLASK_ENV=development
export FLASK_DEBUG=1

# Run the Flask server
python -m flask run --host=0.0.0.0 --port=5001
```

### Frontend Setup
```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

## 📖 API Documentation

The Flask backend provides a REST API with the following endpoints:

### Base URL
```
http://localhost:5001
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| \`GET\` | \`/todos/\` | Get all todos |
| \`POST\` | \`/todos/\` | Create a new todo |
| \`GET\` | \`/todos/{id}\` | Get a specific todo |
| \`PUT\` | \`/todos/{id}\` | Update a todo |
| \`DELETE\` | \`/todos/{id}\` | Delete a todo |

### Todo Data Structure
```json
{
  "id": 1,
  "title": "Example Todo",
  "description": "Optional description",
  "completed": false
}
```

### Example API Calls

**Create a Todo:**
```bash
curl -X POST http://localhost:5001/todos/ \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Learn React", "description": "Build a todo app", "completed": false}'
```

**Get All Todos:**
```bash
curl http://localhost:5001/todos/
```

**Update a Todo:**
```bash
curl -X PUT http://localhost:5001/todos/1 \\
  -H "Content-Type: application/json" \\
  -d '{"completed": true}'
```

## 🎯 Features

### Current Features
- ✅ **Create todos** with title and optional description
- ✅ **View all todos** in a clean list interface
- ✅ **Mark todos as complete/incomplete**
- ✅ **Delete todos**
- ✅ **Persistent storage** with SQLite database
- ✅ **REST API** with full CRUD operations
- ✅ **Responsive design** that works on mobile and desktop
- ✅ **Type safety** with TypeScript
- ✅ **Auto-reload** development servers

### Planned Features
- 🔄 **Advanced UI interactions** (drag & drop, animations)
- 🔄 **Collision detection system**
- 🔄 **Floating todo boxes**
- 🔄 **Keyboard shortcuts**
- 🔄 **Push mechanics**
- 🔄 **Debug visualization tools**

## 🧪 Testing

### Backend Tests
```bash
cd backend/flask-todo-api
python -m pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 🏗️ Development

### Backend Development
The Flask app uses:
- **Auto-reload** - Changes to Python files automatically restart the server
- **Debug mode** - Detailed error messages and debugging tools
- **SQLite** - File-based database that requires no setup

### Frontend Development
The React app uses:
- **Vite HMR** - Hot module replacement for instant updates
- **TypeScript** - Compile-time type checking
- **ESLint** - Code linting and formatting

### Making Changes
1. **Backend changes**: Edit files in \`backend/flask-todo-api/src/\`
2. **Frontend changes**: Edit files in \`frontend/src/\`
3. **Both servers auto-reload** when you save changes

## 🔧 Configuration

### Environment Variables
```bash
# Backend
FLASK_APP=src/app.py
FLASK_ENV=development
FLASK_DEBUG=1

# Frontend (Vite automatically picks up .env files)
VITE_API_BASE_URL=http://localhost:5001
```

### Ports
- **Backend**: \`5001\` (Flask)
- **Frontend**: \`5173\` (Vite)

## 📊 Database

The app uses SQLite with the following schema:

```sql
CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Database file: \`backend/flask-todo-api/todos.db\`

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill processes on ports 5001 and 5173
lsof -ti:5001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Python dependencies issues:**
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r backend/flask-todo-api/requirements.txt
```

**Node.js dependencies issues:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Database issues:**
```bash
# Delete and recreate the database
rm backend/flask-todo-api/todos.db
# The database will be recreated automatically when you start the backend
```

## 📝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: \`git checkout -b feature/your-feature\`
3. **Make your changes**
4. **Test your changes**: Run both backend and frontend tests
5. **Commit your changes**: \`git commit -m "Add your feature"\`
6. **Push to the branch**: \`git push origin feature/your-feature\`
7. **Submit a pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Flask** team for the excellent web framework
- **React** team for the powerful UI library
- **Vite** team for the lightning-fast build tool
- **SQLAlchemy** team for the robust ORM

---

## 🚀 Getting Started Checklist

- [ ] Clone the repository
- [ ] Run \`./launch.sh\`
- [ ] Open \`http://localhost:5173\` in your browser
- [ ] Create your first todo
- [ ] Start building awesome features!

**Happy coding!** 🎉
