import React, { useState, useMemo } from "react";
import DataTableHeader from "./DataTableHeader";

const DataTable = ({
  columns,
  data,
  initialColumnOrder,
  fixedColumns = [],
  onRowClick,
  getRowClassName,
  initialSortConfig = { key: null, direction: "asc" },
  currentPage = 1,
  rowsPerPage = 10,
}) => {
  // Garantir que os valores de paginação sejam números
  const numericCurrentPage = Number(currentPage) || 1;
  const numericRowsPerPage = Number(rowsPerPage) || 10;
  // Criar um fallback para columnOrder baseado nos IDs das colunas
  const defaultColumnOrder = useMemo(() => {
    return columns?.map((col) => col.id) || [];
  }, [columns]);

  const [columnOrder, setColumnOrder] = useState(
    initialColumnOrder || defaultColumnOrder
  );
  const [sortConfig, setSortConfig] = useState(initialSortConfig);
  const [filters, setFilters] = useState({});
  const [columnWidths, setColumnWidths] = useState({});

  // Atualizar columnOrder quando columns mudarem, se initialColumnOrder não foi fornecido
  React.useEffect(() => {
    if (!initialColumnOrder && columns?.length > 0) {
      setColumnOrder(columns.map((col) => col.id));
    }
  }, [columns, initialColumnOrder]);

  // Atualizar columnOrder quando initialColumnOrder mudar
  React.useEffect(() => {
    if (initialColumnOrder && Array.isArray(initialColumnOrder)) {
      setColumnOrder(initialColumnOrder);
    }
  }, [initialColumnOrder]);

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

  const handleColumnWidthChange = (columnId, width) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: width,
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
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Verificar se a coluna tem uma função sortValue customizada
        const column = columns.find((col) => col.id === sortConfig.key);
        if (column && column.sortValue) {
          aValue = column.sortValue(aValue);
          bValue = column.sortValue(bValue);
        }

        // Tratamento especial para colunas específicas
        if (sortConfig.key === "createdAt") {
          // Se o valor for uma string formatada (dd/mm/yyyy ou dd/mm/yy), converter de volta para Date
          if (typeof aValue === "string" && aValue.includes("/")) {
            const [day, month, year] = aValue.split("/");
            let fullYear = parseInt(year);
            if (fullYear < 100) {
              fullYear = fullYear + 2000;
            }
            aValue = new Date(fullYear, parseInt(month) - 1, parseInt(day));
          }
          if (typeof bValue === "string" && bValue.includes("/")) {
            const [day, month, year] = bValue.split("/");
            let fullYear = parseInt(year);
            if (fullYear < 100) {
              fullYear = fullYear + 2000;
            }
            bValue = new Date(fullYear, parseInt(month) - 1, parseInt(day));
          }
        } else if (sortConfig.key === "totalValue") {
          // Extrair valor numérico de "U$ 123.45"
          if (typeof aValue === "object" && aValue?.props?.children) {
            const text = aValue.props.children;
            aValue =
              parseFloat(text.replace(/[U$\s,]/g, "").replace(",", ".")) || 0;
          }
          if (typeof bValue === "object" && bValue?.props?.children) {
            const text = bValue.props.children;
            bValue =
              parseFloat(text.replace(/[U$\s,]/g, "").replace(",", ".")) || 0;
          }
        } else if (
          sortConfig.key === "paymentStatus" ||
          sortConfig.key === "projectStatus" ||
          sortConfig.key === "isPaid" ||
          sortConfig.key === "project_status" ||
          sortConfig.key === "translation_status"
        ) {
          // Extrair texto de badges JSX
          if (typeof aValue === "object" && aValue?.props?.children) {
            aValue = aValue.props.children?.toLowerCase() || "";
          }
          if (typeof bValue === "object" && bValue?.props?.children) {
            bValue = bValue.props.children?.toLowerCase() || "";
          }
        } else if (
          (sortConfig.key === "deadline" ||
            sortConfig.key === "deadlineDate") &&
          !(column && column.sortValue)
        ) {
          // Extrair e converter datas do prazo (apenas se não há sortValue customizado)
          const parseDeadline = (value) => {
            // Extrair o texto da data de forma mais robusta
            let dateText = "";

            if (typeof value === "string") {
              dateText = value.trim();
            } else if (typeof value === "object" && value?.props?.children) {
              // Se children é uma string
              if (typeof value.props.children === "string") {
                dateText = value.props.children.trim();
              }
              // Se children é um array (pode acontecer com JSX)
              else if (Array.isArray(value.props.children)) {
                dateText = value.props.children
                  .filter((child) => typeof child === "string")
                  .join("")
                  .trim();
              }
              // Se children é outro objeto JSX
              else if (
                typeof value.props.children === "object" &&
                value.props.children?.props?.children
              ) {
                dateText = value.props.children.props.children
                  .toString()
                  .trim();
              }
            } else if (value && typeof value.toString === "function") {
              dateText = value.toString().trim();
            }

            // Verificar se é "A definir" ou similar
            if (
              !dateText ||
              dateText === "A definir" ||
              dateText === "Sem Prazo" ||
              dateText === "" ||
              dateText === "null" ||
              dateText === "undefined"
            ) {
              return new Date(8640000000000000); // Data máxima para "A definir" ir para o final
            }

            // Processar datas no formato dd/mm/yy ou dd/mm/yyyy
            if (dateText.includes("/")) {
              const parts = dateText.split("/");
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);

                // Validar componentes da data
                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                  return new Date(8640000000000000);
                }

                // Tratar anos de 2 dígitos (25 = 2025, etc.)
                let fullYear = year;
                if (fullYear < 100) {
                  fullYear = fullYear + 2000;
                }

                // Validar ranges válidos
                if (
                  day < 1 ||
                  day > 31 ||
                  month < 1 ||
                  month > 12 ||
                  fullYear < 1900
                ) {
                  return new Date(8640000000000000);
                }

                return new Date(fullYear, month - 1, day);
              }
            }

            // Se contém "dias úteis", calcular data futura
            if (dateText.includes("dias úteis")) {
              const match = dateText.match(/(\d+)/);
              if (match) {
                const days = parseInt(match[1]);
                if (!isNaN(days)) {
                  const currentDate = new Date();
                  let businessDays = days;
                  let currentDay = new Date(currentDate);

                  while (businessDays > 0) {
                    currentDay.setDate(currentDay.getDate() + 1);
                    if (
                      currentDay.getDay() !== 0 &&
                      currentDay.getDay() !== 6
                    ) {
                      businessDays -= 1;
                    }
                  }
                  return currentDay;
                }
              }
            }

            // Para outros textos não reconhecidos, colocar no final
            return new Date(8640000000000000);
          };

          aValue = parseDeadline(aValue);
          bValue = parseDeadline(bValue);
        } else if (sortConfig.key === "clientType") {
          // Extrair texto do tipo de cliente
          if (typeof aValue === "object" && aValue?.props?.children) {
            aValue = aValue.props.children?.toLowerCase() || "";
          }
          if (typeof bValue === "object" && bValue?.props?.children) {
            bValue = bValue.props.children?.toLowerCase() || "";
          }
        } else if (sortConfig.key === "translationStatus") {
          // Para select, usar o value diretamente ou extrair do objeto
          if (typeof aValue === "object" && aValue?.props?.value) {
            aValue = aValue.props.value?.toLowerCase() || "";
          } else if (typeof aValue === "string") {
            aValue = aValue.toLowerCase();
          }
          if (typeof bValue === "object" && bValue?.props?.value) {
            bValue = bValue.props.value?.toLowerCase() || "";
          } else if (typeof bValue === "string") {
            bValue = bValue.toLowerCase();
          }
        } else if (sortConfig.key === "pages") {
          // Converter páginas para número
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else if (
          sortConfig.key === "filesDisplay" ||
          sortConfig.key === "files"
        ) {
          // Extrair número de arquivos de JSX
          if (typeof aValue === "object" && aValue?.props?.children) {
            // Para files do ClientProjects, pode ser um array ou span simples
            if (Array.isArray(aValue.props.children)) {
              const spanElement = aValue.props.children.find(
                (child) => typeof child === "object" && child?.props?.children
              );
              aValue =
                parseInt(spanElement?.props?.children) ||
                parseInt(aValue.props.children[0]) ||
                0;
            } else {
              aValue = parseInt(aValue.props.children) || 0;
            }
          } else if (typeof aValue === "string" || typeof aValue === "number") {
            aValue = parseInt(aValue) || 0;
          }
          if (typeof bValue === "object" && bValue?.props?.children) {
            // Para files do ClientProjects, pode ser um array ou span simples
            if (Array.isArray(bValue.props.children)) {
              const spanElement = bValue.props.children.find(
                (child) => typeof child === "object" && child?.props?.children
              );
              bValue =
                parseInt(spanElement?.props?.children) ||
                parseInt(bValue.props.children[0]) ||
                0;
            } else {
              bValue = parseInt(bValue.props.children) || 0;
            }
          } else if (typeof bValue === "string" || typeof bValue === "number") {
            bValue = parseInt(bValue) || 0;
          }
        } else if (sortConfig.key === "monthYear") {
          // Converter mês/ano para data comparável (mm/yy -> Date)
          if (typeof aValue === "string" && aValue.includes("/")) {
            const [month, year] = aValue.split("/");
            aValue = new Date(2000 + parseInt(year), parseInt(month) - 1);
          } else {
            aValue = new Date(0); // Data muito antiga para "Sem Data"
          }
          if (typeof bValue === "string" && bValue.includes("/")) {
            const [month, year] = bValue.split("/");
            bValue = new Date(2000 + parseInt(year), parseInt(month) - 1);
          } else {
            bValue = new Date(0); // Data muito antiga para "Sem Data"
          }
        }

        // Tratamento especial para valores de data ou "A definir"
        if (aValue === "A definir" && bValue === "A definir") {
          return 0;
        }

        if (aValue === "A definir") {
          return sortConfig.direction === "asc" ? 1 : -1; // "A definir" vai para o final em ASC, início em DESC
        }

        if (bValue === "A definir") {
          return sortConfig.direction === "asc" ? -1 : 1; // "A definir" vai para o final em ASC, início em DESC
        }

        // Comparação com tratamento especial para datas máximas (usado pelo parseDeadline antigo)
        const maxDate = 8640000000000000;
        const aIsMaxDate =
          aValue instanceof Date && aValue.getTime() === maxDate;
        const bIsMaxDate =
          bValue instanceof Date && bValue.getTime() === maxDate;

        // Se ambos são "A definir" (data máxima), manter ordem original
        if (aIsMaxDate && bIsMaxDate) {
          return 0;
        }

        // Se apenas um é "A definir" (data máxima)
        if (aIsMaxDate) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        if (bIsMaxDate) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }

        // Comparação normal
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Aplicar paginação
    const startIndex = (numericCurrentPage - 1) * numericRowsPerPage;
    const endIndex = startIndex + numericRowsPerPage;

    return filteredData.slice(startIndex, endIndex);
  }, [
    data,
    filters,
    sortConfig,
    columns,
    numericCurrentPage,
    numericRowsPerPage,
  ]);

  // Verificar se temos columns e columnOrder válidos
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        Nenhuma coluna definida para a tabela
      </div>
    );
  }

  if (!columnOrder || !Array.isArray(columnOrder) || columnOrder.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">Carregando tabela...</div>
    );
  }

  return (
    <div className="table-wrapper overflow-x-auto firstMobile:overflow-x-scroll">
      <div className="table-container relative">
        <table className="w-full">
          <DataTableHeader
            columns={columns}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            sortConfig={sortConfig}
            onSort={handleSort}
            filters={filters}
            onFilterChange={handleFilterChange}
            fixedColumns={fixedColumns}
            columnWidths={columnWidths}
            onColumnWidthChange={handleColumnWidthChange}
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
                      className="table-cell !py-0 whitespace-nowrap truncate text-center h-8 text-xs font-medium border-r border-gray-200"
                      style={{
                        width: columnWidths[columnId]
                          ? `${columnWidths[columnId]}px`
                          : "auto",
                        minWidth: "80px",
                        maxWidth: columnWidths[columnId]
                          ? `${columnWidths[columnId]}px`
                          : "150px",
                      }}
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
    </div>
  );
};

export default DataTable;
