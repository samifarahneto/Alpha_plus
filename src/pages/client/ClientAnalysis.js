import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import ClientLayout from "../../components/layouts/ClientLayout";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";
import { FaDownload } from "react-icons/fa";

const ClientAnalysis = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientAnalysisRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientAnalysisColumnOrder");
    return savedColumnOrder
      ? JSON.parse(savedColumnOrder)
      : [
          "projectOwner",
          "userEmail",
          "projectName",
          "createdAt",
          "sourceLanguage",
          "targetLanguage",
          "files",
          "deadlineDate",
          "payment_status",
          "project_status",
          "translation_status",
          "totalValue",
        ];
  });

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const fixedColumns = ["projectOwner", "userEmail", "projectName"];

  useEffect(() => {
    const fetchProjects = async () => {
      if (authLoading) {
        console.log("Aguardando carregamento da autenticação...");
        return;
      }

      if (!user) {
        console.log("Usuário não está logado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const firestore = getFirestore();

        console.log("Buscando projetos para o email:", user.email);

        // Array de coleções para buscar
        const collections = [
          "b2bapproved",
          "b2bprojectspaid",
          "b2cprojectspaid",
        ];

        // Array para armazenar todas as queries
        const queries = collections.map((collectionName) => {
          console.log(`Criando query para coleção: ${collectionName}`);
          const projectsRef = collection(firestore, collectionName);
          return query(
            projectsRef,
            where("userEmail", "==", user.email),
            where("project_status", "==", "Em Análise")
          );
        });

        // Executar todas as queries
        const querySnapshots = await Promise.all(
          queries.map(async (q, index) => {
            const snapshot = await getDocs(q);
            console.log(
              `Resultados da coleção ${collections[index]}:`,
              snapshot.docs.length
            );
            snapshot.docs.forEach((doc) => {
              console.log(`Projeto encontrado em ${collections[index]}:`, {
                id: doc.id,
                userEmail: doc.data().userEmail,
                project_status: doc.data().project_status,
                projectName: doc.data().projectName,
              });
            });
            return snapshot;
          })
        );

        // Combinar os resultados
        const projectsData = querySnapshots.flatMap((snapshot, index) =>
          snapshot.docs.map((doc) => {
            const data = doc.data();
            console.log(
              `Processando projeto ${doc.id} da coleção ${collections[index]}:`,
              {
                userEmail: data.userEmail,
                project_status: data.project_status,
                projectName: data.projectName,
              }
            );
            return {
              id: doc.id,
              collection: collections[index],
              ...data,
            };
          })
        );

        console.log("Total de projetos encontrados:", projectsData.length);
        console.log("Projetos:", projectsData);

        setProjects(projectsData);
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar os projetos. Por favor, tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading]);

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  const formatDate = (date) => {
    if (!date) return "";
    if (typeof date === "object" && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString("pt-BR");
    }
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const columns = [
    {
      id: "projectOwner",
      label: "Autor",
      fixed: true,
      render: (value) => (
        <span>
          {value && typeof value === "string" && value.length > 15
            ? `${value.slice(0, 15)}...`
            : value || "Não informado"}
        </span>
      ),
    },
    {
      id: "userEmail",
      label: "Email",
      fixed: true,
      render: (value) => <span>{value || "Não informado"}</span>,
    },
    {
      id: "projectName",
      label: "Projeto",
      fixed: true,
      render: (value) => (
        <span>
          {value && typeof value === "string" && value.length > 15
            ? `${value.slice(0, 15)}...`
            : value || "Sem Nome"}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: "Data",
      render: (value) => formatDate(value),
    },
    {
      id: "sourceLanguage",
      label: "Origem",
      render: (value) => <span>{value || "Não informado"}</span>,
    },
    {
      id: "targetLanguage",
      label: "Destino",
      render: (value) => <span>{value || "Não informado"}</span>,
    },
    {
      id: "files",
      label: "Arqs",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <span>{Array.isArray(row.files) ? row.files.length : 0}</span>
          {Array.isArray(row.files) &&
            row.files.length > 0 &&
            row.files[0]?.fileUrl && (
              <FaDownload
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(row.files[0].fileUrl, "_blank");
                }}
                size={14}
              />
            )}
        </div>
      ),
    },
    {
      id: "deadlineDate",
      label: "Prazo",
      render: (value) => {
        if (!value) return "N/A";
        return formatDate(value);
      },
    },
    {
      id: "payment_status",
      label: "PGTO",
      render: (value) => {
        const statusConfig = {
          Pago: {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
          },
          Pendente: {
            bg: "bg-yellow-50",
            text: "text-yellow-700",
            border: "border-yellow-200",
          },
          Atrasado: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
          },
          Divergência: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
          },
          "N/A": {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
          },
        };

        const status = typeof value === "string" ? value : "N/A";
        const config = statusConfig[status] || statusConfig["N/A"];

        return (
          <div
            className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
          >
            {status}
          </div>
        );
      },
    },
    {
      id: "project_status",
      label: "Status",
      render: (value) => {
        const statusConfig = {
          "Em Andamento": {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
          },
          Finalizado: {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
          },
          "Em Revisão": {
            bg: "bg-yellow-50",
            text: "text-yellow-700",
            border: "border-yellow-200",
          },
          Cancelado: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
          },
          "Em Análise": {
            bg: "bg-yellow-50",
            text: "text-yellow-700",
            border: "border-yellow-200",
          },
          "Ag. Orçamento": {
            bg: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200",
          },
          "Ag. Aprovação": {
            bg: "bg-amber-50",
            text: "text-amber-700",
            border: "border-amber-200",
          },
          "Ag. Pagamento": {
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200",
          },
          "Em Divergência": {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
          },
          "N/A": {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
          },
        };

        const status = typeof value === "string" ? value : "N/A";
        const config = statusConfig[status] || statusConfig["N/A"];

        return (
          <div
            className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
          >
            {status}
          </div>
        );
      },
    },
    {
      id: "translation_status",
      label: "Tradução",
      render: (value) => {
        const statusConfig = {
          "Em Andamento": {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
          },
          Concluído: {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
          },
          "Em Revisão": {
            bg: "bg-yellow-50",
            text: "text-yellow-700",
            border: "border-yellow-200",
          },
          Cancelado: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
          },
          "N/A": {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
          },
        };

        const status = typeof value === "string" ? value : "N/A";
        const config = statusConfig[status] || statusConfig["N/A"];

        return (
          <div
            className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
          >
            {status}
          </div>
        );
      },
    },
    {
      id: "totalValue",
      label: "Valor U$",
      render: (value, row) => `U$ ${calculateTotalValue(row.files)}`,
    },
  ];

  // Calcular índices para paginação
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = projects.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(projects.length / rowsPerPage);

  // Função para mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    setShowRowsDropdown(false);
    localStorage.setItem("clientAnalysisRowsPerPage", value.toString());
  };

  return (
    <ClientLayout>
      {error && (
        <div className="text-center p-4 md:p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-4 md:my-5">
          <p>Erro ao carregar os projetos: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center p-4 md:p-8">
          <div className="animate-spin rounded-full h-12 md:h-16 w-12 md:w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando projetos...</p>
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <div className="w-full shadow-lg rounded-lg">
              <DataTable
                columns={columns}
                data={currentRows}
                initialColumnOrder={columnOrder}
                fixedColumns={fixedColumns}
                onRowClick={(row) => handleProjectClick(row.id)}
                getRowClassName={(row) =>
                  "hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                }
              />
            </div>
          </div>

          {/* Paginação */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Projetos por página:
              </span>
              <div className="relative">
                <button
                  id="rows-button"
                  onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {rowsPerPage}
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
                </button>
                {showRowsDropdown && (
                  <div
                    id="rows-dropdown"
                    className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg"
                  >
                    <div className="py-1">
                      {[10, 25, 50, 100].map((value) => (
                        <button
                          key={value}
                          onClick={() => handleRowsPerPageChange(value)}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`w-8 h-8 text-sm border rounded-lg ${
                        currentPage === page
                          ? "bg-blue-500 text-white border-blue-500"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próximo
              </button>
            </div>
          </div>
        </>
      )}
    </ClientLayout>
  );
};

export default ClientAnalysis;
