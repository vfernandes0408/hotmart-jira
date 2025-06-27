#!/bin/bash

# Build the app first
echo "Building the app..."
npm run build

# Copy index.html to dist if it doesn't exist
if [ ! -f "./dist/index.html" ]; then
  echo "Copying index.html to dist directory..."
  cp ./index.html ./dist/
fi

# Start Electron with the built app
echo "Starting Electron..."
electron .