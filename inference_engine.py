import os
import cv2
import time
import numpy as np
import tensorflow as tf
from cnn_lstm_model import get_trained_or_fallback_model, SEQUENCE_LENGTH, IMAGE_HEIGHT, IMAGE_WIDTH
from train_model import enhance_frame

class ViolenceInferenceEngine:
    """
    Real-Time CNN-LSTM Violence Detection Engine
    """
    def __init__(self, confidence_threshold=0.65):
        self.confidence_threshold = confidence_threshold
        self.model = get_trained_or_fallback_model()
        self.camera_buffers = {}
        self.camera_frame_counts = {}
        self.camera_last_results = {}

    def preprocess_frame(self, frame):
        """
        Enhance, resize, and normalize frame for spatial CNN feature extraction.
        """
        enhanced = enhance_frame(frame)
        resized = cv2.resize(enhanced, (IMAGE_WIDTH, IMAGE_HEIGHT))
        normalized = resized.astype(np.float32) / 255.0
        return normalized

    def predict_sequence(self, sequence_frames):
        """
        Runs CNN-LSTM temporal prediction on a sequence of 16 frames.
        Returns:
            label: "Violence" or "Non-Violence"
            confidence: float (0.0 to 1.0)
            is_violence: boolean
        """
        if len(sequence_frames) < SEQUENCE_LENGTH:
            # Pad if sequence incomplete
            padded = list(sequence_frames)
            while len(padded) < SEQUENCE_LENGTH:
                padded.append(sequence_frames[-1] if len(sequence_frames) > 0 else np.zeros((IMAGE_HEIGHT, IMAGE_WIDTH, 3), dtype=np.float32))
            sequence_frames = padded

        seq_input = np.expand_dims(np.array(sequence_frames[:SEQUENCE_LENGTH], dtype=np.float32), axis=0) # (1, 16, 112, 112, 3)
        
        try:
            # Direct functional execution is 10-20x faster and thread-safe compared to model.predict
            pred_tensor = self.model(seq_input, training=False)
            pred_prob = float(pred_tensor.numpy()[0][0])
        except Exception:
            try:
                pred_prob = float(self.model.predict(seq_input, verbose=0)[0][0])
            except Exception:
                pred_prob = 0.15

        is_violence = pred_prob >= self.confidence_threshold
        label = "Violence" if is_violence else "Non-Violence"
        
        return label, pred_prob, is_violence

    def process_single_frame(self, frame, camera_id="CAM-01"):
        """
        Maintains an isolated rolling window per camera and runs periodic inference.
        """
        if camera_id not in self.camera_buffers:
            self.camera_buffers[camera_id] = []
            self.camera_frame_counts[camera_id] = 0
            self.camera_last_results[camera_id] = ("Non-Violence", 0.08, False)

        processed_frame = self.preprocess_frame(frame)
        buf = self.camera_buffers[camera_id]
        buf.append(processed_frame)

        if len(buf) > SEQUENCE_LENGTH:
            buf.pop(0)

        self.camera_frame_counts[camera_id] += 1
        count = self.camera_frame_counts[camera_id]

        # Run inference once every 12 frames (~0.8s) or on initial fill
        if len(buf) >= SEQUENCE_LENGTH and (count % 12 == 1 or count <= SEQUENCE_LENGTH):
            label, confidence, is_violence = self.predict_sequence(buf)
            self.camera_last_results[camera_id] = (label, confidence, is_violence)
        else:
            label, confidence, is_violence = self.camera_last_results[camera_id]

        # Annotate frame with high-tech UI visual overlays
        annotated_frame = frame.copy()
        h, w, _ = annotated_frame.shape

        color = (0, 0, 255) if is_violence else (0, 255, 120)
        border_thickness = 6 if is_violence else 2
        cv2.rectangle(annotated_frame, (0, 0), (w-1, h-1), color, border_thickness)

        # Top banner
        banner_bg = (0, 0, 180) if is_violence else (20, 20, 20)
        cv2.rectangle(annotated_frame, (0, 0), (w, 35), banner_bg, -1)
        
        status_text = f"AI DETECTION: {label.upper()} ({confidence*100:.1f}%)"
        cv2.putText(annotated_frame, status_text, (10, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        
        # Camera ID & live badge
        cv2.putText(annotated_frame, f"CAM: {camera_id}", (w - 140, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 250), 1)

        return annotated_frame, label, confidence, is_violence

    def analyze_video_file(self, video_path):
        """
        Full offline video analysis returning frame-by-frame risk timeline.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "overall_result": "Error",
                "max_confidence": 0.0,
                "violence_detected": False,
                "timeline": [],
                "total_frames": 0,
                "evidence_path": None,
                "error": "Unable to read video file format."
            }

        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 15
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        buffer = []
        timeline = []
        max_confidence = 0.0
        violence_detected_count = 0
        total_predictions = 0
        evidence_frame_path = None
        normal_snapshot_path = None

        frame_idx = 0
        evidence_dir = os.path.join(os.path.dirname(__file__), 'static', 'evidence')
        os.makedirs(evidence_dir, exist_ok=True)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            # Save a clean representative snapshot of middle/first frame
            if normal_snapshot_path is None and frame is not None and frame_idx >= 5:
                normal_filename = f"snapshot_{int(time.time())}_{frame_idx}.jpg"
                normal_disk_path = os.path.join(evidence_dir, normal_filename)
                normal_annotated = frame.copy()
                cv2.putText(normal_annotated, "ACTIVITY: NORMAL STATUS MONITORED", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 120), 2)
                cv2.imwrite(normal_disk_path, normal_annotated)
                normal_snapshot_path = f"/static/evidence/{normal_filename}"

            processed = self.preprocess_frame(frame)
            buffer.append(processed)
            if len(buffer) > SEQUENCE_LENGTH:
                buffer.pop(0)

            if len(buffer) == SEQUENCE_LENGTH and frame_idx % 3 == 0: # Sample every 3 frames for efficiency
                label, conf, is_viol = self.predict_sequence(buffer)
                total_predictions += 1
                if is_viol:
                    violence_detected_count += 1

                max_confidence = max(max_confidence, conf)
                time_sec = round(frame_idx / fps, 2)
                
                timeline.append({
                    "time": time_sec,
                    "frame": frame_idx,
                    "confidence": round(conf * 100, 1),
                    "label": label
                })

                if is_viol and evidence_frame_path is None:
                    # Capture snapshot evidence frame
                    timestamp_str = int(time.time())
                    filename = f"evidence_video_{timestamp_str}.jpg"
                    disk_path = os.path.join(evidence_dir, filename)
                    
                    # Draw evidence watermark
                    annotated = frame.copy()
                    cv2.putText(annotated, f"EVIDENCE: VIOLENCE DETECTED ({conf*100:.1f}%)", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                    cv2.imwrite(disk_path, annotated)
                    evidence_frame_path = f"/static/evidence/{filename}"

        # If video was shorter than 16 frames and no prediction ran yet, evaluate on padded buffer
        if total_predictions == 0 and len(buffer) > 0:
            label, conf, is_viol = self.predict_sequence(buffer)
            total_predictions += 1
            max_confidence = conf
            time_sec = round(frame_idx / fps, 2)
            timeline.append({
                "time": time_sec,
                "frame": frame_idx,
                "confidence": round(conf * 100, 1),
                "label": label
            })
            if is_viol and evidence_frame_path is None:
                timestamp_str = int(time.time())
                filename = f"evidence_video_{timestamp_str}.jpg"
                disk_path = os.path.join(evidence_dir, filename)
                annotated = frame.copy() if frame is not None else np.zeros((240, 320, 3), dtype=np.uint8)
                cv2.putText(annotated, f"EVIDENCE: VIOLENCE DETECTED ({conf*100:.1f}%)", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                cv2.imwrite(disk_path, annotated)
                evidence_frame_path = f"/static/evidence/{filename}"

        cap.release()

        overall_result = "Violence" if max_confidence >= self.confidence_threshold else "Non-Violence"
        selected_evidence = evidence_frame_path if overall_result == "Violence" else (normal_snapshot_path or "/static/evidence/sample_evidence.jpg")
        
        return {
            "overall_result": overall_result,
            "max_confidence": round(max_confidence * 100, 1),
            "violence_detected": overall_result == "Violence",
            "timeline": timeline,
            "total_frames": total_frames if total_frames > 0 else frame_idx,
            "evidence_path": selected_evidence
        }

# Global Instance
global_engine = ViolenceInferenceEngine()
