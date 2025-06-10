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

import { FaDownload } from "react-icons/fa";
import ClientLayout from "../../components/layouts/ClientLayout";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";
import Pagination from "../../components/Pagination";

const ClientBudget = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientBudgetRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });

  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientBudgetColumnOrder");
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
            collections = ["b2bdocprojects"];
          } else if (registeredByType === "b2c") {
            collections = ["b2cdocprojects"];
          }
        } else {
          if (userType === "b2b") {
            collections = ["b2bdocprojects"];
          } else if (userType === "b2c") {
            collections = ["b2cdocprojects"];
          }
        }

        const queries = collections.flatMap((collectionName) =>
          emailsToSearch.map((email) => {
            const projectsRef = collection(firestore, collectionName);
            return query(
              projectsRef,
              where("userEmail", "==", email),
              where("project_status", "==", "Ag. Orçamento"),
              orderBy("createdAt", "desc")
            );
          })
        );

        const unsubscribes = queries.map((q) =>
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
    if (!date) return "";
    const d = date.toDate();
    return d.toLocaleDateString("pt-BR");
  };

  const calculateTotalValue = (files) => {
    if (!files) return "0.00";
    const total = files.reduce((sum, file) => sum + (file.value || 0), 0);
    return total.toFixed(2);
  };

  const columns = [
    {
      id: "projectOwner",
      label: "Autor",
      fixed: true,
      render: (value) => (
        <span>
          {value && value.length > 15
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
          {value && value.length > 15
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
    },
    {
      id: "targetLanguage",
      label: "Destino",
    },
    {
      id: "files",
      label: "Arqs",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <span>{row.files?.length || 0}</span>
          {row.files?.length > 0 && (
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
        const date = value.toDate ? value.toDate() : new Date(value);
        return date.toLocaleDateString("pt-BR");
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

        const status = value || "Pendente";
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

        const status = value || "Ag. Orçamento";
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

        const status = value || "N/A";
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

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    localStorage.setItem("clientBudgetRowsPerPage", value.toString());
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
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(file.fileUrl, "_blank");
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

  return (
    <ClientLayout>
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 text-blue-600 sm:bg-gradient-to-r sm:from-blue-600 sm:to-purple-600 sm:bg-clip-text sm:text-transparent">
          Aguardando Orçamento
        </h1>

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
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(projects.length / rowsPerPage)}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              totalItems={projects.length}
            />
          </>
        )}
        {renderFilesModal()}
      </div>
    </ClientLayout>
  );
};

export default ClientBudget;
