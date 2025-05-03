import librosa
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sounddevice as sd
from scipy.io.wavfile import write
import time
from pymongo import MongoClient
from datetime import datetime
import gridfs
# Optional: Uncomment if you want noise reduction
# import noisereduce as nr  

# === CONFIG ===
MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"
directories = [
    'final_chainsaw1STIHL',
    'final_chainsaw2TAEM',
    'final_chainsaw3husqavarna',
    'final_chainsawskill',
    'final_chainsawholzfforma',
]
test_file = "temp_audio.wav"
USE_NOISE_REDUCTION = False  # Toggle noise reduction

# === MONGODB SETUP ===
client = MongoClient(MONGO_URI)
db = client.get_database()
collection = db.get_collection('detections')
fs = gridfs.GridFS(db)

# === AUDIO FEATURE EXTRACTION ===
def extract_features(file_path):
    y, sr = librosa.load(file_path, sr=None)

    # OPTIONAL NOISE REDUCTION
    if USE_NOISE_REDUCTION:
        import noisereduce as nr
        y = nr.reduce_noise(y=y, sr=sr)

    # TRIM & NORMALIZE
    y, _ = librosa.effects.trim(y)
    y = librosa.util.normalize(y)

    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    return np.mean(mfccs.T, axis=0)

# === COMPARISON FUNCTION ===
def compare_audio_files(file1, file2):
    features1 = extract_features(file1)
    features2 = extract_features(file2)
    similarity = cosine_similarity([features1], [features2])
    return similarity[0][0]

# === RECORD AUDIO ===
def record_audio(duration, filename):
    fs = 16000
    print(f"Recording {duration} seconds of audio...")
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    write(filename, fs, audio)
    print(f"Audio saved as {filename}")

# === UPLOAD TO MONGODB ===
def insert_detection(detection_message, audio_file):
    detection_data = {
        "device": "Sentry 2",
        "location": "Cabanglasan Bukidnon",
        "detection": detection_message,
        "timestamp": datetime.utcnow()
    }
    detection_id = collection.insert_one(detection_data).inserted_id
    print(f"Detection inserted into MongoDB with ID: {detection_id}")

    try:
        with open(audio_file, "rb") as f:
            audio_data = f.read()
            file_id = fs.put(audio_data, filename=audio_file)
            print(f"Audio file uploaded to GridFS with file ID: {file_id}")
            collection.update_one(
                {"_id": detection_id},
                {"$set": {"file_id": file_id}}
            )
            print(f"Detection {detection_id} updated with file_id: {file_id}")
            return detection_id, file_id
    except Exception as e:
        print(f"Error uploading audio file to GridFS: {e}")

# === MAIN LOOP ===
while True:
    record_audio(5, test_file)

    total_similarity = 0
    num_files = 0

    for directory in directories:
        audio_files = [f for f in os.listdir(directory) if f.endswith('.mp3') or f.endswith('.wav')]
        if not audio_files:
            print(f"No audio files found in {directory}")
            continue

        for audio_file in audio_files:
            file_path = os.path.join(directory, audio_file)
            try:
                similarity = compare_audio_files(test_file, file_path)
                print(f"Compared with {file_path}, similarity: {similarity * 100:.2f}%")
                total_similarity += similarity
                num_files += 1
            except Exception as e:
                print(f"Error comparing {file_path}: {e}")

    if num_files > 0:
        avg_similarity = total_similarity / num_files
        avg_similarity_percentage = avg_similarity * 100
        print(f"\nAverage similarity: {avg_similarity_percentage:.2f}%")

        if avg_similarity_percentage >= 95:
            print("Result: Chainsaw")
            insert_detection("🚨 Chainsaw Detected!", test_file)
        elif avg_similarity_percentage >= 93:
            print("Result: Possible Chainsaw")
            insert_detection("🚨 Possible Chainsaw Detected!", test_file)
        else:
            print("Result: No Chainsaw")

    print("\nWaiting for 3 seconds before recording again...")
    time.sleep(3)
