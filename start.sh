#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Python 3.11 is installed
if ! command_exists python3.11; then
    echo "Python 3.11 is required but not installed. Please install Python 3.11."
    exit 1
fi

# Check if Node.js is installed
if ! command_exists node; then
    echo "Node.js is required but not installed. Please install Node.js."
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo "npm is required but not installed. Please install npm."
    exit 1
fi

# Create and activate backend virtual environment
echo "Setting up backend virtual environment..."
if [ ! -d "backend/venv" ]; then
    python3.11 -m venv backend/venv
fi
source backend/venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
python3.11 -m pip install --upgrade pip
python3.11 -m pip install --upgrade setuptools wheel
python3.11 -m pip install -r backend/requirements.txt

# Create and activate frontend virtual environment
echo "Setting up frontend virtual environment..."
if [ ! -d "frontend/node_modules" ]; then
    cd frontend
    npm install
    cd ..
fi

# Kill any existing processes on ports 3000 and 8000
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Create a log directory if it doesn't exist
mkdir -p logs

# Start the backend server with debug logging and output redirection
cd backend
python3.11 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug 2>&1 | tee -a ../logs/backend.log &
BACKEND_PID=$!

# Start the frontend development server with output redirection
cd ../frontend
npm start 2>&1 | tee -a ../logs/frontend.log &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    deactivate  # Deactivate Python virtual environment
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Print instructions for viewing logs
echo "Servers started. View logs in the logs directory:"
echo "Backend logs: tail -f logs/backend.log"
echo "Frontend logs: tail -f logs/frontend.log"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
