// LEAFLET MAP
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// CSS
import "./style.css"; // Import the updated CSS

const localCoordinates = [8.154557, 125.151347]; // Malaybalay Coordinates

function Dashboard() {
  return (
    <div className="dashboard">
      {/* Fullscreen Map */}
      <MapContainer
        center={localCoordinates} // Location Malaybalay
        zoom={15}
        className="map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
}

export default Dashboard;
