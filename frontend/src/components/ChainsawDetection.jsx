import React, { useState, useEffect } from "react";

function ChainsawDetection() {
    const [detection, setDetection] = useState({ type: "normal", confidence: 100 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("http://localhost:5000/latest-detection");
                const data = await response.json();
                setDetection(data);
            } catch (error) {
                console.error("Error fetching detection data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Refresh every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: "20px", border: "2px solid black", borderRadius: "10px", textAlign: "center" }}>
            <h2>Chainsaw Detection</h2>
            <h3>Type: {detection.type}</h3>
            <p>Confidence: {detection.confidence}%</p>
        </div>
    );
}

export default ChainsawDetection;
