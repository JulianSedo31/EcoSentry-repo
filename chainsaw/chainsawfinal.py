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

# MongoDB URI (replace with your actual URI)
MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_database()  # Connect to the database
collection = db.get_collection('detections')  # Get the 'detections' collection
fs = gridfs.GridFS(db)  # Initialize GridFS for storing files

# Function to load audio and extract features (MFCCs)
def extract_features(file_path):
    audio, sr = librosa.load(file_path, sr=None)
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    return np.mean(mfccs.T, axis=0)

# Function to compare two feature vectors using cosine similarity
def compare_audio_files(file1, file2):
    features1 = extract_features(file1)
    features2 = extract_features(file2)
    similarity = cosine_similarity([features1], [features2])
    return similarity[0][0]

# Function to record audio and save as WAV
def record_audio(duration, filename):
    fs = 16000  # Sampling frequency (Hz)
    print(f"Recording {duration} seconds of audio...")

    # Record audio
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()  # Wait until recording is finished

    # Save the audio as a WAV file
    write(filename, fs, audio)
    print(f"Audio saved as {filename}")

# Directories to compare (chainsaw1STIHL, chainsaw2TAEM, chainsaw3husqavarna)
directories = [
    'final_chainsaw1STIHL',
    'final_chainsaw2TAEM',
    'final_chainsaw3husqavarna',
    'final_chainsawskill',
    'final_chainsawholzfforma',
]

# Path to the test file (will be recorded)
test_file = "temp_audio.wav"

# Function to insert detection into MongoDB and upload audio to GridFS
def insert_detection(detection_message, audio_file):
    # Insert the detection message and timestamp into MongoDB
    detection_data = {
        "device": "Sentry 2",
        "location": "Cabanglasan Bukidnon",
        "detection": detection_message,
        "timestamp": datetime.utcnow()  # Timestamp in UTC format
    }
    
    # Insert detection data into MongoDB and get detection_id
    detection_id = collection.insert_one(detection_data).inserted_id
    print(f"Detection inserted into MongoDB with ID: {detection_id}")

    # Upload the audio file to GridFS with detection_id as part of the data
    try:
        with open(audio_file, "rb") as f:
            audio_data = f.read()  # Read the file as binary
            
            # Upload the audio to GridFS and get the file_id
            file_id = fs.put(audio_data, filename=audio_file)
            print(f"Audio file uploaded to GridFS with file ID: {file_id}")
            
            # Now link the detection record with the file by adding file_id
            collection.update_one(
                {"_id": detection_id},
                {"$set": {"file_id": file_id}}  # Store the file_id in the detection record
            )
            print(f"Detection {detection_id} updated with file_id: {file_id}")
            return detection_id, file_id  # Return detection_id and file_id

    except Exception as e:
        print(f"Error uploading audio file to GridFS: {e}")

# Loop to record, compare, and wait
while True:
    # Step 1: Record 5 seconds of audio and save it as temp_audio.wav
    record_audio(5, test_file)
    
    total_similarity = 0
    num_files = 0

    # Step 2: Compare the recorded file with files in the directories
    for directory in directories:
        audio_files = [f for f in os.listdir(directory) if f.endswith('.mp3') or f.endswith('.wav')]

        if not audio_files:
            print(f"No MP3 or WAV files found in {directory}")

        # Compare the test file to each of the MP3/WAV files in the directory
        for audio_file in audio_files:
            file_path = os.path.join(directory, audio_file)  # Full path to each audio file
            similarity = compare_audio_files(test_file, file_path)

            total_similarity += similarity
            num_files += 1

    # Step 3: Calculate the average similarity and classify
    if num_files > 0:
        avg_similarity = total_similarity / num_files
        avg_similarity_percentage = avg_similarity * 100

        # Print the average similarity percentage
        print(f"\nAverage similarity: {avg_similarity_percentage:.2f}%")

        if avg_similarity_percentage >= 95:
            print("Result: Chainsaw")
            insert_detection("🚨 Chainsaw Detected!", test_file)  # Insert detection and upload audio
        elif avg_similarity_percentage >= 93:
            print("Result: Possible Chainsaw")
            insert_detection("🚨 Possible Chainsaw Detected!", test_file)  # Insert detection and upload audio
        else:
            print("Result: No Chainsaw")
    
    print("\nWaiting for 3 seconds before recording again...")
    time.sleep(3)
