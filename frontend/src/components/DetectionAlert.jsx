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

const DetectionAlert = ({ open, message, onClose, detectionId }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (open && detectionId) {
      // Fetch and play the chainsaw audio
      const playChainsawAudio = async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/detection/audio/${detectionId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch audio");
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          audioRef.current = new Audio(audioUrl);
          audioRef.current.volume = 1.0;
          audioRef.current.loop = true;

          await audioRef.current.play();
        } catch (error) {
          console.error("Error playing chainsaw audio:", error);
        }
      };

      playChainsawAudio();
    } else {
      // Stop the audio when modal is closed
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        URL.revokeObjectURL(audioRef.current.src);
      }
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [open, detectionId]);

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
