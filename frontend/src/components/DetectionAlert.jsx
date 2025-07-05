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
}) => {
  const audioRef = useRef(null);

  // Function to format the message with appropriate color
  const formatMessage = (msg) => {
    if (msg.includes("Chainsaw Detected")) {
      return "🔴 Chainsaw Detected";
    } else if (msg.includes("Possible Chainsaw")) {
      return "🟡 Chainsaw Detected";
    }
    return msg;
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
        <Typography className="alert-info">
          Location: {location || "N/A"}
        </Typography>
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
