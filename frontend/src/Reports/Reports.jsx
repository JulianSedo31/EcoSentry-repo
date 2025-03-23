import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, TextField, Button, InputAdornment } from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import DetectionAlert from "../components/DetectionAlert";
import "./style.css";

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
];

function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [detections, setDetections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [latestDetection, setLatestDetection] = useState(null);

  // Fetch detections from the backend
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/detection');
        const data = await response.json();
        
        // Check for new detections
        if (data.length > 0) {
          const newestDetection = data[0];
          
          // If this is the first load or if we have a new detection
          if (!latestDetection || newestDetection._id !== latestDetection._id) {
            setLatestDetection(newestDetection);
            setAlertOpen(true);
          }
        }
        
        setDetections(data);
        setFilteredData(data);
      } catch (error) {
        console.error('Error fetching detections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
    // Set up polling every 5 seconds to check for new detections
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, [latestDetection]);

  // Handle alert close
  const handleAlertClose = () => {
    setAlertOpen(false);
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

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Detection Reports</h1>
        <div className="actions-container">
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
        open={alertOpen}
        message={latestDetection?.detection || ""}
        onClose={handleAlertClose}
      />
    </div>
  );
}

export default Reports;
