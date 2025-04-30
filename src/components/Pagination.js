import React, { useState, useEffect, useRef } from "react";
import "../styles/Pagination.css";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalItems,
}) => {
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState("down");
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest("#rows-button") &&
        !event.target.closest("#rows-dropdown")
      ) {
        setShowRowsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showRowsDropdown && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
  }, [showRowsDropdown]);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Mostrando {startItem} a {endItem} de {totalItems} itens
      </div>
      <div className="pagination-controls">
        <div className="pagination-rows-per-page">
          <span className="pagination-rows-label">Itens por página</span>
          <div className="pagination-rows-dropdown">
            <div
              id="rows-button"
              ref={buttonRef}
              onClick={() => setShowRowsDropdown(!showRowsDropdown)}
              className="pagination-rows-button"
            >
              <span>{rowsPerPage}</span>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            {showRowsDropdown && (
              <div
                id="rows-dropdown"
                ref={dropdownRef}
                className={`pagination-rows-dropdown-content ${dropdownDirection}`}
              >
                <div className="p-2 space-y-2">
                  {[10, 25, 50, 100].map((value) => (
                    <div
                      key={value}
                      onClick={() => {
                        onRowsPerPageChange(value);
                        setShowRowsDropdown(false);
                      }}
                      className="pagination-rows-option"
                    >
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pagination-pages">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-page-button"
          >
            Anterior
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-page-button ${
                currentPage === page ? "active" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-page-button"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
