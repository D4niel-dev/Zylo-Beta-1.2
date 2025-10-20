from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import socket
import os
import shutil
import random
import urllib.request
import urllib.error
import ssl
from typing import List, Dict

# Initialize Flask app and SocketIO
app = Flask(__name__, static_folder='frontend')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
host_ip = socket.gethostbyname(socket.gethostname())

# File paths and user data
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Persisted app data (JSON, SQLite, etc.) should live under backend/ now
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
USER_DATA_FILE = os.path.join(DATA_DIR, 'users.json')
FRONTEND_DIR = os.path.join(BASE_DIR, '../frontend')
MESSAGES_FILE = os.path.join(DATA_DIR, "messages.json")
DMS_FILE = os.path.join(DATA_DIR, "dms.json")
GROUPS_FILE = os.path.join(DATA_DIR, 'groups.json')
EXPLORE_FILE = os.path.join(DATA_DIR, 'explore.json')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ---- AI modules (personas, memory, learner) ----
try:
    from ai.personas import list_personas as ai_list_personas, pick_persona
    from ai.memory import (
        get_user_memory,
        append_conversation as memory_append_conversation,
        upsert_fact as memory_upsert_fact,
        set_preference as memory_set_preference,
        clear_user_memory as memory_clear_user,
    )
    from ai.learner import PersonaLearner
except Exception:
    ai_list_personas = lambda: [
        {"key": "helper", "name": "Helper AI", "style": "helpful, structured"},
        {"key": "friend", "name": "Friend AI", "style": "friendly, empathetic"},
        {"key": "supporter", "name": "Supporter AI", "style": "encouraging, motivational"},
    ]
    def pick_persona(key: str | None):
        class _P:
            def __init__(self, key: str):
                self.key = key or 'helper'
                self.name = 'Helper AI'
                self.style = 'helpful, structured'
                self.system_prompt = (
                    "You are Helper AI. Provide step-by-step guidance with numbered lists,"
                    " call out assumptions, and propose next actions."
                )
        return _P(key)
    def get_user_memory(username: str):
        return {"facts": [], "preferences": {}, "conversations": []}
    def memory_append_conversation(username: str, messages: List[Dict[str, str]], max_keep: int = 50):
        return None
    def memory_upsert_fact(username: str, fact: str):
        return None
    def memory_set_preference(username: str, key: str, value):
        return None
    def memory_clear_user(username: str):
        return None
    class PersonaLearner:  # type: ignore
        def __init__(self, base_dir: str):
            self.base_dir = base_dir
        def train_on_feedback(self, persona: str, user: str, prompt: str, target_phrase: str, epochs: int = 8):
            return None
        def suggest_phrase(self, persona: str, user: str, prompt: str):
            return None

# Instance to persist learned tiny models (if torch available)
AI_LEARN_DIR = os.path.join(DATA_DIR, 'ai_learn')
persona_learner = PersonaLearner(AI_LEARN_DIR)

# One-time migration for older deployments that stored folders at repo root
def _migrate_storage_dirs():
    try:
        old_uploads = os.path.join(BASE_DIR, '..', 'uploads')
        if os.path.isdir(old_uploads):
            # Move children to new uploads directory
            for name in os.listdir(old_uploads):
                src = os.path.join(old_uploads, name)
                dst = os.path.join(UPLOADS_DIR, name)
                if not os.path.exists(dst):
                    try:
                        shutil.move(src, dst)
                    except Exception:
                        pass
            try:
                os.rmdir(old_uploads)
            except Exception:
                pass

        old_data = os.path.join(BASE_DIR, '..', 'data')
        if os.path.isdir(old_data):
            for name in ("users.json", "messages.json", "groups.json", "explore.json"):
                src = os.path.join(old_data, name)
                dst = os.path.join(DATA_DIR, name)
                if os.path.exists(src) and not os.path.exists(dst):
                    try:
                        shutil.move(src, dst)
                    except Exception:
                        pass
            try:
                # If directory is empty after moving, remove it
                if not os.listdir(old_data):
                    os.rmdir(old_data)
            except Exception:
                pass
    except Exception:
        # Never block startup on migration
        pass

_migrate_storage_dirs()

# Helper functions
def load_users():
    if not os.path.exists(USER_DATA_FILE):
        return []
    with open(USER_DATA_FILE, "r") as file:
        return json.load(file)

def save_users(users):
    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

def save_user(username, email, password):
    users = load_users()
    for user in users:
        if user["username"] == username or user.get("email") == email:
            return False  # Username already exists
    users.append({"username": username, "email": email, "password": password})
    
    with open(USER_DATA_FILE, "w") as file:
        json.dump(users, file, indent=2)
    return True

def load_messages():
    if not os.path.exists(MESSAGES_FILE):
        return []
    with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_messages(messages):
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2)

