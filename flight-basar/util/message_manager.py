import os
import json
from datetime import datetime
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DB_DIR = os.path.join(PROJECT_DIR, "db")

def save_message(name, email, nachricht):
    """Saves a contact message to a JSON file."""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    timestamp = datetime.now().isoformat()

    data = {
        "name": name,
        "email": email,
        "nachricht": nachricht,
        "sent_at": timestamp
    }

    # Create a hash from the timestamp to use as a filename
    hash_object = hashlib.md5(timestamp.encode())
    hex_hash = hash_object.hexdigest()

    file_path = os.path.join(DB_DIR, f"{hex_hash}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def list_messages():
    """Lists all saved messages."""
    records = []
    if not os.path.isdir(DB_DIR):
        return records

    for fn in os.listdir(DB_DIR):
        if not fn.endswith(".json"):
            continue

        file_path = os.path.join(DB_DIR, fn)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["_filename"] = fn
            records.append(data)
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            pass

    # Sort records by date, newest first
    records.sort(key=lambda r: r.get("sent_at", ""), reverse=True)
    return records
