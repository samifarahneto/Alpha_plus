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
import { FaDownload } from "react-icons/fa";
import "../../../styles/Pagination.css";
import DataTable from "../../../components/DataTable";
import "../../../styles/Table.css";
import Pagination from "../../../components/Pagination";
import Filter from "../../../components/Filter";
import { saveAs } from "file-saver";

const MasterProjects = ({ style, isMobile }) => {
  const { user, loading } = useAuth();
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
  const [unreadCount, setUnreadCount] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [unreadBudgetCount, setUnreadBudgetCount] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [unreadApprovalCount, setUnreadApprovalCount] = useState(0);
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
    return savedVisibleColumns
      ? JSON.parse(savedVisibleColumns)
      : [
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
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    // Carregar a preferência do usuário do localStorage, ou usar 10 como padrão
    const savedRowsPerPage = localStorage.getItem("masterProjectsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [sortConfig] = useState(() => {
    const savedSortConfig = localStorage.getItem("masterProjectsSortConfig");
    return savedSortConfig
      ? JSON.parse(savedSortConfig)
      : { key: "createdAt", direction: "desc" };
  });
  const [projectStatusFilter, setProjectStatusFilter] = useState([]);
  const [translationStatusFilter, setTranslationStatusFilter] = useState([]);

  const columns = [
    { id: "projectNumber", label: "#", fixed: true },
    { id: "client", label: "Cliente", fixed: true },
    { id: "projectName", label: "Nome do Projeto", fixed: true },
    { id: "createdAt", label: "Data" },
    { id: "monthYear", label: "Mês/Ano" },
    { id: "sourceLanguage", label: "Origem" },
    { id: "targetLanguage", label: "Destino" },
    { id: "pages", label: "Pgs." },
    { id: "filesDisplay", label: "Arq." },
    { id: "totalValue", label: "Valor (U$)" },
    { id: "paymentStatus", label: "Status Pgto" },
    { id: "deadline", label: "Prazo" },
    { id: "clientType", label: "Tipo" },
    { id: "projectStatus", label: "Status do Projeto", fixed: true },
    { id: "translationStatus", label: "Status de Tradução", fixed: true },
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
    { value: "Em Andamento", label: "Em Andamento" },
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
      return onSnapshot(collectionRef, (snapshot) => {
        setAllUploads((prevUploads) => {
          const newUploads = [...prevUploads];
          snapshot.docChanges().forEach((change) => {
            const projectData = {
              id: change.doc.id,
              ...change.doc.data(),
              files: change.doc.data().files || [],
              collection: collectionName,
            };

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

  useEffect(() => {
    if (!allUploads) return;

    // Processar todos os contadores em um único bloco
    const processCounters = () => {
      // Contagem para "Todos Projetos" - projetos não lidos em todas as coleções
      const unreadProjects = allUploads.filter((project) => {
        const hasUnreadFiles = project.files?.some((file) => !file.isRead);
        const isProjectUnread = project.isRead === false;
        return hasUnreadFiles || isProjectUnread;
      });

      // Contagem para "Aguardando Orçamento" - projetos nas coleções b2bdocprojects e b2cdocprojects
      const budgetProjects = allUploads.filter(
        (project) =>
          project.collection === "b2bdocprojects" ||
          project.collection === "b2cdocprojects"
      );

      // Contagem para "Aguardando Aprovação" - projetos nas coleções b2bapproval e b2capproval
      const approvalProjects = allUploads.filter(
        (project) =>
          project.collection === "b2bapproval" ||
          project.collection === "b2capproval"
      );

      // Atualizar todos os contadores de uma vez
      setUnreadCount(unreadProjects.length);
      setUnreadBudgetCount(budgetProjects.length);
      setUnreadApprovalCount(approvalProjects.length);
    };

    processCounters();
  }, [allUploads]);

  useEffect(() => {
    if (!filteredUploads) return;

    const unreadProjects = filteredUploads.filter((project) =>
      project.files.some((file) => !file.isRead)
    );
    setUnreadCount(unreadProjects.length);
  }, [filteredUploads]);

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
      filteredData = filteredData.filter((upload) => {
        if (!upload.createdAt?.seconds) return false;
        const uploadDate = new Date(upload.createdAt.seconds * 1000);

        if (dateFilter.start && dateFilter.end) {
          const startDate = new Date(`${dateFilter.start}T00:00:00`);
          const endDate = new Date(`${dateFilter.end}T23:59:59`);
          return uploadDate >= startDate && uploadDate <= endDate;
        } else if (dateFilter.start) {
          const startDate = new Date(`${dateFilter.start}T00:00:00`);
          return uploadDate >= startDate;
        } else if (dateFilter.end) {
          const endDate = new Date(`${dateFilter.end}T23:59:59`);
          return uploadDate <= endDate;
        }
        return true;
      });
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
      filteredData = filteredData.filter((upload) => {
        const userInfo = clientTypes[upload.userEmail];
        if (!userInfo) return false;

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

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";

    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const calculateTotalPages = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
      const pageCount = parseInt(file.pageCount) || 0;
      return total + pageCount;
    }, 0);
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

    const uploadDoc = doc(firestore, collectionName, uploadId);

    try {
      // Atualiza os arquivos como lidos
      const updatedFiles = selectedUpload.files.map((file) => ({
        ...file,
        isRead: true,
      }));

      // Atualizar o documento no Firestore com os arquivos lidos e o isRead do documento principal
      await updateDoc(uploadDoc, {
        files: updatedFiles,
        isRead: true,
      });

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
        files: updatedFiles,
      };

      navigate(url, {
        state: {
          project: projectToPass,
          collection: collectionName,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar o projeto:", error);
    }
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

      // Se o status for Em Andamento, Cancelado ou Finalizado, atualizar também o project_status
      if (
        newStatus === "Em Andamento" ||
        newStatus === "Cancelado" ||
        newStatus === "Finalizado"
      ) {
        updateData.project_status = newStatus;
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

      // Salvar as colunas visíveis no localStorage
      localStorage.setItem(
        "masterProjectsVisibleColumns",
        JSON.stringify(newVisibleColumns)
      );
      return newVisibleColumns;
    });
  };

  const renderColumnSelector = () => {
    if (!showColumnSelector) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-[90%] max-w-[420px] bg-white rounded-lg shadow-xl p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Personalizar Colunas
            </h3>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  id={column.id}
                  checked={column.fixed || visibleColumns.includes(column.id)}
                  onChange={() => handleColumnToggle(column.id)}
                  disabled={column.fixed}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={column.id}
                  className={`ml-3 text-sm flex-1 ${
                    column.fixed ? "text-gray-500" : "text-gray-700"
                  }`}
                >
                  {column.label}
                  {column.fixed && (
                    <span className="ml-2 text-xs text-gray-400">(Fixa)</span>
                  )}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowColumnSelector(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const sortData = (data, config) => {
    if (!config.key) return data;

    return [...data].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];

      // Tratamento especial para campos específicos
      if (config.key === "client") {
        aValue = (
          clientTypes[a.userEmail]?.nomeCompleto ||
          a.userEmail ||
          ""
        ).toLowerCase();
        bValue = (
          clientTypes[b.userEmail]?.nomeCompleto ||
          b.userEmail ||
          ""
        ).toLowerCase();
      } else if (config.key === "projectName") {
        aValue = (a.projectName || "").toLowerCase();
        bValue = (b.projectName || "").toLowerCase();
      } else if (config.key === "projectStatus") {
        aValue = (a.project_status || "").toLowerCase();
        bValue = (b.project_status || "").toLowerCase();
      } else if (config.key === "translationStatus") {
        aValue = (a.translation_status || "").toLowerCase();
        bValue = (b.translation_status || "").toLowerCase();
      } else if (config.key === "createdAt") {
        aValue = new Date(aValue?.seconds * 1000);
        bValue = new Date(bValue?.seconds * 1000);
      } else if (config.key === "deadline") {
        aValue = a.deadlineDate || a.deadline;
        bValue = b.deadlineDate || b.deadline;
      } else if (config.key === "totalValue") {
        aValue = Number(
          a.totalProjectValue || a.totalValue || calculateTotalValue(a.files)
        );
        bValue = Number(
          b.totalProjectValue || b.totalValue || calculateTotalValue(b.files)
        );
      } else if (config.key === "pages") {
        aValue = calculateTotalPages(a.files);
        bValue = calculateTotalPages(b.files);
      } else if (config.key === "files") {
        aValue = a.files?.length || 0;
        bValue = b.files?.length || 0;
      } else if (config.key === "paymentStatus") {
        aValue = (
          typeof a.payment_status === "object"
            ? a.payment_status.status
            : a.payment_status || ""
        ).toLowerCase();
        bValue = (
          typeof b.payment_status === "object"
            ? b.payment_status.status
            : b.payment_status || ""
        ).toLowerCase();
      } else if (config.key === "clientType") {
        aValue = (() => {
          const userInfo = clientTypes[a.userEmail];
          if (!userInfo) return "N/A";
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
          } else if (
            userInfo.clientType === "Colab" ||
            userInfo.clientType === "Cliente"
          ) {
            return "B2C";
          }
          return userInfo.clientType || "N/A";
        })().toLowerCase();
        bValue = (() => {
          const userInfo = clientTypes[b.userEmail];
          if (!userInfo) return "N/A";
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
          } else if (
            userInfo.clientType === "Colab" ||
            userInfo.clientType === "Cliente"
          ) {
            return "B2C";
          }
          return userInfo.clientType || "N/A";
        })().toLowerCase();
      }

      if (aValue < bValue) return config.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return config.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedUploads = sortData(filteredUploads, sortConfig);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedUploads.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedUploads.length / rowsPerPage);

  // Função para mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    // Salvar a preferência do usuário no localStorage
    localStorage.setItem("masterProjectsRowsPerPage", value.toString());
  };

  const getRowClassName = (row) => {
    const rowIsUnread =
      row.isRead === false ||
      (Array.isArray(row.files) && row.files.some((file) => !file.isRead));
    return rowIsUnread ? "unread" : "";
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

  return (
    <div className="w-full px-4 md:px-10">
      {!loading && (
        <div className="w-full">
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
                    placeholder="Selecione as línguas..."
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
                    placeholder="Selecione os status..."
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
                    placeholder="Selecione os status..."
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
                  placeholder="Selecione as línguas..."
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
                  placeholder="Selecione os status..."
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
                  placeholder="Selecione os status..."
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

          <div className="w-full overflow-x-auto">
            <div className="w-full shadow-lg rounded-lg">
              <DataTable
                columns={columns}
                data={currentRows.map((row) => ({
                  ...row,
                  projectNumber: row.projectNumber || "N/A",
                  client:
                    clientTypes[row.userEmail]?.registeredBy ||
                    row.userEmail ||
                    "N/A",
                  projectName:
                    row.projectName && row.projectName.length > 20
                      ? `${row.projectName.slice(0, 20)}...`
                      : row.projectName || "Sem Nome",
                  createdAt: new Date(
                    row.createdAt.seconds * 1000
                  ).toLocaleDateString("pt-BR"),
                  monthYear: row.createdAt
                    ? new Date(row.createdAt.seconds * 1000).toLocaleDateString(
                        "pt-BR",
                        {
                          month: "2-digit",
                          year: "2-digit",
                        }
                      )
                    : "Sem Data",
                  pages: calculateTotalPages(row.files) || "0",
                  filesDisplay: (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs font-medium">
                        {row.files?.length || "0"}
                      </span>
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
                  totalValue: (
                    <span className="text-xs font-medium">
                      {`U$ ${Number(
                        row.totalProjectValue ||
                          row.totalValue ||
                          calculateTotalValue(row.files)
                      ).toFixed(2)}`}
                    </span>
                  ),
                  paymentStatus: renderPaymentStatusBadge(
                    typeof row.payment_status === "object"
                      ? row.payment_status.status || "N/A"
                      : row.payment_status || "N/A"
                  ),
                  deadline: (
                    <span className="text-xs font-medium">
                      {formatDeadline(row.deadline, row.deadlineDate)}
                    </span>
                  ),
                  clientType: (
                    <span className="text-xs font-medium">
                      {(() => {
                        const userInfo = clientTypes[row.userEmail];
                        if (!userInfo) return "N/A";
                        if (
                          userInfo.userType === "colaborator" &&
                          userInfo.registeredBy
                        ) {
                          const registeredByInfo =
                            clientTypes[userInfo.registeredBy];
                          if (
                            registeredByInfo &&
                            registeredByInfo.userType === "b2b"
                          )
                            return "B2B";
                          if (
                            registeredByInfo &&
                            (registeredByInfo.clientType === "Cliente" ||
                              registeredByInfo.clientType === "Colab")
                          )
                            return "B2C";
                        } else if (
                          userInfo.clientType === "Colab" ||
                          userInfo.clientType === "Cliente"
                        ) {
                          return "B2C";
                        }
                        return userInfo.clientType || "N/A";
                      })()}
                    </span>
                  ),
                  projectStatus: renderProjectStatusBadge(
                    row.project_status || "N/A"
                  ),
                  translationStatus: (
                    <select
                      value={row.translation_status || "N/A"}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateProjectStatus(row.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={row.collection === "b2bdocprojects"}
                      className={`w-full !h-6 !py-0 !text-xs font-medium rounded-full text-center ${
                        row.translation_status === "Finalizado"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : row.translation_status === "Em Andamento"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : row.translation_status === "Em Revisão"
                          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : row.translation_status === "Em Certificação"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : row.translation_status === "Cancelado"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : row.translation_status === "N/A"
                          ? "bg-gray-50 text-gray-700 border border-gray-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {row.collection === "b2bdocprojects" ? (
                        <option value="Ag. Orçamento">Ag. Orçamento</option>
                      ) : (
                        <>
                          <option value="N/A">N/A</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Em Revisão">Em Revisão</option>
                          <option value="Em Certificação">
                            Em Certificação
                          </option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="Cancelado">Cancelado</option>
                        </>
                      )}
                    </select>
                  ),
                }))}
                initialColumnOrder={columns.map((col) => col.id)}
                fixedColumns={fixedColumns}
                onRowClick={handleRowClick}
                getRowClassName={getRowClassName}
              />
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={paginate}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            totalItems={sortedUploads.length}
          />

          {renderFilesModal()}
          {renderColumnSelector()}
        </div>
      )}
    </div>
  );
};

export default MasterProjects;
