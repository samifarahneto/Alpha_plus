import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotifications } from "../../../contexts/NotificationContext";
import { FaDownload } from "react-icons/fa";
import "../../../styles/Pagination.css";
import DataTable from "../../../components/DataTable";
import "../../../styles/Table.css";
import Pagination from "../../../components/Pagination";
import Filter from "../../../components/Filter";
import { saveAs } from "file-saver";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MasterProjects = ({ style, isMobile }) => {
  const { user, loading } = useAuth();
  const {
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
  } = useNotifications();
  const [allUploads, setAllUploads] = useState([]);
  const [filteredUploads, _setFilteredUploads] = useState([]);
  const [clientFilter, setClientFilter] = useState("");
  const [projectNameFilter, setProjectNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [sourceLanguageFilter, setSourceLanguageFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const location = useLocation();
  const [clientTypes, setClientTypes] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Carregar as colunas visíveis do localStorage, ou usar o padrão
    const savedVisibleColumns = localStorage.getItem(
      "masterProjectsVisibleColumns"
    );
    const defaultColumns = [
      "projectNumber", // Nº do Projeto (fixo)
      "client", // Cliente (fixo)
      "projectName", // Nome do Projeto (fixo)
      "createdAt", // Data
      "monthYear", // Mês/Ano
      "sourceLanguage", // Origem
      "targetLanguage", // Destino
      "pages", // Pgs.
      "filesDisplay", // Arq.
      "totalValue", // Valor (U$)
      "paymentStatus", // Status Pgto
      "deadline", // Prazo
      "clientType", // Tipo
      "projectStatus", // Status do Projeto (fixo)
      "translationStatus", // Status de Tradução (fixo)
    ];

    if (savedVisibleColumns) {
      const parsed = JSON.parse(savedVisibleColumns);
      // Verificar se a coluna projectNumber está incluída
      if (!parsed.includes("projectNumber")) {
        // Se não estiver, adicionar no início
        const updatedColumns = ["projectNumber", ...parsed];
        // Salvar a versão atualizada
        localStorage.setItem(
          "masterProjectsVisibleColumns",
          JSON.stringify(updatedColumns)
        );
        return updatedColumns;
      }
      return parsed;
    }
    return defaultColumns;
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    // Carregar a ordem das colunas do localStorage, ou usar a ordem padrão
    const savedOrder = localStorage.getItem("masterProjectsColumnOrder");
    const defaultOrder = [
      "projectNumber",
      "client",
      "projectName",
      "createdAt",
      "monthYear",
      "sourceLanguage",
      "targetLanguage",
      "pages",
      "filesDisplay",
      "totalValue",
      "paymentStatus",
      "deadline",
      "clientType",
      "projectStatus",
      "translationStatus",
    ];

    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      // Verificar se a coluna projectNumber está incluída
      if (!parsed.includes("projectNumber")) {
        // Se não estiver, adicionar no início
        const updatedOrder = ["projectNumber", ...parsed];
        // Salvar a versão atualizada
        localStorage.setItem(
          "masterProjectsColumnOrder",
          JSON.stringify(updatedOrder)
        );
        return updatedOrder;
      }
      return parsed;
    }
    return defaultOrder;
  });
  const [modalColumnOrder, setModalColumnOrder] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    // Carregar a preferência do usuário do localStorage, ou usar 10 como padrão
    const savedRowsPerPage = localStorage.getItem("masterProjectsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [sortConfig] = useState(() => {
    // Sempre iniciar com ordenação por data decrescente
    return { key: "createdAt", direction: "desc" };
  });
  const [projectStatusFilter, setProjectStatusFilter] = useState([]);
  const [translationStatusFilter, setTranslationStatusFilter] = useState([]);

  const columns = [
    {
      id: "projectNumber",
      label: "Nº",
      fixed: true,
      minWidth: "50px",
      maxWidth: "50px",
      render: (value, row) => <span>{row.projectNumber || "N/A"}</span>,
    },
    {
      id: "client",
      label: "Cliente",
      fixed: true,
      minWidth: "100px",
      render: (value, row) => (
        <span>
          {clientTypes[row.userEmail]?.registeredBy || row.userEmail || "N/A"}
        </span>
      ),
    },
    {
      id: "projectName",
      label: "Nome do Projeto",
      fixed: true,
      minWidth: "150px",
      render: (value, row) => (
        <span className="font-medium">
          {row.projectName && row.projectName.length > 20
            ? `${row.projectName.slice(0, 20)}...`
            : row.projectName || "Sem Nome"}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: "Data",
      minWidth: "80px",
      render: (value, row) => (
        <span>
          {new Date(row.createdAt.seconds * 1000).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      id: "monthYear",
      label: "Mês/Ano",
      minWidth: "70px",
      render: (value, row) => (
        <span>
          {row.createdAt
            ? new Date(row.createdAt.seconds * 1000).toLocaleDateString(
                "pt-BR",
                {
                  month: "2-digit",
                  year: "2-digit",
                }
              )
            : "Sem Data"}
        </span>
      ),
    },
    {
      id: "sourceLanguage",
      label: "Origem",
      minWidth: "80px",
      render: (value, row) => <span>{row.sourceLanguage || "N/A"}</span>,
    },
    {
      id: "targetLanguage",
      label: "Destino",
      minWidth: "80px",
      render: (value, row) => <span>{row.targetLanguage || "N/A"}</span>,
    },
    {
      id: "pages",
      label: "Pgs.",
      minWidth: "50px",
      maxWidth: "50px",
      render: (value, row) => (
        <span>{calculateTotalPages(row.files) || "0"}</span>
      ),
    },
    {
      id: "filesDisplay",
      label: "Arq.",
      minWidth: "50px",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <span>{row.files.length || "0"}</span>
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
    },
    {
      id: "totalValue",
      label: "Valor (U$)",
      minWidth: "90px",
      render: (value, row) => (
        <span>
          U${" "}
          {Number(
            row.totalProjectValue ||
              row.totalValue ||
              calculateTotalValue(row.files)
          ).toFixed(2)}
        </span>
      ),
    },
    {
      id: "paymentStatus",
      label: "Status Pgto",
      minWidth: "100px",
      render: (value, row) =>
        renderPaymentStatusBadge(
          typeof row.payment_status === "object"
            ? row.payment_status.status || "N/A"
            : row.payment_status || "N/A"
        ),
    },
    {
      id: "deadline",
      label: "Prazo",
      minWidth: "80px",
      render: (value, row) => (
        <span className={row.deadlineDate ? "font-medium" : "text-gray-500"}>
          {formatDeadline(row.deadline, row.deadlineDate)}
        </span>
      ),
    },
    {
      id: "clientType",
      label: "Tipo",
      minWidth: "60px",
      render: (value, row) => {
        const userInfo = clientTypes[row.userEmail];
        if (!userInfo) return <span>N/A</span>;

        if (userInfo.userType === "colaborator" && userInfo.registeredBy) {
          const registeredByInfo = clientTypes[userInfo.registeredBy];
          if (registeredByInfo && registeredByInfo.userType === "b2b") {
            return <span>B2B</span>;
          } else if (
            registeredByInfo &&
            (registeredByInfo.clientType === "Cliente" ||
              registeredByInfo.clientType === "Colab")
          ) {
            return <span>B2C</span>;
          }
        } else if (
          userInfo.clientType === "Colab" ||
          userInfo.clientType === "Cliente"
        ) {
          return <span>B2C</span>;
        }
        return <span>{userInfo.clientType || "N/A"}</span>;
      },
    },
    {
      id: "projectStatus",
      label: "Status do Projeto",
      fixed: true,
      minWidth: "120px",
      render: (value, row) =>
        renderProjectStatusBadge(row.project_status || "N/A"),
    },
    {
      id: "translationStatus",
      label: "Status de Tradução",
      fixed: true,
      minWidth: "140px",
      render: (value, row) => (
        <select
          value={row.translation_status || "N/A"}
          onChange={(e) => {
            e.stopPropagation();
            updateProjectStatus(row.id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={row.collection === "b2bdocprojects"}
          className={`input-default w-36 !h-6 !py-0 !text-sm rounded-lg ${
            row.translation_status === "Finalizado"
              ? "text-green-600"
              : row.translation_status === "Em Andamento"
              ? "text-blue-600"
              : row.translation_status === "Em Revisão"
              ? "text-yellow-600"
              : row.translation_status === "Em Certificação"
              ? "text-orange-600"
              : row.translation_status === "Cancelado"
              ? "text-gray-600"
              : row.translation_status === "N/A"
              ? "text-gray-600"
              : "text-blue-600"
          }`}
        >
          {row.collection === "b2bdocprojects" ? (
            <option value="Ag. Orçamento">Ag. Orçamento</option>
          ) : (
            <>
              <option value="N/A">N/A</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Revisão">Em Revisão</option>
              <option value="Em Certificação">Em Certificação</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </>
          )}
        </select>
      ),
    },
  ];

  const fixedColumns = columns.filter((col) => col.fixed).map((col) => col.id);

  const navigate = useNavigate();

  const sourceLanguageOptions = [
    { value: "Português (Brasil)", label: "Português (Brasil)" },
    { value: "Espanhol (América Latina)", label: "Espanhol (América Latina)" },
  ];

  const paymentOptions = [
    { value: "Pago", label: "Pago" },
    { value: "Pendente", label: "Pendente" },
  ];

  const clientTypeOptions = [
    { value: "B2B", label: "B2B" },
    { value: "B2C", label: "B2C" },
  ];

  const projectStatusOptions = [
    { value: "Ag. Orçamento", label: "Aguardando Orçamento" },
    { value: "Ag. Aprovação", label: "Aguardando Aprovação" },
    { value: "Ag. Pagamento", label: "Aguardando Pagamento" },
    { value: "Em Análise", label: "Em Análise" },
    { value: "Em Andamento", label: "Em Andamento" },
    { value: "Cancelado", label: "Cancelado" },
  ];

  const translationStatusOptions = [
    { value: "Em Tradução", label: "Em Tradução" },
    { value: "Finalizado", label: "Finalizado" },
    { value: "Em Revisão", label: "Em Revisão" },
    { value: "Cancelado", label: "Cancelado" },
    { value: "N/A", label: "N/A" },
  ];

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const db = getFirestore();
    const collections = [
      // Coleções B2B
      "b2bprojects",
      "b2bprojectspaid",
      "b2bapproved",
      "b2bdocprojects",
      "b2bapproval",
      // Coleções B2C
      "b2cprojectspaid",
      "b2cdocprojects",
      "b2capproval",
    ];

    // Configurar listener para usuários
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
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
    });

    // Configurar listeners para cada coleção
    const unsubscribeFunctions = collections.map((collectionName) => {
      const collectionRef = collection(db, collectionName);
      console.log(`Configurando listener para coleção: ${collectionName}`);
      return onSnapshot(collectionRef, (snapshot) => {
        console.log(
          `Dados recebidos da coleção ${collectionName}:`,
          snapshot.docs.length,
          "documentos"
        );
        setAllUploads((prevUploads) => {
          const newUploads = [...prevUploads];
          snapshot.docChanges().forEach((change) => {
            const projectData = {
              id: change.doc.id,
              ...change.doc.data(),
              files: change.doc.data().files || [],
              collection: collectionName,
            };

            console.log(`Projeto da coleção ${collectionName}:`, {
              id: projectData.id,
              projectName: projectData.projectName,
              changeType: change.type,
            });

            const index = newUploads.findIndex((p) => p.id === change.doc.id);

            if (change.type === "added" && index === -1) {
              newUploads.push(projectData);
            } else if (change.type === "modified" && index !== -1) {
              newUploads[index] = projectData;
            } else if (change.type === "removed" && index !== -1) {
              newUploads.splice(index, 1);
            }
          });
          return newUploads;
        });
      });
    });

    return () => {
      unsubscribeUsers();
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, loading]);

  // useEffect para contar projetos não lidos pelo Master
  useEffect(() => {
    if (!allUploads) return;

    // 1. Contar projetos onde MasterRead é false (Todos Projetos)
    const unreadMasterProjects = allUploads.filter((project) => {
      return project.MasterRead === false;
    });

    // 2. Contar projetos aguardando orçamento (ProjectsBudget.js logic)
    const budgetProjects = allUploads.filter(
      (project) =>
        project.collection === "b2bdocprojects" ||
        project.collection === "b2cdocprojects"
    );

    // 3. Contar projetos aguardando aprovação (ProjectsApproval.js logic)
    const approvalProjects = allUploads.filter(
      (project) =>
        project.collection === "b2bapproval" ||
        project.collection === "b2capproval"
    );

    // 4. Contar projetos aprovados (ProjectsApproved.js logic)
    const approvedProjects = allUploads.filter(
      (project) =>
        project.collection === "b2bapproved" ||
        project.collection === "b2capproved"
    );

    // 5. Contar projetos em análise (ProjectsInAnalysis.js logic)
    const inAnalysisProjects = allUploads.filter(
      (project) =>
        (project.collection === "b2bapproved" ||
          project.collection === "b2bprojectspaid" ||
          project.collection === "b2cprojectspaid") &&
        project.project_status?.toLowerCase() === "em análise"
    );

    // 6. Contar projetos em andamento (MasterOnGoing.js logic)
    const onGoingProjects = allUploads.filter(
      (project) => project.project_status === "Em Andamento"
    );

    // Atualizar todos os contextos de notificações
    updateMasterUnreadCount(unreadMasterProjects.length);
    updateBudgetCount(budgetProjects.length);
    updateApprovalCount(approvalProjects.length);
    updateApprovedCount(approvedProjects.length);
    updateInAnalysisCount(inAnalysisProjects.length);
    updateOnGoingCount(onGoingProjects.length);
  }, [
    allUploads,
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
  ]);

  useEffect(() => {
    if (!allUploads || !clientTypes) return;

    let filteredData = [...allUploads];

    // Aplicar filtro de cliente
    if (clientFilter) {
      const searchTerm = clientFilter.toLowerCase();
      filteredData = filteredData.filter((upload) => {
        const projectOwner = (upload.projectOwner || "").toLowerCase();
        const nomeCompleto = (
          clientTypes[upload.userEmail]?.nomeCompleto || ""
        ).toLowerCase();
        return (
          projectOwner.includes(searchTerm) || nomeCompleto.includes(searchTerm)
        );
      });
    }

    // Aplicar filtro de nome do projeto
    if (projectNameFilter) {
      const searchTerm = projectNameFilter.toLowerCase();
      filteredData = filteredData.filter((upload) =>
        (upload.projectName || "").toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar filtro de data
    if (dateFilter.start || dateFilter.end) {
      console.log("Aplicando filtro de data:", dateFilter);
      const beforeFilter = filteredData.length;
      filteredData = filteredData.filter((upload) => {
        // Se não há filtro de data definido, incluir todos os projetos
        if (!dateFilter.start && !dateFilter.end) return true;

        // Se o projeto não tem createdAt.seconds, incluir mesmo assim (não excluir)
        if (!upload.createdAt?.seconds) {
          console.log(
            "Projeto sem createdAt.seconds (incluindo mesmo assim):",
            upload.id,
            upload.projectName
          );
          return true; // Mudança: incluir ao invés de excluir
        }

        const uploadDate = new Date(upload.createdAt.seconds * 1000);

        // Obter apenas a data (sem hora) para comparação
        const uploadDateOnly = new Date(
          uploadDate.getFullYear(),
          uploadDate.getMonth(),
          uploadDate.getDate()
        );

        if (dateFilter.start && dateFilter.end) {
          const startDate = new Date(dateFilter.start);
          const endDate = new Date(dateFilter.end);
          return uploadDateOnly >= startDate && uploadDateOnly <= endDate;
        } else if (dateFilter.start) {
          const startDate = new Date(dateFilter.start);
          return uploadDateOnly >= startDate;
        } else if (dateFilter.end) {
          const endDate = new Date(dateFilter.end);
          return uploadDateOnly <= endDate;
        }
        return true;
      });
      console.log(
        `Filtro de data: ${beforeFilter} -> ${filteredData.length} projetos`
      );
    }

    // Aplicar filtro de língua de origem
    if (sourceLanguageFilter.length > 0) {
      filteredData = filteredData.filter((upload) =>
        sourceLanguageFilter.includes(upload.sourceLanguage)
      );
    }

    // Aplicar filtro de pagamento
    if (paymentFilter) {
      filteredData = filteredData.filter((upload) => {
        const paymentStatus =
          typeof upload.payment_status === "object"
            ? upload.payment_status.status
            : upload.payment_status;
        return paymentStatus?.toUpperCase() === paymentFilter.toUpperCase();
      });
    }

    // Aplicar filtro de tipo de cliente
    if (clientTypeFilter) {
      console.log("Aplicando filtro de tipo de cliente:", clientTypeFilter);
      const beforeFilter = filteredData.length;
      filteredData = filteredData.filter((upload) => {
        const userInfo = clientTypes[upload.userEmail];
        if (!userInfo) {
          console.log(
            "Projeto sem userInfo (incluindo mesmo assim quando não há filtro):",
            upload.id,
            upload.projectName,
            upload.userEmail
          );
          // Se não há informações do usuário, incluir o projeto mesmo assim
          // pois pode ser um projeto válido com dados incompletos
          return true;
        }

        if (userInfo.userType === "colaborator" && userInfo.registeredBy) {
          const registeredByInfo = clientTypes[userInfo.registeredBy];
          if (registeredByInfo && registeredByInfo.userType === "b2b")
            return clientTypeFilter === "B2B";
          if (
            registeredByInfo &&
            (registeredByInfo.clientType === "Cliente" ||
              registeredByInfo.clientType === "Colab")
          )
            return clientTypeFilter === "B2C";
        } else if (
          userInfo.clientType === "Colab" ||
          userInfo.clientType === "Cliente"
        ) {
          return clientTypeFilter === "B2C";
        }
        return userInfo.clientType === clientTypeFilter;
      });
      console.log(
        `Filtro de tipo de cliente: ${beforeFilter} -> ${filteredData.length} projetos`
      );
    }

    // Aplicar filtro de status do projeto
    if (projectStatusFilter && projectStatusFilter.length > 0) {
      filteredData = filteredData.filter((upload) => {
        const projectStatus = upload.project_status || "Rascunho";
        return projectStatusFilter.includes(projectStatus);
      });
    }

    // Aplicar filtro de status da tradução
    if (translationStatusFilter && translationStatusFilter.length > 0) {
      filteredData = filteredData.filter((upload) => {
        const translationStatus = upload.translation_status || "N/A";
        return translationStatusFilter.includes(translationStatus);
      });
    }

    _setFilteredUploads(filteredData);

    // Debug específico para as coleções problemáticas
    const problematicCollections = [
      "b2bapproved",
      "b2bapproval",
      "b2bdocprojects",
      "b2cdocprojects",
    ];
    const problematicProjects = filteredData.filter((project) =>
      problematicCollections.includes(project.collection)
    );

    if (problematicProjects.length > 0) {
      console.log("Projetos das coleções problemáticas encontrados:", {
        total: problematicProjects.length,
        projects: problematicProjects.map((p) => ({
          id: p.id,
          name: p.projectName,
          collection: p.collection,
          userEmail: p.userEmail,
        })),
      });
    } else {
      console.log(
        "Nenhum projeto das coleções problemáticas encontrado em filteredData"
      );
      console.log("Verificando em allUploads...");
      const allProblematicProjects = allUploads.filter((project) =>
        problematicCollections.includes(project.collection)
      );
      console.log("Projetos problemáticos em allUploads:", {
        total: allProblematicProjects.length,
        projects: allProblematicProjects.map((p) => ({
          id: p.id,
          name: p.projectName,
          collection: p.collection,
          userEmail: p.userEmail,
        })),
      });
    }
  }, [
    allUploads,
    clientTypes,
    clientFilter,
    projectNameFilter,
    dateFilter,
    sourceLanguageFilter,
    paymentFilter,
    clientTypeFilter,
    projectStatusFilter,
    translationStatusFilter,
  ]);

  // Adicionar useEffect para fechar o dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("status-dropdown");
      const button = document.getElementById("status-button");
      if (
        dropdown &&
        button &&
        !dropdown.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const calculateTotalValue = (files, project) => {
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
  };

  const calculateTotalPages = (files, project) => {
    if (!files || !Array.isArray(files)) return 0;
    const basePages = files.reduce(
      (total, file) => total + (Number(file.pageCount) || 0),
      0
    );

    // Se houver divergência, adicionar as páginas divergentes ao total
    if (project?.payment_status?.pages) {
      return basePages + Number(project.payment_status.pages);
    }

    return basePages;
  };

  const handleFileDownload = async (fileUrl) => {
    try {
      // Extrair o caminho do arquivo da URL completa
      const filePath = fileUrl.split("/o/")[1]?.split("?")[0];
      if (!filePath) return fileUrl;

      // Decodificar o caminho do arquivo
      const decodedPath = decodeURIComponent(filePath);

      // Usar o endpoint local como proxy
      const proxyUrl = `/api/download?path=${encodeURIComponent(decodedPath)}`;

      // Fazer a requisição para o proxy
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");

      // Obter o blob da resposta
      const blob = await response.blob();

      // Extrair o nome do arquivo
      const fileName = decodedPath.split("/").pop();

      // Forçar o download usando saveAs
      saveAs(blob, fileName);
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      // Se houver erro, tentar abrir em uma nova aba como fallback
      window.open(fileUrl, "_blank");
    }
  };

  const handleRowClick = async (project) => {
    console.log("Projeto clicado:", project);
    console.log("Total de projetos disponíveis:", allUploads.length);

    const firestore = getFirestore();

    // Extrair o ID do projeto
    const uploadId = project.id;

    // Encontrar o projeto em todas as listas
    const selectedUpload = allUploads.find((upload) => {
      console.log("Verificando projeto:", upload.id);
      return upload.id === uploadId;
    });

    if (!selectedUpload) {
      console.error("Projeto não encontrado. ID:", uploadId);
      console.error(
        "Projetos disponíveis:",
        allUploads.map((u) => u.id)
      );
      return;
    }

    console.log("Projeto encontrado:", selectedUpload);

    // Determinar a coleção correta
    const collectionName = selectedUpload.collection;
    console.log("Coleção do projeto:", collectionName);

    if (!collectionName) {
      console.error("Coleção não encontrada no projeto:", selectedUpload);
      return;
    }

    try {
      // Atualizar MasterRead para true
      const uploadDoc = doc(firestore, collectionName, uploadId);
      await updateDoc(uploadDoc, {
        MasterRead: true,
      });

      // Atualizar o estado local imediatamente
      setAllUploads((prevUploads) =>
        prevUploads.map((upload) =>
          upload.id === uploadId ? { ...upload, MasterRead: true } : upload
        )
      );

      console.log("MasterRead atualizado para true para o projeto:", uploadId);
    } catch (error) {
      console.error("Erro ao atualizar MasterRead:", error);
    }

    // Navegar para a página de detalhes com a coleção correta
    const url = `/company/master/project/${uploadId}?collection=${collectionName}`;
    console.log("Navegando para:", url);
    console.log("Estado sendo passado:", {
      project: selectedUpload,
      collection: collectionName,
    });

    // Garantir que o projeto tenha todos os dados necessários
    const projectToPass = {
      ...selectedUpload,
      id: uploadId,
      collection: collectionName,
      MasterRead: true, // Garantir que o projeto passado já tenha MasterRead como true
    };

    navigate(url, {
      state: {
        project: projectToPass,
        collection: collectionName,
      },
    });
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    const firestore = getFirestore();

    // Encontrar o projeto nos dados filtrados
    const project = allUploads.find((p) => p.id === projectId);

    if (!project) {
      console.error("Projeto não encontrado");
      return;
    }

    // Determinar a coleção correta com base no projeto
    const collectionName = project.collection;

    try {
      const projectRef = doc(firestore, collectionName, projectId);

      // Preparar o objeto de atualização
      const updateData = {};

      // Atualizar apenas o translation_status
      updateData.translation_status = newStatus;

      // Se o status for Cancelado ou Finalizado, atualizar também o project_status
      if (newStatus === "Cancelado" || newStatus === "Finalizado") {
        updateData.project_status = newStatus;
      }
      // Se o status for Em Tradução, manter project_status como 'Em Andamento'
      else if (newStatus === "Em Tradução") {
        updateData.project_status = "Em Andamento";
      }

      await updateDoc(projectRef, updateData);

      // Criar log da ação
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: "@Master",
        action: "alteração de status de tradução",
        details: {
          projeto: {
            nome: project.projectName || "Sem nome",
            email: project.userEmail || "Não informado",
            statusAnterior: project.translation_status || "N/A",
            statusNovo: newStatus,
          },
        },
      };

      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local imediatamente
      setAllUploads((prevUploads) =>
        prevUploads.map((upload) =>
          upload.id === projectId
            ? {
                ...upload,
                ...updateData,
              }
            : upload
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const formatDeadline = (deadline, deadlineDate) => {
    if (!deadline && !deadlineDate) return "A definir";

    // Se for uma data ISO, converter para dd/mm/yyyy
    if (deadlineDate && deadlineDate.includes("T")) {
      const date = new Date(deadlineDate);
      // Ajustar para GMT-3
      date.setHours(date.getHours() - 3);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Se já estiver no formato dd/mm/yyyy, retornar como está
    if (deadlineDate && deadlineDate.includes("/")) {
      return deadlineDate;
    }

    // Se for dias úteis, calcular a data de entrega
    if (deadline && deadline.includes("dias úteis")) {
      const days = parseInt(deadline);
      if (!isNaN(days)) {
        const currentDate = new Date();
        // Ajustar para GMT-3
        currentDate.setHours(currentDate.getHours() - 3);
        let businessDays = days;
        let currentDay = new Date(currentDate);

        while (businessDays > 0) {
          currentDay.setDate(currentDay.getDate() + 1);
          if (currentDay.getDay() !== 0 && currentDay.getDay() !== 6) {
            businessDays -= 1;
          }
        }

        const day = currentDay.getDate().toString().padStart(2, "0");
        const month = (currentDay.getMonth() + 1).toString().padStart(2, "0");
        const year = currentDay.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }

    return deadline || "A definir";
  };

  const renderFilesModal = () => {
    if (!showFilesModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
          <div className="p-6">
            {/* Cabeçalho do Modal */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center">
                Visualizar Arquivos
              </h3>
            </div>

            {/* Lista de Arquivos */}
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
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          await handleFileDownload(file.fileUrl);
                        } catch (error) {
                          console.error("Erro ao baixar arquivo:", error);
                          alert(
                            "Erro ao baixar o arquivo. Por favor, tente novamente."
                          );
                        }
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

            {/* Rodapé do Modal */}
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

  const handleColumnToggle = (columnId) => {
    if (fixedColumns.includes(columnId)) return;

    setVisibleColumns((prev) => {
      const newVisibleColumns = prev.includes(columnId)
        ? prev.filter((col) => col !== columnId)
        : [...prev, columnId];
      return newVisibleColumns;
    });
  };

  // Componente para item sortable da coluna
  const SortableColumnItem = ({ column }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center group hover:bg-gray-50 rounded p-2 -mx-2 ${
          isDragging ? "z-50 shadow-lg bg-white border" : ""
        }`}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center mr-3 text-gray-400 cursor-grab active:cursor-grabbing touch-none select-none p-1 -m-1 hover:bg-gray-100 rounded transition-colors"
          style={{ touchAction: "none" }}
        >
          <svg
            className="w-5 h-5 sm:w-4 sm:h-4"
            fill="currentColor"
            viewBox="0 0 8 8"
          >
            <circle cx="2" cy="2" r="0.5" />
            <circle cx="6" cy="2" r="0.5" />
            <circle cx="2" cy="4" r="0.5" />
            <circle cx="6" cy="4" r="0.5" />
            <circle cx="2" cy="6" r="0.5" />
            <circle cx="6" cy="6" r="0.5" />
          </svg>
        </div>

        {/* Checkbox */}
        <input
          type="checkbox"
          id={column.id}
          checked={column.fixed || visibleColumns.includes(column.id)}
          onChange={() => handleColumnToggle(column.id)}
          disabled={column.fixed}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
        />

        {/* Icon placeholder */}
        <div className="w-5 h-5 flex items-center justify-center mr-3">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z"
            />
          </svg>
        </div>

        {/* Label */}
        <label
          htmlFor={column.id}
          className={`flex-1 text-sm cursor-pointer ${
            column.fixed ? "text-gray-500" : "text-gray-700"
          }`}
        >
          {column.label}
          {column.fixed && (
            <span className="ml-2 text-xs text-gray-400">(Coluna fixa)</span>
          )}
        </label>
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Configuração para melhor suporte a dispositivos móveis
      activationConstraint: {
        distance: 8, // Distância mínima para ativar o drag
        delay: 200, // Delay para evitar conflito com scroll
        tolerance: 5, // Tolerância para movimento acidental
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setModalColumnOrder((items) => {
        const oldIndex = items.findIndex((item) => item === active.id);
        const newIndex = items.findIndex((item) => item === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveColumns = () => {
    // Salvar as colunas visíveis e a ordem das colunas no localStorage
    localStorage.setItem(
      "masterProjectsVisibleColumns",
      JSON.stringify(visibleColumns)
    );
    localStorage.setItem(
      "masterProjectsColumnOrder",
      JSON.stringify(modalColumnOrder)
    );
    // Atualizar o estado da ordem das colunas
    setColumnOrder(modalColumnOrder);
    setShowColumnSelector(false);
  };

  const renderColumnSelector = () => {
    if (!showColumnSelector) return null;

    // Inicializar ordem do modal quando o modal abrir
    if (modalColumnOrder.length === 0) {
      setModalColumnOrder([...columnOrder]);
    }

    // Reordenar colunas baseado na ordem do modal
    const orderedColumns = modalColumnOrder
      .map((colId) => columns.find((col) => col.id === colId))
      .filter(Boolean);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-[500px] max-w-[90vw] bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Personalizar colunas da tabela
            </h3>
            <button
              onClick={() => {
                setShowColumnSelector(false);
                setModalColumnOrder([]);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-hidden">
            {/* Colunas da Tabela */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Colunas da tabela
              </h4>
              <div className="text-xs text-gray-500 mb-3">
                As seguintes colunas estão disponíveis na tabela. Mantenha
                pressionado o ícone ⋮⋮ e arraste para reordenar.
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                autoScroll={{
                  threshold: {
                    x: 0.1,
                    y: 0.1,
                  },
                  acceleration: 0.5,
                }}
              >
                <SortableContext
                  items={modalColumnOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="space-y-2 max-h-80 overflow-y-auto overflow-x-hidden touch-none"
                    style={{ touchAction: "pan-y" }}
                  >
                    {orderedColumns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        isVisible={visibleColumns.includes(column.id)}
                        onToggle={handleColumnToggle}
                        isFixed={column.fixed}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={() => {
                setShowColumnSelector(false);
                setModalColumnOrder([]);
              }}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveColumns}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Usar filteredUploads diretamente, deixando a ordenação para o DataTable

  // Função para mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    // Salvar a preferência do usuário no localStorage
    localStorage.setItem("masterProjectsRowsPerPage", value.toString());
  };

  const getRowClassName = () => {
    return "";
  };

  const handleClientFilterChange = (e) => {
    setClientFilter(e.target.value);
  };

  const handleProjectNameFilterChange = (e) => {
    setProjectNameFilter(e.target.value);
  };

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setDateFilter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSourceLanguageFilterChange = (e) => {
    setSourceLanguageFilter(e.target.value);
  };

  const handlePaymentFilterChange = (e) => {
    setPaymentFilter(e.target.value);
  };

  const handleClientTypeFilterChange = (e) => {
    setClientTypeFilter(e.target.value);
  };

  const handleProjectStatusFilterChange = (e) => {
    setProjectStatusFilter(e.target.value);
  };

  const handleTranslationStatusFilterChange = (e) => {
    setTranslationStatusFilter(e.target.value);
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

    const config = statusConfig[status] || statusConfig["N/A"];

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

  return (
    <div className="w-full">
      {!loading && (
        <div className="w-full">
          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Todos Projetos
            </h1>
          </div>
          <div className="flex flex-col md:flex-row items-end gap-2.5 mb-8 px-2 md:px-10">
            {/* Versão Mobile - Aba Expansível */}
            <div className="w-full lg:hidden">
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors mb-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span className="font-medium">Filtros</span>
                  {isFiltersExpanded && (
                    <span className="text-sm text-gray-500">
                      (Clique para recolher)
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isFiltersExpanded ? "rotate-180" : ""
                  }`}
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

              {/* Conteúdo dos Filtros Mobile */}
              <div
                className={`grid grid-cols-1 gap-4 transition-all duration-300 ease-in-out ${
                  isFiltersExpanded
                    ? "opacity-100 max-h-[500px] overflow-y-auto"
                    : "opacity-0 max-h-0 overflow-hidden"
                }`}
              >
                <div className="w-full">
                  <Filter
                    label="Cliente"
                    type="search"
                    name="client"
                    value={clientFilter}
                    onChange={handleClientFilterChange}
                    placeholder="Buscar por cliente..."
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Nome do Projeto"
                    type="search"
                    name="projectName"
                    value={projectNameFilter}
                    onChange={handleProjectNameFilterChange}
                    placeholder="Buscar por projeto..."
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Data"
                    type="daterange"
                    value={dateFilter}
                    onChange={handleDateFilterChange}
                    onClear={() => setDateFilter({ start: "", end: "" })}
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Língua de Origem"
                    type="multiselect"
                    name="sourceLanguage"
                    value={sourceLanguageFilter}
                    onChange={handleSourceLanguageFilterChange}
                    options={sourceLanguageOptions}
                    placeholder="Selecione"
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Status de Pagamento"
                    type="select"
                    name="payment"
                    value={paymentFilter}
                    onChange={handlePaymentFilterChange}
                    options={paymentOptions}
                    placeholder="Todos"
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Tipo de Cliente"
                    type="select"
                    name="clientType"
                    value={clientTypeFilter}
                    onChange={handleClientTypeFilterChange}
                    options={clientTypeOptions}
                    placeholder="Todos"
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Status do Projeto"
                    type="multiselect"
                    name="projectStatus"
                    value={projectStatusFilter}
                    onChange={handleProjectStatusFilterChange}
                    options={projectStatusOptions}
                    placeholder="Selecione"
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
                <div className="w-full">
                  <Filter
                    label="Status da Tradução"
                    type="multiselect"
                    name="translationStatus"
                    value={translationStatusFilter}
                    onChange={handleTranslationStatusFilterChange}
                    options={translationStatusOptions}
                    placeholder="Selecione"
                    className="text-sm w-full"
                    labelClassName="text-center lg:text-center"
                    containerClassName="flex flex-col items-center gap-1"
                  />
                </div>
              </div>

              {/* Botão de Personalizar Colunas - Versão Mobile */}
              <button
                onClick={() => setShowColumnSelector(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-lg shadow-sm mt-4"
                title="Configurar colunas"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  Personalizar Colunas
                </span>
              </button>
            </div>

            {/* Versão Desktop */}
            <div className="hidden lg:flex w-full items-end gap-2.5">
              <div className="flex-1">
                <Filter
                  label="Cliente"
                  type="search"
                  name="client"
                  value={clientFilter}
                  onChange={handleClientFilterChange}
                  placeholder="Buscar por cliente..."
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Nome do Projeto"
                  type="search"
                  name="projectName"
                  value={projectNameFilter}
                  onChange={handleProjectNameFilterChange}
                  placeholder="Buscar por projeto..."
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Data"
                  type="daterange"
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  onClear={() => setDateFilter({ start: "", end: "" })}
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Língua de Origem"
                  type="multiselect"
                  name="sourceLanguage"
                  value={sourceLanguageFilter}
                  onChange={handleSourceLanguageFilterChange}
                  options={sourceLanguageOptions}
                  placeholder="Selecione"
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Status de Pagamento"
                  type="select"
                  name="payment"
                  value={paymentFilter}
                  onChange={handlePaymentFilterChange}
                  options={paymentOptions}
                  placeholder="Todos"
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Tipo de Cliente"
                  type="select"
                  name="clientType"
                  value={clientTypeFilter}
                  onChange={handleClientTypeFilterChange}
                  options={clientTypeOptions}
                  placeholder="Todos"
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Status do Projeto"
                  type="multiselect"
                  name="projectStatus"
                  value={projectStatusFilter}
                  onChange={handleProjectStatusFilterChange}
                  options={projectStatusOptions}
                  placeholder="Selecione"
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <div className="flex-1">
                <Filter
                  label="Status da Tradução"
                  type="multiselect"
                  name="translationStatus"
                  value={translationStatusFilter}
                  onChange={handleTranslationStatusFilterChange}
                  options={translationStatusOptions}
                  placeholder="Selecione"
                  className="text-sm w-full"
                  labelClassName="text-center"
                />
              </div>
              <button
                onClick={() => setShowColumnSelector(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 shadow-sm"
                title="Configurar colunas"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  Personalizar Colunas
                </span>
              </button>
            </div>
          </div>

          <div className="w-full">
            <div className="w-full shadow-lg rounded-lg overflow-hidden">
              <DataTable
                columns={columns.filter(
                  (col) => col.fixed || visibleColumns.includes(col.id)
                )}
                initialSortConfig={sortConfig}
                initialColumnOrder={columnOrder.filter((colId) => {
                  const col = columns.find((c) => c.id === colId);
                  return col && (col.fixed || visibleColumns.includes(col.id));
                })}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                data={filteredUploads}
                fixedColumns={fixedColumns}
                onRowClick={handleRowClick}
                getRowClassName={getRowClassName}
              />
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredUploads.length / rowsPerPage)}
            onPageChange={paginate}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            totalItems={filteredUploads.length}
          />

          {renderFilesModal()}
          {renderColumnSelector()}
        </div>
      )}

      <style jsx>{`
        .table-cell {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .table-header-cell {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          position: relative;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .table-container {
          width: 100%;
          min-width: 100%;
        }

        /* Garantir que o conteúdo seja truncado corretamente */
        .table-cell > * {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }

        /* Evitar interferência com redimensionamento */
        .table-header-cell[style*="width"] {
          width: var(--column-width) !important;
        }

        /* Responsividade para dispositivos menores */
        @media (max-width: 768px) {
          .table-cell {
            font-size: 0.75rem;
            padding: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MasterProjects;
