import sqlite3
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), 'auraos.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            event_type TEXT NOT NULL,
            status TEXT NOT NULL,
            description TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Check if empty, seed default activities if empty
    cursor.execute('SELECT COUNT(*) FROM activity_events')
    count = cursor.fetchone()[0]
    if count == 0:
        seed_data = [
            {
                'event_id': f'act-{uuid.uuid4().hex[:6]}',
                'title': 'Intent Plan Synthesis: Quantum Computing Research',
                'event_type': 'plans',
                'status': 'Completed',
                'description': 'Extracted top papers from Google Scholar and generated executive digest.',
                'timestamp': '10:14 AM Today'
            },
            {
                'event_id': f'act-{uuid.uuid4().hex[:6]}',
                'title': 'Browser Environment Launch: GitHub Vector DB Comparison',
                'event_type': 'browsing',
                'status': 'Active',
                'description': 'Opened workspace tabs for Qdrant, Milvus, and Pinecone repositories.',
                'timestamp': '09:45 AM Today'
            },
            {
                'event_id': f'act-{uuid.uuid4().hex[:6]}',
                'title': 'Security Shield Audit: Cross-Origin Workspace Check',
                'event_type': 'system',
                'status': 'Passed',
                'description': 'Zero vulnerabilities found. Aura Sandbox isolation verified.',
                'timestamp': '08:30 AM Today'
            }
        ]
        for item in seed_data:
            cursor.execute('''
                INSERT INTO activity_events (event_id, title, event_type, status, description, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (item['event_id'], item['title'], item['event_type'], item['status'], item['description'], item['timestamp']))
        conn.commit()
    conn.close()

def get_activities() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT event_id, title, event_type, status, description, timestamp FROM activity_events ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_activity(title: str, event_type: str, status: str, description: str, timestamp: str = None) -> Dict[str, Any]:
    if not timestamp:
        timestamp = datetime.now().strftime('%I:%M %p Today')
    
    event_id = f'act-{uuid.uuid4().hex[:6]}'
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO activity_events (event_id, title, event_type, status, description, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (event_id, title, event_type, status, description, timestamp))
    conn.commit()
    conn.close()
    
    return {
        'event_id': event_id,
        'title': title,
        'event_type': event_type,
        'status': status,
        'description': description,
        'timestamp': timestamp
    }
