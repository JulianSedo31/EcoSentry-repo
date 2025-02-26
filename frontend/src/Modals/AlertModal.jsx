import React from "react";
import "../assets/style.css"; // Ensure this is linked to your CSS file

const AlertModal = ({ show, onClose, alertMessage }) => {
  if (!show) return null; // Don't render if not shown

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🚨 Illegal Logging Alert! 🚨</h2>
        <p>{alertMessage}</p>
        <button onClick={onClose} className="close-btn">
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
