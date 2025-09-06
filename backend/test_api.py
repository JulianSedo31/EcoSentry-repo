#!/usr/bin/env python3
"""
Test script to verify the Flask API endpoint is working correctly
"""

import requests
import json

def test_api_endpoint():
    print("🧪 Testing Flask API endpoint...")
    
    # Test the API endpoint that Dashboard uses
    api_url = "http://localhost:5000/api/detection?includeArchived=false"
    
    try:
        response = requests.get(api_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API endpoint working! Received {len(data)} detections")
            
            # Look for chainsaw alerts with GPS
            chainsaw_alerts = [d for d in data if 'chainsaw' in d.get('detection', '').lower()]
            gps_alerts = [d for d in chainsaw_alerts if 'latitude' in d and 'longitude' in d]
            
            print(f"🚨 Found {len(chainsaw_alerts)} chainsaw alerts")
            print(f"🗺️  Found {len(gps_alerts)} GPS-enabled alerts")
            
            if gps_alerts:
                print("\n📍 GPS Alert Details:")
                for alert in gps_alerts[:3]:  # Show first 3
                    print(f"   - Lat: {alert['latitude']}, Lon: {alert['longitude']}")
                    print(f"     Time: {alert.get('timestamp', 'N/A')}")
                    print(f"     Device: {alert.get('device', 'N/A')}")
                    print()
            
            return True
            
        else:
            print(f"❌ API endpoint failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server. Is it running on port 5000?")
        return False
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

def test_insert_endpoint():
    print("\n🧪 Testing insert_detection endpoint...")
    
    # Test data similar to what ESP32 sends
    test_data = {
        "device": "EcoSentry-Rx",
        "location": "Can-ayan, Bukidnon",
        "detection": "ALERT,CHAINSAW,8.15067372,125.13175377",
        "rssi": -45,
        "snr": 8.5
    }
    
    try:
        response = requests.post(
            "http://localhost:5000/insert_detection",
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Insert endpoint working! ID: {result.get('id', 'N/A')}")
            return True
        else:
            print(f"❌ Insert endpoint failed with status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing insert endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting API tests...\n")
    
    # Test both endpoints
    api_ok = test_api_endpoint()
    insert_ok = test_insert_endpoint()
    
    print("\n" + "=" * 50)
    if api_ok and insert_ok:
        print("🎉 All tests passed! Your GPS coordinates should appear on the map.")
    else:
        print("⚠️  Some tests failed. Check the Flask server and MongoDB connection.")
