import React, { useState, useEffect } from "react";
// DATA TABLE
import { DataGrid } from "@mui/x-data-grid";
// MUI LIBRARY
import {
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
// ICONS
import {
  Search as SearchIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";
// COMPONENTS
import DetectionAlert from "../components/DetectionAlert";
// STYLE
import "./style.css";
// CHARTS
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
// PFF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [detections, setDetections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detectionToDelete, setDetectionToDelete] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDevice, setSelectedDevice] = useState("all");

  // Get unique years from detections
  const getUniqueYears = () => {
    const years = new Set(
      detections.map((d) => new Date(d.timestamp).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  };

  // Get unique devices from detections
  const getUniqueDevices = () => {
    const devices = new Set(detections.map((d) => d.device));
    return Array.from(devices).filter(Boolean); // Filter out null/undefined values
  };

  // Filter detections by month, year, and device
  useEffect(() => {
    const filtered = detections.filter((detection) => {
      const date = new Date(detection.timestamp);
      const monthMatch = date.getMonth() === selectedMonth;
      const yearMatch = date.getFullYear() === selectedYear;
      const deviceMatch =
        selectedDevice === "all" || detection.device === selectedDevice;
      return monthMatch && yearMatch && deviceMatch;
    });
    setFilteredData(filtered);
  }, [detections, selectedMonth, selectedYear, selectedDevice]);

  // Fetch detections from the backend
  useEffect(() => {
    const fetchDetections = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/detection");
        const data = await response.json();
        setDetections(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error fetching detections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetections();
  }, []);

  // Handle delete click
  const handleDeleteClick = (id) => {
    setDetectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/detection/${detectionToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete detection");
      }

      // Remove the deleted detection from the state
      setDetections((prevDetections) =>
        prevDetections.filter(
          (detection) => detection._id !== detectionToDelete
        )
      );
      setFilteredData((prevFilteredData) =>
        prevFilteredData.filter(
          (detection) => detection._id !== detectionToDelete
        )
      );

      // Show success message
      alert("Detection deleted successfully");
    } catch (error) {
      console.error("Error deleting detection:", error);
      alert("Failed to delete detection: " + error.message);
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

  // Handle search (remove sa nako kay murag dili na needed )
  // const handleSearch = (event) => {
  //   const term = event.target.value.toLowerCase();
  //   setSearchTerm(term);

  //   const filtered = detections.filter(
  //     (detection) =>
  //       detection._id.toLowerCase().includes(term) ||
  //       detection.detection.toLowerCase().includes(term) ||
  //       new Date(detection.timestamp)
  //         .toLocaleString()
  //         .toLowerCase()
  //         .includes(term)
  //   );
  //   setFilteredData(filtered);
  // };

  // Export functions
  const exportToPDF = () => {
    try {
      // Create new PDF document
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text("Chainsaw Detection Report", 14, 15);

      // Add date range
      doc.setFontSize(12);
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const dateRange = `${monthNames[selectedMonth]} ${selectedYear}`;
      doc.text(`Period: ${dateRange}`, 14, 25);

      // Prepare table data
      const tableData = filteredData.map((detection) => [
        detection.device || "N/A",
        detection.location || "N/A",
        new Date(detection.timestamp).toLocaleString(),
        detection.detection,
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 35,
        head: [["Device", "Location", "Timestamp", "Detection"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [191, 49, 49],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 45 },
          3: { cellWidth: 70, fontSize: 7 },
        },
        margin: { top: 35 },
      });

      // Save the PDF
      doc.save(`chainsaw_detection_report_${dateRange.replace(" ", "_")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  //  Function to handle playing audio
  const handlePlayAudio = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/detection/audio/${id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch audio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      alert("Failed to play audio file");
    }
  };

  // Handle month change
  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  // Handle year change
  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  // Handle device change
  const handleDeviceChange = (event) => {
    setSelectedDevice(event.target.value);
  };

  // Inside your Reports component, add this chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000, // Animation duration in milliseconds
      easing: "easeInOutQuart", // Smooth easing function
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(20, 30, 45, 0.95)",
        titleColor: "white",
        bodyColor: "white",
        padding: 12,
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
  };

  // Modify your data preparation function
  const prepareChartData = () => {
    const monthlyData = Array(12).fill(0);

    detections.forEach((detection) => {
      const date = new Date(detection.timestamp);
      const monthIndex = date.getMonth();
      if (detection.detection.includes("Chainsaw")) {
        monthlyData[monthIndex]++;
      }
    });

    return {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets: [
        {
          data: monthlyData,
          backgroundColor: "rgba(117, 207, 184, 0.8)",
          borderColor: "#75CFB8",
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: "#75CFB8",
        },
      ],
    };
  };

  //Chart data to show monthly and yearly trends
  const prepareLineChartData = () => {
    // Create an object to store yearly totals
    const yearlyData = {};

    detections.forEach((detection) => {
      const date = new Date(detection.timestamp);
      const year = date.getFullYear();

      // Initialize the year if it doesn't exist
      if (!yearlyData[year]) {
        yearlyData[year] = {
          total: 0,
          months: Array(12).fill(0),
        };
      }

      if (detection.detection.includes("Chainsaw")) {
        yearlyData[year].total++;
        yearlyData[year].months[date.getMonth()]++;
      }
    });

    // Get all years and sort them
    const years = Object.keys(yearlyData).sort();

    // Create datasets for each year
    const datasets = years.map((year) => ({
      label: year,
      data: yearlyData[year].months,
      borderColor: getYearColor(year),
      backgroundColor: `${getYearColor(year)}20`, // 20 is hex for 12% opacity
      fill: true,
      tension: 0.4,
      pointBackgroundColor: getYearColor(year),
      pointBorderColor: "#fff",
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: getYearColor(year),
      pointRadius: 4,
      pointHoverRadius: 6,
    }));

    return {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets,
    };
  };

  // Generate different colors for each year
  const getYearColor = (year) => {
    const colors = {
      2024: "#75CFB8", // Keep the existing color for current year
      2023: "#64B5F6", // Blue
      2022: "#81C784", // Green
      2021: "#BA68C8", // Purple
      // Add more colors as needed
    };
    return colors[year] || "#75CFB8"; // Default to original color if year not found
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: "easeInOutQuart",
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
    plugins: {
      legend: {
        display: true, // Show legend for multiple years
        position: "top",
        labels: {
          color: "rgba(255, 255, 255, 0.7)",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(20, 30, 45, 0.95)",
        titleColor: "white",
        bodyColor: "white",
        padding: 12,
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y} detections`;
          },
        },
      },
    },
  };

  // Column definitions
  const columns = [
    {
      field: "device",
      headerName: "Device",
      flex: 1,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "location",
      headerName: "Location",
      flex: 2,
      minWidth: 300,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "timestamp",
      headerName: "Timestamp",
      flex: 1,
      minWidth: 250,
      headerAlign: "center",
      renderCell: (params) => {
        return new Date(params.row.timestamp).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "medium",
        });
      },
    },
    {
      field: "detection",
      headerName: "Detection",
      flex: 1,
      minWidth: 250,
      sortable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <div
          style={{
            color: params.row.detection.includes("Chainsaw")
              ? "black"
              : "#ff9800",
            fontWeight: "500",
            fontSize: "0.875rem",
          }}
        >
          {params.row.detection}
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 200,
      sortable: false,
      headerAlign: "center",
      renderCell: (params) => (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <IconButton
            onClick={() => handleDeleteClick(params.row._id)}
            color="error"
            size="small"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(211, 47, 47, 0.08)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="reports-container">
      {/* Charts Row */}
      <div className="charts-container">
        {/* BAR CHART */}
        <div className="chart-box">
          <h3 className="chart-title">Chainsaw Detections per Month</h3>
          <div style={{ position: "relative", height: "90%", width: "100%" }}>
            <Bar data={prepareChartData()} options={chartOptions} />
          </div>
        </div>
        {/* LINE CHART */}
        <div className="chart-box">
          <h3 className="chart-title">Yearly Detection Trends Comparison</h3>
          <div style={{ position: "relative", height: "90%", width: "100%" }}>
            <Line data={prepareLineChartData()} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* Controls and Table Row */}
      <div className="controls-table-container">
        <div className="controls-section">
          <div className="date-filters">
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={handleMonthChange}
              >
                <MenuItem value={0}>January</MenuItem>
                <MenuItem value={1}>February</MenuItem>
                <MenuItem value={2}>March</MenuItem>
                <MenuItem value={3}>April</MenuItem>
                <MenuItem value={4}>May</MenuItem>
                <MenuItem value={5}>June</MenuItem>
                <MenuItem value={6}>July</MenuItem>
                <MenuItem value={7}>August</MenuItem>
                <MenuItem value={8}>September</MenuItem>
                <MenuItem value={9}>October</MenuItem>
                <MenuItem value={10}>November</MenuItem>
                <MenuItem value={11}>December</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={handleYearChange}
              >
                {getUniqueYears().map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Device</InputLabel>
              <Select
                value={selectedDevice}
                label="Device"
                onChange={handleDeviceChange}
              >
                <MenuItem value="all">All Devices</MenuItem>
                {getUniqueDevices().map((device) => (
                  <MenuItem key={device} value={device}>
                    {device}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportToPDF}
            className="export-btn"
          >
            Export PDF
          </Button>
        </div>

        <Box
          className="table-container"
          sx={{ width: "100%", overflow: "hidden" }}
        >
          <DataGrid
            rows={filteredData}
            columns={columns}
            pageSize={10}
            disableSelectionOnClick
            loading={loading}
            className="data-grid"
            disableColumnResize={true}
            getRowId={(row) => row._id}
            sx={{
              width: "100%",
              "& .MuiDataGrid-main": {
                overflow: "hidden",
              },
              "& .MuiDataGrid-virtualScroller": {
                overflow: "hidden",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "white",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
                color: "black",
              },
            }}
          />
        </Box>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this detection record?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Reports;
