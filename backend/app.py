from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
# import eventlet
# import eventlet.wsgi
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import socket
import os
import random

# File paths and user data
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
HTML_DIR = os.path.join(FRONTEND_DIR, "html")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
DATA_DIR = os.path.join(ROOT_DIR, "data")
FILES_DIR = os.path.join(ROOT_DIR, "files")
LIBS_DIR = os.path.join(FILES_DIR, "libs")

# Initialize Flask app and SocketIO
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="", template_folder=HTML_DIR)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
host_ip = socket.gethostbyname(socket.gethostname())

# Other file paths
USER_DATA_FILE = os.path.join(DATA_DIR, 'users.json')
MESSAGES_FILE = os.path.join(DATA_DIR, "messages.json")
os.makedirs(DATA_DIR, exist_ok=True)

# Helper functions
def load_users():
    if not os.path.exists(USER_DATA_FILE):
        return []
    with open(USER_DATA_FILE, "r") as file:
        return json.load(file)

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

def send_reset_email(to_email, reset_link):
    from_email = "zylosupp0rt@gmail.com"
    password = "kgawzxrfthcytgfu"

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
        
# Load existing messages
messages = load_messages()

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
    avatar = data.get("avatar") or "/images/default_avatar.png"
    banner = data.get("banner") or "/images/default_banner.png"
    
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

    new_user = {
        "username": username,
        "email": email,
        "password": password,
        "usertag": usertag,
        "dob": dob,
        "gender": gender,
        "phone": phone,
        "avatar": avatar,
        "banner": banner
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

    
@socketio.on("typing")
def handle_typing(data):
    emit("typing", data, broadcast=True, include_self=False)
    
@app.route('/<path:path>')
def serve_static_file(path):
    return send_from_directory(FRONTEND_DIR, path)
    
@app.route("/api/stats", methods=["GET"])
def get_stats():
    users = load_users()
    user_count = len(users)
    message_count = len(messages) 
    room_count = 1

    return jsonify({
        "users": user_count,
        "messages": message_count,
        "rooms": room_count
    })

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
def serve_login():
    return send_from_directory(HTML_DIR, 'login.html')

@app.route('/main')
def serve_main():
    return send_from_directory(HTML_DIR, 'mainapp.html')

@app.route("/libs/<path:filename>")
def serve_libs(filename):
    return send_from_directory(LIBS_DIR, filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(ASSETS_DIR, '../images'), filename)

@app.route('/uploads/<username>/<filename>')
def serve_upload(username, filename):
    return send_from_directory(os.path.join(DATA_DIR, 'uploads', username), filename)

@app.route('/files/<path:filename>')
def serve_files(filename):
    return send_from_directory(FILES_DIR, filename)

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

    user_upload_dir = os.path.join(BASE_DIR, '..', 'uploads', username)
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

# Run the app (IMPORTANT: Use socketio.run to enable WebSocket support)
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
