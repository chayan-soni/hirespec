#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Go back to the root directory
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Go back to the root directory
cd ..

# Start the backend server
echo "Starting backend server..."
cd backend
npm start
