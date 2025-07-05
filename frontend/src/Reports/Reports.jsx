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
  PictureAsPdf as PdfIcon,
  Archive as ArchiveIcon,
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
// PDF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import penroLogo from "../assets/penroLogo.png";
import Swal from "sweetalert2";

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
        const response = await fetch(
          "http://localhost:5000/api/detection?includeArchived=false"
        );
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

  // Handle archive click
  const handleArchiveClick = (id) => {
    Swal.fire({
      title: "Archive Detection",
      text: "Are you sure you want to archive this detection record?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#27323a",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/detection/${id}/archive`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archivedBy: "User" }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to archive detection");
          }

          setDetections((prevDetections) =>
            prevDetections.filter((detection) => detection._id !== id)
          );
          setFilteredData((prevFilteredData) =>
            prevFilteredData.filter((detection) => detection._id !== id)
          );

          Swal.fire("Archived!", "Detection archived successfully.", "success");
        } catch (error) {
          console.error("Error archiving detection:", error);
          Swal.fire(
            "Error",
            "Failed to archive detection: " + error.message,
            "error"
          );
        }
      }
    });
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
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // HEADER
      const logoWidth = 25;
      const logoHeight = 25;
      const orgName = "Provincial Environment and Natural Resources Office";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14); // Smaller but clean org name
      const orgNameWidth = doc.getTextWidth(orgName);

      const spacing = 6;
      const totalWidth = logoWidth + spacing + orgNameWidth;
      const headerX = (pageWidth - totalWidth) / 2;
      const headerY = 30;

      doc.addImage(
        penroLogo,
        "PNG",
        headerX,
        headerY - logoHeight / 2,
        logoWidth,
        logoHeight
      );
      doc.text(orgName, headerX + logoWidth + spacing, headerY);

      // REPORT TITLE
      doc.setFontSize(15);
      doc.setTextColor(40);
      doc.text("Chainsaw Detection Report", pageWidth / 2, 50, {
        align: "center",
      });

      // DATE RANGE
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
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Monthly Report – ${dateRange}`, pageWidth / 2, 60, {
        align: "center",
      });

      // SUMMARY STATS
      doc.setFontSize(11);
      doc.text(`Total Detections: ${filteredData.length}`, 20, 75);

      // TABLE DATA
      const tableData = filteredData.map((detection) => [
        detection.device || "N/A",
        detection.location || "N/A",
        new Date(detection.timestamp).toLocaleString(),
        detection.detection,
      ]);

      autoTable(doc, {
        startY: 80,
        head: [["Device", "Location", "Timestamp", "Detection"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [34, 139, 34], // Forest green
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: "linebreak",
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 30, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 50, halign: "center" },
          3: { cellWidth: 55, halign: "center" },
        },
        margin: { top: 20, bottom: 50 },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
      });

      // FOOTER / SIGNATURE BLOCK
      const pageHeight = doc.internal.pageSize.getHeight();
      const adminName = "Thomas L. Cardente II, Ph.D.";
      const adminTitle = "PENRO OFFICER";

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");

      const adminNameWidth = doc.getTextWidth(adminName);
      const adminTitleWidth = doc.getTextWidth(adminTitle);
      const lineWidth = Math.max(adminNameWidth, adminTitleWidth) + 20;

      const lineXStart = (pageWidth - lineWidth) / 2;
      const lineXEnd = lineXStart + lineWidth;
      const footerStartY = pageHeight - 35;

      // Admin name ABOVE the line
      doc.text(adminName, pageWidth / 2, footerStartY - 3, {
        align: "center",
      });

      // Signature line
      doc.line(lineXStart, footerStartY, lineXEnd, footerStartY);

      // Admin title BELOW the line
      doc.text(adminTitle, pageWidth / 2, footerStartY + 6, {
        align: "center",
      });

      // SAVE FILE
      const fileName = `chainsaw_detection_report_${dateRange.replace(
        " ",
        "_"
      )}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  //  Function to handle playing audio
  // const handlePlayAudio = async (id) => {
  //   try {
  //     const response = await fetch(
  //       `http://localhost:5000/api/detection/audio/${id}`
  //     );
  //     if (!response.ok) {
  //       throw new Error("Failed to fetch audio");
  //     }

  //     const audioBlob = await response.blob();
  //     const audioUrl = URL.createObjectURL(audioBlob);
  //     const audio = new Audio(audioUrl);
  //     audio.play();
  //   } catch (error) {
  //     console.error("Error playing audio:", error);
  //     alert("Failed to play audio file");
  //   }
  // };

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
    const yearlyTotals = {};

    detections.forEach((d) => {
      const year = new Date(d.timestamp).getFullYear();
      if (d.detection.includes("Chainsaw")) {
        yearlyTotals[year] = (yearlyTotals[year] || 0) + 1;
      }
    });

    const years = Object.keys(yearlyTotals).sort();
    const dataPoints = years.map((year) => yearlyTotals[year]);

    return {
      labels: years,
      datasets: [
        {
          label: "Total Detections",
          data: dataPoints,
          borderColor: "#75CFB8",
          backgroundColor: "rgba(117, 207, 184, 0.3)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#75CFB8",
        },
      ],
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
      renderCell: (params) => {
        const message = params.row.detection;
        let displayMessage = message;

        if (message.includes("Chainsaw Detected")) {
          displayMessage = "🔴 Chainsaw Detected";
        } else if (message.includes("Possible Chainsaw")) {
          displayMessage = "🟡 Chainsaw Detected";
        }

        return (
          <div
            style={{
              color: message.includes("Chainsaw Detected")
                ? "#000000"
                : "#000000",
              fontWeight: "500",
              fontSize: "0.875rem",
            }}
          >
            {displayMessage}
          </div>
        );
      },
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
            onClick={() => handleArchiveClick(params.row._id)}
            color="27323a"
            size="small"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(255, 193, 7, 0.08)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <ArchiveIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  // Conditionally render a loading spinner for the initial fetch
  if (loading) {
    return (
      <div className="spinnerOverlay">
        <div className="spinner"></div>
      </div>
    );
  }

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
          <h3 className="chart-title">Total Chainsaw Detections per Year</h3>
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
    </div>
  );
}

export default Reports;
