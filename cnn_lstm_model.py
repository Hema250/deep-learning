import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (
    TimeDistributed, Conv2D, MaxPooling2D, Flatten, Dense, Dropout,
    LSTM, Bidirectional, BatchNormalization, GlobalAveragePooling2D, Input
)
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.optimizers import Adam

# Parameters
SEQUENCE_LENGTH = 16
IMAGE_HEIGHT = 112
IMAGE_WIDTH = 112
CHANNELS = 3
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'static', 'models', 'cnn_lstm_violence_model.keras')

def build_cnn_lstm_model(seq_len=SEQUENCE_LENGTH, img_h=IMAGE_HEIGHT, img_w=IMAGE_WIDTH):
    """
    Builds a hybrid CNN-LSTM Model for Violence Detection.
    - CNN: Extracts spatial features frame by frame (MobileNetV2 feature extractor / TimeDistributed CNN)
    - LSTM: Learns temporal dynamics across consecutive frames
    """
    base_cnn = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(img_h, img_w, CHANNELS)
    )
    base_cnn.trainable = False
    
    x_in = Input(shape=(img_h, img_w, CHANNELS))
    feat = base_cnn(x_in, training=False)
    feat = GlobalAveragePooling2D()(feat)
    cnn_extractor = Model(inputs=x_in, outputs=feat, name="Spatial_Feature_Extractor")

    video_input = Input(shape=(seq_len, img_h, img_w, CHANNELS), name="Video_Sequence_Input")
    spatial_features = TimeDistributed(cnn_extractor)(video_input)
    
    x = Bidirectional(LSTM(64, return_sequences=False, dropout=0.3))(spatial_features)
    x = Dense(64, activation='relu')(x)
    x = BatchNormalization()(x)
    x = Dropout(0.4)(x)
    output = Dense(1, activation='sigmoid', name="Violence_Probability")(x)

    model = Model(inputs=video_input, outputs=output, name="College_Violence_Detection_CNN_LSTM")
    
    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )
    
    return model

def build_lightweight_cnn_lstm(seq_len=SEQUENCE_LENGTH, img_h=IMAGE_HEIGHT, img_w=IMAGE_WIDTH):
    """
    Alternative fast lightweight custom CNN-LSTM model suitable for CPU inference & quick training.
    """
    model = Sequential([
        Input(shape=(seq_len, img_h, img_w, CHANNELS)),
        
        TimeDistributed(Conv2D(16, (3, 3), activation='relu', padding='same')),
        TimeDistributed(MaxPooling2D((2, 2))),
        
        TimeDistributed(Conv2D(32, (3, 3), activation='relu', padding='same')),
        TimeDistributed(MaxPooling2D((2, 2))),
        
        TimeDistributed(Flatten()),
        TimeDistributed(Dense(64, activation='relu')),
        
        LSTM(64, return_sequences=False),
        Dropout(0.4),
        Dense(32, activation='relu'),
        Dense(1, activation='sigmoid')
    ], name="Lightweight_CNN_LSTM")

    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    return model

def get_trained_or_fallback_model():
    """
    Loads saved model if exists, otherwise builds a model.
    """
    if os.path.exists(MODEL_PATH):
        try:
            print(f"Loading trained CNN-LSTM model from {MODEL_PATH}...")
            return tf.keras.models.load_model(MODEL_PATH, compile=False)
        except Exception as e:
            print(f"Error loading model: {e}. Building new lightweight CNN-LSTM model.")
    
    return build_lightweight_cnn_lstm()

if __name__ == '__main__':
    model = build_lightweight_cnn_lstm()
    model.summary()
