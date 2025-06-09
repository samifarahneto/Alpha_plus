import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import DataTable from "../../../components/DataTable";
import Pagination from "../../../components/Pagination";

const MasterPayments = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [clientTypes, setClientTypes] = useState({});
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("masterPaymentsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [sortConfig] = useState(() => {
    const savedSortConfig = localStorage.getItem("masterPaymentsSortConfig");
    return savedSortConfig
      ? JSON.parse(savedSortConfig)
      : { key: "createdAt", direction: "desc" };
  });

  const columns = [
    { id: "client", label: "Cliente", fixed: true },
    { id: "clientOrigin", label: "Cliente Origem", fixed: true },
    { id: "type", label: "Tipo" },
    { id: "origin", label: "Origem" },
    { id: "projectName", label: "Nome do Projeto" },
    { id: "createdAt", label: "Data" },
    { id: "monthYear", label: "Mês/Ano" },
    { id: "sourceLanguage", label: "Origem" },
    { id: "targetLanguage", label: "Destino" },
    { id: "convertCurrency", label: "Conv." },
    { id: "deadline", label: "Prazo" },
    { id: "totalValue", label: "Valor (U$)" },
    { id: "paymentStatus", label: "Pgto" },
    { id: "projectStatus", label: "Status", fixed: true },
    { id: "translationStatus", label: "Tradução", fixed: true },
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
              // Filtrar apenas projetos com payment_status "Pendente" ou "Divergência"
              const filteredProjects = snapshot.docs
                .filter((doc) => {
                  const data = doc.data();
                  return (
                    data.payment_status === "Pendente" ||
                    data.payment_status === "Divergência"
                  );
                })
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
    if (!row || !row.id) {
      console.error("ID do projeto não encontrado:", row);
      return;
    }

    // Criar um objeto limpo com apenas os dados necessários
    const cleanProjectData = {
      id: row.id,
      collection: row.collection,
      projectName: row.projectName,
      userEmail: row.userEmail,
      createdAt: row.createdAt,
      sourceLanguage: row.sourceLanguage,
      targetLanguage: row.targetLanguage,
      totalPages: row.totalPages,
      totalProjectValue: row.totalProjectValue,
      deadline: row.deadline,
      deadlineDate: row.deadlineDate,
      isPriority: row.isPriority,
      files:
        row.files?.map((file) => ({
          name: file.name,
          url: file.url,
          fileUrl: file.fileUrl,
          pageCount: file.pageCount,
          total: file.total,
          valuePerPage: file.valuePerPage,
        })) || [],
      project_status: row.project_status || "Em Andamento",
      payment_status: row.payment_status,
      translation_status: row.translation_status,
      valuePerPage: row.valuePerPage,
      hasManualQuoteFiles: row.hasManualQuoteFiles,
      convertCurrency: row.convertCurrency,
    };

    console.log("Navegando para projeto:", {
      id: row.id,
      collection: row.collection,
      cleanProjectData,
    });

    navigate(`/company/master/project/${row.id}?collection=${row.collection}`, {
      state: {
        project: cleanProjectData,
        collection: row.collection,
      },
    });
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

  const renderPaymentStatusBadge = (status) => {
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

  const renderTranslationStatusBadge = (status) => {
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

  const formatDeadline = (deadline, deadlineDate) => {
    // Se deadlineDate for "A Definir" ou null, retorna "A Definir"
    if (deadlineDate === "A Definir" || deadlineDate === null) {
      return "A Definir";
    }

    // Se deadlineDate for uma data ISO (contém "T")
    if (deadlineDate && deadlineDate.includes("T")) {
      const date = new Date(deadlineDate);
      // Ajustar para GMT-3
      date.setHours(date.getHours() + 3);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // Se deadlineDate já estiver no formato dd/mm/yyyy
    if (deadlineDate && deadlineDate.includes("/")) {
      return deadlineDate;
    }

    // Se não houver deadlineDate, usa o deadline para calcular
    if (deadline) {
      const days = parseInt(deadline);
      if (!isNaN(days)) {
        const today = new Date();
        let businessDays = 0;
        let currentDate = new Date(today);

        while (businessDays < days) {
          currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            businessDays++;
          }
        }

        return currentDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    }

    return "A Definir";
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
      ...row,
      client: clientTypes[row.userEmail]?.nomeCompleto || "N/A",
      clientOrigin: row.userEmail || "N/A",
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
      origin: (() => {
        const text =
          clientTypes[row.userEmail]?.registeredBy &&
          clientTypes[row.userEmail]?.registeredBy.trim() !== ""
            ? clientTypes[row.userEmail]?.registeredBy
            : row.userEmail || "N/A";
        return text.length > 20 ? `${text.slice(0, 20)}...` : text;
      })(),
      projectName:
        row.projectName && row.projectName.length > 20
          ? `${row.projectName.slice(0, 20)}...`
          : row.projectName || "Sem Nome",
      createdAt: row.createdAt?.seconds
        ? new Date(row.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
        : "Sem Data",
      monthYear: row.createdAt?.seconds
        ? new Date(row.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
            month: "2-digit",
            year: "2-digit",
          })
        : "Sem Data",
      sourceLanguage: row.sourceLanguage || "N/A",
      targetLanguage: row.targetLanguage || "N/A",
      convertCurrency: row.convertCurrency ? "Sim" : "Não",
      deadline: formatDeadline(row.deadline, row.deadlineDate),
      totalValue: `U$ ${Number(
        row.totalProjectValue || row.totalValue || 0
      ).toFixed(2)}`,
      paymentStatus: renderPaymentStatusBadge(
        typeof row.payment_status === "object"
          ? row.payment_status.status || "N/A"
          : row.payment_status || "N/A"
      ),
      projectStatus: renderProjectStatusBadge(row.project_status || "N/A"),
      translationStatus: renderTranslationStatusBadge(
        row.translation_status || "N/A"
      ),
    }));
  }, [paginatedData, clientTypes]);

  return (
    <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8">
      <div className="text-center mb-6 lg:mb-8">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Pagamentos Pendentes
        </h1>
      </div>
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
              localStorage.setItem("masterPaymentsRowsPerPage", value);
            }}
            totalItems={projects?.length || 0}
          />
        </div>
      )}
    </div>
  );
};

export default MasterPayments;
