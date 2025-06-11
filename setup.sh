#!/bin/bash

# Professional Todo App Setup Script
# This script sets up the conda environment and installs all dependencies

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

# Function to check if conda is available
check_conda() {
    if ! command -v conda >/dev/null 2>&1; then
        print_error "Conda is not installed or not in PATH"
        print_error "Please install Anaconda or Miniconda first:"
        print_error "https://docs.conda.io/en/latest/miniconda.html"
        exit 1
    fi
    
    print_success "Conda found: $(conda --version)"
}

# Function to create conda environment
setup_conda_env() {
    print_status "Setting up conda environment..."
    
    # Check if todo-api environment exists
    if conda env list | grep -q "todo-api"; then
        print_warning "Conda environment 'todo-api' already exists"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Removing existing environment..."
            conda env remove -n todo-api -y
        else
            print_status "Using existing environment..."
            return 0
        fi
    fi
    
    print_status "Creating conda environment 'todo-api' with Python 3.9..."
    conda create -n todo-api python=3.9 -y
    
    print_success "Conda environment 'todo-api' created successfully"
}

# Function to install backend dependencies
setup_backend() {
    print_status "Setting up backend dependencies..."
    
    # Activate conda environment
    if [[ "$SHELL" == *"zsh"* ]]; then
        eval "$(conda shell.zsh hook)"
    else
        eval "$(conda shell.bash hook)"
    fi
    conda activate todo-api
    
    cd backend/flask-todo-api
    
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_success "Backend dependencies installed"
    
    cd ../..
}

# Function to install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend dependencies..."
    
    # Check if node is available
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed"
        print_error "Please install Node.js first: https://nodejs.org/"
        exit 1
    fi
    
    print_success "Node.js found: $(node --version)"
    
    cd frontend
    
    print_status "Installing npm dependencies..."
    npm install
    
    print_success "Frontend dependencies installed"
    
    cd ..
}

# Main setup function
main() {
    echo ""
    echo "🛠️  Professional Todo App Setup"
    echo "================================"
    echo ""
    
    # Check prerequisites
    check_conda
    
    # Setup conda environment
    setup_conda_env
    
    # Setup backend
    setup_backend
    
    # Setup frontend
    setup_frontend
    
    echo ""
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run the app: ./launch.sh"
    echo "2. Or manually activate environment: conda activate todo-api"
    echo ""
    print_status "The 'todo-api' conda environment is now ready to use"
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
