#!/bin/bash

# Start Vite
vite &

# Navigate to server directory and activate the virtual environment
cd server
source envinaba/Scripts/activate

# Start the Python server
python serve.py &

# Start Ollama
ollama serve