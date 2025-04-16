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
import "./style.css";
import alarmSound from "../assets/security-alarm-80493.mp3";

const DetectionAlert = ({ open, message, onClose }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Create and play the alert sound
      audioRef.current = new Audio(alarmSound);
      audioRef.current.volume = 1.0; // Set volume to 100%
      audioRef.current.loop = true; // Make it loop
      audioRef.current.play().catch((error) => {
        console.error("Error playing sound:", error);
      });
    } else {
      // Stop the sound when modal is closed
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    // Cleanup function to stop sound when component unmounts
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
        <Typography className="alert-message">{message}</Typography>
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
