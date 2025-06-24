import React, { useState, useEffect } from "react";
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
import { useAuth } from "../../contexts/AuthContext";

import ClientLayout from "../../components/layouts/ClientLayout";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";
import { FaDownload } from "react-icons/fa";
import Pagination from "../../components/Pagination";

const ClientBudgetReady = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem(
      "clientBudgetReadyRowsPerPage"
    );
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });

  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem(
      "clientBudgetReadyColumnOrder"
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

        // Buscar dados do usuário
        const userDoc = await getDocs(
          query(
            collection(firestore, "users"),
            where("email", "==", user.email)
          )
        );

        if (userDoc.empty) {
          console.error("Documento do usuário não encontrado");
          setLoading(false);
          return;
        }

        const userData = userDoc.docs[0].data();
        const userRegisteredBy = userData.registeredBy;
        const userType = userData.userType.toLowerCase();
        const registeredByType = userData.registeredByType;
        const colaboradores = userData.colaboradores || [];
        const projectPermissions = userData.projectPermissions || [];

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Se for colab, busca apenas os projetos do próprio usuário e dos usuários que ele tem permissão
        if (userType === "colab") {
          emailsToSearch = [user.email, ...projectPermissions];
        } else {
          // Para b2b/b2c, busca projetos do usuário e dos vinculados
          const usersWithSameRegisteredBy = query(
            collection(firestore, "users"),
            where("registeredBy", "==", userRegisteredBy || user.email)
          );
          const usersSnapshot = await getDocs(usersWithSameRegisteredBy);
          emailsToSearch = usersSnapshot.docs
            .map((doc) => doc.data().email)
            .filter((email) => email);

          // Adicionar o email do usuário atual à lista se ele não estiver incluído
          if (user.email && !emailsToSearch.includes(user.email)) {
            emailsToSearch.push(user.email);
          }

          // Adicionar os emails dos colaboradores
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
            collections = ["b2bapproval"];
          } else if (registeredByType === "b2c") {
            collections = ["b2capproval"];
          }
        } else {
          if (userType === "b2b") {
            collections = ["b2bapproval"];
          } else if (userType === "b2c") {
            collections = ["b2capproval"];
          }
        }

        console.log("Configuração de busca:", {
          userType,
          registeredByType,
          emailsToSearch,
          collections,
        });

        // Array para armazenar os unsubscribe functions
        const unsubscribeFunctions = [];

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            // Buscar projetos onde o email é o projectOwner
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              where("project_status", "in", [
                "Orçamento Recebido",
                "Ag. Pagamento",
                "Ag. Aprovação",
              ]),
              orderBy("createdAt", "desc")
            );

            // Buscar projetos onde o email é o userEmail
            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              where("project_status", "in", [
                "Orçamento Recebido",
                "Ag. Pagamento",
                "Ag. Aprovação",
              ]),
              orderBy("createdAt", "desc")
            );

            // Adicionar listeners para atualização em tempo real
            const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
              if (!snapshot.empty) {
                const newProjects = await Promise.all(
                  snapshot.docs.map(async (doc) => {
                    const projectData = doc.data();
                    const firestore = getFirestore();
                    const usersCollection = collection(firestore, "users");

                    let authorName = "Não informado";
                    if (projectData.projectOwner) {
                      try {
                        const userQuery = query(
                          usersCollection,
                          where("email", "==", projectData.projectOwner)
                        );
                        const userSnapshot = await getDocs(userQuery);
                        if (!userSnapshot.empty) {
                          const userData = userSnapshot.docs[0].data();
                          authorName = userData.nomeCompleto || "Não informado";
                        }
                      } catch (error) {
                        console.error("Erro ao buscar nome do autor:", error);
                      }
                    }

                    return {
                      ...projectData,
                      id: doc.id,
                      collection: collectionName,
                      authorName: authorName,
                      projectOwner: projectData.projectOwner || "Não informado",
                      userEmail: projectData.userEmail || "Não informado",
                    };
                  })
                );

                setProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });
              }
            });

            const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
              if (!snapshot.empty) {
                const newProjects = await Promise.all(
                  snapshot.docs.map(async (doc) => {
                    const projectData = doc.data();
                    const firestore = getFirestore();
                    const usersCollection = collection(firestore, "users");

                    let authorName = "Não informado";
                    if (projectData.projectOwner) {
                      try {
                        const userQuery = query(
                          usersCollection,
                          where("email", "==", projectData.projectOwner)
                        );
                        const userSnapshot = await getDocs(userQuery);
                        if (!userSnapshot.empty) {
                          const userData = userSnapshot.docs[0].data();
                          authorName = userData.nomeCompleto || "Não informado";
                        }
                      } catch (error) {
                        console.error("Erro ao buscar nome do autor:", error);
                      }
                    }

                    return {
                      ...projectData,
                      id: doc.id,
                      collection: collectionName,
                      authorName: authorName,
                      projectOwner: projectData.projectOwner || "Não informado",
                      userEmail: projectData.userEmail || "Não informado",
                    };
                  })
                );

                setProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });
              }
            });

            unsubscribeFunctions.push(unsubscribe1, unsubscribe2);
          });
        });

        setLoading(false);

        // Cleanup function para remover todos os listeners quando o componente for desmontado
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar os projetos. Por favor, tente novamente.");
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

    try {
      // Se for um objeto Firestore Timestamp
      if (typeof date === "object" && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString("pt-BR");
      }

      // Se for uma string, tenta converter
      if (typeof date === "string") {
        // Se for uma string no formato ISO ou qualquer formato válido
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString("pt-BR");
        }
        // Se não conseguir converter, retorna a string original
        return date;
      }

      // Se for um objeto Date
      if (date instanceof Date) {
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("pt-BR");
        }
      }

      // Tenta converter qualquer outro tipo
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("pt-BR");
      }

      // Se nada funcionar, retorna o valor original convertido para string
      return String(date);
    } catch (error) {
      console.warn("Erro ao formatar data:", error, "Valor original:", date);
      return String(date);
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
      render: (value) => {
        const formattedDate = formatDate(value);
        return formattedDate || "N/A";
      },
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
        const formattedDate = formatDate(value);
        return formattedDate || "N/A";
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
          "Orçamento Recebido": {
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200",
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

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    localStorage.setItem("clientBudgetReadyRowsPerPage", value.toString());
  };

  return (
    <ClientLayout>
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 text-blue-600 sm:bg-gradient-to-r sm:from-blue-600 sm:to-purple-600 sm:bg-clip-text sm:text-transparent">
          Orçamentos Recebidos
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
      </div>
    </ClientLayout>
  );
};

export default ClientBudgetReady;
