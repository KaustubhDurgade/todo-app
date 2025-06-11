#!/bin/bash

# Professional Todo App Launcher
# Starts both Flask backend and React frontend

echo "🚀 Professional Todo App Launcher"
echo "=================================="

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "[INFO] Shutting down servers..."
    
    # Kill Flask backend (port 5001)
    if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
        echo "[INFO] Stopping Flask backend..."
        kill $(lsof -t -i:5001) 2>/dev/null || true
    fi
    
    # Kill React frontend (port 5173)
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
        echo "[INFO] Stopping React frontend..."
        kill $(lsof -t -i:5173) 2>/dev/null || true
    fi
    
    echo "[SUCCESS] All servers stopped. Goodbye! 👋"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Change to project directory
cd "$(dirname "$0")"

echo "[INFO] Cleaning up any existing processes..."

# Kill any existing processes on our ports
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "[WARNING] Port 5001 is in use, killing existing process..."
    kill $(lsof -t -i:5001) 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "[WARNING] Port 5173 is in use, killing existing process..."
    kill $(lsof -t -i:5173) 2>/dev/null || true
    sleep 2
fi

# Start Flask backend
echo "[INFO] Starting Flask backend server..."
cd backend/flask-todo-api

# Install Python dependencies if needed
if [ -f "requirements.txt" ]; then
    echo "[INFO] Installing/updating Python dependencies..."
    pip install -r requirements.txt --quiet
fi

# Start Flask server in background
echo "[INFO] Launching Flask server on port 5001..."
export FLASK_APP=src/app.py
export FLASK_ENV=development
export FLASK_DEBUG=1

python -m flask run --host=0.0.0.0 --port=5001 &
FLASK_PID=$!

# Wait a moment for Flask to start
sleep 3

# Check if Flask started successfully
if ! lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "[ERROR] Flask backend failed to start!"
    exit 1
fi

echo "[SUCCESS] Flask backend started successfully (PID: $FLASK_PID)"

# Start React frontend
echo "[INFO] Starting React frontend server..."
cd ../../frontend

# Install npm dependencies if needed
if [ -f "package.json" ]; then
    echo "[INFO] Installing/updating npm dependencies..."
    npm install --silent
fi

echo "[INFO] Launching Vite dev server..."
npm run dev &
VITE_PID=$!

# Wait a moment for Vite to start
sleep 3

# Check if Vite started successfully
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "[ERROR] React frontend failed to start!"
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

echo "[SUCCESS] React frontend started successfully on port 5173 (PID: $VITE_PID)"
echo ""
echo "[SUCCESS] 🎉 Todo App is now running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:5001"
echo "📖 API Docs: http://localhost:5001/swagger/ (if available)"
echo ""
echo "💡 Features:"
echo "   • Basic todo list functionality"
echo "   • Add, edit, delete, and toggle todos"
echo "   • Clean starting point for new features"
echo ""
echo "[WARNING] Press Ctrl+C to stop all servers"

# Keep script running and wait for interrupt
wait
