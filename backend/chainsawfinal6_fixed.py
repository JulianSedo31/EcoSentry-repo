import librosa
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sounddevice as sd
from scipy.io.wavfile import write
import time
import serial  # For serial communication with LoRa module
import subprocess
import json

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

# Directories containing known chainsaw sounds
directories = [
    'final_chainsaw1STIHL',
    'final_chainsaw2TAEM',
    'final_chainsaw3husqavarna',
    'final_chainsawskill',
    'final_chainsawholzfforma',
]

test_file = "temp_audio.wav"

# LoRa serial communication setup (Replace with your ESP32 port)
LO_RA_PORT = '/dev/ttyACM1'
LO_RA_BAUD = 115200
ser = serial.Serial(LO_RA_PORT, LO_RA_BAUD, timeout=1)
time.sleep(2)  # Allow ESP32 reset

def get_current_fix(timeout_s=3.0):
    """Fetch GPS coordinates using gpsd command line tools (more reliable)"""
    try:
        # Use gpspipe to get current GPS data
        result = subprocess.run(['gpspipe', '-w', '-n', '10'], 
                              capture_output=True, text=True, timeout=timeout_s)
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                try:
                    data = json.loads(line)
                    if data.get('class') == 'TPV':
                        lat = data.get('lat')
                        lon = data.get('lon')
                        if lat is not None and lon is not None:
                            return float(lat), float(lon)
                except (json.JSONDecodeError, KeyError, ValueError):
                    continue
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    # Fallback: try gpsmon command
    try:
        result = subprocess.run(['gpsmon', '-n', '1'], 
                              capture_output=True, text=True, timeout=timeout_s)
        # Parse gpsmon output for coordinates (this is a simplified parser)
        # You might need to adjust this based on your gpsmon output format
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    return None, None

# Function to send message over LoRa with retry mechanism
def send_lora_message(message, retries=3):
    attempt = 0
    while attempt < retries:
        try:
            print(f"Sending message over LoRa: {message}")
            ser.write((message + "\n").encode())
            return True
        except Exception as e:
            print(f"Error sending message over LoRa: {e}")
            attempt += 1
            if attempt < retries:
                print("Retrying...")
            else:
                print("Max retries reached. Could not send message.")
    return False

SIMILARITY_THRESHOLD = 0.75

# Main loop: record, compare, and alert
while True:
    record_audio(5, test_file)

    detected = False
    for directory in directories:
        for file in os.listdir(directory):
            if file.endswith(".wav"):
                known_file = os.path.join(directory, file)
                try:
                    similarity = compare_audio_files(test_file, known_file)
                    print(f"Compared with {file}, similarity = {similarity:.2f}")
                    if similarity > SIMILARITY_THRESHOLD:
                        detected = True
                        break
                except Exception as e:
                    print(f"Error comparing with {file}: {e}")
        if detected:
            break

    if detected:
        print("⚠️ Chainsaw detected!")
        lat, lon = get_current_fix()
        if lat is not None and lon is not None:
            # Receiver will still detect "chainsaw" (case-insensitive) in the payload
            send_lora_message(f"ALERT,CHAINSAW,{lat:.8f},{lon:.8f}")
            print(f"GPS coordinates: {lat:.8f}, {lon:.8f}")
        else:
            send_lora_message("ALERT,CHAINSAW,NOFIX")
            print("No GPS fix available")
    else:
        print("✅ No chainsaw detected.")

    time.sleep(3)
