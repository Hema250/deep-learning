import os
import sqlite3
import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reseed=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")

    if force_reseed:
        cursor.execute("DROP TABLE IF EXISTS users")
        cursor.execute("DROP TABLE IF EXISTS departments")
        cursor.execute("DROP TABLE IF EXISTS cameras")
        cursor.execute("DROP TABLE IF EXISTS incidents")
        cursor.execute("DROP TABLE IF EXISTS uploaded_videos")

    # Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL, -- 'admin' or 'hod'
        full_name TEXT NOT NULL,
        department TEXT,
        assigned_classes TEXT
    );
    ''')

    # Departments Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        hod_username TEXT,
        classes TEXT NOT NULL
    );
    ''')

    # Cameras Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        department TEXT NOT NULL,
        class_section TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        pos_x FLOAT DEFAULT 0.0,
        pos_y FLOAT DEFAULT 0.0,
        pos_z FLOAT DEFAULT 0.0
    );
    ''')

    # Incidents Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_code TEXT UNIQUE NOT NULL,
        timestamp TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        department TEXT NOT NULL,
        class_section TEXT NOT NULL,
        location TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        evidence_image TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Alert Active',
        acknowledged_by TEXT,
        notes TEXT
    );
    ''')

    # Uploaded Videos Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS uploaded_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        upload_time TEXT NOT NULL,
        prediction_result TEXT NOT NULL,
        max_confidence REAL NOT NULL,
        evidence_image TEXT
    );
    ''')

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("Seeding database with role-based access for Main Admin & Department HODs...")
        
        users_data = [
            ('admin', 'admin123', 'admin', 'Dr. Robert Vance (Chief Security Admin)', 'ALL', 'ALL'),
            ('hod_aids', 'hod123', 'hod', 'Dr. K. Ramanathan (HOD AI & DS Department)', 'AI & DS', 'AI & DS – III A,AI & DS – III B,AI & DS – IV A,AI & DS – IV B'),
            ('hod_cse', 'hod123', 'hod', 'Prof. Alan Turing (HOD CSE Department)', 'CSE', 'CSE – III A,CSE – III B,CSE – IV A,CSE – IV B'),
            ('hod_ece', 'hod123', 'hod', 'Dr. C. Shannon (HOD ECE Department)', 'ECE', 'ECE – III A,ECE – III B,ECE – IV A,ECE – IV B'),
            ('hod_eee', 'hod123', 'hod', 'Prof. Michael Faraday (HOD EEE Department)', 'EEE', 'EEE – III A,EEE – III B,EEE – IV A,EEE – IV B'),
            ('hod_me', 'hod123', 'hod', 'Dr. Nikola Tesla (HOD Mechanical Department)', 'ME', 'ME – III A,ME – III B,ME – IV A,ME – IV B')
        ]
        cursor.executemany("INSERT INTO users (username, password, role, full_name, department, assigned_classes) VALUES (?,?,?,?,?,?)", users_data)

        depts_data = [
            ('AIDS', 'AI & DS', 'hod_aids', 'AI & DS – III A, AI & DS – III B, AI & DS – IV A, AI & DS – IV B'),
            ('CSE', 'CSE', 'hod_cse', 'CSE – III A, CSE – III B, CSE – IV A, CSE – IV B'),
            ('ECE', 'ECE', 'hod_ece', 'ECE – III A, ECE – III B, ECE – IV A, ECE – IV B'),
            ('EEE', 'EEE', 'hod_eee', 'EEE – III A, EEE – III B, EEE – IV A, EEE – IV B'),
            ('ME', 'ME', 'hod_me', 'ME – III A, ME – III B, ME – IV A, ME – IV B')
        ]
        cursor.executemany("INSERT INTO departments (code, name, hod_username, classes) VALUES (?,?,?,?)", depts_data)

        cameras_data = [
            # AI & DS Department Cameras (-20, y, 10)
            ('CAM-AIDS01', 'AI & DS Lab 1 Corridor', 'AI & DS Block Floor 2', 'AI & DS', 'AI & DS – III A', 'Active', -20.0, 3.0, 10.0),
            ('CAM-AIDS02', 'Deep Learning & ML Lab', 'AI & DS Block Floor 2', 'AI & DS', 'AI & DS – III B', 'Active', -18.0, 3.0, 6.0),
            ('CAM-AIDS03', 'AI Lecture Theatre A', 'AI & DS Block Floor 3', 'AI & DS', 'AI & DS – IV A', 'Active', -22.0, 3.0, 14.0),
            ('CAM-AIDS04', 'Data Science Computing Bay', 'AI & DS Block Floor 3', 'AI & DS', 'AI & DS – IV B', 'Active', -16.0, 3.0, 8.0),

            # CSE Department Cameras (-10, y, -15)
            ('CAM-CSE01', 'CSE Software Lab 3', 'CSE Block Floor 2 Corridor', 'CSE', 'CSE – III A', 'Active', -10.0, 3.0, -15.0),
            ('CAM-CSE02', 'CSE Lecture Hall 2', 'CSE Block Floor 2 Hall 2', 'CSE', 'CSE – III B', 'Active', -8.0, 3.0, -12.0),
            ('CAM-CSE03', 'Networks Computing Bay', 'CSE Block Floor 3 Lab', 'CSE', 'CSE – IV A', 'Active', -12.0, 3.0, -18.0),
            ('CAM-CSE04', 'Cloud Computing Center', 'CSE Block Floor 3 Center', 'CSE', 'CSE – IV B', 'Active', -6.0, 3.0, -10.0),

            # ECE Department Cameras (15, y, -15)
            ('CAM-ECE01', 'VLSI Design Studio', 'ECE Block Floor 1', 'ECE', 'ECE – III A', 'Active', 15.0, 3.0, -15.0),
            ('CAM-ECE02', 'Signal Processing Lab', 'ECE Block Floor 1 Lab', 'ECE', 'ECE – III B', 'Active', 18.0, 3.0, -18.0),
            ('CAM-ECE03', 'Embedded Systems Wing', 'ECE Block Floor 2', 'ECE', 'ECE – IV A', 'Active', 12.0, 3.0, -12.0),
            ('CAM-ECE04', 'Communication Systems Hall', 'ECE Block Floor 2 Hall', 'ECE', 'ECE – IV B', 'Active', 16.0, 3.0, -20.0),

            # EEE Department Cameras (18, y, 10)
            ('CAM-EEE01', 'High Voltage Power Arena', 'EEE Block Ground Floor', 'EEE', 'EEE – III A', 'Active', 18.0, 3.0, 10.0),
            ('CAM-EEE02', 'Power Electronics Wing', 'EEE Block Floor 1', 'EEE', 'EEE – III B', 'Active', 20.0, 3.0, 14.0),
            ('CAM-EEE03', 'Electrical Machines Lab', 'EEE Block Floor 1 Lab', 'EEE', 'EEE – IV A', 'Active', 16.0, 3.0, 6.0),
            ('CAM-EEE04', 'Renewable Energy Lab', 'EEE Block Rooftop Facility', 'EEE', 'EEE – IV B', 'Active', 22.0, 5.0, 18.0),

            # ME Department Cameras (5, y, 20)
            ('CAM-ME01', 'Heavy Machinery Workshop', 'ME Block Workshop Bay 1', 'ME', 'ME – III A', 'Active', 5.0, 2.5, 20.0),
            ('CAM-ME02', 'Robotics & Automation Lab', 'ME Block Floor 1', 'ME', 'ME – III B', 'Active', 8.0, 2.5, 24.0),
            ('CAM-ME03', 'Thermal Dynamics Bay', 'ME Block Ground Floor', 'ME', 'ME – IV A', 'Active', 2.0, 2.5, 16.0),
            ('CAM-ME04', 'CAD/CAM Design Studio', 'ME Block Floor 2 Studio', 'ME', 'ME – IV B', 'Active', 10.0, 3.0, 26.0),

            # Main Admin Plaza Camera (0, y, 0)
            ('CAM-AD01', 'Main Administration Plaza', 'Central Campus Lawn', 'Admin', 'General Plaza', 'Active', 0.0, 3.5, 0.0)
        ]
        cursor.executemany("INSERT INTO cameras (camera_id, name, location, department, class_section, status, pos_x, pos_y, pos_z) VALUES (?,?,?,?,?,?,?,?,?)", cameras_data)

        now = datetime.datetime.now()
        incidents_data = [
            ('INC-9101', (now - datetime.timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"), 'CAM-AIDS01', 'AI & DS', 'AI & DS – III A', 'AI & DS Block Floor 2 Corridor', 96.8, '/static/evidence/sample_evidence.jpg', 'Alert Active', None, 'Physical altercation flagged near AI & DS Lab 1.'),
            ('INC-9102', (now - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"), 'CAM-AIDS03', 'AI & DS', 'AI & DS – IV A', 'AI & DS Block Floor 3 Lecture Theatre', 92.4, '/static/evidence/sample_evidence.jpg', 'Acknowledged', 'Dr. K. Ramanathan', 'Scuffle resolved by staff after lecture.'),
            ('INC-9103', (now - datetime.timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S"), 'CAM-CSE01', 'CSE', 'CSE – III A', 'CSE Block Floor 2 Corridor', 89.5, '/static/evidence/sample_evidence.jpg', 'Under Investigation', 'Prof. Alan Turing', 'High motion anomaly logged near lab.'),
            ('INC-9104', (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), 'CAM-ME01', 'ME', 'ME – III A', 'ME Block Workshop Bay 1', 94.2, '/static/evidence/sample_evidence.jpg', 'Resolved', 'Dr. Nikola Tesla', 'Verbal dispute resolved by workshop instructor.')
        ]
        cursor.executemany("INSERT INTO incidents (incident_code, timestamp, camera_id, department, class_section, location, confidence_score, evidence_image, status, acknowledged_by, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)", incidents_data)

        conn.commit()

    conn.close()

if __name__ == '__main__':
    init_db(force_reseed=True)
    print("Database reseeded with AI & DS and Department HOD role permissions.")
