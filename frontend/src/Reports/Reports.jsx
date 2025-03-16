import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, TextField, Button, InputAdornment } from "@mui/material";
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import "./style.css";

// Sample data for testing
const sampleAlerts = [
  {
    id: 1,
    timestamp: "2024-03-15 09:30:45",
    alertType: "Chainsaw Sound Detected",
  },
  {
    id: 2,
    timestamp: "2024-03-15 10:15:22",
    alertType: "Chainsaw Sound Detected",
  },
  {
    id: 3,
    timestamp: "2024-03-15 11:45:33",
    alertType: "Chainsaw Sound Detected",
  },
];

// Column definitions
const columns = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "timestamp", headerName: "Timestamp", width: 200 },
  { field: "alertType", headerName: "Alert Type", width: 200 },
];

function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(sampleAlerts);

  // Handle search
  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = sampleAlerts.filter(
      (alert) =>
        alert.id.toString().includes(term) ||
        alert.timestamp.toLowerCase().includes(term)
    );
    setFilteredData(filtered);
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["ID,Timestamp,Alert Type"];
    const data = filteredData.map(
      (row) => `${row.id},${row.timestamp},"${row.alertType}"`
    );
    const csvContent = [...headers, ...data].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alerts_report.csv";
    link.click();
  };

  const exportToPDF = () => {
    // PDF export functionality would go here
    console.log("Export to PDF");
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Alert Reports</h1>
        <div className="actions-container">
          <TextField
            variant="outlined"
            placeholder="Search alerts..."
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
