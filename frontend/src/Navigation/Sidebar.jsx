import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
//SIDEBAR
import { Sidebar, Menu, MenuItem, sidebarClasses } from "react-pro-sidebar";
// ICONS
import { BiSolidDashboard } from "react-icons/bi";
import { TbReportAnalytics } from "react-icons/tb";
import { FiLogOut } from "react-icons/fi";
import { FaInfoCircle, FaInfo } from "react-icons/fa";
// IMG
import Logo from "../assets/EcoSentryLogo.png";
// STYLE
import "./style.css"; // Custom CSS for styling

function CustomSidebar({ setToken }) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Sidebar state
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation
  const handleNavigation = (path) => {
    if (path === "logout") {
      // Clear token and force reload to show login page
      localStorage.removeItem("token");
      setToken(null);
      // window.location = "/"; // Force reload for guaranteed redirect
      return;
    }
    navigate(`/app${path}`);
  };

  // Check if route is active
  const isActive = (path) => {
    if (path === "") {
      return location.pathname === "/app";
    }
    return location.pathname === `/app${path}`;
  };

  return (
    <div className="sidebar-container">
      <Sidebar
        collapsed={isCollapsed} // Controls sidebar collapse
        rootStyles={{
          [`.${sidebarClasses.container}`]: {
            backgroundColor: "#27323a", // Sidebar background color
            color: "white",
            minHeight: "100vh",
            transition: "width 0.3s ease-in-out",
          },
        }}
      >
        {/* Sidebar Header - Clickable Logo */}
        <div
          className="sidebar-header"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <img
            src={Logo}
            alt="EcoSentryLogo"
            className={`sidebar-logo ${
              isCollapsed ? "sidebar-collapsed-logo" : ""
            }`}
          />
        </div>

        {/* Sidebar Menu */}
        <Menu>
          <MenuItem
            icon={<BiSolidDashboard size={30} />}
            onClick={() => handleNavigation("")}
            className={`menu-item ${isActive("") ? "active" : ""}`}
          >
            Dashboard
          </MenuItem>
          <MenuItem
            icon={<TbReportAnalytics size={30} />}
            onClick={() => handleNavigation("/reports")}
            className={`menu-item ${isActive("/reports") ? "active" : ""}`}
          >
            Reports
          </MenuItem>
          <MenuItem
            icon={<FaInfo size={28} />}
            onClick={() => handleNavigation("/about")}
            className={`menu-item ${isActive("/about") ? "active" : ""}`}
          >
            About us
          </MenuItem>
          <MenuItem
            icon={<FiLogOut size={27} />}
            onClick={() => handleNavigation("logout")}
            className="menu-item"
          >
            Logout
          </MenuItem>
        </Menu>
      </Sidebar>
    </div>
  );
}

export default CustomSidebar;
