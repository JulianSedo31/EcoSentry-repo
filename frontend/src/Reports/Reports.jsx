import React, { useState, useMemo } from "react";
import { useTable, useFilters, usePagination } from "react-table";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../assets/style.css"; 

const Reports = () => {
  // Sample data (replace this with real data later)
  const data = useMemo(
    () => [
      { id: 1, location: "Forest A", severity: "High", date: "2024-02-01" },
      { id: 2, location: "Forest B", severity: "Medium", date: "2024-02-10" },
      { id: 3, location: "Forest C", severity: "Low", date: "2024-01-15" },
      { id: 4, location: "Forest D", severity: "High", date: "2024-03-05" },
      { id: 1, location: "Forest A", severity: "High", date: "2024-02-01" },
      { id: 2, location: "Forest B", severity: "Medium", date: "2024-02-10" },
      { id: 3, location: "Forest C", severity: "Low", date: "2024-01-15" },
      { id: 4, location: "Forest D", severity: "High", date: "2024-03-05" },
      { id: 1, location: "Forest A", severity: "High", date: "2024-02-01" },
      { id: 2, location: "Forest B", severity: "Medium", date: "2024-02-10" },
      { id: 3, location: "Forest C", severity: "Low", date: "2024-01-15" },
      { id: 4, location: "Forest D", severity: "High", date: "2024-03-05" },
    ],
    []
  );

  // Column definitions
  const columns = useMemo(
    () => [
      { Header: "ID", accessor: "id" },
      { Header: "Location", accessor: "location" },
      { Header: "Severity", accessor: "severity" },
      { Header: "Date", accessor: "date" },
    ],
    []
  );

  // React Table Hooks
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    setFilter,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
  } = useTable(
    { columns, data, initialState: { pageIndex: 0, pageSize: 10 } },
    useFilters,
    usePagination
  );

  // State for search and filters
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Handle search input
  const handleSearch = (e) => {
    const value = e.target.value || "";
    setSearchInput(value);
    setFilter("date", value);
  };

  // Handle month & year filtering
  const handleFilter = () => {
    setFilter("date", (rowValue) => {
      const rowDate = new Date(rowValue);
      const rowMonth = rowDate.getMonth() + 1; // Months are 0-based
      const rowYear = rowDate.getFullYear();

      return (
        (!selectedMonth || rowMonth === parseInt(selectedMonth)) &&
        (!selectedYear || rowYear === parseInt(selectedYear))
      );
    });
  };

  // Download as PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Illegal Logging Reports", 20, 10);
    doc.autoTable({ html: "#reportsTable" });
    doc.save("reports.pdf");
  };

  return (

    <div className="reports-container">
      {/* Filters & Search */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search Date..."
          value={searchInput}
          onChange={handleSearch}
        />

        <select onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <select onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">All Years</option>
          {[2023, 2024, 2025].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button onClick={handleFilter}>Apply Filter</button>
        <button onClick={exportToPDF} style={{backgroundColor: '#436850', color: 'white'}}>Download PDF</button>
      </div>

      {/* Table */}
      <table {...getTableProps()} id="reportsTable" className="reports-table">
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button onClick={previousPage} disabled={!canPreviousPage}>
          Previous
        </button>
        <button onClick={nextPage} disabled={!canNextPage}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Reports;
