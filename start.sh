#!/bin/bash

# Captive Portal App Startup Script for Linux
echo "🚀 Starting Captive Portal App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install-all
fi

# Build the client for production
echo "🔨 Building client for production..."
npm run build

# Start the application
echo "🌟 Starting the application..."
npm run server
