import os, sys
import subprocess
import webbrowser
import socket
import tarfile
import io
import importlib.util, requests

# DIR paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILES_DIR = os.path.join(BASE_DIR, "files")
LIBS_DIR = os.path.join(FILES_DIR, "libs")
FRONTEND_HTML = os.path.join(BASE_DIR, "frontend", "html")

# Install logs
LOGS_DIR = os.path.join(FILES_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "install.log")
os.makedirs(LIBS_DIR, exist_ok=True)

# Ensure libs directory is on sys.path for imports
sys.path.insert(0, LIBS_DIR)

# ---- Python deps ----
def install_python_reqs():
    req_file = os.path.join(BASE_DIR, "requirements.txt")
    if not os.path.exists(req_file):
        return

    with open(req_file) as f:
        for line in f:
            pkg = line.strip()
            if not pkg:
                continue

            parts = pkg.split("==")
            name = parts[0]
            version = parts[1] if len(parts) > 1 else None

            if not is_python_package_installed(name, version):
                log(f"[Installing] Installing {pkg}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", "-t", LIBS_DIR, pkg])
            else:
                log(f"[Skip] {pkg} already installed in libs/")
                
def is_python_package_installed(pkg_name, pkg_version=None):
    import pkg_resources

    try:
        dist = pkg_resources.WorkingSet([LIBS_DIR]).find(pkg_resources.Requirement.parse(pkg_name))
        if dist:
            if pkg_version:
                return dist.version == pkg_version
            return True
    except Exception:
        pass

    try:
        mod = importlib.import_module(pkg_name)
        if pkg_version:
            try:
                dist = pkg_resources.get_distribution(pkg_name)
                return dist.version == pkg_version
            except Exception:
                return True
        return True
    except ImportError:
        return False

# ---- Frontend deps ----
FRONTEND_LIBS = {
    "tailwind/tailwindcss-3.4.4.tgz": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-3.4.4.tgz",
    "feather/feather.min.js": "https://unpkg.com/feather-icons/dist/feather.min.js",
    "cropper/cropper.min.css": "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css",
    "cropper/cropper.min.js": "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js",
    "emoji/emoji-mart.css": "https://cdn.jsdelivr.net/npm/emoji-mart@latest/css/emoji-mart.css",
    "emoji/browser.js": "https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js",
}

def download_frontend_libs():
    for rel_path, url in FRONTEND_LIBS.items():
        dest = os.path.join(LIBS_DIR, rel_path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)

        if "tailwindcss" in url:
            tailwind_dir = os.path.join(LIBS_DIR, "tailwind")
            if not os.path.exists(os.path.join(tailwind_dir, "package")):
                log(f"[Fetching] Fetching and extracting Tailwind -> {tailwind_dir}")
                download_and_extract(url, tailwind_dir)
            else:
                log("[Skip] Tailwind already extracted")
            continue

        if not os.path.exists(dest):
            log(f"[Fetching] Fetching {url} -> {dest}")
            try:
                r = requests.get(url, timeout=30)
                r.raise_for_status()
                with open(dest, "wb") as f:
                    f.write(r.content)
            except Exception as e:
                log(f"[Error] Failed to fetch {url}: {e}")
        else:
            log(f"[Skiping] {rel_path} already exists")
                
def download_and_extract(url, dest_dir):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    file_bytes = io.BytesIO(resp.content)

    with tarfile.open(fileobj=file_bytes, mode="r:gz") as tar:
        tar.extractall(dest_dir)

# ---- Rewrite HTML ----
REWRITE_MAP = {
    "https://cdn.tailwindcss.com": "/libs/tailwind/tailwind.js",
    "https://unpkg.com/feather-icons": "/libs/feather/feather.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css": "/libs/cropper/cropper.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js": "/libs/cropper/cropper.min.js",
    "https://cdn.jsdelivr.net/npm/emoji-mart@latest/css/emoji-mart.css": "/libs/emoji/emoji-mart.css",
    "https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js": "/libs/emoji/browser.js",
}

def rewrite_html_files():
    if not os.path.exists(FRONTEND_HTML):
        return
    for fname in os.listdir(FRONTEND_HTML):
        if not fname.endswith(".html"): 
            continue
        fpath = os.path.join(FRONTEND_HTML, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = content
        for old, new in REWRITE_MAP.items():
            new_content = new_content.replace(old, new)
        if new_content != content:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            log(f"[Rewrite] Updated {fname}")
            
def log(message):
    print(message)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(message + "\n")
        
def bootstrap_needed():
    req_file = os.path.join(BASE_DIR, "requirements.txt")
    if os.path.exists(req_file):
        with open(req_file) as f:
            for line in f:
                pkg = line.strip()
                if not pkg: continue
                name = pkg.split("==")[0]
                if importlib.util.find_spec(name) is None:
                    return True
    
    for rel_path in FRONTEND_LIBS.keys():
        dest = os.path.join(LIBS_DIR, rel_path)
        if not os.path.exists(dest):
            return True
    
    return False

# Run all bootstrap steps
if bootstrap_needed():
    log("[Bootstrap] Missing deps detected, running installer...")
    install_python_reqs()
    download_frontend_libs()
    rewrite_html_files()
else:
    log("[Bootstrap] All dependencies already installed, skipping setup.")

# Get local IP
hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)
print(f"App is running on: http://{local_ip}:5000/")

# Path to backend app.py
backend_path = os.path.join(BASE_DIR, 'backend', 'app.py')

# Start the Flask server
print("Starting Flask server...")
subprocess.Popen([sys.executable, backend_path])

# Open the frontend in browser
print("Starting app server...")
frontend_path = os.path.abspath(os.path.join(FRONTEND_HTML, 'login.html')) # Backup link if needed
webbrowser.open(f"http://{local_ip}:5000/")
