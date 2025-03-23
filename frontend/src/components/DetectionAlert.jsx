import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { Fade } from "@mui/material";

function DetectionAlert({ open, message, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 500 }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WarningIcon sx={{ color: "#e65100" }} />
        <Typography variant="h6" sx={{ color: "#e65100" }}>
          Chainsaw Detection Alert
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Time: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Acknowledge
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DetectionAlert;