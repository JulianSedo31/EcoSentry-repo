import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// COMPONENTS
import Layout from "./Layout/Layout";
import Dashboard from "./Dashboard/Dashboard";
import Reports from "./Reports/Reports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout></Layout>}>
          <Route path="/dashboard" element={<Dashboard></Dashboard>}></Route>
          <Route path="/reports" element={<Reports></Reports>}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
