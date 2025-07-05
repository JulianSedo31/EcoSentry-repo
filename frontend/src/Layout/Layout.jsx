import { Outlet } from "react-router-dom";
import Sidebar from "../navigation/Sidebar";
import Navbar from "../navigation/Navbar";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap
import "./style.css"; // Make sure to import the styles

function Layout({ setToken }) {
  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar-wrapper">
        <Sidebar setToken={setToken} />
      </div>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* <Navbar /> */}
        <div className="content-wrapper">
          <Outlet />
        </div>

        {/* Footer */}
        <footer
          className="text-center mt-auto py-2"
          style={{
            position: "absolute",
            bottom: "10px",
            width: "100%",
            textAlign: "center",
            color: "#000",
            fontSize: "0.8rem",
            pointerEvents: "none", // Let clicks pass through
            zIndex: "9999",
            opacity: 0.7,
          }}
        >
          © 2025 EcoSentry. All rights reserved. <br />
        </footer>
      </div>
    </div>
  );
}

export default Layout;
