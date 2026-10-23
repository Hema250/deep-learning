import os
import cv2
import numpy as np

DATASET_DIR = os.path.join(os.path.dirname(__file__), 'static', 'dataset')
VIOLENCE_DIR = os.path.join(DATASET_DIR, 'violence')
NON_VIOLENCE_DIR = os.path.join(DATASET_DIR, 'non_violence')
SAMPLE_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), 'static', 'uploads')

def create_synthetic_campus_video(filename, label="non_violence", duration_frames=45, fps=15):
    """
    Generates synthetic video clips simulating college CCTV footage:
    - non_violence: Smooth motion, calm walking students, steady lighting.
    - violence: Chaotic motion, rapid flickering color blocks, fast velocity movement.
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, (320, 240))

    np.random.seed(42 if label == "non_violence" else 99)

    for i in range(duration_frames):
        # Create base CCTV background (Hallway/Workshop tile background)
        frame = np.ones((240, 320, 3), dtype=np.uint8) * 40
        
        # Grid tiles
        for y in range(0, 240, 30):
            cv2.line(frame, (0, y), (320, y), (60, 60, 60), 1)
        for x in range(0, 320, 40):
            cv2.line(frame, (x, 0), (x, 240), (60, 60, 60), 1)

        # Campus overlay banner
        dept_name = "CS DEPT - LECTURE HALL A" if label == "non_violence" else "MECHANICAL WORKSHOP B"
        cv2.putText(frame, f"CCTV LIVE - {dept_name}", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 200), 1)
        
        timestamp = f"2026-10-06 14:{10 + i//30:02d}:{i%30*2:02d}"
        cv2.putText(frame, timestamp, (10, 230),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

        if label == "non_violence":
            # Smooth movement of 2 people walking normally
            pos_x1 = int(50 + i * 2.5) % 280
            pos_y1 = 120 + int(np.sin(i * 0.1) * 10)
            cv2.circle(frame, (pos_x1, pos_y1), 18, (0, 180, 255), -1) # Student 1
            cv2.circle(frame, (pos_x1, pos_y1 - 25), 8, (255, 220, 180), -1) # Head

            pos_x2 = int(250 - i * 2.0) % 280
            pos_y2 = 140 + int(np.cos(i * 0.1) * 8)
            cv2.circle(frame, (pos_x2, pos_y2), 18, (0, 200, 100), -1) # Student 2
            cv2.circle(frame, (pos_x2, pos_y2 - 25), 8, (255, 220, 180), -1)

            cv2.putText(frame, "STATUS: NORMAL ACTIVITY", (150, 230),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)

        else:
            # Aggressive rapid movement, violent shaking, red highlight flash
            shake_x = np.random.randint(-15, 15)
            shake_y = np.random.randint(-15, 15)
            
            p1_x = 140 + shake_x
            p1_y = 110 + shake_y
            p2_x = 160 - shake_x
            p2_y = 115 - shake_y

            # Red motion blur line between targets
            cv2.line(frame, (p1_x, p1_y), (p2_x, p2_y), (0, 0, 255), 5)
            cv2.circle(frame, (p1_x, p1_y), 22, (0, 0, 220), -1)
            cv2.circle(frame, (p2_x, p2_y), 22, (0, 50, 255), -1)

            # Red warning flash border
            if i % 4 < 2:
                cv2.rectangle(frame, (0, 0), (319, 239), (0, 0, 255), 4)

            cv2.putText(frame, "WARNING: HIGH MOTION ANOMALY", (130, 230),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)

        out.write(frame)

    out.release()
    print(f"Generated sample video: {filename}")

def generate_all_samples():
    os.makedirs(VIOLENCE_DIR, exist_ok=True)
    os.makedirs(NON_VIOLENCE_DIR, exist_ok=True)
    os.makedirs(SAMPLE_UPLOADS_DIR, exist_ok=True)

    # Generate dataset videos
    for i in range(1, 6):
        create_synthetic_campus_video(os.path.join(NON_VIOLENCE_DIR, f"normal_campus_{i}.mp4"), label="non_violence")
        create_synthetic_campus_video(os.path.join(VIOLENCE_DIR, f"violence_campus_{i}.mp4"), label="violence")

    # Generate sample video files for uploads/demo testing
    create_synthetic_campus_video(os.path.join(SAMPLE_UPLOADS_DIR, "demo_lecture_hall_normal.mp4"), label="non_violence", duration_frames=60)
    create_synthetic_campus_video(os.path.join(SAMPLE_UPLOADS_DIR, "demo_workshop_brawl_incident.mp4"), label="violence", duration_frames=60)

if __name__ == '__main__':
    generate_all_samples()
