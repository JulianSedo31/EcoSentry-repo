import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
//SIDEBAR
import { Sidebar, Menu, MenuItem, sidebarClasses } from "react-pro-sidebar";
// ICONS
import { BiSolidDashboard } from "react-icons/bi";
import { GoHistory } from "react-icons/go";
import { TbLogout2 } from "react-icons/tb";
// IMG
import Logo from "../assets/EcoSentryLogo.png";
// STYLE
import "./style.css"; // Custom CSS for styling

function CustomSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar state
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation
  const handleNavigation = (path) => {
    if (path === "logout") {
      // Clear token and navigate to login
      localStorage.removeItem("token");
      navigate("/");
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
            icon={<GoHistory size={25} />}
            onClick={() => handleNavigation("/reports")}
            className={`menu-item ${isActive("/reports") ? "active" : ""}`}
          >
            Reports
          </MenuItem>
          <MenuItem
            icon={<TbLogout2 size={30} />}
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