# ---- Direct Messages (DMs) helpers ----
def load_dms():
    """Load direct messages from persistent storage."""
    if not os.path.exists(DMS_FILE):
        # Initialize empty file for first-time startup
        with open(DMS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(DMS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_dms(dms_list):
    """Persist direct messages to disk."""
    with open(DMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(dms_list, f, indent=2)

# Group storage helpers
def load_groups():
    if not os.path.exists(GROUPS_FILE):
        with open(GROUPS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(GROUPS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_groups(groups):
    with open(GROUPS_FILE, 'w', encoding='utf-8') as f:
        json.dump(groups, f, indent=2)

# Explore storage helpers
def load_explore():
    if not os.path.exists(EXPLORE_FILE):
        with open(EXPLORE_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(EXPLORE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_explore(posts):
    with open(EXPLORE_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)


def http_post_json(url: str, payload: dict, timeout: int = 20) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
            raw = resp.read()
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except Exception:
            raise


def http_get_json(url: str, timeout: int = 10) -> dict:
    req = urllib.request.Request(url)
    context = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
        raw = resp.read()
        return json.loads(raw.decode("utf-8"))

def send_reset_email(to_email, reset_link):
    from_email = os.getenv("Zylo_SMTP_FROM", "zylosupp0rt@gmail.com")
    password = os.getenv("Zylo_SMTP_PASSWORD", "kgawzxrfthcytgfu")

    subject = "🔐 Reset Your Zylo Password"

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; color: #111827;">
        <div style="max-width: 520px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">

          <h2 style="color: #1d4ed8; text-align: center;">Reset Your Zylo Password</h2>
          <p>Hello,</p>
          <p>You (or someone else) requested a password reset for your Zylo account. Click the button below to proceed:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #10b981; color: white; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p><strong>Note:</strong> This link will expire in 30 minutes for your account's security.</p>

          <p>If you didn't request this, you can safely ignore this message. No changes will be made to your account.</p>

          <p style="margin-top: 30px;">Thanks,<br><strong>The Zylo Support Team</strong></p>
        </div>

        <p style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 24px;">
          Trouble with the button? Copy and paste this link into your browser:<br>
          <a href="{reset_link}" style="color: #3b82f6;">{reset_link}</a>
        </p>
      </body>
    </html>
    """

    # Compose email
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email

    message.attach(MIMEText(html_body, "html"))

    # Send the email
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_email, password)
        server.send_message(message)
        
# Load existing messages and groups
messages = load_messages()
groups = load_groups()
dms = load_dms()

# API Endpoints
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    dob = data.get("dob", "")
    gender = data.get("gender", "")
    phone = data.get("phone", "")
    avatar_data = data.get("avatar")
    banner_data = data.get("banner")
    
    raw_tag = (data.get("usertag") or "").strip()
    if raw_tag:
        usertag = "@" + raw_tag.lstrip("@")
    else:
        usertag = f"@{username.lower()}{random.randint(1000, 9999)}"

    if not username or not email or not password:
        return jsonify({"success": False, "error": "Missing required fields."}), 400

    # Load existing users
    if not os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, "w") as f:
            json.dump([], f)

    with open(USER_DATA_FILE, "r") as f:
        users = json.load(f)

    for user in users:
        if user["username"] == username:
            return jsonify({"success": False, "error": "Username already exists."}), 409
        if user["email"] == email:
            return jsonify({"success": False, "error": "Email already registered."}), 409

    # Process avatar and banner uploads
    avatar_url = "/images/default_avatar.png"
    banner_url = "/images/default_banner.png"
    
    if avatar_data and avatar_data.startswith("data:"):
        # Save avatar to uploads directory
        user_upload_dir = os.path.join(UPLOADS_DIR, username)
        os.makedirs(user_upload_dir, exist_ok=True)
        avatar_url = _save_data_url_for_user(username, avatar_data, "avatar.png")
        if not avatar_url:
            avatar_url = "/images/default_avatar.png"
    
    if banner_data and banner_data.startswith("data:"):
        # Save banner to uploads directory
        user_upload_dir = os.path.join(UPLOADS_DIR, username)
        os.makedirs(user_upload_dir, exist_ok=True)
        banner_url = _save_data_url_for_user(username, banner_data, "banner.png")
        if not banner_url:
            banner_url = "/images/default_banner.png"

    new_user = {
        "username": username,
        "email": email,
        "password": password,
        "usertag": usertag,
        "dob": dob,
        "gender": gender,
        "phone": phone,
        "avatar": avatar_url,
        "banner": banner_url
    }

    users.append(new_user)

    with open(USER_DATA_FILE, "w") as f:
        json.dump(users, f, indent=2)

    return jsonify({"success": True})

    
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    identifier = data.get("identifier")
    password = data.get("password")
    users = load_users()
    for user in users:
        if (user["username"] == identifier or user.get("email") == identifier) and user["password"] == password:
            return jsonify({"success": True, "username": user["username"], "usertag": user.get("usertag", "")})
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route("/api/forgot", methods=["POST"])
def forgot():
    data = request.get_json()
    identifier = data.get("identifier")

    with open(USER_DATA_FILE, "r") as f:
        users = json.load(f)

    for user in users:
        if user.get("username") == identifier or user.get("email") == identifier:
            reset_link = f"http://{host_ip}:5000/reset.html?user={user['username']}"
            send_reset_email(user.get("email"), reset_link)
            return jsonify({"success": True})

    return jsonify({"success": False, "error": "User not found."}), 404


@app.route("/api/reset", methods=["POST"])
def reset_password():
    data = request.json
    username = data.get("username")
    new_password = data.get("newPassword")
    
    if not username or not new_password:
        return jsonify({"success": False, "error": "Missing username or password"}), 400

    users = load_users()
    updated = False
    for user in users:
        if user["username"] == username:
            user["password"] = new_password
            updated = True
            break

    if updated:
        with open(USER_DATA_FILE, "w") as f:
            json.dump(users, f, indent=2)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Username not found"}), 404
    
@app.route("/api/messages", methods=["GET"])
def get_messages():
    return jsonify(messages)

@socketio.on("send_message")
def handle_send_message(data):
    username = data.get("username")
    message = data.get("message")

    msg_data = {"username": username, "message": message}
    messages.append(msg_data)
    save_messages(messages)
    
    print("Message received from client:", msg_data)
    emit("receive_message", msg_data, broadcast=True)

@socketio.on('register_user')
def register_user(data):
    # Placeholder for per-user rooms in future; currently no-op
    try:
        user = (data or {}).get('username')
        if not user:
            return
        # Could join a personal room like f"user:{user}" if needed
    except Exception:
        pass
    
@socketio.on("send_file")
def handle_send_file(data):
    username = data.get("username")
    file_name = data.get("fileName")
    file_type = data.get("fileType")
    file_data = data.get("fileData")

    msg_data = {
        "type": "file",
        "username": username,
        "fileName": file_name,
        "fileType": file_type,
        "fileData": file_data
    }

    # Save in memory
    print("File message received from client:", msg_data)
    messages.append(msg_data)
    save_messages(messages)

    emit("receive_file", msg_data, broadcast=True)

def _extract_extension_from_data_url(data_url: str) -> str:
    try:
        header = data_url.split(';', 1)[0]  # e.g., data:image/png
        mime = header.split(':', 1)[1]      # image/png
        main, sub = mime.split('/')
        if sub.lower() in ("jpeg", "pjpeg"):
            return "jpg"
        if sub.lower() == "svg+xml":
            return "svg"
        return sub.lower()
    except Exception:
        return "bin"

def _safe_filename(seed: str, ext: str) -> str:
    base = f"{seed}_{random.randint(100000, 999999)}"
    ext = (ext or "").lstrip('.').lower() or "bin"
    return f"{base}.{ext}"

def _save_data_url_for_user(username: str, base64_data: str, filename_hint: str = None) -> str:
    """Save a data URL to backend/uploads/<username>/ and return the public URL path."""
    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_upload_dir, exist_ok=True)
    try:
        header, encoded = base64_data.split(",", 1)
        file_bytes = base64.b64decode(encoded)
        ext = None
        if filename_hint and '.' in filename_hint:
            ext = filename_hint.rsplit('.', 1)[1].lower()
        if not ext:
            ext = _extract_extension_from_data_url(base64_data)
        seed = f"explore_{int(random.random()*1e9)}"
        filename = _safe_filename(seed, ext)
        filepath = os.path.join(user_upload_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
        return f"/uploads/{username}/{filename}"
    except Exception as e:
        print("Failed to save data URL:", e)
        return None

@socketio.on('join_group')
def handle_join_group(data):
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    if not group_id or not username:
        return
    for g in load_groups():
        if g.get('id') == group_id and (username in (g.get('members') or []) or username == g.get('owner')):
            join_room(group_id)
            emit('group_joined', { 'groupId': group_id })
            return

@socketio.on('leave_group')
def handle_leave_group(data):
    group_id = (data or {}).get('groupId')
    if not group_id:
        return
    leave_room(group_id)

@socketio.on('send_group_message')
def handle_send_group_message(data):
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    message = (data or {}).get('message')
    if not group_id or not username or not message:
        return
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            entry = { 'username': username, 'message': message }
            msgs = g.get('messages') or []
            msgs.append(entry)
            all_groups[idx]['messages'] = msgs
            save_groups(all_groups)
            emit('receive_group_message', { 'groupId': group_id, 'username': username, 'message': message }, room=group_id)
            return

@socketio.on('send_group_file')
def handle_send_group_file(data):
    """Handle file sharing within a group room."""
    group_id = (data or {}).get('groupId')
    username = (data or {}).get('username')
    file_name = (data or {}).get('fileName')
    file_type = (data or {}).get('fileType')
    file_data = (data or {}).get('fileData')
    if not group_id or not username or not file_name or not file_data:
        return
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            entry = {
                'username': username,
                'fileName': file_name,
                'fileType': file_type,
                'fileData': file_data,
            }
            msgs = g.get('messages') or []
            msgs.append(entry)
            all_groups[idx]['messages'] = msgs
            save_groups(all_groups)
            emit('receive_group_file', {
                'groupId': group_id,
                'username': username,
                'fileName': file_name,
                'fileType': file_type,
                'fileData': file_data,
            }, room=group_id)
            return

    
@socketio.on("typing")
def handle_typing(data):
    emit("typing", data, broadcast=True, include_self=False)
    
    
@app.route("/api/stats", methods=["GET"])
def get_stats():
    users = load_users()
    user_count = len(users)
    message_count = len(messages) 
    try:
        current_groups = load_groups()
        # +1 for the public community room
        room_count = (len(current_groups) or 0) + 1
    except Exception:
        room_count = 1

    return jsonify({
        "users": user_count,
        "messages": message_count,
        "rooms": room_count
    })


@app.route('/api/ai/models', methods=['GET'])
def ai_models():
    """Return available AI models. Prefers Ollama if reachable."""
    provider = os.getenv('Zylo_AI_PROVIDER', 'auto').lower()
    # Try Ollama if explicitly requested or auto
    if provider in ('ollama', 'auto'):
        try:
            tags = http_get_json('http://127.0.0.1:11434/api/tags', timeout=3)
            models = [m.get('name') for m in tags.get('models', []) if m.get('name')]
            if models:
                return jsonify({"success": True, "provider": "ollama", "models": models})
        except Exception:
            pass
    # Fallback list (may not be installed; UI can allow selection anyway)
    fallback_models = [
        "llama3.2:1b",
        "llama3.1:8b",
        "tinyllama",
        "phi3:mini",
        "qwen2.5:0.5b",
    ]
    return jsonify({"success": True, "provider": "mock", "models": fallback_models})


@app.route('/api/ai/personas', methods=['GET'])
def ai_personas():
    """Return available AI personas (helper, friend, supporter)."""
    return jsonify({"success": True, "personas": ai_list_personas()})


def mock_ai_response(messages: list) -> str:
    """Very simple fallback responder when no local model is available."""
    last_user = ""
    for m in reversed(messages or []):
        if (m.get('role') or '').lower() == 'user':
            last_user = m.get('content', '')
            break
    if not last_user:
        return "Hello! Ask me anything and I'll do my best to help."
    # Friendly reflection with a tiny bit of guidance
    snippet = last_user.strip()
    if len(snippet) > 240:
        snippet = snippet[:240] + "…"
    return (
        "Here's a quick thought: " + snippet + "\n\n"
        "- If you want step-by-step help, tell me your goal and constraints.\n"
        "- For code, paste the snippet and error.\n\n"
        "I can also draft examples or explain trade-offs."
    )


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """Chat with an AI assistant. Uses Ollama if available, else mock."""
    data = request.get_json(silent=True) or {}
    messages_in = data.get('messages') or []
    single_message = data.get('message')
    persona_key = (data.get('persona') or '').strip().lower() or None
    username = (data.get('username') or '').strip() or 'anonymous'
    if not messages_in and single_message:
        messages_in = [{"role": "user", "content": str(single_message)}]

    model = (data.get('model') or os.getenv('Zylo_AI_MODEL') or 'llama3.1:8b')
    provider = os.getenv('Zylo_AI_PROVIDER', 'auto').lower()
    persona = pick_persona(persona_key)

    # Try Ollama first if configured/auto
    if provider in ('ollama', 'auto'):
        try:
            payload = {
                "model": model,
                "stream": False,
                "messages": ([{"role": "system", "content": persona.system_prompt}] + messages_in),
            }
            resp = http_post_json('http://127.0.0.1:11434/api/chat', payload, timeout=30)
            # Expected schema: { message: { role, content }, ... }
            reply = (
                ((resp or {}).get('message') or {}).get('content')
                or (resp.get('response') if isinstance(resp, dict) else None)
            )
            if reply:
                try:
                    memory_append_conversation(username, messages_in[-10:])
                except Exception:
                    pass
                return jsonify({"success": True, "provider": "ollama", "model": model, "reply": reply, "persona": persona.key})
        except Exception as e:
            # Fall through to mock
            pass

    # Mock fallback
    reply = mock_ai_response(messages_in)
    try:
        memory_append_conversation(username, messages_in[-10:])
    except Exception:
        pass
    try:
        suggestion = persona_learner.suggest_phrase(persona.key, username, messages_in[-1]['content'] if messages_in else '')
        if suggestion and isinstance(suggestion, str):
            reply = f"{reply}\n\n(phrase preference noted: {suggestion})"
    except Exception:
        pass
    return jsonify({"success": True, "provider": "mock", "model": "mock", "reply": reply, "persona": persona.key})


@app.route('/api/ai/feedback', methods=['POST'])
def ai_feedback():
    """Accept feedback to improve per-user, per-persona phrasing via tiny learner."""
    data = request.get_json(silent=True) or {}
    persona_key = (data.get('persona') or '').strip().lower() or 'helper'
    username = (data.get('username') or '').strip() or 'anonymous'
    prompt = (data.get('prompt') or '')
    target = (data.get('targetPhrase') or data.get('target') or '')
    if not target:
        return jsonify({"success": False, "error": "Missing targetPhrase"}), 400
    try:
        persona_learner.train_on_feedback(persona_key, username, prompt or target, target, epochs=6)
        memory_upsert_fact(username, f"prefers_phrase::{persona_key}::{target}")
    except Exception:
        pass
    return jsonify({"success": True})


@app.route('/api/ai/memory', methods=['GET', 'DELETE'])
def ai_memory():
    username = (request.args.get('username') or request.args.get('user') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400
    if request.method == 'GET':
        try:
            mem = get_user_memory(username)
        except Exception:
            mem = {"facts": [], "preferences": {}, "conversations": []}
        return jsonify({"success": True, "memory": mem})
    else:  # DELETE
        try:
            memory_clear_user(username)
        except Exception:
            pass
        return jsonify({"success": True})


@app.route('/api/explore/posts', methods=['GET', 'POST'])
def explore_posts():
    """List or create Explore posts."""
    if request.method == 'GET':
        posts = load_explore()
        posts_sorted = sorted(posts, key=lambda p: p.get('createdAt', 0), reverse=True)
        return jsonify({"success": True, "posts": posts_sorted})

    data = request.json or {}
    username = (data.get('username') or '').strip()
    caption = (data.get('caption') or '').strip()
    file_name = data.get('fileName')
    file_data = data.get('fileData')
    if not username or not file_data:
        return jsonify({"success": False, "error": "Missing username/fileData"}), 400

    url = _save_data_url_for_user(username, file_data, file_name)
    if not url:
        return jsonify({"success": False, "error": "Failed to save file"}), 500

    post = {
        'id': f"p{random.randint(100000,999999)}",
        'username': username,
        'caption': caption,
        'fileName': file_name,
        'url': url,
        'createdAt': int(__import__('time').time()),
    }
    posts = load_explore()
    posts.append(post)
    save_explore(posts)
    return jsonify({"success": True, "post": post})

@app.route('/api/get-user')
def get_user():
    identifier = request.args.get("identifier")
    if not identifier:
        return jsonify({"success": False, "error": "Missing identifier"}), 400

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"success": False, "error": "User data not found"}), 404

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    for user in users:
        if user.get("username") == identifier or user.get("email") == identifier:
            return jsonify({"success": True, "user": user})

    return jsonify({"success": False, "error": "User not found"}), 404

@app.route('/api/check-user')
def check_user():
    identifier = request.args.get("identifier", "").strip().lower()
    if not identifier:
        return jsonify({"exists": False})

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"exists": False})

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    for user in users:
        if user.get("username", "").lower() == identifier or user.get("email", "").lower() == identifier:
            return jsonify({"exists": True, "username": user["username"]})

    return jsonify({"exists": False})


@app.route('/')
def serve_main():
    return send_from_directory(FRONTEND_DIR, 'login.html')

@app.route('/images/<path:filename>')
def serve_images(filename):
    # Images were relocated under the frontend folder
    return send_from_directory(os.path.join(FRONTEND_DIR, 'images'), filename)

@app.route('/uploads/<username>/<filename>')
def serve_upload(username, filename):
    return send_from_directory(os.path.join(UPLOADS_DIR, username), filename)

@app.route('/files/<path:filename>')
def serve_files(filename):
    # Static files (css, vendor, audio, etc.) now live under frontend/files
    return send_from_directory(os.path.join(FRONTEND_DIR, 'files'), filename)

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    data = request.json
    username = data.get("username")
    usertag = data.get("usertag")
    avatar_data = data.get("avatar")
    banner_data = data.get("banner")
    about = data.get("about")
    level = data.get("level")
    gold = data.get("gold")
    rank = data.get("rank")

    print(f"Incoming update for user: {username}")
    print("Raw data:", data)

    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    if not os.path.exists(USER_DATA_FILE):
        return jsonify({"success": False, "error": "users.json not found"}), 404

    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_upload_dir, exist_ok=True)

    avatar_url = None
    banner_url = None

    def save_image(base64_data, filename):
        if not base64_data:
            return None
        try:
            header, encoded = base64_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            filepath = os.path.join(user_upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(file_data)
            return f"/uploads/{username}/{filename}"
        except Exception as e:
            print("Failed to save image:", e)
            return None

    avatar_url = save_image(avatar_data, "avatar.png")
    banner_url = save_image(banner_data, "banner.png")

    with open(USER_DATA_FILE, "r", encoding="utf-8") as f:
        users = json.load(f)

    updated = False
    for user in users:
        if user.get("username") == username:
            if avatar_url: 
                user["avatar"] = avatar_url
                
            if banner_url: 
                user["banner"] = banner_url
                
            if usertag is not None:
                raw_tag = str(usertag).strip()
                if raw_tag:
                    user["usertag"] = "@" + raw_tag.lstrip("@")
                
            user["aboutMe"] = about
            user["level"] = level
            user["gold"] = gold
            user["rank"] = rank
            updated = True
            print(f"✅ Updated {username}'s profile.")
            break

    if not updated:
        return jsonify({"success": False, "error": "User not found"}), 404

    with open(USER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

    return jsonify({"success": True, "user": user})


# -------- Settings and Account Management Endpoints -------- #

def _find_user(users, username):
    for idx, u in enumerate(users):
        if u.get("username") == username:
            return idx, u
    return -1, None


@app.route('/api/update-username', methods=['POST'])
def update_username():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_username = (data.get("newUsername") or "").strip()
    if not username or not new_username:
        return jsonify({"success": False, "error": "Missing username/newUsername"}), 400

    users = load_users()
    # Ensure new username unique
    for u in users:
        if u.get("username", "").lower() == new_username.lower():
            return jsonify({"success": False, "error": "Username already exists"}), 409

    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    # Rename uploads dir if exists
    old_dir = os.path.join(UPLOADS_DIR, username)
    new_dir = os.path.join(UPLOADS_DIR, new_username)
    if os.path.exists(old_dir):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        try:
            shutil.move(old_dir, new_dir)
        except Exception:
            # If move fails for any reason, continue without blocking update
            pass

    # Update user record
    users[idx]["username"] = new_username

    # Update messages author names to keep history aligned
    global messages
    changed = False
    for m in messages:
        if m.get("username") == username:
            m["username"] = new_username
            changed = True
    if changed:
        save_messages(messages)

    save_users(users)
    return jsonify({"success": True, "username": new_username})


@app.route('/api/update-usertag', methods=['POST'])
def update_usertag():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_tag = (data.get("newUsertag") or data.get("newTag") or "").strip()
    if not username or not new_tag:
        return jsonify({"success": False, "error": "Missing username/newUsertag"}), 400

    # Normalize to @xxxx (keep other formats too)
    raw = str(new_tag)
    if raw.startswith("@"):  # already with @
        normalized = raw
    else:
        normalized = f"@{raw}"

    # If strictly enforce 4 digits, keep it lenient but validate
    if not any(c.isdigit() for c in raw):
        return jsonify({"success": False, "error": "Usertag must contain digits (e.g., 4 digits)."}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    users[idx]["usertag"] = normalized
    save_users(users)
    return jsonify({"success": True, "usertag": normalized})


@app.route('/api/update-email', methods=['POST'])
def update_email():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    new_email = (data.get("newEmail") or "").strip()
    if not username or not new_email:
        return jsonify({"success": False, "error": "Missing username/newEmail"}), 400

    users = load_users()
    # Ensure email unique
    for u in users:
        if u.get("email", "").lower() == new_email.lower():
            return jsonify({"success": False, "error": "Email already in use"}), 409

    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    users[idx]["email"] = new_email
    save_users(users)
    return jsonify({"success": True, "email": new_email})


@app.route('/api/update-password', methods=['POST'])
def update_password():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")
    if not username or not old_password or not new_password:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    if user.get("password") != old_password:
        return jsonify({"success": False, "error": "Old password incorrect"}), 401

    users[idx]["password"] = new_password
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/update-settings', methods=['POST'])
def update_settings():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    settings_payload = data.get("settings") or {}
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    users = load_users()
    idx, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404

    user_settings = user.get("settings") or {}
    # Merge shallowly
    user_settings.update(settings_payload)
    users[idx]["settings"] = user_settings
    save_users(users)
    return jsonify({"success": True, "settings": user_settings})


@app.route('/api/delete-account', methods=['POST'])
def delete_account():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400

    users = load_users()
    new_users = [u for u in users if u.get("username") != username]
    if len(new_users) == len(users):
        return jsonify({"success": False, "error": "User not found"}), 404

    save_users(new_users)

    # Remove uploads dir if exists
    user_upload_dir = os.path.join(UPLOADS_DIR, username)
    try:
        if os.path.isdir(user_upload_dir):
            shutil.rmtree(user_upload_dir)
    except Exception:
        pass

    # Remove user's messages
    global messages
    messages = [m for m in messages if m.get("username") != username]
    save_messages(messages)

    return jsonify({"success": True})

# ---------------- Friends APIs ---------------- #

def _ensure_social_fields(user: dict) -> dict:
    if user is None:
        return {}
    if 'friends' not in user or not isinstance(user.get('friends'), list):
        user['friends'] = []
    if 'friendRequests' not in user or not isinstance(user.get('friendRequests'), dict):
        user['friendRequests'] = { 'incoming': [], 'outgoing': [] }
    else:
        fr = user['friendRequests']
        if not isinstance(fr.get('incoming'), list):
            fr['incoming'] = []
        if not isinstance(fr.get('outgoing'), list):
            fr['outgoing'] = []
    return user


@app.route('/api/friends', methods=['GET'])
def friends_get():
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({"success": False, "error": "Missing username"}), 400
    users = load_users()
    _, user = _find_user(users, username)
    if user is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    user = _ensure_social_fields(user)
    return jsonify({
        "success": True,
        "friends": user.get('friends', []),
        "incoming": user.get('friendRequests', {}).get('incoming', []),
        "outgoing": user.get('friendRequests', {}).get('outgoing', []),
    })


@app.route('/api/friends/request', methods=['POST'])
def friends_request():
    data = request.json or {}
    sender = (data.get('from') or '').strip()
    target = (data.get('to') or '').strip()
    if not sender or not target:
        return jsonify({"success": False, "error": "Missing from/to"}), 400
    if sender == target:
        return jsonify({"success": False, "error": "Cannot add yourself"}), 400
    users = load_users()
    si, su = _find_user(users, sender)
    ti, tu = _find_user(users, target)
    if su is None or tu is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    su = _ensure_social_fields(su)
    tu = _ensure_social_fields(tu)

    if target in su['friends']:
        return jsonify({"success": False, "error": "Already friends"}), 409
    if target in su['friendRequests']['outgoing']:
        return jsonify({"success": True, "message": "Already requested"})
    if sender in tu['friendRequests']['incoming']:
        return jsonify({"success": True, "message": "Already requested"})

    su['friendRequests']['outgoing'].append(target)
    tu['friendRequests']['incoming'].append(sender)
    users[si] = su
    users[ti] = tu
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/accept', methods=['POST'])
def friends_accept():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    requester = (data.get('from') or '').strip()
    if not username or not requester:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ri, r = _find_user(users, requester)
    if u is None or r is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    r = _ensure_social_fields(r)

    if requester in u['friendRequests']['incoming']:
        u['friendRequests']['incoming'] = [x for x in u['friendRequests']['incoming'] if x != requester]
    if username in r['friendRequests']['outgoing']:
        r['friendRequests']['outgoing'] = [x for x in r['friendRequests']['outgoing'] if x != username]

    if requester not in u['friends']:
        u['friends'].append(requester)
    if username not in r['friends']:
        r['friends'].append(username)

    users[ui] = u
    users[ri] = r
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/decline', methods=['POST'])
def friends_decline():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    requester = (data.get('from') or '').strip()
    if not username or not requester:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ri, r = _find_user(users, requester)
    if u is None or r is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    r = _ensure_social_fields(r)
    u['friendRequests']['incoming'] = [x for x in u['friendRequests']['incoming'] if x != requester]
    r['friendRequests']['outgoing'] = [x for x in r['friendRequests']['outgoing'] if x != username]
    users[ui] = u
    users[ri] = r
    save_users(users)
    return jsonify({"success": True})


@app.route('/api/friends/remove', methods=['POST'])
def friends_remove():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    friend = (data.get('friend') or '').strip()
    if not username or not friend:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    fi, fuser = _find_user(users, friend)
    if u is None or fuser is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    fuser = _ensure_social_fields(fuser)
    u['friends'] = [x for x in u['friends'] if x != friend]
    fuser['friends'] = [x for x in fuser['friends'] if x != username]
    users[ui] = u
    users[fi] = fuser
    save_users(users)
    return jsonify({"success": True})

@app.route('/api/friends/cancel', methods=['POST'])
def friends_cancel():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    target = (data.get('to') or '').strip()
    if not username or not target:
        return jsonify({"success": False, "error": "Missing fields"}), 400
    users = load_users()
    ui, u = _find_user(users, username)
    ti, t = _find_user(users, target)
    if u is None or t is None:
        return jsonify({"success": False, "error": "User not found"}), 404
    u = _ensure_social_fields(u)
    t = _ensure_social_fields(t)
    u['friendRequests']['outgoing'] = [x for x in u['friendRequests']['outgoing'] if x != target]
    t['friendRequests']['incoming'] = [x for x in t['friendRequests']['incoming'] if x != username]
    users[ui] = u
    users[ti] = t
    save_users(users)
    return jsonify({"success": True})

# ---------------- Direct Messages APIs + Socket ---------------- #
@app.route('/api/dm/history', methods=['GET'])
def dm_history():
    user_a = (request.args.get('userA') or '').strip()
    user_b = (request.args.get('userB') or '').strip()
    if not user_a or not user_b:
        return jsonify([])
    conv = []
    for m in (load_dms() or []):
        if (m.get('from') == user_a and m.get('to') == user_b) or (m.get('from') == user_b and m.get('to') == user_a):
            conv.append(m)
    return jsonify(conv)

@app.route('/api/dm/send', methods=['POST'])
def dm_send():
    data = request.json or {}
    frm = (data.get('from') or '').strip()
    to = (data.get('to') or '').strip()
    if not frm or not to:
        return jsonify({"success": False, "error": "Missing from/to"}), 400
    entry = {
        'from': frm,
        'to': to,
        'message': data.get('message'),
        'fileName': data.get('fileName'),
        'fileType': data.get('fileType'),
        'fileData': data.get('fileData'),
        'createdAt': int(__import__('time').time()),
    }
    all_dms = load_dms()
    all_dms.append(entry)
    save_dms(all_dms)
    # Push live update to both parties if they are connected
    try:
        emit('receive_dm', entry, broadcast=True)
    except Exception:
        pass
    return jsonify({"success": True})

@socketio.on('send_dm')
def handle_send_dm(data):
    try:
        frm = (data or {}).get('from')
        to = (data or {}).get('to')
        if not frm or not to:
            return
        entry = {
            'from': frm,
            'to': to,
            'message': (data or {}).get('message'),
            'fileName': (data or {}).get('fileName'),
            'fileType': (data or {}).get('fileType'),
            'fileData': (data or {}).get('fileData'),
            'createdAt': int(__import__('time').time()),
        }
        all_dms = load_dms()
        all_dms.append(entry)
        save_dms(all_dms)
        emit('receive_dm', entry, broadcast=True)
    except Exception:
        pass

# ---------------- Groups APIs ---------------- #

def _gen_group_id() -> str:
    return f"g{random.randint(100000, 999999)}"


@app.route('/api/groups', methods=['GET'])
def list_groups():
    username = (request.args.get('username') or '').strip()
    all_groups = load_groups()
    if username:
        filtered = [g for g in all_groups if username in (g.get('members') or []) or username == g.get('owner')]
        return jsonify({"success": True, "groups": filtered})
    return jsonify({"success": True, "groups": all_groups})


@app.route('/api/groups/create', methods=['POST'])
def create_group():
    data = request.json or {}
    owner = (data.get('owner') or '').strip()
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    if not owner or not name:
        return jsonify({"success": False, "error": "Missing owner/name"}), 400
    users = load_users()
    _, u = _find_user(users, owner)
    if u is None:
        return jsonify({"success": False, "error": "Owner not found"}), 404
    gid = _gen_group_id()
    g = {
        "id": gid,
        "name": name,
        "description": description,
        "owner": owner,
        "members": [owner],
        "messages": []
    }
    all_groups = load_groups()
    all_groups.append(g)
    save_groups(all_groups)
    return jsonify({"success": True, "group": g})


@app.route('/api/groups/join', methods=['POST'])
def join_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing username/groupId"}), 400
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            members = g.get('members') or []
            if username not in members:
                members.append(username)
                all_groups[idx]['members'] = members
                save_groups(all_groups)
            return jsonify({"success": True, "group": all_groups[idx]})
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/leave', methods=['POST'])
def leave_group_api():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    group_id = (data.get('groupId') or '').strip()
    if not username or not group_id:
        return jsonify({"success": False, "error": "Missing username/groupId"}), 400
    all_groups = load_groups()
    for idx, g in enumerate(all_groups):
        if g.get('id') == group_id:
            members = [m for m in (g.get('members') or []) if m != username]
            all_groups[idx]['members'] = members
            save_groups(all_groups)
            return jsonify({"success": True})
    return jsonify({"success": False, "error": "Group not found"}), 404


@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def group_messages_get(group_id):
    all_groups = load_groups()
    for g in all_groups:
        if g.get('id') == group_id:
            return jsonify(g.get('messages') or [])
    return jsonify([])

@app.route('/<path:path>')
def serve_static_file(path):
    # Serve frontend files. Map service worker and manifest to root scope from /frontend/js
    if path == 'service-worker.js':
        return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), 'service-worker.js')
    if path == 'manifest.webmanifest':
        return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), 'manifest.webmanifest')
    return send_from_directory(FRONTEND_DIR, path)

# Run the app (IMPORTANT: Use socketio.run to enable Socket.IO support)
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
