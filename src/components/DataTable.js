import React, { useState } from "react";
import DataTableHeader from "./DataTableHeader";

const DataTable = ({
  columns,
  data,
  initialColumnOrder,
  fixedColumns = [],
  onRowClick,
  getRowClassName,
}) => {
  const [columnOrder, setColumnOrder] = useState(initialColumnOrder);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filters, setFilters] = useState({});

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (columnId, value) => {
    setFilters((prev) => ({
      ...prev,
      [columnId]: value,
    }));
  };

  const filteredAndSortedData = React.useMemo(() => {
    let filteredData = [...data];

    // Aplicar filtros
    Object.entries(filters).forEach(([columnId, value]) => {
      if (!value) return;
      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      filteredData = filteredData.filter((row) => {
        const cellValue = row[columnId];
        if (!cellValue) return false;

        if (column.filter?.type === "text") {
          return cellValue
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase());
        }
        return cellValue === value;
      });
    });

    // Aplicar ordenação
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  }, [data, filters, sortConfig, columns]);

  return (
    <div className="table-wrapper overflow-x-auto firstMobile:overflow-x-scroll">
      <table className="table-default w-full">
        <DataTableHeader
          columns={columns}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          sortConfig={sortConfig}
          onSort={handleSort}
          filters={filters}
          onFilterChange={handleFilterChange}
          fixedColumns={fixedColumns}
        />
        <tbody className="table-body">
          {filteredAndSortedData.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className={`table-row ${
                getRowClassName ? getRowClassName(row) : ""
              }`}
            >
              {columnOrder.map((columnId) => {
                const column = columns.find((c) => c.id === columnId);
                if (!column) return null;

                return (
                  <td
                    key={columnId}
                    className="table-cell !py-0 whitespace-nowrap max-w-[150px] firstMobile:max-w-[120px] truncate text-center h-8 text-xs font-medium"
                  >
                    {column.render
                      ? column.render(row[columnId], row)
                      : row[columnId]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
