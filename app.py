import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

from flask import Flask, render_template, request, jsonify
import sqlite3
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json
import random

load_dotenv()

app = Flask(__name__)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Multi-Agent Architecture Base Class
class AIAgent:
    def __init__(self, name, role, instructions):
        self.name = name
        self.role = role
        self.instructions = instructions
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def execute(self, task):
        prompt = f"System: You are {self.name}, {self.role}.\nInstructions: {self.instructions}\n\nTask:\n{task}"
        response = self.model.generate_content(prompt)
        return response.text.strip()


# Database Setup
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT,
            status TEXT DEFAULT 'active'
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            duration INTEGER DEFAULT 60
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            institution TEXT,
            bio TEXT,
            level TEXT DEFAULT 'Beginner',
            goal TEXT DEFAULT 'Learn and grow',
            avatar_color TEXT DEFAULT '#7c3aed'
        )
    ''')
    # Create a default profile if none exists
    prof = conn.execute('SELECT COUNT(*) FROM profile').fetchone()[0]
    if prof == 0:
        conn.execute('INSERT INTO profile (name, email, institution, bio) VALUES (?, ?, ?, ?)',
                     ('Student', 'student@example.com', 'Self Taught', 'Ready to learn!'))
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/proposal')
def proposal():
    try:
        with open('project_proposal.md', 'r', encoding='utf-8') as f:
            content = f.read()
        return render_template('proposal.html', content=content)
    except Exception as e:
        return str(e)

# AI Planner Endpoint (Multi-Agent System)
@app.route('/api/generate_plan', methods=['POST'])
def generate_plan():
    if not api_key:
        return jsonify({"error": "Gemini API key is not configured in .env file"}), 500
        
    data = request.json
    topic = data.get('topic', 'General Studies')
    start_date = data.get('start_date', '')
    goal_date = data.get('goal_date', 'Unknown')
    hours = data.get('hours', 3)
    level = data.get('level', 'beginner')
    objectives = data.get('objectives', '')
    today = datetime.now().strftime("%Y-%m-%d")
    
    date_context = f"Start Date: {start_date} | End Date: {goal_date}" if start_date else f"Goal Date: {goal_date} (Today is {today})"
    
    # Initialize our crew of specialized agents
    curriculum_designer = AIAgent(
        name="Curriculum Designer",
        role="Expert Educational Planner",
        instructions="Create 3 concise phases of study for the given topic. Return ONLY HTML without markdown formatting. Structure it strictly as: <div class='plan-item'><h4>Phase X: Title</h4><p>Description</p><ul><li>Topic 1</li></ul></div>"
    )
    
    scheduler = AIAgent(
        name="Study Scheduler",
        role="Strict Time Management Expert",
        instructions="Generate 5-10 specific study sessions distributed evenly between the Start Date and End Date. Daily hours must align with the user's availability. Return ONLY a valid JSON array without any markdown wrappers (like ```json), where each object contains: 'title' (string), 'date' (YYYY-MM-DD), 'time' (HH:MM 24-hour format), and 'duration' (integer, minutes)."
    )
    
    note_taker = AIAgent(
        name="Content Writer",
        role="Expert Subject Matter Writer",
        instructions="Generate a robust, detailed set of starter notes in Markdown format based on the curriculum phases provided. Do not use markdown wrappers for the final output."
    )
    
    try:
        # Agent 1: Design Curriculum
        html_plan = curriculum_designer.execute(f"Topic: {topic}\nLevel: {level}\nObjectives: {objectives}")
        html_plan = html_plan.replace("```html", "").replace("```", "").strip()
        
        # Agent 2: Schedule Sessions based on Curriculum
        scheduler_task = f"Topic: {topic}\nDates: {date_context}\nDaily Hours Available: {hours}\nCurriculum Phases:\n{html_plan}"
        sessions_json_str = scheduler.execute(scheduler_task)
        sessions_json_str = sessions_json_str.replace("```json", "").replace("```", "").strip()
        try:
            sessions = json.loads(sessions_json_str)
        except json.JSONDecodeError:
            sessions = [{"title": "Initial Study Session", "date": today, "time": "10:00", "duration": 60}]
            
        # Agent 3: Write Starter Notes
        notes_body = note_taker.execute(f"Topic: {topic}\nLevel: {level}\nCurriculum Phases:\n{html_plan}")
        
        conn = get_db_connection()
        
        # 1. Add Subject
        color = '#' + ''.join([random.choice('0123456789ABCDEF') for j in range(6)])
        conn.execute('INSERT INTO subjects (name, color) VALUES (?, ?)', (topic, color))
        
        # 2. Add Sessions
        for session in sessions:
            conn.execute('INSERT INTO sessions (title, date, time, duration) VALUES (?, ?, ?, ?)',
                         (session.get('title'), session.get('date'), session.get('time'), session.get('duration')))
                         
        # 3. Add Starter Note
        notes_title = f"Starter Notes: {topic}"
        conn.execute('INSERT INTO notes (title, body) VALUES (?, ?)', (notes_title, notes_body))
                     
        # 4. Add Notification
        msg = f"🤖 Multi-Agent System configured '{topic}': Curriculum designed, {len(sessions)} sessions scheduled, and starter notes written!"
        conn.execute('INSERT INTO notifications (message, type) VALUES (?, ?)', (msg, 'success'))
        
        conn.commit()
        conn.close()
        
        return jsonify({"plan": html_plan})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Notes API
@app.route('/api/notes', methods=['GET', 'POST'])
def handle_notes():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute('INSERT INTO notes (title, body) VALUES (?, ?)', 
                           (data['title'], data['body']))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"id": new_id, "title": data['title'], "body": data['body']})
    else:
        notes = conn.execute('SELECT * FROM notes ORDER BY created_at DESC').fetchall()
        conn.close()
        return jsonify([dict(n) for n in notes])

@app.route('/api/notes/<int:note_id>', methods=['PUT', 'DELETE'])
def update_delete_note(note_id):
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        conn.execute('UPDATE notes SET title = ?, body = ? WHERE id = ?', 
                     (data['title'], data['body'], note_id))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    elif request.method == 'DELETE':
        conn.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

# Subjects API
@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute('INSERT INTO subjects (name, color) VALUES (?, ?)', 
                           (data['name'], data.get('color', '#7c3aed')))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"id": new_id, "name": data['name'], "color": data.get('color', '#7c3aed'), "status": "active"})
    else:
        subjects = conn.execute('SELECT * FROM subjects ORDER BY id DESC').fetchall()
        conn.close()
        return jsonify([dict(s) for s in subjects])

@app.route('/api/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/subjects/<int:subject_id>/toggle', methods=['PUT'])
def toggle_subject(subject_id):
    conn = get_db_connection()
    data = request.json
    conn.execute('UPDATE subjects SET status = ? WHERE id = ?', (data['status'], subject_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Sessions API
@app.route('/api/sessions', methods=['GET', 'POST'])
def handle_sessions():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute('INSERT INTO sessions (title, date, time, duration) VALUES (?, ?, ?, ?)', 
                           (data['title'], data['date'], data['time'], data.get('duration', 60)))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"id": new_id, "title": data['title'], "date": data['date'], "time": data['time'], "duration": data.get('duration', 60)})
    else:
        sessions = conn.execute('SELECT * FROM sessions ORDER BY date ASC, time ASC').fetchall()
        conn.close()
        return jsonify([dict(s) for s in sessions])

@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Notifications API
@app.route('/api/notifications', methods=['GET', 'POST'])
def handle_notifications():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute('INSERT INTO notifications (message, type) VALUES (?, ?)', 
                           (data['message'], data.get('type', 'info')))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"id": new_id, "success": True})
    else:
        # Get unread notifications
        notifs = conn.execute('SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 10').fetchall()
        conn.close()
        return jsonify([dict(n) for n in notifs])

@app.route('/api/notifications/read', methods=['POST'])
def mark_notifications_read():
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET is_read = 1 WHERE is_read = 0')
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Profile API (Multi-Profile Support)
@app.route('/api/profiles', methods=['GET', 'POST'])
def handle_profiles():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute('''
            INSERT INTO profile (name, email, institution, bio, level, goal, avatar_color) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('name', 'New Student'),
            data.get('email', ''),
            data.get('institution', ''),
            data.get('bio', ''),
            data.get('level', 'Beginner'),
            data.get('goal', 'Learn and grow'),
            data.get('avatar_color', '#7c3aed')
        ))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"id": new_id, "success": True})
    else:
        profs = conn.execute('SELECT * FROM profile').fetchall()
        conn.close()
        return jsonify([dict(p) for p in profs])

