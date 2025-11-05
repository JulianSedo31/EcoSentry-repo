import librosa
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sounddevice as sd
from scipy.io.wavfile import write
import time
import serial  # For serial communication with LoRa module
import subprocess
import json  # <-- added for GPS data parsing
import requests

# ==========================
#  AUDIO FEATURE EXTRACTION
# ==========================
def extract_features(file_path):
    audio, sr = librosa.load(file_path, sr=None)
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    return np.mean(mfccs.T, axis=0)

# ==========================
#  AUDIO COMPARISON
# ==========================
def compare_audio_files(file1, file2):
    features1 = extract_features(file1)
    features2 = extract_features(file2)
    similarity = cosine_similarity([features1], [features2])
    return similarity[0][0]

# ==========================
#  RECORD AUDIO
# ==========================
def record_audio(duration, filename):
    fs = 16000
    print(f"Recording {duration} seconds of audio...")
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    write(filename, fs, audio)
    print(f"Audio saved as {filename}")

# ==========================
#  LORA COMMUNICATION
# ==========================
LO_RA_PORT = '/dev/ttyACM1'  # Adjust to your device path
LO_RA_BAUD = 115200

# HTTP upload endpoint for recorded audio (adjust to your Flask server IP/port)
UPLOAD_URL = "http://192.168.1.237:5000/api/detection/audio_upload"

try:
    ser = serial.Serial(LO_RA_PORT, LO_RA_BAUD, timeout=1)
    time.sleep(2)  # Give LoRa module time to initialize
    print(f"✅ LoRa serial connected on {LO_RA_PORT}")
except Exception as e:
    print(f"❌ Failed to connect to LoRa: {e}")
    ser = None

def send_lora_message(message, retries=3):
    for attempt in range(retries):
        try:
            print(f"Sending message over LoRa: {message}")
            if ser:
                ser.write((message + "\n").encode())
            return True
        except Exception as e:
            print(f"Error sending message: {e}")
            if attempt < retries - 1:
                print("Retrying...")
    print("Failed to send message after retries.")
    return False


def upload_audio_file(file_path, device="EcoSentry-Pi", location="Can-ayan, Bukidnon", detection_msg=None, latitude=None, longitude=None, rssi=None, snr=None):
    """Upload a recorded audio file to the web server using multipart/form-data.

    The server should expose /api/detection/audio_upload which stores the file in GridFS and creates a detection document.
    """
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'audio/wav')}
            data = {
                'device': device,
                'location': location,
                'detection': detection_msg or "",
            }
            if latitude is not None and longitude is not None:
                data['latitude'] = str(latitude)
                data['longitude'] = str(longitude)
            if rssi is not None:
                data['rssi'] = str(rssi)
            if snr is not None:
                data['snr'] = str(snr)

            print(f"Uploading audio {file_path} to {UPLOAD_URL} ...")
            resp = requests.post(UPLOAD_URL, files=files, data=data, timeout=10)
            if resp.ok:
                try:
                    print("Upload succeeded:", resp.json())
                except Exception:
                    print("Upload succeeded, non-json response")
                return True
            else:
                print(f"Upload failed: HTTP {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        print(f"Error uploading audio file: {e}")
        return False

# ==========================
#  GPS FUNCTION (copied from your final8.py)
# ==========================
def get_current_fix(timeout_s=3.0):
    """Fetch GPS coordinates using gpsd tools."""
    try:
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
    return None, None

# ==========================
#  MAIN DETECTION LOOP
# ==========================
directories = [
    'final_chainsaw1STIHL',
    'final_chainsaw2TAEM',
    'final_chainsaw3husqavarna',
]

test_file = "temp_audio.wav"

while True:
    record_audio(5, test_file)

    total_similarity = 0
    file_count = 0

    for directory in directories:
        if not os.path.exists(directory):
            print(f"⚠️ Directory not found: {directory}")
            continue

        for file in os.listdir(directory):
            if file.endswith(".wav"):
                file_path = os.path.join(directory, file)
                try:
                    similarity = compare_audio_files(test_file, file_path)
                    print(f"Compared with {file}, similarity = {similarity:.2f}")
                    total_similarity += similarity
                    file_count += 1
                except Exception as e:
                    print(f"Error comparing with {file}: {e}")

    if file_count > 0:
        avg_similarity = total_similarity / file_count
        avg_similarity_pct = avg_similarity * 100
        print(f"Average similarity: {avg_similarity_pct:.2f}%")

        # ==========================
        #  Detection logic (unchanged)
        # ==========================
        if avg_similarity_pct >= 94:
            result = "Chainsaw Detected"
            print(f"Result: {result}")

            # Get GPS coordinates
            lat, lon = get_current_fix()
            if lat is not None and lon is not None:
                gps_message = f"{result},{lat:.8f},{lon:.8f}"
                print(f"📍 GPS: {lat:.8f}, {lon:.8f}")
            else:
                gps_message = f"{result},NOFIX"
                print("⚠️ No GPS fix available")

            send_lora_message(gps_message)
            # Upload the recorded audio file to the web server and WAIT until it succeeds
            attempt = 0
            uploaded = False
            while not uploaded:
                attempt += 1
                try:
                    print(f"[UPLOAD] Attempt {attempt} to upload {test_file}...")
                    uploaded = upload_audio_file(test_file, device="EcoSentry-Pi", location="Can-ayan, Bukidnon", detection_msg=gps_message, latitude=lat, longitude=lon)
                    if uploaded:
                        print("Upload succeeded")
                        break
                    else:
                        print(f"Upload attempt {attempt} failed, retrying in 5s...")
                        time.sleep(5)
                except Exception as e:
                    print(f"Exception while uploading audio: {e}")
                    print("Retrying in 5s...")
                    time.sleep(5)

        elif avg_similarity_pct <= 70:
            result = "⚠ Possible Chainsaw Detected"
            print(f"Result: {result}")

            # Get GPS coordinates
            lat, lon = get_current_fix()
            if lat is not None and lon is not None:
                gps_message = f"{result},{lat:.8f},{lon:.8f}"
                print(f"📍 GPS: {lat:.8f}, {lon:.8f}")
            else:
                gps_message = f"{result},NOFIX"
                print("⚠️ No GPS fix available")

            send_lora_message(gps_message)
            # Upload the recorded audio file to the web server and WAIT until it succeeds
            attempt = 0
            uploaded = False
            while not uploaded:
                attempt += 1
                try:
                    print(f"[UPLOAD] Attempt {attempt} to upload {test_file}...")
                    uploaded = upload_audio_file(test_file, device="EcoSentry-Pi", location="Can-ayan, Bukidnon", detection_msg=gps_message, latitude=lat, longitude=lon)
                    if uploaded:
                        print("Upload succeeded")
                        break
                    else:
                        print(f"Upload attempt {attempt} failed, retrying in 5s...")
                        time.sleep(5)
                except Exception as e:
                    print(f"Exception while uploading audio: {e}")
                    print("Retrying in 5s...")
                    time.sleep(5)

        else:
            result = "✅ No Chainsaw Detected"
            print(f"Result: {result}")
            # No message sent for no detection
    else:
        print("No reference files found for comparison.")

    print("Waiting 3 seconds before next iteration...\n")
    time.sleep(3)

