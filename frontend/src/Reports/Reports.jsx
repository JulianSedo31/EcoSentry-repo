import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, TextField, Button, InputAdornment, CircularProgress } from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import "./style.css";

// Column definitions
const columns = [
  { field: "id", headerName: "ID", width: 90 },
  { 
    field: "timestamp", 
    headerName: "Timestamp", 
    width: 200,
    valueFormatter: (params) => {
      console.log('Timestamp value:', params.value);
      return params.value ? new Date(params.value).toLocaleString() : 'N/A';
    }
  },
  { field: "detection", headerName: "Detection Type", width: 200 },
];

function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [detections, setDetections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch detections from backend
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        console.log('🔄 Starting to fetch detections...');
        const response = await fetch('http://localhost:5000/api/detections');
        console.log('📥 Response received:', response);
        
        if (!response.ok) {
          console.error('❌ Response not OK:', response.status, response.statusText);
          throw new Error(`Failed to fetch detections: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Raw data from server:', JSON.stringify(data, null, 2));
        
        if (!Array.isArray(data)) {
          console.error('❌ Data is not an array:', data);
          throw new Error('Received invalid data format from server');
        }
        
        if (data.length === 0) {
          console.log('⚠️ No detections found in the data');
        }
        
        // Transform data to include id for DataGrid
        const transformedData = data.map((detection, index) => {
          console.log('🔍 Processing detection:', JSON.stringify(detection, null, 2));
          
          const transformed = {
            id: detection.id || index + 1,
            timestamp: detection.timestamp || 'N/A', // Fallback for missing timestamp
            detection: detection.detection || 'Unknown'
          };
          console.log('Transformed row:', transformed);
          return transformed;
        });
        
        console.log('✨ Final transformed data:', JSON.stringify(transformedData, null, 2));
        setDetections(transformedData);
        setFilteredData(transformedData);
      } catch (err) {
        console.error('❌ Error in fetchDetections:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
  }, []);

  // Handle search
  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = detections.filter(
      (detection) =>
        detection.id.toString().includes(term) ||
        (detection.timestamp && new Date(detection.timestamp).toLocaleString().toLowerCase().includes(term)) ||
        detection.detection.toLowerCase().includes(term)
    );
    setFilteredData(filtered);
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["ID,Timestamp,Detection Type"];
    const data = filteredData.map(
      (row) => `${row.id},${new Date(row.timestamp).toLocaleString()},"${row.detection}"`
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

  if (loading) {
    return (
      <div className="reports-container">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <div>Error: {error}</div>
        </Box>
      </div>
    );
  }

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
        />
      </Box>
    </div>
  );
}

export default Reports;