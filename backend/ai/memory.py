import json
import os
from typing import List, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
USER_MEMORY_FILE = os.path.join(DATA_DIR, 'user_memory.json')

os.makedirs(DATA_DIR, exist_ok=True)


def _load_all_memory() -> Dict[str, Any]:
    if not os.path.exists(USER_MEMORY_FILE):
        return {}
    try:
        with open(USER_MEMORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def _save_all_memory(mem: Dict[str, Any]) -> None:
    with open(USER_MEMORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(mem, f, indent=2)


def get_user_memory(username: str) -> Dict[str, Any]:
    all_mem = _load_all_memory()
    return all_mem.get(username) or {"facts": [], "preferences": {}, "conversations": []}


def append_conversation(username: str, messages: List[Dict[str, str]], max_keep: int = 50) -> None:
    all_mem = _load_all_memory()
    u = all_mem.get(username) or {"facts": [], "preferences": {}, "conversations": []}
    convs = u.get("conversations") or []
    convs.append(messages)
    # Trim old conversations
    if len(convs) > max_keep:
        convs = convs[-max_keep:]
    u["conversations"] = convs
    all_mem[username] = u
    _save_all_memory(all_mem)


def upsert_fact(username: str, fact: str) -> None:
    fact = (fact or '').strip()
    if not fact:
        return
    all_mem = _load_all_memory()
    u = all_mem.get(username) or {"facts": [], "preferences": {}, "conversations": []}
    facts = u.get("facts") or []
    if fact not in facts:
        facts.append(fact)
    u["facts"] = facts
    all_mem[username] = u
    _save_all_memory(all_mem)


def set_preference(username: str, key: str, value: Any) -> None:
    all_mem = _load_all_memory()
    u = all_mem.get(username) or {"facts": [], "preferences": {}, "conversations": []}
    prefs = u.get("preferences") or {}
    prefs[str(key)] = value
    u["preferences"] = prefs
    all_mem[username] = u
    _save_all_memory(all_mem)


def clear_user_memory(username: str) -> None:
    """Remove all stored memory for a user."""
    all_mem = _load_all_memory()
    all_mem[username] = {"facts": [], "preferences": {}, "conversations": []}
    _save_all_memory(all_mem)
