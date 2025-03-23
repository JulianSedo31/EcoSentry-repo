import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const DetectionAlert = ({ open, message, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#fff3e0',
          borderRadius: 2,
          border: '2px solid #ff9800'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon sx={{ color: '#ff9800', fontSize: 30 }} />
        <Typography variant="h6" sx={{ color: '#e65100' }}>
          Chainsaw Detection Alert!
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" sx={{ fontSize: '1.1rem', color: '#333' }}>
            {message}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
            Time: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          variant="contained" 
          sx={{ 
            bgcolor: '#ff9800',
            '&:hover': {
              bgcolor: '#f57c00'
            }
          }}
        >
          Acknowledge
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetectionAlert;