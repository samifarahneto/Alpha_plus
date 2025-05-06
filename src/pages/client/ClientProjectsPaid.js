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

const ClientProjectsPaid = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem(
      "clientProjectsPaidRowsPerPage"
    );
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem(
      "clientProjectsPaidColumnOrder"
    );
    return savedColumnOrder
      ? JSON.parse(savedColumnOrder)
      : [
          "projectName",
          "projectOwner",
          "createdAt",
          "sourceLanguage",
          "targetLanguage",
          "totalValue",
        ];
  });
  const navigate = useNavigate();

  const fixedColumns = ["projectName", "projectOwner"];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const firestore = getFirestore();

        // Buscar informações do usuário atual
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
        const registeredByType = userData.registeredByType?.toLowerCase();

        console.log("Dados do usuário:", {
          userType,
          registeredByType,
          email: currentUser.email,
        });

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Determinar os emails a serem buscados baseado no tipo de usuário
        if (userType === "colab") {
          // Colaborador vê apenas seus próprios projetos
          emailsToSearch = [currentUser.email];
        } else {
          // B2B ou B2C veem seus projetos e de seus colaboradores
          emailsToSearch.push(currentUser.email);

          // Busca todos os usuários que foram registrados por este usuário
          const registeredUsersQuery = query(
            collection(firestore, "users"),
            where("registeredBy", "==", currentUser.email)
          );
          const registeredUsersSnapshot = await getDocs(registeredUsersQuery);
          registeredUsersSnapshot.forEach((doc) => {
            emailsToSearch.push(doc.data().email);
          });
        }

        // Determinar as coleções baseadas no registeredByType
        let collections = [];
        if (userType === "colab") {
          // Se for colaborador, usa o registeredByType
          if (registeredByType === "b2b") {
            collections = ["b2bprojectspaid"];
          } else if (registeredByType === "b2c") {
            collections = ["b2cprojectspaid"];
          }
        } else {
          // Se for usuário normal (b2b ou b2c), usa o userType
          if (userType === "b2b") {
            collections = ["b2bprojectspaid"];
          } else if (userType === "b2c") {
            collections = ["b2cprojectspaid"];
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

        // Limpar os projetos existentes antes de começar a escutar por novos
        setProjects([]);

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            console.log(
              `Buscando projetos para ${email} na coleção ${collectionName}`
            );

            // Buscar projetos onde o email é o userEmail
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              where("payment_status", "==", "Pago"),
              orderBy("createdAt", "desc")
            );

            // Adicionar listener para atualização em tempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} para ${email}:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                }))
              );

              // Primeiro, processar as mudanças
              snapshot.docChanges().forEach((change) => {
                if (change.type === "removed") {
                  setProjects((prevProjects) =>
                    prevProjects.filter(
                      (project) => project.id !== change.doc.id
                    )
                  );
                }
              });

              // Depois, atualizar com os novos dados
              const newProjects = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
                collection: collectionName,
              }));

              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
            });

            unsubscribeFunctions.push(unsubscribe);
          });

          // Buscar também projetos onde o usuário é o registeredBy
          if (!userType.includes("colab")) {
            const registeredByQuery = query(
              collectionRef,
              where("registeredBy", "==", currentUser.email),
              where("payment_status", "==", "Pago"),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(registeredByQuery, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} onde ${currentUser.email} é registeredBy:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                }))
              );

              const newProjects = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
                collection: collectionName,
              }));

              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
            });

            unsubscribeFunctions.push(unsubscribe);
          }
        });

        setLoading(false);

        // Cleanup function
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos pagos:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date.seconds * 1000).toLocaleDateString("pt-BR");
  };

  const columns = [
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
      id: "projectOwner",
      label: "Proprietário",
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
      id: "createdAt",
      label: "Data de Criação",
      render: (value) => formatDate(value),
    },
    {
      id: "sourceLanguage",
      label: "Idioma de Origem",
    },
    {
      id: "targetLanguage",
      label: "Idioma de Destino",
    },
    {
      id: "totalValue",
      label: "Valor Total",
      render: (value, row) => `R$ ${calculateTotalValue(row.files)}`,
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
    localStorage.setItem("clientProjectsPaidRowsPerPage", value.toString());
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

export default ClientProjectsPaid;
