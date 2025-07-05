from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime

app = Flask(__name__)

MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database()
collection = db.get_collection('detections')

@app.route('/insert_detection', methods=['POST'])
def insert_detection():
    data = request.get_json()  # <- gets JSON from ESP32
    data['timestamp'] = datetime.utcnow()
    result = collection.insert_one(data)
    return jsonify({'status': 'success', 'id': str(result.inserted_id)}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)