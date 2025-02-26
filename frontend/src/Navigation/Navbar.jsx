import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { IoNotificationsOutline } from "react-icons/io5";
import "../assets/style.css";

const Navbar = () => {
  const location = useLocation();

  // Mapping paths to page titles
  const pageTitles = {
    "/dashboard": "Dashboard",
    "/reports": "Reports",
  };

  // State to store notifications (Replace this with backend data later)
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Illegal logging detected!" },
    { id: 2, message: "Suspicious activity near protected trees!" },
    { id: 2, message: "Suspicious activity near protected trees!" },
  ]);

  // State to show/hide the notification dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  // Function to toggle the dropdown visibility
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Function to remove a notification when clicked (Modify this to mark as read in backend)
  const handleNotificationClick = (id) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
  };

  return (
    <nav className="navbarLayout">
      {/* Dynamic page title based on route */}
      <p className="pageTitle">{pageTitles[location.pathname]}</p>

      {/* Notification Icon */}
      <div className="notificationsContainer">
        <IoNotificationsOutline
          className="notificationIcon"
          onClick={toggleDropdown}
        />

        {/* Show notification count badge if there are unread notifications */}
        {notifications.length > 0 && (
          <span className="notifBadge">{notifications.length}</span>
        )}

        {/* Notification Dropdown */}
        {showDropdown && (
          <div className="notificationDropdown">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="notificationItem"
                  onClick={() => handleNotificationClick(notif.id)}
                >
                  {notif.message}
                </div>
              ))
            ) : (
              <p className="noNotifications">No new notifications</p>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
