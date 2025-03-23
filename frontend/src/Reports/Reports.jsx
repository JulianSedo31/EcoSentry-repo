import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, TextField, Button, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel } from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import DetectionAlert from "../components/DetectionAlert";
import "./style.css";

function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [detections, setDetections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detectionToDelete, setDetectionToDelete] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notification settings
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/notification-settings');
        if (!response.ok) {
          throw new Error('Failed to fetch notification settings');
        }
        const settings = await response.json();
        setAlertsEnabled(settings.isEnabled);
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        setError('Failed to load notification settings');
      }
    };

    fetchNotificationSettings();
  }, []);

  // Fetch detections from the backend
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/detection');
        if (!response.ok) {
          throw new Error('Failed to fetch detections');
        }
        const data = await response.json();
        
        // Check for new detections
        if (data.length > 0) {
          const newestDetection = data[0];
          
          // If this is the first load or if we have a new detection
          if (!latestDetection || newestDetection._id !== latestDetection._id) {
            setLatestDetection(newestDetection);
            // Only show alert if alerts are enabled
            if (alertsEnabled) {
              setAlertOpen(true);
            }
          }
        }
        
        setDetections(data);
        setFilteredData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching detections:', error);
        setError('Failed to load detections');
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
    // Set up polling every 5 seconds to check for new detections
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, [latestDetection, alertsEnabled]);

  // Handle alert close
  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  // Handle alert toggle
  const handleAlertToggle = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled: !alertsEnabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      const settings = await response.json();
      setAlertsEnabled(settings.isEnabled);

      if (!settings.isEnabled) {
        setAlertOpen(false);
      } else if (latestDetection) {
        setAlertOpen(true);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      alert('Failed to update notification settings');
    }
  };

  // Handle delete click
  const handleDeleteClick = (id) => {
    setDetectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/detection/${detectionToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete detection');
      }

      // Remove the deleted detection from the state
      setDetections(prevDetections => 
        prevDetections.filter(detection => detection._id !== detectionToDelete)
      );
      setFilteredData(prevFilteredData => 
        prevFilteredData.filter(detection => detection._id !== detectionToDelete)
      );
      
      // Show success message
      alert('Detection deleted successfully');
    } catch (error) {
      console.error('Error deleting detection:', error);
      alert('Failed to delete detection: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDetectionToDelete(null);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDetectionToDelete(null);
  };

  // Handle search
  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = detections.filter(
      (detection) =>
        detection._id.toLowerCase().includes(term) ||
        detection.detection.toLowerCase().includes(term) ||
        new Date(detection.timestamp).toLocaleString().toLowerCase().includes(term)
    );
    setFilteredData(filtered);
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["ID,Timestamp,Detection"];
    const data = filteredData.map(
      (row) => `${row._id},${new Date(row.timestamp).toLocaleString()},"${row.detection}"`
    );
    const csvContent = [...headers, ...data].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "detections_report.csv";
    link.click();
  };

  const exportToPDF = () => {
    // PDF export functionality would go here
    console.log("Export to PDF");
  };

  // Column definitions
  const columns = [
    { field: "_id", headerName: "ID", width: 220 },
    { 
      field: "timestamp", 
      headerName: "Timestamp", 
      width: 200,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString();
      }
    },
    { field: "detection", headerName: "Detection", width: 200 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => handleDeleteClick(params.row._id)}
          color="error"
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Detection Reports</h1>
        <div className="actions-container">
          <FormControlLabel
            control={
              <Switch
                checked={alertsEnabled}
                onChange={handleAlertToggle}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon />
                {alertsEnabled ? "Alerts On" : "Alerts Off"}
              </Box>
            }
          />
          <TextField
            variant="outlined"
            placeholder="Search detections..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-field"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={exportToCSV}
            className="export-btn"
          >
            CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportToPDF}
            className="export-btn"
          >
            PDF
          </Button>
        </div>
      </div>

      <Box className="table-container">
        <DataGrid
          rows={filteredData}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5, 10, 20]}
          disableSelectionOnClick
          className="data-grid"
          loading={loading}
          getRowId={(row) => row._id}
        />
      </Box>

      <DetectionAlert
        open={alertOpen && alertsEnabled}
        message={latestDetection ? `Chainsaw detected at ${latestDetection.location}` : ''}
        onClose={() => setAlertOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this detection record?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Reports;
