import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";

import { FaDownload } from "react-icons/fa";
import "../../styles/Pagination.css";
import ClientLayout from "../../components/layouts/ClientLayout";
import "../../styles/Navigation.css";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";
import Pagination from "../../components/Pagination";

const ClientDivergence = () => {
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const savedVisibleColumns = localStorage.getItem(
      "clientDivergenceVisibleColumns"
    );
    return savedVisibleColumns
      ? JSON.parse(savedVisibleColumns)
      : [
          "projectNumber",
          "projectOwner",
          "userEmail",
          "projectName",
          "createdAt",
          "pages",
          "files",
          "sourceLanguage",
          "targetLanguage",
          "totalValue",
          "paymentStatus",
          "deadlineDate",
          "project_status",
          "translation_status",
        ];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem(
      "clientDivergenceRowsPerPage"
    );
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const navigate = useNavigate();

  const fixedColumns = ["projectOwner", "userEmail", "projectName"];

  const availableColumns = [
    { id: "projectNumber", label: "Nº" },
    { id: "projectOwner", label: "Autor", fixed: true },
    { id: "userEmail", label: "Email", fixed: true },
    { id: "projectName", label: "Projeto", fixed: true },
    { id: "createdAt", label: "Data" },
    { id: "pages", label: "Págs" },
    { id: "files", label: "Arqs" },
    { id: "sourceLanguage", label: "Origem" },
    { id: "targetLanguage", label: "Destino" },
    { id: "totalValue", label: "Valor U$" },
    { id: "paymentStatus", label: "Status Pgto" },
    { id: "deadlineDate", label: "Prazo" },
    { id: "project_status", label: "Status" },
    { id: "translation_status", label: "Tradução" },
  ];

  const calculateTotalPages = useCallback((files, row) => {
    // Se há payment_status com páginas de divergência, somar as páginas originais + divergência
    if (row?.payment_status?.pages) {
      // Calcular páginas originais dos arquivos
      const originalPages =
        files && Array.isArray(files)
          ? files.reduce((total, file) => {
              let pageCount = 0;
              if (file.pageCount !== undefined && file.pageCount !== null) {
                if (typeof file.pageCount === "string") {
                  pageCount = parseInt(file.pageCount) || 0;
                } else if (typeof file.pageCount === "number") {
                  pageCount = file.pageCount;
                }
              }
              return total + pageCount;
            }, 0)
          : 0;

      // Adicionar páginas de divergência
      const divergencePages =
        typeof row.payment_status.pages === "string"
          ? parseInt(row.payment_status.pages) || 0
          : row.payment_status.pages || 0;

      return originalPages + divergencePages;
    }

    // Se não há divergência, calcular normalmente pelos arquivos
    if (!files || !Array.isArray(files)) return 0;

    const total = files.reduce((total, file) => {
      // Converter pageCount para número, lidando com diferentes tipos
      let pageCount = 0;
      if (file.pageCount !== undefined && file.pageCount !== null) {
        if (typeof file.pageCount === "string") {
          pageCount = parseInt(file.pageCount) || 0;
        } else if (typeof file.pageCount === "number") {
          pageCount = file.pageCount;
        }
      }
      return total + pageCount;
    }, 0);

    return total;
  }, []);

  const calculateTotalValue = useCallback((files, project) => {
    if (!files || !Array.isArray(files)) return "0.00";

    const baseValue = files.reduce((acc, file) => {
      const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
      return acc + fileTotal;
    }, 0);

    // Se houver divergência, adicionar o valor da divergência
    if (project?.payment_status?.divergencePayment) {
      return (
        baseValue + Number(project.payment_status.divergencePayment)
      ).toFixed(2);
    }

    return baseValue.toFixed(2);
  }, []);

  useEffect(() => {
    const fetchAuthorNames = async () => {
      const firestore = getFirestore();
      const usersCollection = collection(firestore, "users");

      const updatedProjects = await Promise.all(
        allProjects.map(async (project) => {
          if (project.projectOwner) {
            try {
              const q = query(
                usersCollection,
                where("email", "==", project.projectOwner)
              );
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                return {
                  ...project,
                  authorName: userData.nomeCompleto || project.projectOwner,
                };
              }
            } catch (error) {
              console.error(
                `Erro ao buscar nome para o email ${project.projectOwner}:`,
                error
              );
            }
          }
          return {
            ...project,
            authorName: project.projectOwner || "Não informado",
          };
        })
      );
      setAllProjects(updatedProjects);
      setProjects(updatedProjects);
    };

    if (allProjects.length > 0) {
      fetchAuthorNames();
    }
  }, [allProjects]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }

        const firestore = getFirestore();
        const userDoc = await getDocs(
          query(
            collection(firestore, "users"),
            where("email", "==", currentUser.email)
          )
        );

        if (userDoc.empty) {
          console.error("Documento do usuário não encontrado");
          setLoading(false);
          return;
        }

        const userData = userDoc.docs[0].data();
        const userEmail = userData.email;

        // Configurar listeners para todas as coleções de projetos
        const collections = [
          "b2bprojectspaid",
          "b2cprojectspaid",
          "b2bapproval",
          "b2bdocprojects",
          "b2bapproved",
        ];
        const unsubscribeFunctions = [];

        collections.forEach((collectionName) => {
          const projectsRef = collection(firestore, collectionName);
          let q = query(
            projectsRef,
            where("userEmail", "==", userEmail),
            orderBy("createdAt", "desc")
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const newProjects = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                collection: collectionName,
              }))
              .filter((project) => {
                // Filtrar apenas projetos em divergência que ainda não foram pagos
                const paymentStatus =
                  typeof project.payment_status === "object"
                    ? project.payment_status.status
                    : project.payment_status;

                // Apenas projetos que estão atualmente em divergência e não foram pagos
                return (
                  paymentStatus === "Em Divergência" ||
                  paymentStatus === "Divergência"
                );
              });

            setAllProjects((prevProjects) => {
              // Remover projetos antigos desta coleção
              const filteredProjects = prevProjects.filter(
                (p) => p.collection !== collectionName
              );
              // Adicionar novos projetos
              return [...filteredProjects, ...newProjects];
            });
          });

          unsubscribeFunctions.push(unsubscribe);
        });

        // Cleanup function
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar projetos");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // useEffect para atualizar dados quando allProjects muda
  useEffect(() => {
    setProjects(allProjects);
  }, [allProjects]);

  const handleProjectClick = (projectId, collection) => {
    // Encontrar o projeto nos dados
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      console.error("Projeto não encontrado:", projectId);
      return;
    }

    console.log("Projeto clicado:", project);
    console.log("Coleção do projeto:", project.collection);

    // Navegar para a página de detalhes com a coleção correta
    navigate(`/client/projects/${projectId}`, {
      state: {
        project: project,
        collection: project.collection,
      },
    });
  };

  const formatDate = (date) => {
    if (!date) return "A definir";

    try {
      // Verificar se é uma data válida
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "A definir";
      }

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      // Verificar se os valores são válidos
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return "A definir";
      }

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "A definir";
    }
  };

  const renderFilesModal = () => {
    if (!showFilesModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center">
                Visualizar Arquivos
              </h3>
            </div>

            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-3 sm:gap-4"
                >
                  <div className="flex-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 break-all">
                        {file.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {file.pageCount || 0} páginas
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          window.open(file.fileUrl, "_blank");
                        } catch (error) {
                          console.error("Erro ao abrir arquivo:", error);
                          alert(
                            "Erro ao abrir o arquivo. Por favor, tente novamente."
                          );
                        }
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => setShowFilesModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleColumnToggle = (columnId) => {
    if (fixedColumns.includes(columnId)) return;

    setVisibleColumns((prev) => {
      const newVisibleColumns = prev.includes(columnId)
        ? prev.filter((col) => col !== columnId)
        : [...prev, columnId];
      return newVisibleColumns;
    });
  };

  const handleSaveColumns = () => {
    localStorage.setItem(
      "clientDivergenceVisibleColumns",
      JSON.stringify(visibleColumns)
    );
    setShowColumnSelector(false);
  };

  const renderColumnSelector = () => {
    if (!showColumnSelector) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-lg shadow-xl p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Personalizar Colunas
            </h3>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {availableColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  id={column.id}
                  checked={column.fixed || visibleColumns.includes(column.id)}
                  onChange={() => handleColumnToggle(column.id)}
                  disabled={column.fixed}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={column.id}
                  className={`ml-3 text-sm flex-1 ${
                    column.fixed ? "text-gray-500" : "text-gray-700"
                  }`}
                >
                  {column.label}
                  {column.fixed && (
                    <span className="ml-2 text-xs text-gray-400">(Fixa)</span>
                  )}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={handleSaveColumns}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salvar
            </button>
            <button
              onClick={() => setShowColumnSelector(false)}
              className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentStatusBadge = (status) => {
    const statusConfig = {
      "Em Divergência": {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      Divergência: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      Pendente: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
    };

    const config = statusConfig[status] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    };

    return (
      <div
        className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
      >
        {status || "N/A"}
      </div>
    );
  };

  const renderProjectStatusBadge = (status) => {
    const statusConfig = {
      "Em Divergência": {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      "Em Análise": {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      "Em Andamento": {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      Finalizado: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      Cancelado: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
    };

    const config = statusConfig[status] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    };

    return (
      <div
        className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
      >
        {status || "N/A"}
      </div>
    );
  };

  const sortedProjects = projects.sort((a, b) => {
    if (a.createdAt?.seconds && b.createdAt?.seconds) {
      return b.createdAt.seconds - a.createdAt.seconds;
    }
    return 0;
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedProjects.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedProjects.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    localStorage.setItem("clientDivergenceRowsPerPage", value.toString());
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 text-blue-600 sm:bg-gradient-to-r sm:from-blue-600 sm:to-purple-600 sm:bg-clip-text sm:text-transparent">
          Pagamentos Divergentes
        </h1>
        {/* Tabela */}
        <div className="w-full overflow-x-auto">
          <div className="w-full shadow-lg rounded-lg">
            <DataTable
              columns={availableColumns.filter(
                (col) => col.fixed || visibleColumns.includes(col.id)
              )}
              data={currentRows.map((row) => ({
                ...row,
                projectNumber: row.projectNumber || "N/A",
                projectOwner:
                  row.authorName || row.projectOwner || "Não informado",
                userEmail: row.userEmail || "N/A",
                projectName:
                  row.projectName && row.projectName.length > 20
                    ? `${row.projectName.slice(0, 20)}...`
                    : row.projectName || "Sem Nome",
                createdAt: row.createdAt
                  ? new Date(row.createdAt.seconds * 1000).toLocaleDateString(
                      "pt-BR"
                    )
                  : "Sem Data",
                pages: calculateTotalPages(row.files, row) || "0",
                files: (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-medium">
                      {row.files?.length || "0"}
                    </span>
                    <FaDownload
                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFiles(row.files);
                        setShowFilesModal(true);
                      }}
                      size={14}
                    />
                  </div>
                ),
                totalValue: (
                  <span className="text-xs font-medium">
                    {`U$ ${calculateTotalValue(row.files, row)}`}
                  </span>
                ),
                paymentStatus: renderPaymentStatusBadge(
                  typeof row.payment_status === "object"
                    ? row.payment_status.status || "N/A"
                    : row.payment_status || "N/A"
                ),
                deadlineDate: (
                  <span className="text-xs font-medium">
                    {row.deadlineDate
                      ? formatDate(new Date(row.deadlineDate))
                      : "A definir"}
                  </span>
                ),
                project_status: renderProjectStatusBadge(
                  row.project_status || "N/A"
                ),
                translation_status: (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      row.translation_status === "Finalizado"
                        ? "bg-green-50 text-green-700"
                        : row.translation_status === "Em Tradução"
                        ? "bg-blue-50 text-blue-700"
                        : row.translation_status === "Em Revisão"
                        ? "bg-yellow-50 text-yellow-700"
                        : row.translation_status === "Cancelado"
                        ? "bg-red-50 text-red-700"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {row.translation_status || "N/A"}
                  </span>
                ),
              }))}
              onRowClick={(row) => handleProjectClick(row.id, row.collection)}
              fixedColumns={fixedColumns}
            />
          </div>
        </div>

        {/* Paginação */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={paginate}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          totalItems={sortedProjects.length}
        />

        {/* Modais */}
        {renderFilesModal()}
        {renderColumnSelector()}
      </div>
    </ClientLayout>
  );
};

export default ClientDivergence;
