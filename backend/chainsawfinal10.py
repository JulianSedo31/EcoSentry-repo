import librosa
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import sounddevice as sd
import time
import serial  # For serial communication with LoRa module
import subprocess
import json  # <-- added for GPS data parsing

# ==========================
#  AUDIO FEATURE EXTRACTION
# ==========================
def extract_features(file_path=None, audio=None, sr=None):
        """Extract MFCC features from either a file path or an in-memory audio array.

        Parameters:
            file_path: path to wav file (if provided)
            audio: 1-D numpy array of audio samples (float, -1..1)
            sr: sample rate for the audio array

        Returns:
            1-D feature vector (mean MFCCs)
        """
        if audio is not None and sr is not None:
                mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
                return np.mean(mfccs.T, axis=0)

        if file_path is not None:
                audio, sr = librosa.load(file_path, sr=None)
                mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
                return np.mean(mfccs.T, axis=0)

        raise ValueError("Either file_path or (audio, sr) must be provided")

# ==========================
#  AUDIO COMPARISON
# ==========================
def compare_audio_files(a, b):
    """Compare two audio inputs.

    Each argument may be either:
      - a file path string, or
      - a tuple/list (audio_array, sr)

    Returns cosine similarity scalar.
    """
    def _get_features(x):
        if isinstance(x, str):
            return extract_features(file_path=x)
        if isinstance(x, (list, tuple)) and len(x) == 2:
            return extract_features(audio=x[0], sr=x[1])
        raise ValueError("Unsupported audio input for feature extraction")

    features1 = _get_features(a)
    features2 = _get_features(b)
    similarity = cosine_similarity([features1], [features2])
    return similarity[0][0]

# ==========================
#  RECORD AUDIO
# ==========================
def record_audio(duration):
    """Record audio into memory and return (audio_float_array, sample_rate).

    The returned array is a 1-D float32 in the -1..1 range suitable for librosa.
    """
    fs = 16000
    print(f"Recording {duration} seconds of audio (in-memory)...")
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    # Convert to 1-D float32 in -1..1 for feature extraction
    audio = np.asarray(audio).astype(np.float32).flatten() / 32768.0
    print(f"Recording complete ({len(audio)} samples)")
    return audio, fs

# ==========================
#  LORA COMMUNICATION
# ==========================
LO_RA_PORT = '/dev/ttyACM0'  # Adjust to your device path
LO_RA_BAUD = 115200

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

while True:
    # Record in-memory and compute features without writing a file to disk.
    recorded_audio, recorded_sr = record_audio(5)

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
                    similarity = compare_audio_files((recorded_audio, recorded_sr), file_path)
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

        else:
            result = "✅ No Chainsaw Detected"
            print(f"Result: {result}")
            # No message sent for no detection
    else:
        print("No reference files found for comparison.")

    print("Waiting 3 seconds before next iteration...\n")
    time.sleep(3)



