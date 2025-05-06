import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import ClientLayout from "../../components/layouts/ClientLayout";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";

const ClientGoingOn = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientGoingOnRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientGoingOnColumnOrder");
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
        const db = getFirestore();
        const projectsRef = collection(db, "projects");
        const q = query(
          projectsRef,
          where("clientId", "==", auth.currentUser.uid),
          where("status", "==", "Em Andamento"),
          orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const projectsList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setProjects(projectsList);
            setLoading(false);
          },
          (error) => {
            console.error("Erro ao buscar projetos:", error);
            setError(
              "Erro ao carregar os projetos. Por favor, tente novamente."
            );
            setLoading(false);
          }
        );

        return () => unsubscribe();
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
    localStorage.setItem("clientGoingOnRowsPerPage", value.toString());
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

export default ClientGoingOn;
