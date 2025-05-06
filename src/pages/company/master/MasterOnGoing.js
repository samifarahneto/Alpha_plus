import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import DataTable from "../../../components/DataTable";
import Pagination from "../../../components/Pagination";

const MasterOnGoing = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [clientTypes, setClientTypes] = useState({});
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("masterOnGoingRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [sortConfig] = useState(() => {
    const savedSortConfig = localStorage.getItem("masterOnGoingSortConfig");
    return savedSortConfig
      ? JSON.parse(savedSortConfig)
      : { key: "createdAt", direction: "desc" };
  });

  const columns = [
    { id: "client", label: "Cliente", fixed: true },
    { id: "type", label: "Tipo" },
    { id: "projectName", label: "Nome do Projeto", fixed: true },
    { id: "createdAt", label: "Data de Criação" },
    { id: "deadline", label: "Prazo" },
    { id: "totalValue", label: "Valor Total (U$)" },
    { id: "status", label: "Status", fixed: true },
  ];

  const fixedColumns = columns.filter((col) => col.fixed).map((col) => col.id);
  const initialColumnOrder = columns.map((col) => col.id);

  // Primeiro useEffect para carregar os tipos de usuários
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const firestore = getFirestore();
    const usersRef = collection(firestore, "users");

    const unsubscribeUsers = onSnapshot(
      usersRef,
      (snapshot) => {
        const users = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          users[data.email] = {
            ...data,
            clientType: data.clientType || "Cliente",
            nomeCompleto: data.nomeCompleto || "",
            registeredBy: data.registeredBy || null,
            registeredByType: data.registeredByType || null,
            userType: data.userType || null,
          };
        });
        setClientTypes(users);
      },
      (error) => {
        console.error("Erro ao carregar usuários:", error);
      }
    );

    return () => unsubscribeUsers();
  }, [user, navigate]);

  // Segundo useEffect para carregar os projetos
  useEffect(() => {
    if (!clientTypes || !user) return;

    setLoading(true);

    const firestore = getFirestore();
    const collections = [
      "b2bprojects",
      "b2bprojectspaid",
      "b2bapproved",
      "b2bdocprojects",
      "b2bapproval",
      "b2cprojectspaid",
      "b2cdocprojects",
      "b2capproval",
    ];

    try {
      const unsubscribeFunctions = collections.map((collectionName) => {
        const collectionRef = collection(firestore, collectionName);
        return onSnapshot(
          collectionRef,
          (snapshot) => {
            setProjects((prevProjects) => {
              // Filtrar apenas projetos com status "Em Andamento"
              const filteredProjects = snapshot.docs
                .filter((doc) => doc.data().project_status === "Em Andamento")
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  files: doc.data().files || [],
                  collection: collectionName,
                }));

              // Remover projetos da mesma coleção e adicionar os novos
              const otherCollectionsProjects = prevProjects.filter(
                (p) => p.collection !== collectionName
              );
              return [...otherCollectionsProjects, ...filteredProjects];
            });
            setLoading(false);
          },
          (error) => {
            console.error(`Erro ao carregar coleção ${collectionName}:`, error);
            setLoading(false);
          }
        );
      });

      return () => unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    } catch (error) {
      console.error("Erro ao configurar listeners:", error);
      setLoading(false);
    }
  }, [clientTypes, user]);

  const handleRowClick = (row) => {
    navigate(`/company/master/project/${row.id}?collection=${row.collection}`);
  };

  const sortData = (data, config) => {
    if (!config.key) return data;
    return [...data].sort((a, b) => {
      if (a[config.key] < b[config.key]) {
        return config.direction === "asc" ? -1 : 1;
      }
      if (a[config.key] > b[config.key]) {
        return config.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
      const fileTotal = Number(file.total) || 0;
      return total + fileTotal;
    }, 0);
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

  const paginatedData = React.useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];

    const sortedData = sortData(projects, sortConfig);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [projects, currentPage, rowsPerPage, sortConfig]);

  const formattedData = React.useMemo(() => {
    return paginatedData.map((row) => ({
      client: clientTypes[row.userEmail]?.nomeCompleto || "N/A",
      type: (() => {
        const userInfo = clientTypes[row.userEmail];
        if (!userInfo) return "Desconhecido";
        if (userInfo.userType === "colaborator" && userInfo.registeredBy) {
          const registeredByInfo = clientTypes[userInfo.registeredBy];
          if (registeredByInfo && registeredByInfo.userType === "b2b")
            return "B2B";
          if (
            registeredByInfo &&
            (registeredByInfo.clientType === "Cliente" ||
              registeredByInfo.clientType === "Colab")
          )
            return "B2C";
        }
        if (
          userInfo.clientType === "Colab" ||
          userInfo.clientType === "Cliente"
        )
          return "B2C";
        return userInfo.clientType || "Desconhecido";
      })(),
      projectName:
        row.projectName && row.projectName.length > 20
          ? `${row.projectName.slice(0, 20)}...`
          : row.projectName || "Sem Nome",
      createdAt: row.createdAt?.seconds
        ? new Date(row.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
        : "Sem Data",
      deadline: row.deadlineDate
        ? new Date(row.deadlineDate).toLocaleDateString("pt-BR")
        : "A definir",
      totalValue: `U$ ${calculateTotalValue(row.files).toFixed(2)}`,
      status: renderProjectStatusBadge(row.project_status || "Em Andamento"),
    }));
  }, [paginatedData, clientTypes]);

  return (
    <div className="w-full px-4 md:px-10">
      {!loading && (
        <div className="w-full">
          <div className="w-full overflow-x-auto">
            <div className="w-full">
              <DataTable
                columns={columns}
                data={formattedData}
                initialColumnOrder={initialColumnOrder}
                fixedColumns={fixedColumns}
                onRowClick={handleRowClick}
              />
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(
              1,
              Math.ceil((projects?.length || 0) / rowsPerPage)
            )}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              localStorage.setItem("masterOnGoingRowsPerPage", value);
            }}
            totalItems={projects?.length || 0}
          />
        </div>
      )}
    </div>
  );
};

export default MasterOnGoing;
