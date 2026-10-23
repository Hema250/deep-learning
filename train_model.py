import os
import json
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg') # Non-interactive background plotting
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import tensorflow as tf

from cnn_lstm_model import build_lightweight_cnn_lstm, MODEL_PATH, SEQUENCE_LENGTH, IMAGE_HEIGHT, IMAGE_WIDTH
from generate_demo_dataset import generate_all_samples, DATASET_DIR, VIOLENCE_DIR, NON_VIOLENCE_DIR

METRICS_PATH = os.path.join(os.path.dirname(__file__), 'static', 'models', 'metrics.json')
PLOTS_DIR = os.path.join(os.path.dirname(__file__), 'static', 'models')

def enhance_frame(frame):
    """
    Applies image enhancement preprocessing (CLAHE histogram equalization & normalization)
    """
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return enhanced

def extract_sequences_from_video(video_path, seq_len=SEQUENCE_LENGTH, img_h=IMAGE_HEIGHT, img_w=IMAGE_WIDTH):
    """
    Extracts fixed-length normalized frame sequences from video file.
    """
    cap = cv2.VideoCapture(video_path)
    frames = []
    sequences = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Preprocessing & image enhancement
        enhanced = enhance_frame(frame)
        resized = cv2.resize(enhanced, (img_w, img_h))
        normalized = resized.astype(np.float32) / 255.0
        frames.append(normalized)

        if len(frames) == seq_len:
            sequences.append(np.array(frames))
            frames = frames[seq_len // 2:] # Overlapping sliding window step

    cap.release()
    return sequences

def prepare_dataset():
    """
    Loads dataset, extracts sequences, creates feature arrays X and label vector Y.
    """
    # Ensure synthetic dataset files exist
    generate_all_samples()

    X = []
    Y = []

    print("Extracting features from Non-Violence dataset videos...")
    for file in os.listdir(NON_VIOLENCE_DIR):
        if file.endswith('.mp4'):
            vpath = os.path.join(NON_VIOLENCE_DIR, file)
            seqs = extract_sequences_from_video(vpath)
            for s in seqs:
                X.append(s)
                Y.append(0) # Non-Violence = 0

    print("Extracting features from Violence dataset videos...")
    for file in os.listdir(VIOLENCE_DIR):
        if file.endswith('.mp4'):
            vpath = os.path.join(VIOLENCE_DIR, file)
            seqs = extract_sequences_from_video(vpath)
            for s in seqs:
                X.append(s)
                Y.append(1) # Violence = 1

    X = np.array(X, dtype=np.float32)
    Y = np.array(Y, dtype=np.float32)

    print(f"Total dataset sequences extracted: {len(X)} | Shape: {X.shape}")
    return X, Y

def run_training_pipeline():
    print("=== STARTING CNN-LSTM VIOLENCE DETECTION TRAINING PIPELINE ===")
    X, Y = prepare_dataset()

    if len(X) < 4:
        raise ValueError("Insufficient dataset samples to train.")

    # Train / Validation / Test Split (70% Train, 15% Val, 15% Test)
    can_stratify_1 = min(np.bincount(Y.astype(int))) >= 2 if len(np.unique(Y)) > 1 else False
    X_train, X_temp, Y_train, Y_temp = train_test_split(
        X, Y, test_size=0.30, random_state=42, stratify=Y if can_stratify_1 else None
    )
    can_stratify_2 = min(np.bincount(Y_temp.astype(int))) >= 2 if len(np.unique(Y_temp)) > 1 else False
    X_val, X_test, Y_val, Y_test = train_test_split(
        X_temp, Y_temp, test_size=0.50, random_state=42, stratify=Y_temp if can_stratify_2 else None
    )

    print(f"Split sizes -> Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    # Build CNN-LSTM Architecture
    model = build_lightweight_cnn_lstm()
    
    # Train Model
    epochs = 12
    batch_size = 4
    print(f"Training CNN-LSTM model for {epochs} epochs...")
    history = model.fit(
        X_train, Y_train,
        validation_data=(X_val, Y_val),
        epochs=epochs,
        batch_size=batch_size,
        verbose=1
    )

    # Save Model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model.save(MODEL_PATH)
    print(f"Model saved successfully to {MODEL_PATH}")

    # Evaluate on Test Set
    Y_pred_probs = model.predict(X_test)
    Y_pred = (Y_pred_probs > 0.5).astype(int).flatten()
    Y_test_int = Y_test.astype(int)

    acc = float(accuracy_score(Y_test_int, Y_pred))
    prec = float(precision_score(Y_test_int, Y_pred, zero_division=1))
    rec = float(recall_score(Y_test_int, Y_pred, zero_division=1))
    f1 = float(f1_score(Y_test_int, Y_pred, zero_division=1))
    cm = confusion_matrix(Y_test_int, Y_pred).tolist()

    print(f"Test Accuracy: {acc*100:.2f}% | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")

    # Generate Performance Plots
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    
    # Loss plot
    axes[0].plot(history.history['loss'], label='Train Loss', color='#6366f1', linewidth=2)
    axes[0].plot(history.history['val_loss'], label='Val Loss', color='#f43f5e', linewidth=2)
    axes[0].set_title('CNN-LSTM Model Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].legend()
    axes[0].grid(True, linestyle='--', alpha=0.5)

    # Accuracy plot
    axes[1].plot(history.history['accuracy'], label='Train Accuracy', color='#10b981', linewidth=2)
    axes[1].plot(history.history['val_accuracy'], label='Val Accuracy', color='#3b82f6', linewidth=2)
    axes[1].set_title('CNN-LSTM Model Accuracy')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].legend()
    axes[1].grid(True, linestyle='--', alpha=0.5)

    plot_path = os.path.join(PLOTS_DIR, 'training_curves.png')
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()

    metrics_data = {
        "accuracy": round(float(acc) * 100, 2),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm,
        "epochs": epochs,
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "history": {
            "loss": [round(float(x), 4) for x in history.history['loss']],
            "val_loss": [round(float(x), 4) for x in history.history['val_loss']],
            "accuracy": [round(float(x), 4) for x in history.history['accuracy']],
            "val_accuracy": [round(float(x), 4) for x in history.history['val_accuracy']]
        }
    }

    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics_data, f, indent=4)

    print(f"Metrics saved to {METRICS_PATH}")
    print("=== TRAINING & EVALUATION COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_training_pipeline()
