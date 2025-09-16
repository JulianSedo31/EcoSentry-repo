import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import securityAlarm from "../assets/security-alarm-80493.mp3";
import "./style.css";

const DetectionAlert = ({
  open,
  message,
  onClose,
  detectionId,
  device,
  location,
  latitude: propLatitude,
  longitude: propLongitude,
}) => {
  const audioRef = useRef(null);

  // Function to parse detection message and remove prefix
  const parseDetectionMessage = (msg) => {
    if (!msg) return { cleanMessage: "", coordinates: null };
    
    // Remove PKT#xxx|DeviceName| prefix
    const parts = msg.split('|');
    let cleanMessage = msg;
    let coordinates = null;
    
    if (parts.length >= 3) {
      // Extract the actual message after the second |
      cleanMessage = parts.slice(2).join('|');
      
      // Parse GPS coordinates from ALERT,CHAINSAW,lat,lon format
      if (cleanMessage.startsWith('ALERT,CHAINSAW,')) {
        const coords = cleanMessage.split(',');
        if (coords.length >= 4 && coords[2] !== 'NOFIX' && coords[3] !== 'NOFIX') {
          coordinates = {
            latitude: parseFloat(coords[2]),
            longitude: parseFloat(coords[3])
          };
        }
      }
    }
    
    return { cleanMessage, coordinates };
  };

  // Function to format the message with appropriate color
  const formatMessage = (msg) => {
    const { cleanMessage } = parseDetectionMessage(msg);
    
    if (cleanMessage.includes("Chainsaw Detected")) {
      return "🔴 Chainsaw Detected";
    } else if (cleanMessage.includes("Possible Chainsaw")) {
      return "🟡 Chainsaw Detected";
    } else if (cleanMessage.includes("ALERT,CHAINSAW")) {
      return "🔴 Chainsaw Detected";
    }
    return cleanMessage;
  };

  useEffect(() => {
    if (open) {
      // Play warning sound
      const warningSound = new Audio(securityAlarm);
      warningSound.volume = 1.0;
      warningSound.loop = true;

      audioRef.current = warningSound;
      warningSound.play().catch((error) => {
        console.error("Error playing warning sound:", error);
      });
    } else {
      // Stop the audio when modal is closed
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="alert-modal"
    >
      <DialogContent>
        <Box className="alert-icon-container">
          <WarningIcon className="alert-icon" />
        </Box>
        <Typography className="alert-message">
          {formatMessage(message)}
        </Typography>
        <Typography className="alert-info">
          Device: {device || "N/A"}
        </Typography>
        {(() => {
          // Determine latitude/longitude to display.
          const parsed = parseDetectionMessage(message) || {};
          const coords = parsed.coordinates || null;

          const lat =
            propLatitude != null
              ? propLatitude
              : coords
              ? coords.latitude
              : null;
          const lon =
            propLongitude != null
              ? propLongitude
              : coords
              ? coords.longitude
              : null;

          return (
            <>
              <Typography className="alert-info">
                Latitude: {lat != null ? lat.toFixed(8) : "N/A"}
              </Typography>
              <Typography className="alert-info">
                Longitude: {lon != null ? lon.toFixed(8) : "N/A"}
              </Typography>
            </>
          );
        })()}
        <Typography className="alert-time">
          Time: {new Date().toLocaleString()}
        </Typography>
      </DialogContent>
      <DialogActions className="alert-actions">
        <Button onClick={onClose} className="acknowledge-button">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetectionAlert;
