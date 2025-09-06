#!/usr/bin/env python3
"""
Test script to check if GPS coordinates are being stored correctly in MongoDB
"""

from pymongo import MongoClient
from datetime import datetime
import json

# MongoDB connection
MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client.get_database()
collection = db.get_collection('detections')

def test_gps_data():
    print("🔍 Checking GPS data in MongoDB...")
    
    # Get the latest 5 detections
    detections = list(collection.find().sort('timestamp', -1).limit(5))
    
    if not detections:
        print("❌ No detections found in database")
        return
    
    print(f"📊 Found {len(detections)} recent detections:")
    print("-" * 60)
    
    for i, detection in enumerate(detections, 1):
        print(f"\n{i}. Detection ID: {detection['_id']}")
        print(f"   Timestamp: {detection.get('timestamp', 'N/A')}")
        print(f"   Device: {detection.get('device', 'N/A')}")
        print(f"   Detection: {detection.get('detection', 'N/A')}")
        
        # Check for GPS coordinates
        if 'latitude' in detection and 'longitude' in detection:
            print(f"   🗺️  GPS: {detection['latitude']}, {detection['longitude']}")
        else:
            print("   ❌ No GPS coordinates found")
        
        # Check for chainsaw detection
        detection_msg = detection.get('detection', '')
        if 'chainsaw' in detection_msg.lower():
            print("   🚨 Chainsaw detected!")
        else:
            print("   ✅ No chainsaw detected")
    
    print("\n" + "=" * 60)
    
    # Test the specific coordinates from your message
    test_lat = 8.15067372
    test_lon = 125.13175377
    
    print(f"🎯 Looking for detections near coordinates: {test_lat}, {test_lon}")
    
    # Find detections with similar coordinates (within 0.001 degrees)
    nearby_detections = collection.find({
        'latitude': {'$gte': test_lat - 0.001, '$lte': test_lat + 0.001},
        'longitude': {'$gte': test_lon - 0.001, '$lte': test_lon + 0.001}
    })
    
    nearby_count = len(list(nearby_detections))
    print(f"📍 Found {nearby_count} detections near your test coordinates")

if __name__ == "__main__":
    test_gps_data()
