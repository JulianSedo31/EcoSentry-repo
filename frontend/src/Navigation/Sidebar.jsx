import React from "react";
// CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "../assets/style.css";
// IMG
import logo from "../assets/EcoSentryLogo.png";
// ICONS
import { RiDashboardFill } from "react-icons/ri";
import { VscHistory } from "react-icons/vsc";
// SIDEBAR
import {
  CDBSidebar,
  CDBSidebarContent,
  CDBSidebarHeader,
  CDBSidebarMenu,
  CDBSidebarMenuItem,
} from "cdbreact";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="sidebarLayout">
      <CDBSidebar textColor="#F7F7F7" backgroundColor="#212121">
        <CDBSidebarHeader>
          <a>
            <img src={logo} className="logo" alt="EcoSentry Logo" />
          </a>
        </CDBSidebarHeader>

        <CDBSidebarContent className="sidebarContent">
          <CDBSidebarMenu>
            {/* dashboard */}
            <NavLink exact to="/dashboard" activeClassName="activeClicked">
              <CDBSidebarMenuItem
                className="menuItem"
                style={{
                  backgroundColor:
                    location.pathname === "/dashboard"
                      ? "#436850"
                      : "transparent",
                }}
              >
                <RiDashboardFill className="dashboardIcon" />
                <span className="dashboardTxt">dashboard</span>
              </CDBSidebarMenuItem>
            </NavLink>

            {/* reports */}
            <NavLink exact to="/reports" activeClassName="activeClicked">
              <CDBSidebarMenuItem
                className="menuItem"
                style={{
                  backgroundColor:
                    location.pathname === "/reports"
                      ? "#436850"
                      : "transparent",
                }}
              >
                <VscHistory className="reportsIcon" />
                <span className="reportsTxt">reports</span>
              </CDBSidebarMenuItem>
            </NavLink>
          </CDBSidebarMenu>
        </CDBSidebarContent>
      </CDBSidebar>
    </div>
  );
};

export default Sidebar;
