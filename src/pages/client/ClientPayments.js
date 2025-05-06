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
import ClientLayout from "../../components/layouts/ClientLayout";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";

const ClientPayments = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientPaymentsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientPaymentsColumnOrder");
    return savedColumnOrder
      ? JSON.parse(savedColumnOrder)
      : [
          "author",
          "email",
          "projectName",
          "createdAt",
          "pages",
          "sourceLanguage",
          "targetLanguage",
          "totalValue",
          "project_status",
          "status",
          "deadline",
          "select",
        ];
  });
  const navigate = useNavigate();

  const fixedColumns = ["author", "email", "projectName"];

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
        const userEmail = currentUser.email;

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [userEmail];

        // Determinar as coleções baseadas no tipo de usuário
        let collections = [];
        if (userType === "colab") {
          // Para colaboradores, usa o registeredByType
          if (registeredByType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
          } else if (registeredByType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
          }
        } else {
          // Para usuários normais (b2b/b2c), usa o userType
          if (userType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
          } else if (userType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
          }
        }

        // Array para armazenar os unsubscribe functions
        const unsubscribeFunctions = [];

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            // Buscar projetos onde o email é o projectOwner ou userEmail
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              where("payment_status", "==", "Pendente"),
              orderBy("createdAt", "desc")
            );

            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              where("payment_status", "==", "Pendente"),
              orderBy("createdAt", "desc")
            );

            // Adicionar listeners para atualização em tempo real
            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
              const projectsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                collection: collectionName,
              }));
              console.log(
                `Projetos da coleção ${collectionName} (q1):`,
                projectsList
              );
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                projectsList.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
              setLoading(false);
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
              const projectsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                collection: collectionName,
              }));
              console.log(
                `Projetos da coleção ${collectionName} (q2):`,
                projectsList
              );
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                projectsList.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
              setLoading(false);
            });

            unsubscribeFunctions.push(unsubscribe1, unsubscribe2);
          });
        });

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
  }, []);

  const handleProjectClick = (projectId) => {
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

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const handleProjectSelect = (projectId, isSelected) => {
    setSelectedProjects((prev) => {
      if (isSelected) {
        return [...prev, projectId];
      } else {
        return prev.filter((id) => id !== projectId);
      }
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedProjects(currentRows.map((row) => row.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handlePayment = () => {
    if (selectedProjects.length > 0) {
      navigate("/client/checkout", {
        state: { selectedProjects },
      });
    } else {
      alert("Por favor, selecione ao menos um projeto para pagar.");
    }
  };

  const renderProjectStatusBadge = (status) => {
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

    const config = statusConfig[status] || statusConfig["N/A"];

    return (
      <div
        className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
      >
        {status || "N/A"}
      </div>
    );
  };

  const columns = [
    {
      id: "author",
      label: "Autor",
      fixed: true,
      render: (value, row) => {
        const author = row.nomeCompleto || row.projectOwner || "Não informado";
        return (
          <span>
            {author && author.length > 15
              ? `${author.slice(0, 15)}...`
              : author}
          </span>
        );
      },
    },
    {
      id: "email",
      label: "Email",
      fixed: true,
      render: (value, row) => {
        const email = row.userEmail || "Não informado";
        return (
          <span>
            {email && email.length > 20 ? `${email.slice(0, 20)}...` : email}
          </span>
        );
      },
    },
    {
      id: "projectName",
      label: "Nome do Projeto",
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
      render: (value) => {
        if (!value) return "Não informado";
        try {
          if (value.toDate) {
            return value.toDate().toLocaleDateString("pt-BR");
          }
          if (value.seconds) {
            return new Date(value.seconds * 1000).toLocaleDateString("pt-BR");
          }
          return new Date(value).toLocaleDateString("pt-BR");
        } catch (error) {
          return "Data inválida";
        }
      },
    },
    {
      id: "pages",
      label: "Págs",
      render: (value, row) => {
        if (!row.files || !Array.isArray(row.files)) return "0";
        const totalPages = row.files.reduce((sum, file) => {
          const pages = parseInt(file.pageCount) || 0;
          return sum + pages;
        }, 0);
        return totalPages.toString();
      },
    },
    {
      id: "sourceLanguage",
      label: "Origem",
      render: (value) => value || "Não informado",
    },
    {
      id: "targetLanguage",
      label: "Destino",
      render: (value) => value || "Não informado",
    },
    {
      id: "totalValue",
      label: "Valor U$",
      render: (value, row) => {
        const total = calculateTotalValue(row.files);
        return `U$ ${total}`;
      },
    },
    {
      id: "project_status",
      label: "Status",
      render: (value) => renderProjectStatusBadge(value || "N/A"),
    },
    {
      id: "status",
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
      id: "deadline",
      label: "Prazo",
      render: (value, row) => {
        if (!value && !row.deadlineDate) return "A definir";

        // Se tiver deadlineDate, usar ele
        if (row.deadlineDate) {
          if (
            row.deadlineDate === "A definir" ||
            row.deadlineDate === "Não definido"
          ) {
            return "A definir";
          }
          try {
            const date = new Date(row.deadlineDate);
            if (isNaN(date.getTime())) return "A definir";
            return date.toLocaleDateString("pt-BR");
          } catch (error) {
            return "A definir";
          }
        }

        // Se não tiver deadlineDate, tentar usar o value (deadline)
        if (!value || !value.seconds) return "A definir";
        try {
          const date = new Date(value.seconds * 1000);
          if (isNaN(date.getTime())) return "A definir";
          return date.toLocaleDateString("pt-BR");
        } catch (error) {
          return "A definir";
        }
      },
    },
    {
      id: "select",
      label: "Sel.",
      render: (value, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedProjects.includes(row.id)}
            onChange={(e) => {
              e.stopPropagation();
              handleProjectSelect(row.id, e.target.checked);
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
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
    localStorage.setItem("clientPaymentsRowsPerPage", value.toString());
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
          {/* Botão Pagar */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handlePayment}
              style={{
                padding: "5px 10px",
                backgroundColor:
                  selectedProjects.length > 0 ? "#E0F7FA" : "#fff",
                border: "1px solid grey",
                borderRadius: "20px",
                fontSize: "14px",
                cursor: selectedProjects.length > 0 ? "pointer" : "not-allowed",
                color: "#333",
                whiteSpace: "nowrap",
                width: "auto",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                transition: "background-color 0.3s ease, box-shadow 0.3s ease",
              }}
              disabled={selectedProjects.length === 0}
            >
              Pagar Projetos
            </button>
          </div>

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
                selectable={true}
                onSelectAll={handleSelectAll}
                selectedRows={selectedProjects}
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

export default ClientPayments;
