import React from "react";
import { useLocation } from "react-router-dom";
// ICONS
import { IoNotificationsOutline } from "react-icons/io5";

const Navbar = () => {

  const location = useLocation();
  // Map paths to page titles
  const pageTitles = {
    "/dashboard": "Dashboard",
    "/reports": "Reports",
  };

  return (
    <nav className="navbarLayout">
      <p className="pageTitle">{pageTitles[location.pathname]}</p> 
      <div className="notificationsContainer">
        <IoNotificationsOutline className="notificationIcon" />
      </div>  
    </nav>
  );
};

export default Navbar;