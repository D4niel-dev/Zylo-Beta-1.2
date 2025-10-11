import os
import subprocess
import webbrowser
import socket

# Get local IP
hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(f"App is running on: http://{local_ip}:5000/")

# Path to backend app.py
backend_path = os.path.join(BASE_DIR, 'backend', 'app.py')

# Start the Flask server
print("Starting Flask server...")
subprocess.Popen(["python", backend_path])

# Open the frontend in browser
print("Starting app server...")
frontend_path = os.path.abspath(os.path.join(BASE_DIR,'frontend', 'login.html')) # Backup link if needed
webbrowser.open(f"http://{local_ip}:5000/")
