import sqlite3
import json
import os

# ***THIS DATABASE MODULE IS STILL UNDER DEVELOPMENT***
# It's hasen't been fully tested yet, so use with caution.
# It currently uses SQLite for user data storage.
# If the DB is unreachable, it falls back to a JSON file.
# Future plans include switching to a more robust DB system.

# Centralize database and JSON storage under backend/data
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DB_PATH = os.path.join(DATA_DIR, 'users.db')
JSON_PATH = os.path.join(DATA_DIR, 'users.json')
os.makedirs(DATA_DIR, exist_ok=True)

def get_connection():
    try:
        conn = sqlite3.connect(DB_PATH)
        return conn
    except Exception as e:
        print("DB error:", e)
        return None

def init_db():
    conn = get_connection()
    if conn:
        try:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT,
                    avatar TEXT,
                    banner TEXT,
                    aboutMe TEXT
                )
            ''')
            conn.commit()
        except Exception as e:
            print("Error initializing DB:", e)
        finally:
            conn.close()

def save_user(user):
    conn = get_connection()
    if conn:
        try:
            conn.execute('''
                INSERT OR REPLACE INTO users (username, password, email, avatar, banner, aboutMe)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user['username'], user['password'], user.get('email'), user.get('avatar'), user.get('banner'), user.get('aboutMe')))
            conn.commit()
        except Exception as e:
            print("DB error, saving to JSON:", e)
            save_user_json(user)
        finally:
            conn.close()
    else:
        save_user_json(user)

def save_user_json(user):
    users = []
    # Ensure data directory exists before writing
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, 'r') as f:
            try:
                users = json.load(f)
            except Exception:
                users = []
    users = [u for u in users if u['username'] != user['username']]
    users.append(user)
    with open(JSON_PATH, 'w') as f:
        json.dump(users, f, indent=2)

# Call this once at startup
init_db()