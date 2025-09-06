from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database()
collection = db.get_collection('detections')

@app.route('/insert_detection', methods=['POST'])
def insert_detection():
    data = request.get_json()  # <- gets JSON from ESP32
    data['timestamp'] = datetime.utcnow()
    
    # Parse GPS coordinates from detection message if available
    if 'detection' in data and 'ALERT,CHAINSAW,' in data['detection']:
        parts = data['detection'].split(',')
        if len(parts) >= 4 and parts[2] != 'NOFIX' and parts[3] != 'NOFIX':
            try:
                data['latitude'] = float(parts[2])
                data['longitude'] = float(parts[3])
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
        
        # Convert ObjectId to string for JSON serialization
        for detection in detections:
            detection['_id'] = str(detection['_id'])
            # Convert datetime to ISO string
            if 'timestamp' in detection:
                detection['timestamp'] = detection['timestamp'].isoformat()
        
        return jsonify(detections), 200
        
    except Exception as e:
        print(f"Error fetching detections: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)  # Use your actual IP