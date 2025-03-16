// ICONS
import { IoNotificationsOutline } from "react-icons/io5";
import { BsBatteryFull, BsBatteryHalf, BsBattery } from "react-icons/bs";
import { MdWifi, MdWifiOff } from "react-icons/md";
// CSS
import "./style.css"; // Import styles

function Navbar() {
  const isConnected = true; // Static value for now
  const batteryLevel = 50; // Example battery percentage

  let BatteryIcon = BsBattery;
  if (batteryLevel > 75) BatteryIcon = BsBatteryFull;
  else if (batteryLevel > 40) BatteryIcon = BsBatteryHalf;

  return (
    <nav className="navbar">
      {/* Device Status Section (Single Row) */}
      <div className="navbar-status">
        <p className="status-label">Device Status:</p>

        {/* Connection Status */}
        <div className="status-item">
          {isConnected ? (
            <>
              <MdWifi className="status-icon connected" />
              <span className="status-text">Connected</span>
            </>
          ) : (
            <>
              <MdWifiOff className="status-icon disconnected" />
              <span className="status-text">Disconnected</span>
            </>
          )}
        </div>

        {/* Battery Status */}
        <div className="status-item">
          <BatteryIcon className="status-icon" />
          <span className="status-text">{batteryLevel}%</span>
        </div>

        {/* Notification Icon */}
        <IoNotificationsOutline className="notification-icon" />
      </div>
    </nav>
  );
}

export default Navbar;
