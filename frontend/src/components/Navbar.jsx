import React from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          EcoSentry
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={Link}
            to="/app"
            startIcon={<DashboardIcon />}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/app/reports"
            startIcon={<AssessmentIcon />}
          >
            Reports
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 