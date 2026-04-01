#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install dependencies for both backend and frontend
echo "Installing dependencies..."
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Start the backend server
echo "Starting backend server..."
npm start
