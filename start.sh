#!/bin/bash

# Start Vite
vite &

# Start Ollama
ollama serve

# Navigate to server directory and activate the virtual environment
cd server
source envinaba/Scripts/Activate.ps1

# Start the Python server
python serve.py &
