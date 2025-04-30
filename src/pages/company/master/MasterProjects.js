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
import MasterNavigation from "./MasterNavigation";
import { FaDownload } from "react-icons/fa";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { IoMdSettings } from "react-icons/io";
import "../../../styles/Pagination.css";
import PageLayout from "../../../components/PageLayout";
import DataTable from "../../../components/DataTable";
import "../../../styles/Table.css";
import Pagination from "../../../components/Pagination";

const MasterProjects = ({ style, isMobile }) => {
  const { user, loading } = useAuth();
  const [allUploads, setAllUploads] = useState([]);
  const [filteredUploads, _setFilteredUploads] = useState([]);
  const location = useLocation();
  const [activeLink, setActiveLink] = useState(() => {
    if (location.pathname.includes("projects-budget")) return "projectsBudget";
    if (location.pathname.includes("projects-approval"))
      return "projectsApproval";
    if (location.pathname.includes("projects-approved"))
      return "projectsCanceled";
    if (location.pathname.includes("ongoing")) return "ongoing";
    if (location.pathname.includes("projects-done")) return "projectsDone";
    if (location.pathname.includes("projects-paid")) return "projectsPaid";
    if (location.pathname.includes("payments")) return "payments";
    if (location.pathname === "/company/master/projects")
      return "masterProjects";
    return "masterProjects";
  });
  const [filters, setFilters] = useState({
    client: "",
    projectName: "",
    origin: "",
    startDate: "",
    endDate: "",
    paymentStatus: "",
    clientType: "",
    status: [],
    month: "",
  });
  const [clientTypes, setClientTypes] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBudgetCount, setUnreadBudgetCount] = useState(0);
  const [unreadApprovalCount, setUnreadApprovalCount] = useState(0);
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

  const columns = [
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

  const months = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
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

    // Aplicar filtros
    if (filters.client) {
      const searchTerm = filters.client.toLowerCase();
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

    // Filtro por nome do projeto
    if (filters.projectName) {
      const searchTerm = filters.projectName.toLowerCase();
      filteredData = filteredData.filter((upload) =>
        (upload.projectName || "").toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por cliente origem
    if (filters.origin) {
      const searchTerm = filters.origin.toLowerCase();
      filteredData = filteredData.filter((upload) => {
        const clientOrigin = (
          clientTypes[upload.userEmail]?.registeredBy ||
          upload.userEmail ||
          ""
        ).toLowerCase();
        const clientOriginName = (
          clientTypes[clientOrigin]?.nomeCompleto ||
          clientOrigin ||
          ""
        ).toLowerCase();
        return (
          clientOrigin.includes(searchTerm) ||
          clientOriginName.includes(searchTerm)
        );
      });
    }

    // Filtro por status
    if (filters.status.length > 0) {
      filteredData = filteredData.filter((upload) => {
        if (
          filters.status.includes("Ag. Orçamento") &&
          upload.collection === "b2bdocprojects"
        ) {
          return true;
        }
        return filters.status.includes(upload.status);
      });
    }

    // Filtro por status de pagamento
    if (filters.paymentStatus) {
      filteredData = filteredData.filter((upload) => {
        const paymentStatus =
          typeof upload.payment_status === "object"
            ? upload.payment_status.status
            : upload.isPaid
            ? "Pago"
            : "Pendente";

        switch (filters.paymentStatus) {
          case "paid":
            return paymentStatus === "Pago";
          case "pending":
            return paymentStatus === "Pendente";
          case "refund":
            return paymentStatus === "Reembolso";
          case "divergence":
            return paymentStatus === "Divergência";
          default:
            return true;
        }
      });
    }

    // Filtro por tipo de cliente
    if (filters.clientType) {
      filteredData = filteredData.filter((upload) => {
        const userInfo = clientTypes[upload.userEmail];
        if (!userInfo) return false;

        let clientType = "N/A";
        if (userInfo.userType === "colaborator" && userInfo.registeredBy) {
          const registeredByInfo = clientTypes[userInfo.registeredBy];
          if (registeredByInfo && registeredByInfo.userType === "b2b") {
            clientType = "B2B";
          } else if (
            registeredByInfo &&
            (registeredByInfo.clientType === "Cliente" ||
              registeredByInfo.clientType === "Colab")
          ) {
            clientType = "B2C";
          }
        } else if (
          userInfo.clientType === "Colab" ||
          userInfo.clientType === "Cliente"
        ) {
          clientType = "B2C";
        } else {
          clientType = userInfo.clientType || "N/A";
        }

        return clientType === filters.clientType;
      });
    }

    // Filtro por data
    if (filters.startDate || filters.endDate) {
      filteredData = filteredData.filter((upload) => {
        if (!upload.createdAt?.seconds) return false;
        const uploadDate = new Date(upload.createdAt.seconds * 1000);

        if (filters.startDate && filters.endDate) {
          const startDate = new Date(`${filters.startDate}T00:00:00`);
          const endDate = new Date(`${filters.endDate}T23:59:59`);
          return uploadDate >= startDate && uploadDate <= endDate;
        } else if (filters.startDate) {
          const startDate = new Date(`${filters.startDate}T00:00:00`);
          return uploadDate >= startDate;
        } else if (filters.endDate) {
          const endDate = new Date(`${filters.endDate}T23:59:59`);
          return uploadDate <= endDate;
        }
        return true;
      });
    }

    // Filtro por mês
    if (filters.month) {
      filteredData = filteredData.filter((upload) => {
        if (!upload.createdAt?.seconds) return false;
        const projectDate = new Date(upload.createdAt.seconds * 1000);
        const projectMonth = (projectDate.getMonth() + 1)
          .toString()
          .padStart(2, "0");
        return projectMonth === filters.month;
      });
    }

    // Atualizar filteredUploads
    _setFilteredUploads(filteredData);
  }, [allUploads, clientTypes, filters]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
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

  const calculateTotalPages = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
      const pageCount = parseInt(file.pageCount) || 0;
      return total + pageCount;
    }, 0);
  };

  const getFileDownloadUrl = async (fileUrl) => {
    try {
      const storage = getStorage();
      // Extrair o caminho do arquivo da URL completa
      const filePath = fileUrl.split("/o/")[1]?.split("?")[0];
      if (!filePath) return fileUrl;

      // Decodificar o caminho do arquivo
      const decodedPath = decodeURIComponent(filePath);
      const fileRef = ref(storage, decodedPath);

      // Gerar nova URL de download
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Erro ao obter URL do arquivo:", error);
      return fileUrl;
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

      // Atualizar o estado local mantendo todos os dados originais
      setAllUploads((prevUploads) =>
        prevUploads.map((upload) =>
          upload.id === uploadId
            ? {
                ...upload,
                files: updatedFiles,
                isRead: true,
                projectName: upload.projectName,
                userEmail: upload.userEmail,
                projectOwner: upload.projectOwner,
                sourceLanguage: upload.sourceLanguage,
                targetLanguage: upload.targetLanguage,
                status: upload.status,
                createdAt: upload.createdAt,
                deadline: upload.deadline,
                totalProjectValue: upload.totalProjectValue,
                isPaid: upload.isPaid,
                collection: upload.collection,
              }
            : upload
        )
      );

      // Recalcula os projetos não lidos
      const unreadProjects = allUploads.filter(
        (upload) => !upload.isRead
      ).length;

      // Atualiza os contadores de não lidos
      setUnreadCount(unreadProjects);

      // Navega para a página de detalhes do projeto com o estado correto
      navigate(`/company/master/project/${uploadId}`, {
        state: {
          project: selectedUpload,
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
                          const url = await getFileDownloadUrl(file.fileUrl);
                          window.open(url, "_blank");
                        } catch (error) {
                          console.error("Erro ao abrir arquivo:", error);
                          alert(
                            "Erro ao acessar o arquivo. Por favor, tente novamente."
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
        <div className="w-[420px] bg-white rounded-lg shadow-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Personalizar Colunas
            </h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center">
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
                  className={`ml-2 text-sm ${
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

  return (
    <PageLayout>
      <div className="glass-card w-full max-w-[100%] mx-0">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos Recebidos
        </h2>

        <MasterNavigation
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          unreadCount={unreadCount}
          unreadBudgetCount={unreadBudgetCount}
          unreadApprovalCount={unreadApprovalCount}
        />

        {/* Filtros */}
        <div className="flex gap-4 mb-6 w-full firstMobile:flex-col">
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="client-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Cliente
            </label>
            <input
              id="client-filter"
              type="text"
              placeholder="Buscar por cliente"
              value={filters.client}
              onChange={(e) => handleFilterChange(e)}
              name="client"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm placeholder:text-gray-400"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="projectName-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Nome do projeto
            </label>
            <input
              id="projectName-filter"
              type="text"
              placeholder="Buscar por projeto"
              value={filters.projectName}
              onChange={(e) => handleFilterChange(e)}
              name="projectName"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm placeholder:text-gray-400"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="origin-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Cliente origem
            </label>
            <input
              id="origin-filter"
              type="text"
              placeholder="Buscar por origem"
              value={filters.origin}
              onChange={(e) => handleFilterChange(e)}
              name="origin"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm placeholder:text-gray-400"
            />
          </div>
          <div className="flex-1 flex flex-col relative">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Status
            </label>
            <div className="relative">
              <div
                id="status-button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full p-2 border border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50 text-black flex justify-between items-center h-[38px]"
              >
                <div className="flex flex-wrap gap-1">
                  {filters.status.length > 0 ? (
                    filters.status.map((status, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status === "Finalizado"
                            ? "bg-green-100 text-green-800"
                            : status === "Em Andamento"
                            ? "bg-blue-100 text-blue-800"
                            : status === "Em Revisão"
                            ? "bg-yellow-100 text-yellow-800"
                            : status === "Em Certificação"
                            ? "bg-orange-100 text-orange-800"
                            : status === "Cancelado"
                            ? "bg-gray-100 text-gray-800"
                            : status === "Ag. Orçamento"
                            ? "bg-purple-100 text-purple-800"
                            : status === "Ag. Aprovação"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {status}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">Selecionar Status</span>
                  )}
                </div>
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
              </div>

              {showStatusDropdown && (
                <div
                  id="status-dropdown"
                  className="absolute z-[9999] w-full top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  <div className="p-2 space-y-2">
                    <label className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes("Finalizado")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              status: [...prev.status, "Finalizado"],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              status: prev.status.filter(
                                (s) => s !== "Finalizado"
                              ),
                            }));
                          }
                        }}
                        className="rounded text-green-600"
                        style={{ accentColor: "green" }}
                      />
                      <span className="text-sm text-green-600">Finalizado</span>
                    </label>
                    <label className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes("Em Andamento")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              status: [...prev.status, "Em Andamento"],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              status: prev.status.filter(
                                (s) => s !== "Em Andamento"
                              ),
                            }));
                          }
                        }}
                        className="rounded text-blue-600"
                        style={{ accentColor: "blue" }}
                      />
                      <span className="text-sm text-blue-600">
                        Em Andamento
                      </span>
                    </label>
                    <label className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes("Em Revisão")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              status: [...prev.status, "Em Revisão"],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              status: prev.status.filter(
                                (s) => s !== "Em Revisão"
                              ),
                            }));
                          }
                        }}
                        className="rounded text-yellow-600"
                        style={{ accentColor: "yellow" }}
                      />
                      <span className="text-sm text-yellow-600">
                        Em Revisão
                      </span>
                    </label>
                    <label className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes("Em Certificação")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              status: [...prev.status, "Em Certificação"],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              status: prev.status.filter(
                                (s) => s !== "Em Certificação"
                              ),
                            }));
                          }
                        }}
                        className="rounded text-orange-600"
                        style={{ accentColor: "orange" }}
                      />
                      <span className="text-sm text-orange-600">
                        Em Certificação
                      </span>
                    </label>
                    <label className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes("Cancelado")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              status: [...prev.status, "Cancelado"],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              status: prev.status.filter(
                                (s) => s !== "Cancelado"
                              ),
                            }));
                          }
                        }}
                        className="rounded text-gray-600"
                        style={{ accentColor: "gray" }}
                      />
                      <span className="text-sm text-gray-600">Cancelado</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="paymentStatus-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Status de Pagamento
            </label>
            <select
              id="paymentStatus-filter"
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange(e)}
              name="paymentStatus"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="refund">Reembolso</option>
              <option value="divergence">Divergência</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="clientType-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Tipo de Cliente
            </label>
            <select
              id="clientType-filter"
              value={filters.clientType}
              onChange={(e) => handleFilterChange(e)}
              name="clientType"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Todos</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="startDate-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Data Inicial
            </label>
            <input
              id="startDate-filter"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange(e)}
              name="startDate"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="endDate-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Data Final
            </label>
            <input
              id="endDate-filter"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange(e)}
              name="endDate"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label
              htmlFor="month-filter"
              className="text-sm font-medium mb-1 text-center"
            >
              Mês
            </label>
            <select
              id="month-filter"
              value={filters.month}
              onChange={(e) => handleFilterChange(e)}
              name="month"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="">Todos</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Personalizar Colunas */}
          <button
            onClick={() => setShowColumnSelector(true)}
            style={{
              padding: "5px 10px",
              backgroundColor: "#E0F7FA",
              border: "1px solid grey",
              borderRadius: "20px",
              fontSize: "14px",
              cursor: "pointer",
              color: "#333",
              whiteSpace: "nowrap",
              width: "auto",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              transition: "background-color 0.3s ease, box-shadow 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              height: "38px",
              marginTop: "24px",
            }}
            className="firstMobile:mt-4"
          >
            <IoMdSettings />
            Personalizar Colunas
          </button>
        </div>

        <DataTable
          columns={columns}
          data={currentRows.map((row) => ({
            ...row,
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
                <span>{row.files?.length || "0"}</span>
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
            totalValue: `U$ ${Number(
              row.totalProjectValue ||
                row.totalValue ||
                calculateTotalValue(row.files)
            ).toFixed(2)}`,
            paymentStatus: (
              <span
                className={`status-badge ${
                  (typeof row.payment_status === "object"
                    ? row.payment_status.status
                    : row.payment_status) === "Pago"
                    ? "status-approved"
                    : (typeof row.payment_status === "object"
                        ? row.payment_status.status
                        : row.payment_status) === "Reembolso"
                    ? "status-refund"
                    : (typeof row.payment_status === "object"
                        ? row.payment_status.status
                        : row.payment_status) === "Divergência"
                    ? "status-divergence"
                    : "status-pending"
                }`}
              >
                {typeof row.payment_status === "object"
                  ? row.payment_status.status
                  : row.payment_status || "PENDENTE"}
              </span>
            ),
            deadline: formatDeadline(row.deadline, row.deadlineDate),
            clientType: (() => {
              const userInfo = clientTypes[row.userEmail];
              if (!userInfo) return "N/A";
              if (
                userInfo.userType === "colaborator" &&
                userInfo.registeredBy
              ) {
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
            })(),
            projectStatus: (
              <span
                className={`status-badge ${
                  row.project_status === "Rascunho"
                    ? "status-draft"
                    : row.project_status === "Ag. Orçamento"
                    ? "status-budget"
                    : row.project_status === "Ag. Aprovação"
                    ? "status-approval"
                    : row.project_status === "Ag. Pagamento"
                    ? "status-pending"
                    : row.project_status === "Em Análise"
                    ? "status-in-progress"
                    : row.project_status === "Em Andamento"
                    ? "status-in-progress"
                    : row.project_status === "Cancelado"
                    ? "status-canceled"
                    : "status-draft"
                }`}
              >
                {row.project_status || "Rascunho"}
              </span>
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
          }))}
          initialColumnOrder={columns.map((col) => col.id)}
          fixedColumns={fixedColumns}
          onRowClick={handleRowClick}
          getRowClassName={getRowClassName}
        />

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
    </PageLayout>
  );
};

export default MasterProjects;
