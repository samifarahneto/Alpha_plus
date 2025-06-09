import React, { useState, useRef, useEffect } from "react";

const HeaderItem = ({ column, sortConfig, onSort, width, onWidthChange }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const thRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(thRef.current?.offsetWidth || 0);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      e.preventDefault();
      const diff = e.clientX - startX;
      const minWidth = parseInt(column.minWidth) || 30;
      // Permitir redimensionamento além do maxWidth original quando o usuário estiver redimensionando
      // Usar um limite máximo muito maior (600px) para dar flexibilidade ao usuário
      const maxWidth = 600;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidth + diff)
      );

      // Aplicar largura imediatamente ao elemento
      if (thRef.current) {
        thRef.current.style.width = `${newWidth}px`;
      }

      if (onWidthChange) {
        onWidthChange(column.id, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.documentElement.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.documentElement.style.cursor = "";
    };
  }, [
    isResizing,
    startX,
    startWidth,
    column.id,
    column.minWidth,
    onWidthChange,
  ]);

  return (
    <th
      ref={thRef}
      className="table-header-cell !py-1 text-center bg-white relative border-r border-gray-200 overflow-hidden"
      style={{
        width: width ? `${width}px` : "auto",
        minWidth: column.minWidth || "30px",
        maxWidth: width ? "none" : column.maxWidth || "400px",
      }}
    >
      <span className="flex items-center justify-center gap-1 h-6">
        <span className="flex-1">
          <span className="firstMobile:text-sm">{column.label}</span>
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSort(column.id);
          }}
          className="flex items-center justify-center cursor-pointer"
          style={{ pointerEvents: "auto" }}
        >
          <svg
            className={`w-3 h-3 firstMobile:w-2.5 firstMobile:h-2.5 ${
              sortConfig.key === column.id ? "text-blue-600" : "text-gray-400"
            }`}
            viewBox="0 0 10 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={
                sortConfig.key === column.id && sortConfig.direction === "asc"
                  ? "M5 0L10 6H0L5 0Z"
                  : "M5 6L0 0H10L5 6Z"
              }
              fill="currentColor"
            />
          </svg>
        </span>
      </span>

      {/* Resizer Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize group"
        onMouseDown={handleMouseDown}
        style={{
          zIndex: 1001,
          right: "0px",
          background: "transparent",
        }}
        title="Arrastar para redimensionar coluna"
      >
        <div className="w-full h-full bg-gray-300 group-hover:bg-blue-400 transition-all duration-150 opacity-0 hover:opacity-60" />
      </div>
    </th>
  );
};

const DataTableHeader = ({
  columns,
  columnOrder,
  onColumnOrderChange,
  sortConfig,
  onSort,
  filters,
  onFilterChange,
  fixedColumns = [],
  columnWidths = {},
  onColumnWidthChange,
}) => {
  // Verificação de segurança para garantir que columnOrder seja um array
  const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : [];

  const handleWidthChange = (columnId, newWidth) => {
    if (onColumnWidthChange) {
      onColumnWidthChange(columnId, newWidth);
    }
  };

  return (
    <thead className="table-header sticky top-0 z-[1] bg-white">
      <tr>
        {safeColumnOrder.map((columnId) => {
          const column = columns?.find((c) => c.id === columnId);
          if (!column) return null;

          return (
            <HeaderItem
              key={columnId}
              column={column}
              sortConfig={sortConfig}
              onSort={onSort}
              width={columnWidths[columnId]}
              onWidthChange={handleWidthChange}
            />
          );
        })}
      </tr>
      {columns && columns.some((col) => col.filter) && (
        <tr className="!h-0">
          {safeColumnOrder.map((columnId) => {
            const column = columns.find((c) => c.id === columnId);
            if (!column) return null;

            return (
              <th key={columnId} className="table-header-cell !py-0">
                {column.filter ? (
                  <span className="px-2 py-0 relative">
                    {column.filter.type === "text" && (
                      <input
                        type="text"
                        placeholder={`Filtrar ${column.label}`}
                        value={filters[columnId] || ""}
                        onChange={(e) =>
                          onFilterChange(columnId, e.target.value)
                        }
                        className="w-full p-0.5 text-xs firstMobile:text-[10px] border rounded h-6"
                      />
                    )}
                    {column.filter.type === "select" && (
                      <select
                        value={filters[columnId] || ""}
                        onChange={(e) =>
                          onFilterChange(columnId, e.target.value)
                        }
                        className="w-full p-0.5 text-xs firstMobile:text-[10px] border rounded h-6"
                        style={{ zIndex: 2 }}
                      >
                        <option value="">Todos</option>
                        {column.filter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {column.filter.type === "date" && (
                      <input
                        type="date"
                        value={filters[columnId] || ""}
                        onChange={(e) =>
                          onFilterChange(columnId, e.target.value)
                        }
                        className="w-full p-0.5 text-xs firstMobile:text-[10px] border rounded h-6"
                      />
                    )}
                  </span>
                ) : (
                  <span className="h-6" />
                )}
              </th>
            );
          })}
        </tr>
      )}
    </thead>
  );
};

export default DataTableHeader;