@app.route('/api/profiles/<int:prof_id>', methods=['GET', 'PUT'])
def specific_profile(prof_id):
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.json
        conn.execute('''
            UPDATE profile 
            SET name = ?, email = ?, institution = ?, bio = ?, level = ?, goal = ? 
            WHERE id = ?
        ''', (
            data.get('name'), data.get('email'), data.get('institution'), 
            data.get('bio'), data.get('level'), data.get('goal'), prof_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    else:
        prof = conn.execute('SELECT * FROM profile WHERE id = ?', (prof_id,)).fetchone()
        conn.close()
        if prof:
            return jsonify(dict(prof))
        return jsonify({"error": "Not found"}), 404

# Extra AI Features
@app.route('/api/ai_insights', methods=['GET'])
def ai_insights():
    if not api_key:
        return jsonify({"insight": "Please configure your Gemini API key to receive AI insights."})
    
    coach = AIAgent(
        name="Study Coach",
        role="Motivational Mentor",
        instructions="Provide a short, highly motivating, and insightful 1-2 sentence tip for a student studying today. Keep it fresh and engaging."
    )
    try:
        insight = coach.execute("Generate a motivational insight.")
        return jsonify({"insight": insight})
    except Exception as e:
        return jsonify({"insight": "Stay focused and keep up the great work! (AI insight unavailable)"})

@app.route('/api/generate_notes', methods=['POST'])
def auto_generate_notes():
    if not api_key:
        return jsonify({"error": "API key not configured"}), 500
    
    data = request.json
    topic = data.get('topic', 'General Studies')
    
    note_expert = AIAgent(
        name="Note Expert",
        role="Expert Tutor",
        instructions="Create a comprehensive but concise set of study notes. Use markdown formatting, bullet points, and highlight key terms. Do not include markdown code blocks (like ```markdown), just the raw text."
    )
    try:
        notes = note_expert.execute(f"Topic: '{topic}'")
        return jsonify({"notes": notes})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai_tutor', methods=['POST'])
def ai_tutor():
    if not api_key:
        return jsonify({"error": "API key not configured"}), 500
        
    data = request.json
    question = data.get('question', '')
    context = data.get('context', '')
    
    researcher = AIAgent(
        name="Research Analyst",
        role="Deep Knowledge Extractor",
        instructions="Analyze the student's question and context. Extract core facts, key definitions, and relevant examples. Provide a factual, bulleted summary."
    )
    
    tutor = AIAgent(
        name="Pedagogical Expert",
        role="Friendly AI Tutor",
        instructions="Take the research provided and formulate a helpful, encouraging, and clear explanation for the student. Use an engaging tone, formatting with paragraphs or short lists as appropriate."
    )
    
    try:
        # Phase 1: Research
        research_notes = researcher.execute(f"Question: '{question}'\nContext: '{context}'")
        
        # Phase 2: Tutoring Response
        final_answer = tutor.execute(f"Student Question: '{question}'\nContext: '{context}'\nResearch Data:\n{research_notes}")
        
        return jsonify({"answer": final_answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
