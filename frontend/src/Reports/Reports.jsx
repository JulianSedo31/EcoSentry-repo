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

// Plugin to draw values above bars (used for device counts)
const barValuePlugin = {
  id: "barValuePlugin",
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx, data, chartArea } = chart;
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || !meta.data) return;
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        ctx.save();
        const opts = pluginOptions || {};
        ctx.fillStyle = opts.color || "#000";
        const font = opts.font || "12px Arial";
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const x = bar.x;
        const y = bar.y - 6;
        ctx.fillText(String(value), x, y);
        ctx.restore();
      });
    });
  },
};

ChartJS.register(barValuePlugin);

function Reports() {
  // API base URL: prefer Vite env var VITE_API_BASE, otherwise fall back to current host with port 5000
  // Create a .env file in the frontend root with VITE_API_BASE=http://192.168.1.237:5000 (for example)
  const API_BASE =
    import.meta.env.VITE_API_BASE ||
    `${window.location.protocol}//${window.location.hostname}:5000`;

  const [searchTerm, setSearchTerm] = useState("");
  const [detections, setDetections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDevice, setSelectedDevice] = useState("all");

  // Function to parse detection message and remove prefix
  const parseDetectionMessage = (msg) => {
    if (!msg) return { cleanMessage: "", coordinates: null };

    // Remove PKT#xxx|DeviceName| prefix
    const parts = msg.split("|");
    let cleanMessage = msg;
    let coordinates = null;

    if (parts.length >= 3) {
      // Extract the actual message after the second |
      cleanMessage = parts.slice(2).join("|");

      // Parse GPS coordinates from ALERT,CHAINSAW,lat,lon format
      if (cleanMessage.startsWith("ALERT,CHAINSAW,")) {
        const coords = cleanMessage.split(",");
        if (
          coords.length >= 4 &&
          coords[2] !== "NOFIX" &&
          coords[3] !== "NOFIX"
        ) {
          coordinates = {
            latitude: parseFloat(coords[2]),
            longitude: parseFloat(coords[3]),
          };
        }
      }
    }

    return { cleanMessage, coordinates };
  };

  // Time zone to display dates in (server timezone)
  const DISPLAY_TZ = "Asia/Kuala_Lumpur";

  // Normalize ISO timestamp strings that lack an explicit timezone offset
  // If the timestamp is a string and doesn't end with 'Z' or '+/-HH:MM',
  // assume server timezone (UTC+08) and append '+08:00' so `new Date()`
  // parses it correctly instead of treating it as local time.
  const normalizeISOWithTZ = (ts) => {
    if (!ts) return ts;
    if (typeof ts !== "string") return ts;
    // already has Z or offset
    if (/[Zz]$/.test(ts) || /[+\-]\d{2}:\d{2}$/.test(ts)) return ts;
    return ts + "+08:00";
  };

  // Helper: return date parts for a timestamp in DISPLAY_TZ
  const tzDateParts = (timestamp) => {
    const dt = new Date(normalizeISOWithTZ(timestamp));
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: DISPLAY_TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(dt);
    const find = (type) => {
      const p = parts.find((x) => x.type === type);
      return p ? parseInt(p.value, 10) : null;
    };
    return {
      year: find("year"),
      month: find("month") != null ? find("month") - 1 : null,
      day: find("day"),
      hour: find("hour"),
      minute: find("minute"),
    };
  };

  // Helper: format a timestamp in DISPLAY_TZ with Intl options
  const formatInTZ = (timestamp, options) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: DISPLAY_TZ,
        ...options,
      }).format(new Date(normalizeISOWithTZ(timestamp)));
    } catch (e) {
      const ts = normalizeISOWithTZ(timestamp);
      return ts ? new Date(ts).toLocaleString() : new Date().toLocaleString();
    }
  };

  // Get unique years from detections
  const getUniqueYears = () => {
    // Use server timezone for year extraction
    const years = new Set(
      detections.map((d) => {
        try {
          return tzDateParts(d.timestamp).year;
        } catch (e) {
          return new Date(normalizeISOWithTZ(d.timestamp)).getFullYear();
        }
      })
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
      // Use server timezone month/year for filtering
      const parts = tzDateParts(detection.timestamp);
      const monthMatch = parts.month === selectedMonth;
      const yearMatch = parts.year === selectedYear;
      const deviceMatch =
        selectedDevice === "all" || detection.device === selectedDevice;
      return monthMatch && yearMatch && deviceMatch;
    });
    setFilteredData(filtered);
  }, [detections, selectedMonth, selectedYear, selectedDevice]);

  // Function to fetch detections from the backend (reusable)
  const fetchDetections = async () => {
    try {
      const response = await fetch(`/api/detection?includeArchived=false`);
      if (!response.ok) {
        // Log and bail — keep the previous data if fetch fails
        const text = await response.text().catch(() => "<no body>");
        throw new Error(`Fetch failed: ${response.status} ${text}`);
      }
      const data = await response.json();
      setDetections(data);
      // Initialize filteredData using server timezone defaults
      setFilteredData(data);

      // Also fetch server time so UI can display/report server timestamp
      try {
        const tResp = await fetch(`/api/server_time`);
        if (tResp.ok) {
          const tjson = await tResp.json();
          setServerTime(tjson);
        }
      } catch (e) {
        console.warn("Failed to fetch server time:", e);
      }
    } catch (error) {
      console.error("Error fetching detections:", error);
    } finally {
      // Hide initial loading spinner after first attempt
      setLoading(false);
    }
  };

  // Auto-refresh: initial fetch + polling interval to refresh detections
  useEffect(() => {
    // Initial fetch
    fetchDetections();

    // Polling interval (ms) — change this value to poll faster/slower.
    const POLL_INTERVAL_MS = 5000; // 5 seconds
    const intervalId = setInterval(() => {
      fetchDetections();
    }, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
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
          const response = await fetch(`/api/detection/${id}/archive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archivedBy: "User" }),
          });

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

  // Play audio for a detection by id
  const handlePlayAudio = async (id) => {
    try {
      // First, find the detection to confirm it has a file_id
      const det = detections.find((d) => d._id === id);
      if (!det || !det.file_id) {
        Swal.fire({
          icon: "info",
          title: "No audio",
          text: "There is no audio file attached to this detection.",
        });
        return;
      }

      const url = `/api/detection/audio/${id}`;
      console.log("[Audio] fetching", url);
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text().catch(() => "<no body>");
        console.error("Audio fetch failed", response.status, text);
        Swal.fire({
          icon: "error",
          title: "Playback failed",
          text: `Unable to fetch audio (HTTP ${response.status}): ${text}`,
        });
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();
      audio.src = audioUrl;
      audio.controls = true;
      audio.autoplay = true;

      // Play and handle playback errors (autoplay, format)
      try {
        await audio.play();
      } catch (playErr) {
        console.error("Audio play error:", playErr);
        Swal.fire({
          icon: "error",
          title: "Playback failed",
          text: `Playback error: ${playErr.message || playErr}`,
        });
      }

      // Revoke object URL after playback ends to free memory
      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);
      });
      // Also revoke on error
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(audioUrl);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Swal.fire({
        icon: "error",
        title: "Playback failed",
        text: "Unable to play audio for this detection.",
      });
    }
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
      // Create PDF with A4 size (210mm x 297mm)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 10; // 10mm margins on all sides for more space
      const usableWidth = pageWidth - 2 * margin; // 190mm usable width

      // HEADER - Compact design
      const logoWidth = 18;
      const logoHeight = 18;
      const orgName = "Provincial Environment and Natural Resources Office";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);

      // Check if org name fits, if not, split it
      const orgNameWidth = doc.getTextWidth(orgName);
      const spacing = 4;
      const totalHeaderWidth = logoWidth + spacing + orgNameWidth;

      let headerX = margin;
      let headerY = 15;

      // Add logo
      doc.addImage(
        penroLogo,
        "PNG",
        headerX,
        headerY - logoHeight / 2,
        logoWidth,
        logoHeight
      );

      // Add organization name
      if (totalHeaderWidth <= usableWidth) {
        doc.text(orgName, headerX + logoWidth + spacing, headerY);
      } else {
        // Split text if too long
        const words = orgName.split(" ");
        let line = "";
        let yPos = headerY;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const testWidth = doc.getTextWidth(testLine);
          if (testWidth > usableWidth - logoWidth - spacing && i > 0) {
            doc.text(line, headerX + logoWidth + spacing, yPos);
            line = words[i] + " ";
            yPos += 5;
          } else {
            line = testLine;
          }
        }
        doc.text(line, headerX + logoWidth + spacing, yPos);
        headerY = yPos + 5;
      }

      // REPORT TITLE
      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Chainsaw Detection Report", pageWidth / 2, headerY + 8, {
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
      doc.setFontSize(10);
      doc.text(`Monthly Report – ${dateRange}`, pageWidth / 2, headerY + 14, {
        align: "center",
      });

      // SUMMARY STATS
      doc.setFontSize(9);
      doc.text(
        `Total Detections: ${filteredData.length}`,
        margin,
        headerY + 20
      );

      // TABLE DATA
      // Use explicit latitude/longitude if present on the detection object,
      // otherwise try to parse coordinates from the detection message.
      const tableData = filteredData.map((detection) => {
        const parsed = parseDetectionMessage(detection.detection || "");
        const lat =
          detection.latitude != null
            ? detection.latitude
            : parsed.coordinates
            ? parsed.coordinates.latitude
            : null;
        const lon =
          detection.longitude != null
            ? detection.longitude
            : parsed.coordinates
            ? parsed.coordinates.longitude
            : null;

        // Format timestamp in server timezone to be more compact
        const formattedDate = formatInTZ(detection.timestamp, {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
        const formattedTime = formatInTZ(detection.timestamp, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        // Clean detection message (remove prefix if present)
        // Keep full message - table will handle wrapping
        const { cleanMessage } = parseDetectionMessage(
          detection.detection || ""
        );

        // Ensure the message is properly formatted for PDF
        // Replace any problematic characters and ensure proper spacing
        const formattedMessage = cleanMessage
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        return [
          detection.device || "N/A",
          lat != null ? lat.toFixed(6) : "N/A",
          lon != null ? lon.toFixed(6) : "N/A",
          `${formattedDate}\n${formattedTime}`,
          formattedMessage, // Full message - will wrap automatically in table
        ];
      });

      // Calculate optimal column widths based on content and available space
      // Total usable width: ~190mm (with 10mm margins)
      // Use flexible widths that adapt to content and maximize space usage
      const fixedColumnsWidth = 28 + 30 + 30 + 32; // Device + Lat + Lon + Timestamp = 120mm
      const detectionColumnWidth = usableWidth - fixedColumnsWidth; // Remaining space for Detection (~70mm)

      const columnWidths = {
        0: 28, // Device
        1: 30, // Latitude
        2: 30, // Longitude
        3: 32, // Timestamp
        4: Math.max(detectionColumnWidth, 70), // Detection (uses all remaining space, minimum 70mm)
      };

      // Verify total width matches usable width
      const totalCalculated = Object.values(columnWidths).reduce(
        (a, b) => a + b,
        0
      );
      if (Math.abs(totalCalculated - usableWidth) > 1) {
        // Adjust detection column to fill exactly
        columnWidths[4] =
          usableWidth -
          (columnWidths[0] +
            columnWidths[1] +
            columnWidths[2] +
            columnWidths[3]);
      }

      autoTable(doc, {
        startY: headerY + 23,
        head: [["Device", "Latitude", "Longitude", "Timestamp", "Detection"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [34, 139, 34], // Forest green
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
          cellPadding: 3,
        },
        styles: {
          fontSize: 8,
          cellPadding: 4, // Slightly more padding for better readability
          overflow: "linebreak", // Allow text to wrap and expand cell height automatically
          halign: "left",
          valign: "top", // Top align for better readability with wrapped text
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          textColor: [0, 0, 0],
        },
        columnStyles: {
          0: {
            cellWidth: columnWidths[0],
            halign: "center",
            valign: "middle",
          },
          1: {
            cellWidth: columnWidths[1],
            halign: "center",
            valign: "middle",
          },
          2: {
            cellWidth: columnWidths[2],
            halign: "center",
            valign: "middle",
          },
          3: {
            cellWidth: columnWidths[3],
            halign: "center",
            valign: "middle",
          },
          4: {
            cellWidth: columnWidths[4],
            halign: "left",
            valign: "top",
            cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
            overflow: "linebreak", // Explicitly allow wrapping - cell will expand vertically
            // Detection column uses remaining space and wraps text
            // Row height will automatically expand to accommodate all text
          },
        },
        margin: {
          top: headerY + 23,
          left: margin,
          right: margin,
          bottom: 35, // Reduced bottom margin for more table space
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        showHead: "everyPage",
        tableWidth: usableWidth, // Use full available width
        pageBreak: "auto",
        rowPageBreak: "avoid", // Don't break rows across pages
        // Allow rows to expand vertically for long content
        didDrawCell: function (data) {
          // This ensures cells can expand to accommodate content
          if (data.row.index >= 0 && data.column.index === 4) {
            // For detection column, ensure proper text rendering
            // The cell will automatically expand vertically
          }
        },
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 5, {
            align: "center",
          });
        },
        // Handle cell content that's too long - ensure proper wrapping and row expansion
        didParseCell: function (data) {
          // Ensure detection column text wraps properly for long content
          if (data.column.index === 4) {
            // Detection column - ensure text wraps and row expands vertically
            data.cell.styles.overflow = "linebreak";
            data.cell.styles.halign = "left";
            data.cell.styles.valign = "top";

            // For long text, ensure proper formatting
            if (data.cell.text) {
              const text = String(data.cell.text);
              // Ensure text is clean and ready for wrapping
              // autoTable will automatically expand the row height to fit all wrapped text
              data.cell.text = text.trim();

              // For very long messages, the cell will expand vertically
              // The row height will grow to accommodate all the text
              // This happens automatically with overflow: "linebreak"
            }
          }
        },
      });

      // FOOTER / SIGNATURE BLOCK on last page
      const finalY = doc.lastAutoTable.finalY || pageHeight - 40;
      const remainingSpace = pageHeight - finalY;

      // Only add footer if there's enough space (at least 25mm)
      if (remainingSpace >= 25) {
        const adminName = "Thomas L. Cardente II, Ph.D.";
        const adminTitle = "PENRO OFFICER";

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");

        const adminNameWidth = doc.getTextWidth(adminName);
        const adminTitleWidth = doc.getTextWidth(adminTitle);
        const lineWidth = Math.max(adminNameWidth, adminTitleWidth) + 15;

        const lineXStart = (pageWidth - lineWidth) / 2;
        const lineXEnd = lineXStart + lineWidth;
        const footerStartY = finalY + 10;

        // Admin name ABOVE the line
        doc.text(adminName, pageWidth / 2, footerStartY - 2, {
          align: "center",
        });

        // Signature line
        doc.line(lineXStart, footerStartY, lineXEnd, footerStartY);

        // Admin title BELOW the line
        doc.text(adminTitle, pageWidth / 2, footerStartY + 5, {
          align: "center",
        });
      } else {
        // Add footer on new page if not enough space
        doc.addPage();
        const adminName = "Thomas L. Cardente II, Ph.D.";
        const adminTitle = "PENRO OFFICER";

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");

        const adminNameWidth = doc.getTextWidth(adminName);
        const adminTitleWidth = doc.getTextWidth(adminTitle);
        const lineWidth = Math.max(adminNameWidth, adminTitleWidth) + 15;

        const lineXStart = (pageWidth - lineWidth) / 2;
        const lineXEnd = lineXStart + lineWidth;
        const footerStartY = pageHeight / 2;

        // Admin name ABOVE the line
        doc.text(adminName, pageWidth / 2, footerStartY - 2, {
          align: "center",
        });

        // Signature line
        doc.line(lineXStart, footerStartY, lineXEnd, footerStartY);

        // Admin title BELOW the line
        doc.text(adminTitle, pageWidth / 2, footerStartY + 5, {
          align: "center",
        });
      }

      // SAVE FILE
      const fileName = `chainsaw_detection_report_${dateRange.replace(
        " ",
        "_"
      )}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Swal.fire({
        icon: "error",
        title: "PDF Generation Failed",
        text: "Error generating PDF. Please try again.",
      });
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
      try {
        const parts = tzDateParts(detection.timestamp);
        const monthIndex = parts.month;
        if (
          detection.detection &&
          detection.detection.includes("Chainsaw") &&
          monthIndex != null
        ) {
          monthlyData[monthIndex]++;
        }
      } catch (e) {
        // fallback to client timezone parsing
        const date = new Date(normalizeISOWithTZ(detection.timestamp));
        const monthIndex = date.getMonth();
        if (detection.detection && detection.detection.includes("Chainsaw")) {
          monthlyData[monthIndex]++;
        }
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

    // Count detections by year using server timezone
    detections.forEach((d) => {
      if (!d || !d.timestamp) return;
      try {
        const parts = tzDateParts(d.timestamp);
        const year = parts.year;
        if (
          year != null &&
          d.detection &&
          typeof d.detection === "string" &&
          d.detection.toLowerCase().includes("chainsaw")
        ) {
          yearlyTotals[year] = (yearlyTotals[year] || 0) + 1;
        }
      } catch (err) {
        // fallback to client timezone
        try {
          const date = new Date(normalizeISOWithTZ(d.timestamp));
          const year = date.getFullYear();
          if (
            d.detection &&
            typeof d.detection === "string" &&
            d.detection.toLowerCase().includes("chainsaw")
          ) {
            yearlyTotals[year] = (yearlyTotals[year] || 0) + 1;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    // Find the earliest year and current year (current year according to server TZ)
    const allYears = Object.keys(yearlyTotals)
      .map(Number)
      .filter((y) => !isNaN(y));
    const currentYear =
      tzDateParts(new Date()).year || new Date().getFullYear();
    const earliestYear =
      allYears.length > 0 ? Math.min(...allYears) : currentYear;

    // Create array of all years from earliest to current (inclusive)
    const completeYears = [];
    for (let year = earliestYear; year <= currentYear; year++) {
      completeYears.push(year);
    }

    // Map data points for all years (fill with 0 if no data)
    const dataPoints = completeYears.map((year) => yearlyTotals[year] || 0);
    const yearLabels = completeYears.map((year) => year.toString());

    return {
      labels: yearLabels,
      datasets: [
        {
          label: "Total Detections",
          data: dataPoints,
          borderColor: "#75CFB8",
          backgroundColor: "rgba(117, 207, 184, 0.3)",
          fill: false,
          tension: 0.4,
          pointBackgroundColor: "#75CFB8",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: "#66BB6A",
          borderWidth: 2,
          spanGaps: false,
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

  // Prepare device counts chart data
  const prepareDeviceChartData = () => {
    const counts = {};
    detections.forEach((d) => {
      if (!d || !d.detection) return;
      if (
        typeof d.detection === "string" &&
        d.detection.toLowerCase().includes("chainsaw")
      ) {
        const device = d.device || "Unknown";
        counts[device] = (counts[device] || 0) + 1;
      }
    });

    const labels = Object.keys(counts);
    const data = labels.map((l) => counts[l]);

    // Simple color generator per device
    const colors = labels.map((_, i) => `hsl(${(i * 47) % 360} 70% 45%)`);

    return {
      labels,
      datasets: [
        {
          label: "Detections",
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare hourly chart data (0-23)
  const prepareHourlyChartData = () => {
    const hours = Array(24).fill(0);
    detections.forEach((d) => {
      if (!d || !d.timestamp || !d.detection) return;
      if (
        typeof d.detection === "string" &&
        d.detection.toLowerCase().includes("chainsaw")
      ) {
        try {
          const parts = tzDateParts(d.timestamp);
          const h = parts.hour;
          if (h != null) hours[h]++;
        } catch (e) {
          const date = new Date(normalizeISOWithTZ(d.timestamp));
          if (!isNaN(date.getTime())) {
            const h = date.getHours();
            hours[h]++;
          }
        }
      }
    });

    return {
      labels: hours.map((_, i) => `${String(i).padStart(2, "0")}:00`),
      datasets: [
        {
          label: "Detections",
          data: hours,
          backgroundColor: "rgba(117, 207, 184, 0.9)",
          borderColor: "#75CFB8",
          borderWidth: 1,
        },
      ],
    };
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
      field: "latitude",
      headerName: "Latitude",
      flex: 1,
      minWidth: 140,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const detection = params.row || {};
        const parsed = parseDetectionMessage(detection.detection || "");
        const lat =
          detection.latitude != null
            ? detection.latitude
            : parsed.coordinates
            ? parsed.coordinates.latitude
            : null;
        return lat != null ? lat.toFixed(8) : "N/A";
      },
    },
    {
      field: "longitude",
      headerName: "Longitude",
      flex: 1,
      minWidth: 140,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const detection = params.row || {};
        const parsed = parseDetectionMessage(detection.detection || "");
        const lon =
          detection.longitude != null
            ? detection.longitude
            : parsed.coordinates
            ? parsed.coordinates.longitude
            : null;
        return lon != null ? lon.toFixed(8) : "N/A";
      },
    },
    {
      field: "timestamp",
      headerName: serverTime
        ? `Timestamp (${serverTime.timezone})`
        : "Timestamp",
      flex: 1,
      minWidth: 250,
      headerAlign: "center",
      renderCell: (params) => {
        // Format timestamp in server timezone (Asia/Kuala_Lumpur / UTC+08)
        const ts = params.row.timestamp;
        const formatted = formatInTZ(ts, {
          dateStyle: "medium",
          timeStyle: "medium",
          timeZoneName: "short",
        });
        return <span>{formatted}</span>;
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
        const { cleanMessage, coordinates } = parseDetectionMessage(message);
        let displayMessage = cleanMessage;

        if (cleanMessage.includes("Chainsaw Detected")) {
          displayMessage = "🔴 Chainsaw Detected";
        } else if (cleanMessage.includes("Possible Chainsaw")) {
          displayMessage = "🟡 Chainsaw Detected";
        } else if (cleanMessage.includes("ALERT,CHAINSAW")) {
          displayMessage = "🔴 Chainsaw Detected";
        }

        return (
          <div
            style={{
              color:
                cleanMessage.includes("Chainsaw Detected") ||
                cleanMessage.includes("ALERT,CHAINSAW")
                  ? "#000000"
                  : "#000000",
              fontWeight: "500",
              fontSize: "0.875rem",
            }}
          >
            {displayMessage}
            {coordinates && (
              <div
                style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}
              >
                Lat: {coordinates.latitude.toFixed(8)}, Lon:{" "}
                {coordinates.longitude.toFixed(8)}
              </div>
            )}
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
            onClick={() => handlePlayAudio(params.row._id)}
            disabled={!params.row.file_id}
            color="27323a"
            size="small"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                transform: "scale(1.05)",
              },
              transition: "all 0.12s ease-in-out",
            }}
          >
            <PlayIcon />
          </IconButton>

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div />
        <div style={{ fontSize: "0.9rem", color: "#444" }}>
          {serverTime ? (
            <span>
              Server time ({serverTime.timezone}):{" "}
              {formatInTZ(serverTime.server_time, {
                dateStyle: "medium",
                timeStyle: "medium",
                timeZoneName: "short",
              })}
            </span>
          ) : (
            <span>Loading server time...</span>
          )}
        </div>
      </div>
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
        {/* DEVICE CHART */}
        <div className="chart-box">
          <h3 className="chart-title">Detections by Device</h3>
          <div style={{ position: "relative", height: "90%", width: "100%" }}>
            <Bar
              data={prepareDeviceChartData()}
              options={{
                ...chartOptions,
                plugins: {
                  ...(chartOptions.plugins || {}),
                  // Enable the barValuePlugin for this chart
                  barValue: { color: "#000", font: "12px Arial" },
                },
              }}
            />
          </div>
        </div>

        {/* HOUR-OF-DAY CHART */}
        <div className="chart-box">
          <h3 className="chart-title">Detections by Hour of Day</h3>
          <div style={{ position: "relative", height: "90%", width: "100%" }}>
            <Bar data={prepareHourlyChartData()} options={chartOptions} />
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
