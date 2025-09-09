import librosa
import numpy as np
import torch
import torch.nn as nn
import os
import sounddevice as sd
from scipy.io.wavfile import write
import time
import serial  # For serial communication with LoRa module
import subprocess
import json
import onnxruntime as ort

# CNN Model Architecture (same as training)
class AudioCNN(nn.Module):
    def __init__(self, num_classes=3):
        super(AudioCNN, self).__init__()
        
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.5)
        
        self.fc1 = nn.Linear(128 * 1 * 27, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc3 = nn.Linear(256, num_classes)
        
        self.relu = nn.ReLU()
        
    def forward(self, x):
        x = x.unsqueeze(1)
        
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = self.pool(self.relu(self.conv3(x)))
        
        x = x.view(x.size(0), -1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.dropout(self.relu(self.fc2(x)))
        x = self.fc3(x)
        
        return x

class ChainsawDetector:
    def __init__(self, model_path=None, onnx_path=None, use_onnx=True):
        self.class_names = ['Chainsaw', 'Silent', 'Noise']
        self.use_onnx = use_onnx
        
        if use_onnx and onnx_path and os.path.exists(onnx_path):
            # Load ONNX model
            self.session = ort.InferenceSession(onnx_path)
            print(f"✅ Loaded ONNX model from {onnx_path}")
        elif model_path and os.path.exists(model_path):
            # Load PyTorch model
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.model = AudioCNN(num_classes=3).to(self.device)
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.eval()
            print(f"✅ Loaded PyTorch model from {model_path}")
        else:
            print("❌ No model found. Using fallback similarity method.")
            self.model = None
            self.session = None
    
    def extract_features(self, audio_path, sr=22050, duration=5, n_mfcc=13):
        """Extract MFCC features from audio file"""
        try:
            audio, sr = librosa.load(audio_path, sr=sr, duration=duration)
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=n_mfcc)
            
            # Pad or truncate to fixed size
            if mfccs.shape[1] < 216:
                mfccs = np.pad(mfccs, ((0, 0), (0, 216 - mfccs.shape[1])), mode='constant')
            else:
                mfccs = mfccs[:, :216]
            
            return mfccs
        except Exception as e:
            print(f"Error extracting features: {e}")
            return None
    
    def predict_with_onnx(self, mfccs):
        """Make prediction using ONNX model"""
        try:
            input_data = mfccs.reshape(1, 13, 216).astype(np.float32)
            outputs = self.session.run(None, {'input': input_data})
            probabilities = torch.softmax(torch.tensor(outputs[0]), dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            return {
                'predicted_class': self.class_names[predicted.item()],
                'confidence': confidence.item(),
                'all_probabilities': {
                    self.class_names[i]: prob.item() for i, prob in enumerate(probabilities[0])
                }
            }
        except Exception as e:
            print(f"Error with ONNX prediction: {e}")
            return None
    
    def predict_with_pytorch(self, mfccs):
        """Make prediction using PyTorch model"""
        try:
            mfccs_tensor = torch.FloatTensor(mfccs).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                output = self.model(mfccs_tensor)
                probabilities = torch.softmax(output, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
                
                return {
                    'predicted_class': self.class_names[predicted.item()],
                    'confidence': confidence.item(),
                    'all_probabilities': {
                        self.class_names[i]: prob.item() for i, prob in enumerate(probabilities[0])
                    }
                }
        except Exception as e:
            print(f"Error with PyTorch prediction: {e}")
            return None
    
    def detect_chainsaw(self, audio_path, confidence_threshold=0.7):
        """Detect chainsaw in audio file"""
        mfccs = self.extract_features(audio_path)
        if mfccs is None:
            return None
        
        if self.use_onnx and self.session:
            result = self.predict_with_onnx(mfccs)
        elif self.model:
            result = self.predict_with_pytorch(mfccs)
        else:
            return None
        
        if result:
            is_chainsaw = (result['predicted_class'] == 'Chainsaw' and 
                          result['confidence'] >= confidence_threshold)
            result['is_chainsaw'] = is_chainsaw
            return result
        
        return None

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

# Function to check audio quality
def check_audio_quality(audio_path):
    """Check if audio has sufficient signal and quality"""
    try:
        audio, sr = librosa.load(audio_path, sr=None)
        
        # Check signal strength
        rms = np.sqrt(np.mean(audio**2))
        max_amplitude = np.max(np.abs(audio))
        
        print(f"🔊 Audio Quality Check:")
        print(f"   RMS: {rms:.6f}")
        print(f"   Max Amplitude: {max_amplitude:.6f}")
        
        # Check for very quiet audio (likely noise)
        if rms < 0.001:  # Very quiet
            print("⚠️ Audio signal very weak - might be noise")
            return False
        elif max_amplitude < 0.01:  # Very quiet
            print("⚠️ Audio amplitude very low - might be noise")
            return False
        
        # Check for clipping or distortion
        if max_amplitude > 0.95:  # Near clipping
            print("⚠️ Audio near clipping - might be distorted")
            return False
        
        print("✅ Audio quality acceptable")
        return True
        
    except Exception as e:
        print(f"❌ Error checking audio quality: {e}")
        return False

# Function to test with silent audio
def test_silent_audio(detector, confidence_threshold):
    """Test with a known silent audio file"""
    silent_file = "test_silent.wav"
    
    print("\n🔇 Testing with silent audio...")
    # Record 5 seconds of actual silence
    record_audio(5, silent_file)
    
    # Check audio quality
    if not check_audio_quality(silent_file):
        print("⚠️ Silent test audio quality poor - skipping")
        if os.path.exists(silent_file):
            os.remove(silent_file)
        return
    
    # Test detection
    result = detector.detect_chainsaw(silent_file, confidence_threshold)
    
    if result:
        print(f"🔇 Silent test result: {result['predicted_class']} ({result['confidence']:.4f})")
        if result['predicted_class'] == 'Chainsaw':
            print("❌ PROBLEM: Silent audio detected as chainsaw!")
            print("   This indicates model overfitting or training data issues")
        else:
            print("✅ Silent audio correctly classified")
    else:
        print("❌ Failed to process silent audio")
    
    # Clean up
    if os.path.exists(silent_file):
        os.remove(silent_file)

# GPS functions
def get_current_fix(timeout_s=3.0):
    """Fetch GPS coordinates using gpsd command line tools"""
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

# LoRa communication functions
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

# Main execution
if __name__ == "__main__":
    # Configuration
    MODEL_PATH = "chainsaw_detection_model.pth"  # PyTorch model path
    ONNX_PATH = "chainsaw_detection_model.onnx"  # ONNX model path
    LO_RA_PORT = '/dev/ttyACM1'
    LO_RA_BAUD = 115200
    CONFIDENCE_THRESHOLD = 0.95  # Increased from 0.7 to reduce false positives
    RECORDING_DURATION = 5
    TEST_FILE = "temp_audio.wav"
    
    # Initialize LoRa serial communication
    try:
        ser = serial.Serial(LO_RA_PORT, LO_RA_BAUD, timeout=1)
        time.sleep(2)  # Allow ESP32 reset
        print(f"✅ LoRa serial connection established on {LO_RA_PORT}")
    except Exception as e:
        print(f"❌ Failed to connect to LoRa module: {e}")
        ser = None
    
    # Initialize chainsaw detector
    detector = ChainsawDetector(
        model_path=MODEL_PATH,
        onnx_path=ONNX_PATH,
        use_onnx=True  # Prefer ONNX for better performance
    )
    
    print("🚀 Starting chainsaw detection system...")
    print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print("Press Ctrl+C to stop")
    
    # Test with silent audio first
    test_silent_audio(detector, CONFIDENCE_THRESHOLD)
    
    try:
        # Main detection loop
        while True:
            # Record audio
            record_audio(RECORDING_DURATION, TEST_FILE)
            
            # Check audio quality first
            if not check_audio_quality(TEST_FILE):
                print("⚠️ Skipping detection due to poor audio quality")
                # Clean up temp file
                if os.path.exists(TEST_FILE):
                    os.remove(TEST_FILE)
                time.sleep(3)
                continue
            
            # Detect chainsaw
            result = detector.detect_chainsaw(TEST_FILE, CONFIDENCE_THRESHOLD)
            
            if result:
                print(f"\n🎯 Detection Result:")
                print(f"   Predicted: {result['predicted_class']}")
                print(f"   Confidence: {result['confidence']:.4f} ({result['confidence']*100:.2f}%)")
                print(f"   All Probabilities:")
                for class_name, prob in result['all_probabilities'].items():
                    print(f"     - {class_name}: {prob:.4f} ({prob*100:.2f}%)")
                
                if result['is_chainsaw']:
                    print("🚨 CHAINSAW DETECTED!")
                    
                    # Get GPS coordinates
                    lat, lon = get_current_fix()
                    
                    if ser:  # Only send if LoRa is connected
                        if lat is not None and lon is not None:
                            message = f"ALERT,CHAINSAW,{lat:.8f},{lon:.8f}"
                            send_lora_message(message)
                            print(f"📍 GPS coordinates sent: {lat:.8f}, {lon:.8f}")
                        else:
                            send_lora_message("ALERT,CHAINSAW,NOFIX")
                            print("⚠️ No GPS fix available")
                    else:
                        print("⚠️ LoRa not connected - alert not sent")
                else:
                    print("✅ No chainsaw detected.")
            else:
                print("❌ Failed to process audio or no model available.")
            
            # Clean up temp file
            if os.path.exists(TEST_FILE):
                os.remove(TEST_FILE)
            
            print("-" * 50)
            time.sleep(3)  # Wait before next recording
            
    except KeyboardInterrupt:
        print("\n🛑 Detection system stopped by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        if ser:
            ser.close()
        print("🔌 LoRa connection closed")