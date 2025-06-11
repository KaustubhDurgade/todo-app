#!/bin/bash

# Professional Todo App Launch Script
# This script starts both the Flask backend and React frontend servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
cleanup_ports() {
    print_status "Cleaning up any existing processes..."
    
    # Kill any process on port 5002 (Flask backend)
    if check_port 5002; then
        print_warning "Port 5002 is in use, killing existing process..."
        lsof -ti:5002 | xargs kill -9 2>/dev/null || true
    fi
    
    # Kill any process on port 5173 or 5174 or 5175 (Vite frontend)
    for port in 5173 5174 5175; do
        if check_port $port; then
            print_warning "Port $port is in use, killing existing process..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    sleep 1
}

# Function to start the backend
start_backend() {
    print_status "Starting Flask backend server..."
    
    cd backend/flask-todo-api
    
    # Check if we're in a conda environment (either pre-activated or just activated)
    if [ -n "$CONDA_DEFAULT_ENV" ] || conda info --envs | grep -q "\*"; then
        ENV_NAME=${CONDA_DEFAULT_ENV:-$(conda info --envs | grep "\*" | awk '{print $1}')}
        print_status "Using conda environment: $ENV_NAME"
        print_status "Installing/updating Python dependencies in conda environment..."
        pip install -r requirements.txt
    else
        # Fallback to virtual environment
        print_status "Using Python virtual environment..."
        
        # Check if virtual environment exists
        if [ ! -d "venv" ]; then
            print_warning "Virtual environment not found. Creating one..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install requirements
        print_status "Installing Python dependencies..."
        pip install -r requirements.txt
    fi
    
    # Always reinstall requirements to ensure all deps are present
    touch .requirements_installed
    
    # Start the Flask server in background
    print_status "Launching Flask server on port 5002..."
    python -m src.app &
    BACKEND_PID=$!
    
    # Wait a moment for the server to start
    sleep 2
    
    # Check if backend started successfully
    if check_port 5002; then
        print_success "Flask backend started successfully (PID: $BACKEND_PID)"
    else
        print_error "Failed to start Flask backend"
        exit 1
    fi
    
    cd ../..
}

# Function to start the frontend
start_frontend() {
    print_status "Starting React frontend server..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found. Installing..."
        npm install
    fi
    
    # Start the Vite development server in background
    print_status "Launching Vite dev server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait a moment for the server to start
    sleep 3
    
    # Check if frontend started successfully (try multiple common ports)
    FRONTEND_PORT=""
    for port in 5173 5174 5175; do
        if check_port $port; then
            FRONTEND_PORT=$port
            break
        fi
    done
    
    if [ -n "$FRONTEND_PORT" ]; then
        print_success "React frontend started successfully on port $FRONTEND_PORT (PID: $FRONTEND_PID)"
    else
        print_error "Failed to start React frontend"
        exit 1
    fi
    
    cd ..
}

# Function to handle cleanup on exit
cleanup() {
    print_status "Shutting down servers..."
    
    # Kill background processes
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Additional cleanup
    cleanup_ports
    
    print_success "Cleanup completed. Goodbye!"
    exit 0
}

# Function to open browser
open_browser() {
    sleep 2
    if [ -n "$FRONTEND_PORT" ]; then
        print_status "Opening browser to http://localhost:$FRONTEND_PORT"
        if command -v open >/dev/null 2>&1; then
            open "http://localhost:$FRONTEND_PORT"
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:$FRONTEND_PORT"
        else
            print_warning "Could not detect browser opener. Please open http://localhost:$FRONTEND_PORT manually"
        fi
    fi
}

# Function to activate conda environment
activate_conda_env() {
    # Check if conda is available
    if ! command -v conda >/dev/null 2>&1; then
        print_warning "Conda not found. Will use system Python or create venv."
        return 1
    fi
    
    # Check if todo-api environment exists
    if conda env list | grep -q "todo-api"; then
        print_status "Activating conda environment: todo-api"
        eval "$(conda shell.bash hook)"
        conda activate todo-api
        export CONDA_DEFAULT_ENV="todo-api"
        print_success "Conda environment 'todo-api' activated"
        return 0
    else
        print_warning "Conda environment 'todo-api' not found. Will use system Python or create venv."
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo "🚀 Professional Todo App Launcher"
    echo "=================================="
    echo ""
    
    # Activate conda environment if available
    activate_conda_env
    
    # Set up signal handlers for cleanup
    trap cleanup SIGINT SIGTERM
    
    # Clean up any existing processes
    cleanup_ports
    
    # Start backend
    start_backend
    
    # Start frontend
    start_frontend
    
    # Open browser
    open_browser &
    
    echo ""
    print_success "🎉 Todo App is now running!"
    echo ""
    echo "📱 Frontend: http://localhost:$FRONTEND_PORT"
    echo "🔧 Backend:  http://localhost:5002"
    echo "📖 API Docs: http://localhost:5002/swagger/"
    echo ""
    echo "💡 Features:"
    echo "   • Press 'N' to add new todos"
    echo "   • Press 'X' to toggle hovered tasks"
    echo "   • Double-click to toggle any task"
    echo "   • Hold 'Cmd' and move mouse to push tasks around"
    echo "   • Single-click and drag to move tasks"
    echo ""
    if [ -n "$CONDA_DEFAULT_ENV" ]; then
        print_success "Using conda environment: $CONDA_DEFAULT_ENV"
    else
        print_warning "Tip: Create 'todo-api' conda environment for best compatibility"
        print_warning "Run: conda create -n todo-api python=3.9"
    fi
    echo ""
    print_warning "Press Ctrl+C to stop all servers"
    echo ""
    
    # Wait for user interrupt
    while true; do
        sleep 1
    done
}

# Check if script is being run from the correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "This script must be run from the pro-todo root directory"
    print_error "Current directory: $(pwd)"
    print_error "Expected structure: backend/ and frontend/ folders"
    exit 1
fi

# Run main function
main
