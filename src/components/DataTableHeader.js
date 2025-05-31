import React from "react";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableItem = ({ id, column, isFixed, sortConfig, onSort }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: isDragging ? "fixed" : "relative",
    zIndex: isDragging ? 1000 : "auto",
    minWidth: "100px",
    backgroundColor: "white",
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging
      ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      : "none",
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`table-header-cell !py-0 whitespace-nowrap truncate text-center firstMobile:min-w-[120px] bg-white ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <span className="flex items-center justify-center gap-1 h-6">
        <span {...attributes} {...listeners} className="flex-1">
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
}) => {
  // Verificação de segurança para garantir que columnOrder seja um array
  const safeColumnOrder = Array.isArray(columnOrder) ? columnOrder : [];

  return (
    <thead className="table-header sticky top-0 z-[1] bg-white">
      <tr>
        <SortableContext
          items={safeColumnOrder}
          strategy={horizontalListSortingStrategy}
        >
          {safeColumnOrder.map((columnId) => {
            const column = columns?.find((c) => c.id === columnId);
            if (!column) return null;

            return (
              <SortableItem
                key={columnId}
                id={columnId}
                column={column}
                isFixed={fixedColumns.includes(columnId)}
                sortConfig={sortConfig}
                onSort={onSort}
              />
            );
          })}
        </SortableContext>
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
