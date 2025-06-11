# 🚀 Professional Todo App

A modern, interactive todo application with a Flask backend and React frontend, featuring draggable floating todo boxes and keyboard shortcuts.

## ✨ Features

### 🎮 **Interactive Controls**
- **N Key** - Open quick-add modal at cursor position
- **X Key** - Toggle completion of hovered task
- **Double-Click** - Toggle any task completion
- **Hold Cmd + Move Mouse** - Push nearby tasks away from cursor
- **Click & Drag** - Move tasks around the screen

### 🎨 **Modern UI**
- Floating draggable todo boxes (not traditional lists)
- Clean, barebones design
- Visual hover feedback for keyboard interactions
- Strikethrough styling for completed tasks
- Crosshair cursor during push mode

### 🔧 **Technical Stack**
- **Backend**: Flask + SQLAlchemy + Flask-RESTX (Swagger docs)
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite
- **API**: RESTful with automatic OpenAPI documentation

## 🛠️ Quick Setup

### **Option 1: Automatic Setup (Recommended)**

If you don't have the conda environment set up yet:

```bash
# 1. Run the setup script (creates conda env and installs everything)
./setup.sh

# 2. Launch the app
./launch.sh
```

### **Option 2: Manual Setup**

If you prefer to set things up manually:

```bash
# 1. Create conda environment
conda create -n todo-api python=3.9
conda activate todo-api

# 2. Install backend dependencies
cd backend/flask-todo-api
pip install -r requirements.txt
cd ../..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Launch the app
./launch.sh
```

## 🚀 Running the App

### **Single Command Launch**
```bash
./launch.sh
```

This will:
- Automatically activate the `todo-api` conda environment
- Start the Flask backend on port 5002
- Start the React frontend on port 5173-5175
- Open your browser automatically
- Display all service URLs and keyboard shortcuts

### **Manual Launch**
```bash
# Terminal 1 - Backend
conda activate todo-api
cd backend/flask-todo-api
python -m src.app

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 📚 API Documentation

When the backend is running, you can access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5002
- **Swagger Docs**: http://localhost:5002/swagger/

## 🎯 How to Use

1. **Creating Todos**: Press `N` anywhere to open the quick-add modal at your cursor
2. **Two-step Creation**: Enter title → press Enter → enter description → press Enter
3. **Completion**: 
   - Hover over any task and press `X` to toggle
   - Or double-click any task to toggle
4. **Movement**:
   - Click and drag to move tasks around
   - Hold `Cmd` and move mouse to push nearby tasks away
5. **Deletion**: Click the × button in the top-right corner of any task

## 📁 Project Structure

```
pro-todo/
├── launch.sh              # Main launcher script
├── setup.sh               # Environment setup script
├── backend/
│   └── flask-todo-api/
│       ├── requirements.txt
│       ├── src/
│       │   ├── app.py     # Flask application
│       │   ├── routes/    # API endpoints
│       │   ├── models/    # Database models
│       │   └── database/  # Database connection
│       └── tests/         # Backend tests
└── frontend/
    ├── package.json
    ├── src/
    │   ├── App.tsx        # Main React component
    │   ├── App.css        # Styling
    │   └── services/      # API service layer
    └── public/
```

## 🔧 Development

### **Backend Development**
```bash
conda activate todo-api
cd backend/flask-todo-api

# Run tests
python -m pytest

# Run with different port
python -m src.app  # Runs on port 5002
```

### **Frontend Development**
```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests (if any)
npm test
```

## 🐛 Troubleshooting

### **"ModuleNotFoundError: No module named 'flask_cors'"**
```bash
conda activate todo-api
pip install flask-cors
```

### **"conda: command not found"**
Install Anaconda or Miniconda first:
- [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
- [Anaconda](https://www.anaconda.com/products/distribution)

### **Port already in use**
The launch script automatically cleans up ports 5002 and 5173-5175. If you still have issues:
```bash
# Kill processes on specific ports
lsof -ti:5002 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### **Frontend won't start**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 🎨 Customization

### **Changing Ports**
Edit the port numbers in:
- `backend/flask-todo-api/src/app.py` (line 55): `app.run(debug=True, port=5002)`
- `frontend/src/services/todoApi.ts`: `baseURL: 'http://localhost:5002'`

### **Push Physics**
Modify push behavior in `frontend/src/App.tsx`:
```typescript
const pushRadius = 100; // Distance within which todos get pushed
const pushForce = 15;   // How much to push them
```

### **Styling**
Customize appearance in `frontend/src/App.css`:
- Todo box styling: `.todo-item`
- Hover effects: `.todo-item.hovered`
- Completed tasks: `.todo-item.completed`

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy organizing!** 📝✨
