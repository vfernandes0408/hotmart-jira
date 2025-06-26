#!/bin/bash

# Clean up previous builds
echo "Cleaning up previous builds..."
rm -rf dist release

# Build the app
echo "Building the app with Vite..."
npm run build

# Create a placeholder icon if it doesn't exist
if [ ! -f "assets/icon.png" ]; then
  echo "Creating placeholder icon..."
  mkdir -p assets
  # Create a simple colored square as a placeholder
  echo "Please replace this with a proper icon" > assets/icon.png
fi

# Build DMG directly with electron-builder
echo "Building DMG with electron-builder..."
npx electron-builder --mac dmg --publish never

echo "Build process completed. Check the 'release' directory for the DMG file."