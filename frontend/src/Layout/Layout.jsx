import React from "react";
// COMPONENTS
import Sidebar from "../Navigation/Sidebar";
import Navbar from "../Navigation/Navbar";
// ROUTER
import { Outlet, useLocation } from "react-router-dom"; // Allows nested routes, para mo appear tanan sa page and layout

function Layout() {
  const location = useLocation(); // Added useLocation to fix reference issue

  return (
    <div className="layoutContainer">
      {/* Sidebar (Fixed on Left) */}
      <Sidebar />

      <div className="layoutNavbar">
        {/* Navbar (Fixed on Top) */}
        <Navbar />

        {/* Content Area */}
        <div className="layoutMainContent">
        <Outlet />  
        </div>
      </div>
    </div>
  );
}

export default Layout;
