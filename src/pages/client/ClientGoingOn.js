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
import Pagination from "../../components/Pagination";
import "../../styles/Table.css";
import { FaDownload } from "react-icons/fa";

const ClientGoingOn = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientGoingOnRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });

  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientGoingOnColumnOrder");
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

        const queries = collections.flatMap((collectionName) =>
          emailsToSearch.map((email) => {
            const projectsRef = collection(firestore, collectionName);
            return query(
              projectsRef,
              where("userEmail", "==", email),
              where("translation_status", "==", "Em Tradução"),
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

    // Se for uma string que representa prazo em texto (não data)
    if (typeof date === "string") {
      // Verificar se é uma string de prazo em texto
      const textualDeadlines = [
        "A definir",
        "Não definido",
        "A Definir",
        "N/A",
        "n/a",
        "dias úteis",
        "úteis",
        "útil",
      ];

      const isTextualDeadline = textualDeadlines.some((text) =>
        date.toLowerCase().includes(text.toLowerCase())
      );

      if (isTextualDeadline) {
        return date;
      }

      // Tentar converter string de data
      const dateFromString = new Date(date);
      if (!isNaN(dateFromString.getTime())) {
        return dateFromString.toLocaleDateString("pt-BR");
      }

      // Se não conseguiu converter, retornar o valor original
      return date;
    }

    // Se for um objeto com seconds (timestamp do Firestore)
    if (typeof date === "object" && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString("pt-BR");
    }

    // Se for um timestamp do Firebase
    if (typeof date === "object" && date.toDate) {
      return date.toDate().toLocaleDateString("pt-BR");
    }

    // Tentar converter como Date
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("pt-BR");
    }

    // Se nada funcionou, retornar o valor original
    return date || "";
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
          "Em Tradução": {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
          },
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
          "Em Certificação": {
            bg: "bg-purple-50",
            text: "text-purple-700",
            border: "border-purple-200",
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
    localStorage.setItem("clientGoingOnRowsPerPage", value.toString());
  };

  return (
    <ClientLayout>
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 text-blue-600 sm:bg-gradient-to-r sm:from-blue-600 sm:to-purple-600 sm:bg-clip-text sm:text-transparent">
          Em Andamento
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
              totalPages={totalPages}
              onPageChange={paginate}
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

export default ClientGoingOn;
