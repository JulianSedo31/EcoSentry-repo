import { Outlet } from "react-router-dom";
import Sidebar from "../Navigation/Sidebar";
import Navbar from "../Navigation/Navbar";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap
import "./style.css"; // Make sure to import the styles

function Layout() {
  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar />
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
