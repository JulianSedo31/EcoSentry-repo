import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout/Layout";
import Dashboard from "./Dashboard/Dashboard";
import Reports from "./Reports/Reports";
import ChainsawDetection from "./components/ChainsawDetection";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/chainsaw-detection" element={<ChainsawDetection />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
