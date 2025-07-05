from pymongo import MongoClient
import gridfs
from bson import ObjectId

# MongoDB URI (replace with your actual URI)
MONGO_URI = "mongodb+srv://root:nahidwin@cluster0.llcgs.mongodb.net/ecoSentryDB?retryWrites=true&w=majority&appName=Cluster0"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.get_database()  # Connect to the database
fs = gridfs.GridFS(db)  # Initialize GridFS for storing files

# Query the detections collection to get the most recent detection
detection = db.detections.find().sort("timestamp", -1).limit(1)  # Sort by timestamp, descending order

if detection:
    # Get the first (most recent) detection
    detection = detection[0]

    if "file_id" in detection:
        # Retrieve the file_id from the detection document
        file_id = detection["file_id"]
        
        # Debugging: Check if the file exists in GridFS
        file_metadata = fs.get(file_id) if fs.exists({"_id": file_id}) else None
        
        if file_metadata:
            print(f"File with file_id {file_id} found in GridFS.")
            # Retrieve the audio file by file_id from GridFS
            audio_file = fs.get(file_id)
            
            # Save the file locally
            with open("retrieved_audio.wav", "wb") as f:
                f.write(audio_file.read())
            print("Audio file retrieved and saved as retrieved_audio.wav")
        else:
            print(f"No file found in GridFS with file_id: {file_id}")
    else:
        print("Detection does not have a linked audio file (file_id).")
else:
    print("No detections found.")
