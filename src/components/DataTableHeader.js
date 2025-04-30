import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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
    backgroundColor: "oklch(87% 0.065 274.039)é",
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging
      ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      : "none",
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`table-header-cell !py-0 whitespace-nowrap truncate text-center firstMobile:min-w-[120px] ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-center gap-1 h-6">
        <div {...attributes} {...listeners} className="flex-1">
          <span className="firstMobile:text-sm">{column.label}</span>
        </div>
        <div
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
        </div>
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
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const newOrder = arrayMove(
        columnOrder,
        columnOrder.indexOf(active.id),
        columnOrder.indexOf(over.id)
      );
      onColumnOrderChange(newOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <thead className="table-header">
        <tr>
          <SortableContext
            items={columnOrder}
            strategy={horizontalListSortingStrategy}
          >
            {columnOrder.map((columnId) => {
              const column = columns.find((c) => c.id === columnId);
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
        {columns.some((col) => col.filter) && (
          <tr className="!h-0">
            {columnOrder.map((columnId) => {
              const column = columns.find((c) => c.id === columnId);
              if (!column) return null;

              return (
                <th key={columnId} className="table-header-cell !py-0">
                  {column.filter ? (
                    <div className="px-2 py-0">
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
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                </th>
              );
            })}
          </tr>
        )}
      </thead>
    </DndContext>
  );
};

export default DataTableHeader;
