from flask import Flask, request, jsonify
from pymongo import MongoClient
import gridfs
from datetime import datetime
from flask_cors import CORS
from bson import ObjectId
from flask import Response

def _serialize_value(v):
    # Convert common non-JSON types to JSON-friendly ones
    if isinstance(v, ObjectId):
        return str(v)
    if hasattr(v, 'isoformat'):
        try:
            return v.isoformat()
        except Exception:
            pass
    if isinstance(v, bytes):
        try:
            return v.decode('utf-8')
        except Exception:
            return str(v)
    if isinstance(v, dict):
        return {k: _serialize_value(val) for k, val in v.items()}
    if isinstance(v, list):
        return [_serialize_value(x) for x in v]
    return v

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database()
collection = db.get_collection('detections')
fs = gridfs.GridFS(db)

@app.route('/insert_detection', methods=['POST'])
def insert_detection():
    data = request.get_json()  # <- gets JSON from ESP32
    data['timestamp'] = datetime.utcnow()
    
    # Parse GPS coordinates from detection message if available
    if 'detection' in data:
        detection_msg = data['detection']
        
        # Remove PKT#xxx|DeviceName| prefix if present
        if '|' in detection_msg:
            parts = detection_msg.split('|')
            if len(parts) >= 3:
                # Extract the actual message after the second |
                clean_message = '|'.join(parts[2:])
            else:
                clean_message = detection_msg
        else:
            clean_message = detection_msg
        
        # Parse GPS coordinates from ALERT,CHAINSAW,lat,lon format
        if 'ALERT,CHAINSAW,' in clean_message:
            coords = clean_message.split(',')
            if len(coords) >= 4 and coords[2] != 'NOFIX' and coords[3] != 'NOFIX':
                try:
                    data['latitude'] = float(coords[2])
                    data['longitude'] = float(coords[3])
                    print(f"GPS coordinates parsed: {data['latitude']}, {data['longitude']}")
                except ValueError:
                    print("Failed to parse GPS coordinates")
    
    result = collection.insert_one(data)
    return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 200

@app.route('/api/detection', methods=['GET'])
def get_detections():
    """API endpoint for Dashboard to fetch detections"""
    try:
        include_archived = request.args.get('includeArchived', 'false').lower() == 'true'
        
        # Build query
        query = {}
        if not include_archived:
            query['isArchived'] = {'$ne': True}
        
        # Fetch detections, sorted by timestamp (newest first)
        detections = list(collection.find(query).sort('timestamp', -1))
        
        # Convert non-JSON types (ObjectId, datetime, bytes) to JSON-friendly values
        serialized = []
        for detection in detections:
            newd = {}
            for k, v in detection.items():
                newd[k] = _serialize_value(v)
            serialized.append(newd)

        return jsonify(serialized), 200
        
    except Exception as e:
        print(f"Error fetching detections: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/detection/audio/<detection_id>', methods=['GET'])
def get_detection_audio(detection_id):
    """Stream the audio file associated with a detection (if any)."""
    try:
        # Find detection document
        detection = collection.find_one({'_id': ObjectId(detection_id)})
        if not detection:
            return jsonify({'error': 'Detection not found'}), 404

        file_id = detection.get('file_id')
        if not file_id:
            return jsonify({'error': 'No audio file for this detection'}), 404

        # Retrieve file from GridFS
        try:
            audio_file = fs.get(file_id)
        except Exception as e:
            print(f"Error retrieving file from GridFS: {e}")
            return jsonify({'error': 'Audio file not found in storage'}), 404

        data = audio_file.read()
        content_type = getattr(audio_file, 'content_type', None) or 'audio/wav'
        return Response(data, mimetype=content_type)

    except Exception as e:
        print(f"Error streaming audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/detection/audio_upload', methods=['POST'])
def upload_detection_audio():
    """Accept multipart/form-data with a file and optional metadata, store audio in GridFS and create a detection document."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        filename = file.filename or 'audio.wav'
        content_type = file.content_type or 'audio/wav'

        # Save file to GridFS
        file_id = fs.put(file.stream.read(), filename=filename, contentType=content_type)

        # Build detection document from optional form fields
        doc = {
            'timestamp': datetime.utcnow(),
            'device': request.form.get('device'),
            'location': request.form.get('location'),
            'detection': request.form.get('detection'),
            'rssi': request.form.get('rssi'),
            'snr': request.form.get('snr')
        }

        # Optional GPS fields
        lat = request.form.get('latitude')
        lon = request.form.get('longitude')
        if lat and lon:
            try:
                doc['latitude'] = float(lat)
                doc['longitude'] = float(lon)
            except ValueError:
                pass

        doc['file_id'] = file_id

        result = collection.insert_one(doc)

        return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 200
    except Exception as e:
        print(f"Error uploading audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)  # Use your actual IP