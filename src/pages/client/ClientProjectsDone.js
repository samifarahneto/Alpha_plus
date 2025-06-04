import React, { useEffect, useState } from "react";
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
import { FaDownload, FaGoogle } from "react-icons/fa";
import "../../styles/Pagination.css";
import ClientLayout from "../../components/layouts/ClientLayout";
import "../../styles/Navigation.css";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";

const ClientProjectsDone = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem(
      "clientProjectsDoneRowsPerPage"
    );
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem(
      "clientProjectsDoneColumnOrder"
    );
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
          "link",
        ];
  });
  const navigate = useNavigate();

  const fixedColumns = ["projectOwner", "userEmail", "projectName"];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

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
        const userType = userData.userType.toLowerCase();
        const registeredByType = userData.registeredByType;
        const projectPermissions = userData.projectPermissions || [];

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Se for colab, busca apenas os projetos do próprio usuário e dos usuários que ele tem permissão
        if (userType === "colab") {
          emailsToSearch = [currentUser.email, ...projectPermissions];
        } else {
          // Para b2b/b2c, busca projetos do usuário e dos vinculados
          const userRegisteredBy = userData.registeredBy;
          const colaboradores = userData.colaboradores || [];

          const usersWithSameRegisteredBy = query(
            collection(firestore, "users"),
            where("registeredBy", "==", userRegisteredBy || currentUser.email)
          );
          const usersSnapshot = await getDocs(usersWithSameRegisteredBy);
          emailsToSearch = usersSnapshot.docs
            .map((doc) => doc.data().email)
            .filter((email) => email);

          if (
            currentUser.email &&
            !emailsToSearch.includes(currentUser.email)
          ) {
            emailsToSearch.push(currentUser.email);
          }

          colaboradores.forEach((colab) => {
            if (colab.email && !emailsToSearch.includes(colab.email)) {
              emailsToSearch.push(colab.email);
            }
          });
        }

        // Determinar as coleções baseadas no tipo de usuário
        let collections = [];
        if (userType === "colab") {
          if (registeredByType === "b2b") {
            collections = ["b2bprojectspaid", "b2bapproved"];
          } else if (registeredByType === "b2c") {
            collections = ["b2cprojectspaid"];
          }
        } else {
          if (userType === "b2b") {
            collections = ["b2bprojectspaid", "b2bapproved"];
          } else if (userType === "b2c") {
            collections = ["b2cprojectspaid"];
          }
        }

        // Criar queries para projetos finalizados (translation_status)
        const translationQueries = collections.flatMap((collectionName) =>
          emailsToSearch.map((email) => {
            const projectsRef = collection(firestore, collectionName);
            return query(
              projectsRef,
              where("userEmail", "==", email),
              where("translation_status", "in", ["Finalizado", "Concluído"]),
              orderBy("createdAt", "desc")
            );
          })
        );

        // Criar queries para projetos finalizados (project_status)
        const projectQueries = collections.flatMap((collectionName) =>
          emailsToSearch.map((email) => {
            const projectsRef = collection(firestore, collectionName);
            return query(
              projectsRef,
              where("userEmail", "==", email),
              where("project_status", "==", "Finalizado"),
              orderBy("createdAt", "desc")
            );
          })
        );

        const allQueries = [...translationQueries, ...projectQueries];

        const unsubscribes = allQueries.map((q) =>
          onSnapshot(
            q,
            (snapshot) => {
              const projectsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                collection: doc.ref.parent.id,
                ...doc.data(),
              }));
              setProjects((prevProjects) => {
                const newProjects = [...prevProjects, ...projectsList];
                // Remove duplicatas baseado no ID
                return Array.from(
                  new Map(newProjects.map((item) => [item.id, item])).values()
                );
              });
              setLoading(false);
            },
            (error) => {
              console.error("Erro ao buscar projetos:", error);
              setError(
                "Erro ao carregar os projetos. Por favor, tente novamente."
              );
              setLoading(false);
            }
          )
        );

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar os projetos. Por favor, tente novamente.");
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    // Verificar casos específicos de valores inválidos
    if (typeof date === "string") {
      // Se contém NaN ou é uma string inválida
      if (
        date.includes("NaN") ||
        date === "A ser definido" ||
        date === "Invalid Date" ||
        date.toLowerCase().includes("invalid")
      ) {
        return "N/A";
      }

      // Se a data vier como string no formato dd/mm/yyyy, manter o formato
      if (date.includes("/")) {
        const [day, month, year] = date.split("/");
        // Verificar se os componentes são válidos
        if (
          day &&
          month &&
          year &&
          !day.includes("NaN") &&
          !month.includes("NaN") &&
          !year.includes("NaN")
        ) {
          // Garantir formato dd/mm/aaaa
          const paddedDay = day.padStart(2, "0");
          const paddedMonth = month.padStart(2, "0");
          const fullYear = year.length === 2 ? `20${year}` : year;
          return `${paddedDay}/${paddedMonth}/${fullYear}`;
        } else {
          return "N/A";
        }
      }
    }

    try {
      let dateObj;

      // Se for um Timestamp do Firestore
      if (date && typeof date.toDate === "function") {
        dateObj = date.toDate();
      }
      // Se for um objeto com seconds (Timestamp do Firestore em outro formato)
      else if (date && typeof date.seconds === "number") {
        dateObj = new Date(date.seconds * 1000);
      }
      // Se for um objeto Date
      else if (date instanceof Date) {
        dateObj = date;
      }
      // Se for uma string de data
      else if (typeof date === "string") {
        dateObj = new Date(date);
      } else {
        return "N/A";
      }

      // Verificar se a data é válida
      if (isNaN(dateObj.getTime())) {
        return "N/A";
      }

      // Garantir que a data seja exibida no formato dd/mm/aaaa
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = String(dateObj.getFullYear());

      // Retornar no formato dd/mm/aaaa
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "N/A";
    }
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

  const renderFilesModal = () => {
    if (!showFilesModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center">
                Visualizar Arquivos
              </h3>
            </div>

            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {file.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {file.pageCount || 0} páginas
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(file.fileUrl, "_blank");
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowFilesModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
      label: "Arquivos",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <span>{Array.isArray(row.files) ? row.files.length : 0}</span>
          {Array.isArray(row.files) && row.files.length > 0 && (
            <FaDownload
              className="text-blue-600 hover:text-blue-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFiles(row.files);
                setShowFilesModal(true);
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
          Finalizado: {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
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
      label: "Valor Total",
      render: (value, row) => `U$ ${calculateTotalValue(row.files)}`,
    },
    {
      id: "link",
      label: "Link",
      render: (value, row) => (
        <div className="flex items-center justify-center">
          {row.shareLink ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(row.shareLink, "_blank");
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded"
              title="Abrir Google Sheets"
            >
              <FaGoogle size={16} />
            </button>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      ),
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
    localStorage.setItem("clientProjectsDoneRowsPerPage", value.toString());
  };

  return (
    <ClientLayout>
      {!loading && (
        <>
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
        </>
      )}
      {renderFilesModal()}
    </ClientLayout>
  );
};

export default ClientProjectsDone;
