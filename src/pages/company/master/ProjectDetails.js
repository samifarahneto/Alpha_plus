import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { IoIosArrowBack } from "react-icons/io";
import {
  FaEdit,
  FaMoneyBillWave,
  FaCreditCard,
  FaUserCheck,
  FaCalendarAlt,
  FaUndo,
  FaInfoCircle,
  FaFileAlt,
  FaUser,
  FaGlobeAmericas,
  FaGlobe,
  FaExchangeAlt,
  FaStar,
  FaClock,
  FaCalendar,
  FaLanguage,
  FaDownload,
} from "react-icons/fa";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import debounce from "lodash/debounce";
import ResponsiveLayout from "../../../components/ResponsiveLayout";
import Card from "../../../components/Card";
import PageLayout from "../../../components/PageLayout";

// Componente memoizado para a linha da tabela
const TableRow = memo(
  ({
    file,
    index,
    editedPages,
    onPageChange,
    sourceLanguage,
    targetLanguage,
    getFileDownloadUrl,
  }) => {
    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <span
            onClick={async () => {
              try {
                const url = await getFileDownloadUrl(file.fileUrl);
                window.open(url, "_blank");
              } catch (error) {
                console.error("Erro ao abrir arquivo:", error);
                alert("Erro ao acessar o arquivo. Por favor, tente novamente.");
              }
            }}
            className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {file.name}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <input
            type="number"
            value={editedPages[index] || file.pageCount}
            onChange={(e) => onPageChange(index, e.target.value)}
            className="w-20 px-2 py-1 border rounded text-center"
            min="0"
          />
        </td>
        <td className="px-6 py-4 text-center">
          <FaDownload
            className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mx-auto"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const url = await getFileDownloadUrl(file.fileUrl);

                // Criar link temporário para download
                const link = document.createElement("a");
                link.href = url;
                link.download = file.name || "arquivo";
                link.target = "_blank"; // Garantir que não abra na mesma aba
                link.rel = "noopener noreferrer";
                link.style.display = "none";

                document.body.appendChild(link);

                // Tentar forçar download
                try {
                  link.click();
                } catch (clickError) {
                  // Se falhar, abrir em nova aba como fallback
                  window.open(url, "_blank", "noopener,noreferrer");
                }

                // Cleanup
                setTimeout(() => {
                  document.body.removeChild(link);
                }, 100);
              } catch (error) {
                console.error("Erro ao baixar arquivo:", error);
                alert("Erro ao baixar o arquivo. Por favor, tente novamente.");
              }
            }}
          />
        </td>
        <td className="px-6 py-4 text-center">{sourceLanguage || "N/A"}</td>
        <td className="px-6 py-4 text-center">{targetLanguage || "N/A"}</td>
        <td className="px-6 py-4 text-right">
          U$ {(Number(file.valuePerPage) || 0).toFixed(2)}
        </td>
      </tr>
    );
  }
);

// Componente memoizado para a tabela de edição
const EditPagesTable = memo(
  ({
    files,
    editedPages,
    onPageChange,
    sourceLanguage,
    targetLanguage,
    getFileDownloadUrl,
  }) => {
    return (
      <table className="w-full">
        <thead className="bg-white border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
              Arquivo
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
              Páginas
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
              Download
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
              Língua de Origem
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
              Língua de Destino
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
              Valor (U$)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {files.map((file, index) => (
            <TableRow
              key={`${index}-${file.name}`}
              file={file}
              index={index}
              editedPages={editedPages}
              onPageChange={onPageChange}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              getFileDownloadUrl={getFileDownloadUrl}
            />
          ))}
        </tbody>
      </table>
    );
  }
);

const renderBadge = (status, config) => {
  const defaultConfig = {
    true: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      label: "Ativado",
    },
    false: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      label: "Desativado",
    },
  };

  const badgeConfig = config || defaultConfig;

  const badge = badgeConfig[status] || badgeConfig["false"];

  return (
    <div
      className={`w-full px-2 py-1 rounded-full border ${badge.bg} ${badge.text} ${badge.border} text-center text-xs font-medium`}
    >
      {badge.label}
    </div>
  );
};

const ProjectDetails = () => {
  const { projectId: urlProjectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [link, setLink] = useState("");
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ date: "" });
  const navigate = useNavigate();
  const [showEditPagesModal, setShowEditPagesModal] = useState(false);
  const [editedPages, setEditedPages] = useState({});
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [showDivergenceModal, setShowDivergenceModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showConvertCurrencyModal, setShowConvertCurrencyModal] =
    useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showSourceLanguageModal, setShowSourceLanguageModal] = useState(false);
  const [newConvertCurrency, setNewConvertCurrency] = useState(false);
  const [newPriority, setNewPriority] = useState(false);
  const [newSourceLanguage, setNewSourceLanguage] = useState("");
  const [divergenceData, setDivergenceData] = useState({
    pages: "",
    reason: "",
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedRefundOption, setSelectedRefundOption] = useState("total");
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  // Memoização dos cálculos removida - agora calculamos diretamente no JSX

  // Debounce para atualização de páginas
  const debouncedSetEditedPages = useMemo(
    () =>
      debounce((newPages) => {
        setEditedPages(newPages);
      }, 300),
    []
  );

  const handlePageChange = useCallback(
    (index, value) => {
      setEditedPages((prev) => {
        const newPages = { ...prev, [index]: value };
        debouncedSetEditedPages(newPages);
        return newPages;
      });
    },
    [debouncedSetEditedPages]
  );

  // Limpeza de estado ao fechar o modal
  const handleCloseEditPagesModal = useCallback(() => {
    setShowEditPagesModal(false);
    setEditedPages({});
    debouncedSetEditedPages.cancel();
  }, [debouncedSetEditedPages]);

  // Efeito para inicializar o ID do projeto
  useEffect(() => {
    console.log("URL Project ID:", urlProjectId);
    console.log("Location State:", location.state);

    // Tenta obter o ID do projeto da URL ou do estado
    const id = urlProjectId || location.state?.project?.id;

    if (id) {
      console.log("ID do projeto encontrado:", id);
      setProjectId(id);
    } else {
      console.error("Nenhum ID de projeto encontrado");
      navigate("/company/master/projects");
    }
  }, [urlProjectId, location.state, navigate]);

  // Efeito para carregar os dados do projeto
  useEffect(() => {
    console.log("useEffect iniciado - projectId:", projectId);
    console.log("Location state:", location.state);

    if (!projectId) {
      console.log("Project ID não disponível");
      return;
    }

    const loadProject = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const collection =
          searchParams.get("collection") || location.state?.collection;

        if (!projectId || !collection) {
          console.error("ID do projeto ou coleção não encontrados");
          navigate("/company/master/projects");
          return;
        }

        const firestore = getFirestore();
        const projectRef = doc(firestore, collection, projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
          console.error("Projeto não encontrado");
          navigate("/company/master/projects");
          return;
        }

        const projectData = projectDoc.data();

        // Garantir que todos os campos necessários existam
        const processedProjectData = {
          ...projectData,
          id: projectId,
          collection: collection,
          projectName: projectData.projectName || "Sem Nome",
          userEmail: projectData.userEmail || "",
          createdAt: projectData.createdAt || null,
          sourceLanguage: projectData.sourceLanguage || "N/A",
          targetLanguage: projectData.targetLanguage || "N/A",
          totalPages: projectData.totalPages || 0,
          totalProjectValue: projectData.totalProjectValue || 0,
          deadline: projectData.deadline || null,
          deadlineDate: projectData.deadlineDate || null,
          isPriority: projectData.isPriority || false,
          files: (projectData.files || []).map((file) => ({
            name: file.name || "",
            url: file.url || "",
            fileUrl: file.fileUrl || file.url || "",
            pageCount: file.pageCount || 0,
            total: file.total || 0,
            valuePerPage: file.valuePerPage || 0,
          })),
          project_status: projectData.project_status || "Ag. Orçamento",
          payment_status: projectData.payment_status || { status: "N/A" },
          translation_status: projectData.translation_status || "N/A",
          valuePerPage: projectData.valuePerPage || 0,
          hasManualQuoteFiles: projectData.hasManualQuoteFiles || false,
          convertCurrency: projectData.convertCurrency || false,
        };

        setProject(processedProjectData);
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
        navigate("/company/master/projects");
      }
    };

    loadProject();
  }, [projectId, location.search, location.state, navigate]);

  // Adicionar um useEffect para monitorar mudanças no estado do projeto
  useEffect(() => {
    console.log("Estado do projeto atualizado:", project);
  }, [project]);

  // Adicionar um useEffect para verificar o projectId
  useEffect(() => {
    console.log("Project ID atual:", projectId);
  }, [projectId]);

  // Verificar se o projeto está sendo carregado
  useEffect(() => {
    if (project) {
      console.log("Projeto carregado com sucesso:", project);
    } else {
      console.log("Projeto ainda não carregado");
    }
  }, [project]);

  const handleShareLink = async () => {
    try {
      // Validar e formatar o link
      let formattedLink = link;

      // Verificar se o link começa com http:// ou https://
      if (!link.startsWith("http://") && !link.startsWith("https://")) {
        formattedLink = `https://${link}`;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "inserção de link de compartilhamento",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          linkAnterior: project.shareLink || "N/A",
          linkNovo: formattedLink,
        },
      };

      await updateDoc(projectRef, { shareLink: formattedLink });

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      alert("Link compartilhado com sucesso!");
      setProject({ ...project, shareLink: formattedLink });
      setLink(formattedLink);
    } catch (error) {
      console.error("Erro ao compartilhar o link:", error.message);
      alert("Erro ao compartilhar o link. Tente novamente.");
    }
  };

  const handleDeadlineUpdate = async () => {
    try {
      if (!newDeadline.date) {
        alert("Por favor, selecione uma data para o prazo.");
        return;
      }

      if (isWeekend(newDeadline.date)) {
        alert("Por favor, selecione uma data que não seja fim de semana.");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Criar um objeto Date com a data selecionada (meio-dia para evitar problemas de timezone)
      const [year, month, day] = newDeadline.date.split("-");
      const updatedDeadline = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        12, // Meio-dia
        0 // 0 minutos
      );

      // Validar se a data é válida
      if (isNaN(updatedDeadline.getTime())) {
        alert("Data inválida. Por favor, verifique a data selecionada.");
        return;
      }

      // Formatar a data para exibição no padrão brasileiro
      const formattedDeadline = updatedDeadline.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const updateData = {
        deadline: `${formattedDeadline}`,
        deadlineDate: updatedDeadline.toISOString(),
      };

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de prazo do projeto",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          prazoAnterior: formatDeadline(project),
          prazoNovo: formattedDeadline,
          dataISO: updatedDeadline.toISOString(),
        },
      };

      await updateDoc(projectRef, updateData);

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local do projeto
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      setShowDeadlineModal(false);
      setNewDeadline({ date: "" });
      alert("Prazo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o prazo:", error);
      alert("Erro ao atualizar o prazo. Tente novamente.");
    }
  };

  const handleProjectNameUpdate = async () => {
    try {
      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de nome do projeto",
        details: {
          projeto: project.projectName,
          nomeAnterior: project.projectName,
          nomeNovo: newProjectName,
          email: project.userEmail,
        },
      };

      await updateDoc(projectRef, {
        projectName: newProjectName,
      });

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        projectName: newProjectName,
      }));

      setShowEditNameModal(false);
      alert("Nome do projeto atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o nome do projeto:", error);
      alert("Erro ao atualizar o nome do projeto. Tente novamente.");
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const isWeekend = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString + "T00:00:00");
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
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

  const handleEditPagesSubmit = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // 1. Busca as taxas do usuário
      const userQuery = query(
        collection(firestore, "users"),
        where("email", "==", project.userEmail)
      );
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0].data();
      const userRates = {
        pttoen: Number(userData.pttoen) || 0,
        esptoen: Number(userData.esptoen) || 0,
      };

      // 2. Busca os percentuais de prioridade globais
      const priceDocRef = doc(firestore, "priceperpage", "price");
      const priceDoc = await getDoc(priceDocRef);
      const priceData = priceDoc.data();

      // 3. Determina o percentual de aumento baseado no tipo de usuário
      let priceIncrease = 0;
      if (project.userType === "b2b" || userData.registeredByType === "b2b") {
        priceIncrease = Number(priceData.b2bPricePercentage) / 100;
      } else if (
        project.userType === "b2c" ||
        userData.registeredByType === "b2c"
      ) {
        priceIncrease = Number(priceData.b2cPricePercentage) / 100;
      }

      // 4. Atualiza os arquivos com as novas páginas e valores
      const updatedFiles = project.files.map((file, index) => {
        const pageCount = editedPages[index] || file.pageCount;
        let valuePerPage = file.valuePerPage;

        if (!valuePerPage) {
          if (
            project.sourceLanguage === "Português (Brasil)" &&
            project.targetLanguage === "Inglês"
          ) {
            valuePerPage = Number(userRates.pttoen);
          } else if (
            project.sourceLanguage === "Espanhol (América Latina)" &&
            project.targetLanguage === "Inglês"
          ) {
            valuePerPage = Number(userRates.esptoen);
          }

          if (project.isPriority) {
            valuePerPage = valuePerPage * (1 + priceIncrease);
          }
        }

        const total = pageCount * valuePerPage;
        return { ...file, pageCount, valuePerPage, total };
      });

      // 5. Calcula o novo valor total do projeto
      const newTotalProjectValue = updatedFiles.reduce(
        (sum, file) => sum + file.total,
        0
      );

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de páginas do projeto",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          arquivos: updatedFiles.map((file, index) => ({
            nome: file.name,
            paginasAnteriores: project.files[index].pageCount,
            paginasNovas: file.pageCount,
            valorAnterior: project.files[index].total,
            valorNovo: file.total,
          })),
          totalAnterior: project.totalProjectValue,
          totalNovo: newTotalProjectValue,
          idiomaOrigem: project.sourceLanguage,
          idiomaDestino: project.targetLanguage,
          prazo: project.deadline,
        },
      };

      // 6. Atualiza apenas os arquivos e valor total no documento atual
      await updateDoc(projectRef, {
        files: updatedFiles,
        totalProjectValue: newTotalProjectValue,
        updatedAt: new Date(),
      });

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // 7. Atualiza o estado local
      setProject({
        ...project,
        files: updatedFiles,
        totalProjectValue: newTotalProjectValue,
      });

      setShowEditPagesModal(false);
      setEditedPages({});
      alert("Número de páginas e valores atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar páginas:", error);
      alert("Erro ao atualizar páginas. Tente novamente.");
    }
  };

  const handlePaymentStatusChange = async (newStatus) => {
    if (newStatus === "Divergência") {
      setShowDivergenceModal(true);
      return;
    }
    if (newStatus === "Reembolsado") {
      setShowRefundModal(true);
      return;
    }
    await updatePaymentStatus(newStatus);
  };

  const updatePaymentStatus = async (newStatus, divergenceInfo = null) => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      const isPaid = newStatus === "Pago";

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de status de pagamento",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
            statusAnterior:
              typeof project.payment_status === "object"
                ? project.payment_status.status
                : project.payment_status,
            statusNovo: newStatus,
            valor: project.totalProjectValue || project.totalValue || 0,
          },
          ...(divergenceInfo && {
            divergencia: {
              paginas: divergenceInfo.pages,
              motivo: divergenceInfo.reason,
            },
          }),
        },
      };

      // Determinar a coleção de destino baseado no tipo de usuário
      let targetCollection = project.collection;
      if (
        isPaid &&
        (project.userType === "b2c" || project.registeredByType === "b2c")
      ) {
        targetCollection = "b2cprojectspaid";
      }

      // Manter os valores do pagamento inicial quando for divergência
      const currentPaymentStatus =
        typeof project.payment_status === "object"
          ? project.payment_status
          : {};
      const initialPayment =
        currentPaymentStatus.initialPayment || project.totalProjectValue || 0;

      // Calcular o valor da divergência baseado no valor por página
      let divergencePayment = 0;
      let newDeadlineDate = project.deadlineDate;
      let newDeadlineText = project.deadline;

      if (divergenceInfo) {
        const totalPages = project.files.reduce(
          (total, file) => total + (Number(file.pageCount) || 0),
          0
        );
        const valuePerPage =
          Number(project.totalProjectValue || project.totalValue || 0) /
          totalPages;
        divergencePayment = valuePerPage * Number(divergenceInfo.pages);

        // Calcular novo prazo baseado no total de páginas (originais + divergência)
        const totalPagesWithDivergence =
          totalPages + Number(divergenceInfo.pages);
        let deadlineDays = 0;

        if (totalPagesWithDivergence <= 5) {
          deadlineDays = 5;
        } else if (totalPagesWithDivergence <= 20) {
          deadlineDays = 10;
        } else if (totalPagesWithDivergence <= 50) {
          deadlineDays = 11;
        } else if (totalPagesWithDivergence <= 90) {
          deadlineDays = 15;
        } else if (totalPagesWithDivergence <= 130) {
          deadlineDays = 20;
        } else {
          deadlineDays = 25;
        }

        // Calcular nova data de prazo
        const currentDate = new Date();
        const newDeadline = new Date(currentDate);
        newDeadline.setDate(currentDate.getDate() + deadlineDays);

        // Pular fins de semana
        while (newDeadline.getDay() === 0 || newDeadline.getDay() === 6) {
          newDeadline.setDate(newDeadline.getDate() + 1);
        }

        // Garantir que sempre temos uma nova data válida
        newDeadlineDate = newDeadline.toISOString();
        newDeadlineText = newDeadline.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });

        console.log("Debug - Novo prazo calculado:", {
          totalPagesOriginais: totalPages,
          paginasDivergencia: Number(divergenceInfo.pages),
          totalPagesComDivergencia: totalPagesWithDivergence,
          diasUteis: deadlineDays,
          novaDataISO: newDeadlineDate,
          novaDataFormatada: newDeadlineText,
        });
      }

      const totalPayment = initialPayment + divergencePayment;

      const updateData = {
        isPaid: isPaid,
        paidAt: isPaid ? new Date().toISOString() : null,
        payment_status: divergenceInfo
          ? {
              status: newStatus,
              pages: divergenceInfo.pages,
              reason: divergenceInfo.reason,
              initialPayment: initialPayment,
              divergencePayment: divergencePayment,
              totalPayment: totalPayment,
              paymentDate: currentPaymentStatus.paymentDate || null,
            }
          : newStatus,
        collection: targetCollection,
        ...(divergenceInfo && {
          project_status: "Em Divergência",
          translation_status: "N/A",
          deadlineDate: newDeadlineDate,
          deadline: newDeadlineText,
        }),
        ...(isPaid && {
          project_status: "Em Análise",
          translation_status: "N/A",
        }),
      };

      console.log(
        "Debug - updateData que será enviado ao Firestore:",
        updateData
      );

      if (isPaid && targetCollection !== project.collection) {
        const newProjectRef = doc(firestore, targetCollection, projectId);
        await setDoc(newProjectRef, {
          ...project,
          ...updateData,
        });
        await deleteDoc(projectRef);
      } else {
        await updateDoc(projectRef, updateData);
      }

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      setProject({
        ...project,
        ...updateData,
      });

      setShowDivergenceModal(false);
      setDivergenceData({ pages: "", reason: "" });
      alert("Status de pagamento atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status de pagamento:", error);
      alert("Erro ao atualizar status de pagamento. Tente novamente.");
    }
  };

  const handleDivergenceConfirm = () => {
    if (!divergenceData.pages || !divergenceData.reason) {
      alert("Por favor, preencha todos os campos!");
      return;
    }
    updatePaymentStatus("Divergência", divergenceData);
    // Remover esta linha pois updatePaymentStatus já atualiza o project_status
    // updateProjectStatus("Em Divergência");
  };

  const handleRefundOptionChange = (e) => {
    const option = e.target.value;
    setSelectedRefundOption(option);
    setShowCustomAmount(option === "other");
    if (option === "total") {
      const totalValue = Number(
        project.payment_status?.originalAmount ||
          project.totalProjectValue ||
          project.totalValue ||
          calculateTotalValue(project.files)
      );
      setRefundAmount(totalValue.toFixed(2));
    } else if (option === "other") {
      setRefundAmount("");
    }
  };

  const handleRefundConfirm = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Calcular o valor original do projeto
      const originalAmount = project.files.reduce((total, file) => {
        const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
        return total + fileTotal;
      }, 0);

      // Calcular o valor do reembolso
      const refundAmountValue =
        selectedRefundOption === "total"
          ? originalAmount
          : Number(refundAmount) || 0;

      const refundData = {
        status: "Reembolsado",
        originalAmount: originalAmount,
        refundAmount: refundAmountValue,
        reason: refundReason || "N/A",
        refundedAt: new Date().toISOString(),
      };

      // Atualizar o documento com os dados do reembolso
      await updateDoc(projectRef, {
        payment_status: refundData,
        project_status: "Cancelado",
        translation_status: "Cancelado",
        totalProjectValue: originalAmount,
      });

      // Adicionar ao histórico de pagamentos
      const paymentHistory = project.paymentHistory || [];
      paymentHistory.push({
        type: "refund",
        amount: refundAmountValue,
        date: new Date().toISOString(),
        reason: refundReason || "N/A",
      });

      await updateDoc(projectRef, {
        paymentHistory: paymentHistory,
      });

      setShowRefundModal(false);
      setRefundAmount("");
      setRefundReason("");
      setSelectedRefundOption("total");
      setShowCustomAmount(false);
      alert("Reembolso registrado com sucesso!");

      // Atualizar os dados do projeto
      const updatedProjectDoc = await getDoc(projectRef);
      if (updatedProjectDoc.exists()) {
        setProject({
          ...updatedProjectDoc.data(),
          collection: project.collection,
        });
      }
    } catch (error) {
      console.error("Erro ao registrar reembolso:", error);
      alert("Erro ao registrar reembolso. Por favor, tente novamente.");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Criar objeto de atualização
      const updateData = {
        translation_status: newStatus,
      };

      // Se o status for Em Tradução, atualizar o project_status para Em Andamento
      if (newStatus === "Em Tradução") {
        updateData.project_status = "Em Andamento";
      }
      // Se o status for Cancelado ou Finalizado, atualizar também o project_status
      else if (newStatus === "Cancelado" || newStatus === "Finalizado") {
        updateData.project_status = newStatus;
      }

      console.log("Atualizando status:", updateData);

      // Atualizar o documento primeiro
      await updateDoc(projectRef, updateData);

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de status de tradução",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
            statusAnterior: project.translation_status || "N/A",
            statusNovo: newStatus,
            statusProjetoAnterior: project.project_status || "N/A",
            statusProjetoNovo:
              updateData.project_status || project.project_status || "N/A",
          },
        },
      };

      // Adicionar o log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      alert("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const handleProjectStatusChange = async (newStatus) => {
    try {
      if (newStatus === "Em Divergência") {
        setShowDivergenceModal(true);
        return;
      }

      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Se o status for Em Andamento, Finalizado ou Cancelado, atualizar ambos os status
      const updateData = {
        project_status: newStatus,
        ...(newStatus === "Em Andamento" && {
          translation_status: "Em Tradução",
        }),
        ...(newStatus === "Finalizado" && { translation_status: "Finalizado" }),
        ...(newStatus === "Cancelado" && { translation_status: "Cancelado" }),
      };

      console.log("Status sendo atualizado:", updateData);

      await updateDoc(projectRef, updateData);

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de status do projeto",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
            statusAnterior: project.project_status || "N/A",
            statusNovo: newStatus,
            statusTraducaoAnterior: project.translation_status || "N/A",
            statusTraducaoNovo: updateData.translation_status || "N/A",
          },
        },
      });

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      alert("Status do projeto atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status do projeto:", error);
      alert("Erro ao atualizar status do projeto. Tente novamente.");
    }
  };

  const handleSendToApproval = async () => {
    try {
      setIsSendingApproval(true);

      // Verifica se há contagem de páginas zerada
      const hasZeroPages = project.files.some((file) => {
        const pageCount =
          editedPages[project.files.indexOf(file)] || file.pageCount;
        return !pageCount || pageCount <= 0;
      });

      if (hasZeroPages) {
        alert(
          "Não é possível enviar para aprovação com contagem de páginas zerada. Por favor, verifique todos os arquivos."
        );
        setIsSendingApproval(false);
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Buscar dados do usuário para obter as taxas
      const userQuery = query(
        collection(firestore, "users"),
        where("email", "==", project.userEmail)
      );
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0].data();

      // Atualizar os arquivos com os valores corretos
      const updatedFiles = project.files.map((file, index) => {
        const pageCount = editedPages[index] || file.pageCount;
        return {
          ...file,
          pageCount,
          total: pageCount * file.valuePerPage,
        };
      });

      // Calcular o total de páginas
      const totalPages = updatedFiles.reduce(
        (sum, file) => sum + Number(file.pageCount),
        0
      );

      // Calcular o prazo baseado no número de páginas
      let deadlineDays = 0;
      if (totalPages <= 5) {
        deadlineDays = 5;
      } else if (totalPages <= 20) {
        deadlineDays = 10;
      } else if (totalPages <= 50) {
        deadlineDays = 11;
      } else if (totalPages <= 90) {
        deadlineDays = 15;
      } else if (totalPages <= 130) {
        deadlineDays = 20;
      } else {
        deadlineDays = 25;
      }

      // Calcular o valor total do projeto
      const newTotalProjectValue = updatedFiles.reduce(
        (sum, file) => sum + file.total,
        0
      );

      // Determinar a coleção de destino
      let targetCollection = project.collection;
      if (project.collection === "b2bdocprojects") {
        targetCollection = "b2bapproval";
      } else if (project.collection === "b2cdocprojects") {
        targetCollection = "b2csketch";
      }

      // Determinar o status do projeto baseado no canTest do usuário
      console.log("Debug userData:", userData);
      console.log("Debug canTest:", userData.canTest);
      const projectStatus =
        userData.canTest === true ? "Ag. Aprovação" : "Ag. Pagamento";
      console.log("Debug projectStatus:", projectStatus);

      // Criar o documento na coleção de destino
      const projectData = {
        ...project,
        collection: targetCollection,
        files: updatedFiles,
        totalPages: totalPages,
        totalProjectValue: newTotalProjectValue,
        deadline: `${deadlineDays} dias úteis`,
        deadlineDate: "A Definir",
        status: "Aprovado",
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: project.userEmail,
        approvedByName: userData.nomeCompleto || "N/A",
        project_status: projectStatus,
        payment_status: "Pendente",
        translation_status: "N/A",
        totalValue: newTotalProjectValue,
        totalFiles: updatedFiles.length,
      };

      // Criar log do envio para aprovação
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "envio para aprovação",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          arquivos: updatedFiles.map((file, index) => ({
            nome: file.name,
            paginas: file.pageCount,
            valor: file.total,
          })),
          totalPaginas: totalPages,
          totalValor: newTotalProjectValue,
          prazo: `${deadlineDays} dias úteis`,
          statusAnterior: project.project_status,
          statusNovo: projectStatus,
        },
      };

      // Se a coleção de destino for diferente, criar novo documento e deletar o antigo
      if (targetCollection !== project.collection) {
        const newProjectRef = doc(firestore, targetCollection, projectId);
        await setDoc(newProjectRef, projectData);
        await deleteDoc(projectRef);
      } else {
        // Atualizar o documento na mesma coleção
        await updateDoc(projectRef, projectData);
      }

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Redirecionar após sucesso
      navigate("/company/master/projects");
    } catch (error) {
      console.error("Erro ao enviar para aprovação:", error);
      alert(
        error.message ||
          "Erro ao enviar para aprovação. Por favor, tente novamente."
      );
      setIsSendingApproval(false);
    }
  };

  // Atualização do useEffect para limpeza
  useEffect(() => {
    return () => {
      debouncedSetEditedPages.cancel();
    };
  }, [debouncedSetEditedPages]);

  // Adicionar useEffect para carregar os logs
  useEffect(() => {
    const fetchActivityLogs = async () => {
      try {
        const firestore = getFirestore();
        const logsRef = collection(firestore, "activity_logs");

        // Buscar logs de três maneiras diferentes para garantir que pegamos todos
        const q1 = query(
          logsRef,
          where("details.projeto.nome", "==", project?.projectName),
          orderBy("timestamp", "desc")
        );

        const q2 = query(
          logsRef,
          where("details.projeto", "==", project?.projectName),
          orderBy("timestamp", "desc")
        );

        const q3 = query(
          logsRef,
          where("details.projeto", "array-contains", project?.projectName),
          orderBy("timestamp", "desc")
        );

        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
          const logsData1 = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setActivityLogs((prevLogs) => {
            const newLogs = [...prevLogs];
            logsData1.forEach((log) => {
              if (!newLogs.some((l) => l.id === log.id)) {
                newLogs.push(log);
              }
            });
            return newLogs.sort(
              (a, b) => b.timestamp?.toDate() - a.timestamp?.toDate()
            );
          });
        });

        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
          const logsData2 = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setActivityLogs((prevLogs) => {
            const newLogs = [...prevLogs];
            logsData2.forEach((log) => {
              if (!newLogs.some((l) => l.id === log.id)) {
                newLogs.push(log);
              }
            });
            return newLogs.sort(
              (a, b) => b.timestamp?.toDate() - a.timestamp?.toDate()
            );
          });
        });

        const unsubscribe3 = onSnapshot(q3, (snapshot) => {
          const logsData3 = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setActivityLogs((prevLogs) => {
            const newLogs = [...prevLogs];
            logsData3.forEach((log) => {
              if (!newLogs.some((l) => l.id === log.id)) {
                newLogs.push(log);
              }
            });
            return newLogs.sort(
              (a, b) => b.timestamp?.toDate() - a.timestamp?.toDate()
            );
          });
        });

        return () => {
          unsubscribe1();
          unsubscribe2();
          unsubscribe3();
        };
      } catch (error) {
        console.error("Erro ao carregar logs:", error);
      }
    };

    if (project?.projectName) {
      fetchActivityLogs();
    }
  }, [project?.projectName]);

  const handleConvertCurrencyUpdate = async () => {
    try {
      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      const updateData = {
        convertCurrency: newConvertCurrency,
      };

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de conversão monetária",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          conversaoAnterior: project.convertCurrency
            ? "Com Conversão"
            : "Sem Conversão",
          conversaoNova: newConvertCurrency ? "Com Conversão" : "Sem Conversão",
        },
      };

      await updateDoc(projectRef, updateData);
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      setShowConvertCurrencyModal(false);
      alert("Conversão monetária atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar conversão monetária:", error);
      alert("Erro ao atualizar conversão monetária. Tente novamente.");
    }
  };

  const handlePriorityUpdate = async () => {
    try {
      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      const updateData = {
        isPriority: newPriority,
      };

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de prioridade",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          prioridadeAnterior: project.isPriority
            ? "Com Prioridade"
            : "Sem Prioridade",
          prioridadeNova: newPriority ? "Com Prioridade" : "Sem Prioridade",
        },
      };

      await updateDoc(projectRef, updateData);
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      setShowPriorityModal(false);
      alert("Prioridade atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
      alert("Erro ao atualizar prioridade. Tente novamente.");
    }
  };

  const handleSourceLanguageUpdate = async () => {
    try {
      if (!projectId || !project?.collection) {
        console.error("ID do projeto ou coleção não disponível:", {
          projectId,
          collection: project?.collection,
        });
        alert("Erro: ID do projeto ou coleção não disponível");
        return;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      const updateData = {
        sourceLanguage: newSourceLanguage,
      };

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "alteração de língua de origem",
        details: {
          projeto: {
            nome: project.projectName,
            email: project.userEmail,
          },
          linguaAnterior: project.sourceLanguage,
          linguaNova: newSourceLanguage,
        },
      };

      await updateDoc(projectRef, updateData);
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local
      setProject((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      setShowSourceLanguageModal(false);
      alert("Língua de origem atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar língua de origem:", error);
      alert("Erro ao atualizar língua de origem. Tente novamente.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "A definir";

    try {
      // Verificar casos específicos de valores inválidos
      if (typeof date === "string") {
        // Se contém NaN ou é uma string inválida
        if (
          date.includes("NaN") ||
          date === "A ser definido" ||
          date === "Invalid Date"
        ) {
          return "A definir";
        }

        // Se a data vier como string no formato dd/mm/yyyy, manter o formato
        if (date.includes("/")) {
          const [day, month, year] = date.split("/");
          // Verificar se os componentes são válidos
          if (
            day &&
            month &&
            year &&
            !day.includes("NaN") &&
            !month.includes("NaN") &&
            !year.includes("NaN")
          ) {
            return `${day}/${month}/${year.slice(-2)}`;
          } else {
            return "A definir";
          }
        }
      }

      // Se for um timestamp do Firestore
      if (typeof date === "object" && date.seconds) {
        const dateObj = new Date(date.seconds * 1000);
        if (isNaN(dateObj.getTime())) {
          return "A definir";
        }
        return dateObj.toLocaleDateString("pt-BR");
      }

      // Se for uma string de data ISO ou qualquer formato válido
      if (typeof date === "string") {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          return "A definir";
        }
        return dateObj.toLocaleDateString("pt-BR");
      }

      // Se for um objeto Date
      if (date instanceof Date) {
        if (isNaN(date.getTime())) {
          return "A definir";
        }
        return date.toLocaleDateString("pt-BR");
      }

      return "A definir";
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "A definir";
    }
  };

  // Função específica para formatar prazo que tenta usar deadlineDate primeiro
  const formatDeadline = (project) => {
    // Primeiro tenta usar deadlineDate se existir
    if (project.deadlineDate) {
      const formatted = formatDate(project.deadlineDate);
      if (formatted !== "A definir") {
        return formatted;
      }
    }

    // Se deadlineDate não existe ou é inválido, tenta deadline
    if (project.deadline) {
      const formatted = formatDate(project.deadline);
      if (formatted !== "A definir") {
        return formatted;
      }
    }

    return "A definir";
  };

  // Função para pré-popular o modal com data atual se existir
  const openDeadlineModal = () => {
    // Tentar extrair data dos campos existentes
    let initialDate = "";

    // Primeiro tenta usar deadlineDate
    if (project.deadlineDate) {
      try {
        const date = new Date(project.deadlineDate);
        if (!isNaN(date.getTime())) {
          initialDate = date.toISOString().split("T")[0];
        }
      } catch (error) {
        console.log("Erro ao processar deadlineDate:", error);
      }
    }

    // Se não conseguiu extrair de deadlineDate, tenta deadline
    if (!initialDate && project.deadline) {
      try {
        // Tentar diferentes formatos de data
        let dateString = project.deadline;

        // Se vier no formato "dd/mm/yyyy"
        if (dateString.includes("/")) {
          const parts = dateString.split("/");
          if (parts.length >= 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
            const isoString = `${year}-${month}-${day}`;
            const date = new Date(isoString);
            if (!isNaN(date.getTime())) {
              initialDate = isoString;
            }
          }
        }
      } catch (error) {
        console.log("Erro ao processar deadline:", error);
      }
    }

    setNewDeadline({ date: initialDate });
    setShowDeadlineModal(true);
  };

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";

    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  // Função para formatar o nome do projeto
  const formatProjectName = (name) => {
    if (!name) return "Sem Nome";
    return name.length > 15 ? `${name.slice(0, 15)}...` : name;
  };

  // Função para renderizar o nome do projeto com tooltip
  const renderProjectName = (name) => {
    const formattedName = formatProjectName(name);
    if (name && name.length > 15) {
      return (
        <span className="text-gray-800 cursor-help" title={name}>
          {formattedName}
        </span>
      );
    }
    return <span className="text-gray-800">{formattedName}</span>;
  };

  const renderMobileView = () => (
    <div className="w-full p-4 space-y-4 pb-20">
      {/* Header com Botão Voltar */}
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <IoIosArrowBack size={24} className="mr-2" />
          <span className="text-lg font-semibold">Voltar</span>
        </button>
      </div>

      {/* Informações do Projeto */}
      <Card title="Informações do Projeto" color="blue" className="mb-4">
        <div className="space-y-3">
          {/* Nome do Projeto */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Nome do Projeto:</span>
            <div className="flex items-center gap-2">
              {renderProjectName(project.projectName)}
              <FaEdit
                className="text-blue-600 cursor-pointer flex-shrink-0"
                onClick={() => {
                  setNewProjectName(project.projectName || "");
                  setShowEditNameModal(true);
                }}
              />
            </div>
          </div>

          {/* Cliente */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Cliente:</span>
            <span className="text-gray-800 text-sm truncate">
              {project.userEmail}
            </span>
          </div>

          {/* Língua de Origem */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Língua Origem:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 text-sm truncate">
                {project.sourceLanguage || "N/A"}
              </span>
              <FaEdit
                className="text-blue-600 cursor-pointer flex-shrink-0"
                onClick={() => {
                  setNewSourceLanguage(project.sourceLanguage || "");
                  setShowSourceLanguageModal(true);
                }}
              />
            </div>
          </div>

          {/* Língua de Destino */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Língua Destino:</span>
            <span className="text-gray-800 text-sm truncate">
              {project.targetLanguage || "N/A"}
            </span>
          </div>

          {/* Conversão Monetária */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Conv. Monetária:</span>
            <div className="flex items-center gap-2">
              {renderBadge(
                project.convertCurrency,
                {
                  true: {
                    bg: "bg-green-50",
                    text: "text-green-700",
                    border: "border-green-200",
                    label: "Com Conversão",
                  },
                  false: {
                    bg: "bg-red-50",
                    text: "text-red-700",
                    border: "border-red-200",
                    label: "Sem Conversão",
                  },
                },
                "w-1/2"
              )}
              <FaEdit
                className="text-blue-600 cursor-pointer flex-shrink-0"
                onClick={() => {
                  setNewConvertCurrency(project.convertCurrency || false);
                  setShowConvertCurrencyModal(true);
                }}
              />
            </div>
          </div>

          {/* Prioridade */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Prioridade:</span>
            <div className="flex items-center gap-2">
              {renderBadge(
                project.isPriority,
                {
                  true: {
                    bg: "bg-green-50",
                    text: "text-green-700",
                    border: "border-green-200",
                    label: "Com Prioridade",
                  },
                  false: {
                    bg: "bg-red-50",
                    text: "text-red-700",
                    border: "border-red-200",
                    label: "Sem Prioridade",
                  },
                },
                "w-1/2"
              )}
              <FaEdit
                className="text-blue-600 cursor-pointer flex-shrink-0"
                onClick={() => {
                  setNewPriority(project.isPriority || false);
                  setShowPriorityModal(true);
                }}
              />
            </div>
          </div>

          {/* Prazo */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Prazo:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 text-sm truncate">
                {formatDeadline(project)}
              </span>
              <FaEdit
                className="text-blue-600 cursor-pointer flex-shrink-0"
                onClick={openDeadlineModal}
              />
            </div>
          </div>

          {/* Data de Recebimento */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Data Receb.:</span>
            <span className="text-gray-800 text-sm truncate">
              {formatDate(project.createdAt)}
            </span>
          </div>
        </div>
      </Card>

      {/* Informações Financeiras */}
      <Card title="Informações Financeiras" color="green" className="mb-4">
        <div className="space-y-3">
          {/* Status de Pagamento */}
          <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
            <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
              <FaCreditCard className="text-green-600" />
              Status de Pagamento
            </h3>
            <select
              value={
                typeof project.payment_status === "object"
                  ? project.payment_status.status
                  : project.payment_status || "Pendente"
              }
              onChange={(e) => handlePaymentStatusChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors"
            >
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
              <option value="Divergência">Divergência</option>
              <option value="Reembolsado">Reembolsado</option>
              <option value="Em Reembolso">Em Reembolso</option>
            </select>
            {typeof project.payment_status === "object" && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Pagamento Inicial:</span>
                  <span className="text-gray-800">
                    U${" "}
                    {Number(project.payment_status.initialPayment || 0).toFixed(
                      2
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Pagamento Divergência:</span>
                  <span className="text-gray-800">
                    U${" "}
                    {Number(
                      project.payment_status.divergencePayment || 0
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600">Total Pago:</span>
                  <span className="text-gray-800">
                    U${" "}
                    {Number(project.payment_status.totalPayment || 0).toFixed(
                      2
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Nome do Aprovador */}
          <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
              <FaUserCheck className="text-green-600" />
              Nome do Aprovador
            </h3>
            <span className="text-gray-800">
              {project.approvedByName || "N/A"}
            </span>
          </div>

          {/* Data de Pagamento */}
          <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
              <FaCalendarAlt className="text-green-600" />
              Informações de Pagamento
            </h3>
            <div className="grid grid-cols-[80px_auto] gap-2 text-sm">
              <span className="text-gray-600 font-medium">Data Pgto:</span>
              <span className="text-gray-800 text-right">
                {typeof project.payment_status === "object" &&
                project.payment_status.paymentDate
                  ? new Date(
                      project.payment_status.paymentDate
                    ).toLocaleDateString("pt-BR")
                  : project.paidAt
                  ? new Date(project.paidAt).toLocaleDateString("pt-BR")
                  : "N/A"}
              </span>
              {typeof project.payment_status === "object" &&
                project.payment_status.status === "Pago" &&
                project.payment_status.divergencePayment > 0 && (
                  <>
                    <span className="text-gray-600 font-medium">
                      Divergência:
                    </span>
                    <span className="text-gray-800 text-right">
                      {project.payment_status.paymentDate
                        ? new Date(
                            project.payment_status.paymentDate
                          ).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </span>
                  </>
                )}
            </div>
          </div>

          {/* Detalhes do Reembolso */}
          {project.payment_status &&
            project.payment_status.status === "Reembolsado" && (
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                  <FaUndo className="text-green-600" />
                  Detalhes do Reembolso
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-600">Valor Original:</span>
                  <span className="text-gray-800">
                    U${" "}
                    {project.payment_status.originalAmount?.toFixed(2) ||
                      "0.00"}
                  </span>
                  <span className="text-gray-600">Valor Reembolsado:</span>
                  <span className="text-gray-800">
                    U${" "}
                    {project.payment_status.refundAmount?.toFixed(2) || "0.00"}
                  </span>
                  <div className="col-span-2 border-t border-gray-200 my-2"></div>
                  <span className="text-gray-600">Motivo:</span>
                  <span className="text-gray-800">
                    {project.payment_status.reason || "N/A"}
                  </span>
                  <span className="text-gray-600">Data:</span>
                  <span className="text-gray-800">
                    {project.payment_status.refundedAt
                      ? new Date(
                          project.payment_status.refundedAt
                        ).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </span>
                </div>
              </div>
            )}
        </div>
      </Card>

      {/* Status do Projeto */}
      <Card title="Status do Projeto" color="blue" className="mb-4">
        <div className="space-y-3">
          {/* Status da Tradução */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Status Trad.:</span>
            <select
              value={
                typeof project.translation_status === "object"
                  ? project.translation_status.status
                  : project.translation_status || "N/A"
              }
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1 rounded border border-gray-200 bg-white text-gray-700 text-sm font-medium whitespace-nowrap"
            >
              <option value="N/A">N/A</option>
              <option value="Em Tradução">Em Tradução</option>
              <option value="Em Revisão">Em Revisão</option>
              <option value="Em Certificação">Em Certificação</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Status do Projeto */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">Status Proj.:</span>
            <select
              value={
                typeof project.project_status === "object"
                  ? project.project_status.status
                  : project.project_status || "Rascunho"
              }
              onChange={(e) => handleProjectStatusChange(e.target.value)}
              disabled={project.project_status === "Em Divergência"}
              className={`px-3 py-1 rounded border text-sm font-medium whitespace-nowrap ${
                project.project_status === "Em Divergência"
                  ? "bg-red-50 text-red-700 border-red-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <option value="Rascunho">Rascunho</option>
              <option value="Ag. Orçamento">Ag. Orçamento</option>
              <option value="Ag. Aprovação">Ag. Aprovação</option>
              <option value="Ag. Pagamento">Ag. Pagamento</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Divergência">Em Divergência</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Arquivos */}
      <Card title="Arquivos" color="blue" className="mb-4">
        <div className="space-y-4">
          {project.files.map((file, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-4 last:border-0 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Arquivo:</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-blue-600 cursor-pointer text-sm truncate"
                    onClick={async () => {
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
                  >
                    {file.name}
                  </span>
                  <FaDownload
                    className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex-shrink-0"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const url = await getFileDownloadUrl(file.fileUrl);

                        // Criar link temporário para download
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = file.name || "arquivo";
                        link.target = "_blank"; // Garantir que não abra na mesma aba
                        link.rel = "noopener noreferrer";
                        link.style.display = "none";

                        document.body.appendChild(link);

                        // Tentar forçar download
                        try {
                          link.click();
                        } catch (clickError) {
                          // Se falhar, abrir em nova aba como fallback
                          window.open(url, "_blank", "noopener,noreferrer");
                        }

                        // Cleanup
                        setTimeout(() => {
                          document.body.removeChild(link);
                        }, 100);
                      } catch (error) {
                        console.error("Erro ao baixar arquivo:", error);
                        alert(
                          "Erro ao baixar o arquivo. Por favor, tente novamente."
                        );
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Páginas:</span>
                <span className="text-gray-800 text-sm">
                  {file.pageCount} páginas
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Valor:</span>
                <span className="text-gray-800 text-sm">
                  U$ {(Number(file.valuePerPage) || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm font-medium">
                Total de Páginas Inicial:
              </span>
              <span className="text-gray-800 text-sm font-medium">
                {project.files.reduce(
                  (total, file) => total + (Number(file.pageCount) || 0),
                  0
                )}
              </span>
            </div>
            {((typeof project.payment_status === "object" &&
              project.payment_status.pages > 0) ||
              (project.divergenceInfo && project.divergenceInfo.pages > 0)) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm font-medium">
                    Páginas Divergentes:
                  </span>
                  <span className="text-gray-800 text-sm font-medium">
                    {project.divergenceInfo?.pages ||
                      project.payment_status?.pages ||
                      "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm font-medium">
                    Total de Páginas Final:
                  </span>
                  <span className="text-gray-800 text-sm font-medium">
                    {project.files.reduce(
                      (total, file) => total + (Number(file.pageCount) || 0),
                      0
                    ) +
                      Number(
                        project.divergenceInfo?.pages ||
                          project.payment_status?.pages ||
                          0
                      )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm font-medium">
                    Valor Divergência:
                  </span>
                  <span className="text-gray-800 text-sm font-medium">
                    U${" "}
                    {Number(
                      project.divergenceInfo?.value ||
                        project.payment_status?.divergencePayment ||
                        0
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-600 text-sm font-medium">
                    Motivo da Divergência:
                  </span>
                  <span className="text-gray-800 text-sm bg-white p-2 rounded border border-gray-200">
                    {project.divergenceInfo?.reason ||
                      project.payment_status?.reason ||
                      "N/A"}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm font-medium">
                Valor Total:
              </span>
              <span className="text-gray-800 text-sm font-medium">
                U${" "}
                {typeof project.payment_status === "object" &&
                project.payment_status.status === "Reembolsado"
                  ? Number(project.payment_status.originalAmount || 0).toFixed(
                      2
                    )
                  : Number(
                      typeof project.payment_status === "object"
                        ? project.payment_status.totalPayment
                        : project.totalProjectValue ||
                            project.totalValue ||
                            calculateTotalValue(project.files)
                    ).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Link do Projeto */}
      {((typeof project.payment_status === "object"
        ? project.payment_status.status === "Pago"
        : project.payment_status === "Pago") ||
        project.project_status === "Finalizado") && (
        <Card title="Link do Projeto" color="blue" className="mb-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Insira o link do projeto"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
              />
              <button
                onClick={handleShareLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap text-sm"
              >
                Compartilhar
              </button>
            </div>
            {project.shareLink && (
              <div className="text-gray-600 text-sm">
                <strong>Link Atual:</strong>{" "}
                <a
                  href={project.shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all"
                >
                  {project.shareLink}
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Histórico de Movimentações */}
      <Card title="Histórico de Movimentações" color="blue">
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {activityLogs.map((log, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-4 last:border-0 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Data/Hora:</span>
                <span className="text-gray-800 text-sm truncate">
                  {log.timestamp?.toDate().toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Usuário:</span>
                <span className="text-gray-800 text-sm truncate">
                  {log.userEmail}
                </span>
              </div>
              <div className="text-sm text-gray-800">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.action === "criação de projeto"
                      ? "bg-green-100 text-green-800"
                      : log.action === "pagamento realizado"
                      ? "bg-blue-100 text-blue-800"
                      : log.action.includes("alteração")
                      ? "bg-yellow-100 text-yellow-800"
                      : log.action === "envio para aprovação"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {log.action}
                </span>
              </div>
              <div className="text-xs text-gray-600 break-words bg-gray-50 p-2 rounded">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="mb-1 last:mb-0">
                    <span className="font-medium">{key}: </span>
                    {typeof value === "object" ? (
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      <span>{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderDesktopView = () => (
    <div className="w-full max-w-[1200px] mx-auto p-8 space-y-8">
      <div className="glass-card bg-white rounded-xl shadow-lg p-6">
        {/* Header com Botão Voltar e Título */}
        <div className="flex items-center mb-6 relative">
          <div
            className="flex items-center cursor-pointer hover:text-blue-600 transition-colors absolute left-0"
            onClick={() => navigate(-1)}
          >
            <IoIosArrowBack size={24} className="mr-2" />
            <span className="text-lg font-semibold">Voltar</span>
          </div>

          <h1 className="text-3xl font-bold flex-1 text-center bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Detalhes do Projeto
          </h1>
        </div>

        {/* Container Principal */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-8">
          {/* Grid de Informações Básicas */}
          <div className="flex gap-8">
            {/* Primeira Div - Informações do Projeto */}
            <div className="w-2/3 bg-gray-50 rounded-xl p-6 space-y-8">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <FaInfoCircle className="text-blue-600" />
                Informações do Projeto
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Nome do Projeto */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaFileAlt className="text-blue-600" />
                    Nome do Projeto
                  </h3>
                  <div className="flex items-center justify-between">
                    {renderProjectName(project.projectName)}
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={() => {
                        setNewProjectName(project.projectName || "");
                        setShowEditNameModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Cliente (Email) */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaUser className="text-blue-600" />
                    Cliente (Email)
                  </h3>
                  <span className="text-gray-800">{project.userEmail}</span>
                </div>

                {/* Língua de Origem */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaGlobeAmericas className="text-blue-600" />
                    Língua de Origem
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800">
                      {project.sourceLanguage || "N/A"}
                    </span>
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={() => {
                        setNewSourceLanguage(project.sourceLanguage || "");
                        setShowSourceLanguageModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Língua de Destino */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaGlobe className="text-blue-600" />
                    Língua de Destino
                  </h3>
                  <span className="text-gray-800">
                    {project.targetLanguage || "N/A"}
                  </span>
                </div>

                {/* Conversão Monetária */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaExchangeAlt className="text-blue-600" />
                    Conversão Monetária
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="w-1/2 pr-2">
                      {renderBadge(project.convertCurrency, {
                        true: {
                          bg: "bg-green-50",
                          text: "text-green-700",
                          border: "border-green-200",
                          label: "Com Conversão",
                        },
                        false: {
                          bg: "bg-red-50",
                          text: "text-red-700",
                          border: "border-red-200",
                          label: "Sem Conversão",
                        },
                      })}
                    </div>
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={() => {
                        setNewConvertCurrency(project.convertCurrency || false);
                        setShowConvertCurrencyModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Prioridade */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaStar className="text-blue-600" />
                    Prioridade
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="w-1/2 pr-2">
                      {renderBadge(project.isPriority, {
                        true: {
                          bg: "bg-green-50",
                          text: "text-green-700",
                          border: "border-green-200",
                          label: "Com Prioridade",
                        },
                        false: {
                          bg: "bg-red-50",
                          text: "text-red-700",
                          border: "border-red-200",
                          label: "Sem Prioridade",
                        },
                      })}
                    </div>
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={() => {
                        setNewPriority(project.isPriority || false);
                        setShowPriorityModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Prazo */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaClock className="text-blue-600" />
                    Prazo
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800">
                      {formatDeadline(project)}
                    </span>
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={openDeadlineModal}
                    />
                  </div>
                </div>

                {/* Data de Recebimento */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaCalendar className="text-blue-600" />
                    Data de Recebimento
                  </h3>
                  <span className="text-gray-800">
                    {formatDate(project.createdAt)}
                  </span>
                </div>

                {/* Status da Tradução */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaLanguage className="text-blue-600" />
                    Status da tradução
                  </h3>
                  <select
                    value={
                      typeof project.translation_status === "object"
                        ? project.translation_status.status
                        : project.translation_status || "N/A"
                    }
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors"
                  >
                    <option value="N/A">N/A</option>
                    <option value="Em Tradução">Em Tradução</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Em Certificação">Em Certificação</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Status do Projeto */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaInfoCircle className="text-blue-600" />
                    Status do Projeto
                  </h3>
                  <select
                    value={
                      typeof project.project_status === "object"
                        ? project.project_status.status
                        : project.project_status || "Rascunho"
                    }
                    onChange={(e) => handleProjectStatusChange(e.target.value)}
                    disabled={project.project_status === "Em Divergência"}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors ${
                      project.project_status === "Em Divergência"
                        ? "bg-red-50 text-red-700 border-red-200 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Ag. Orçamento">Ag. Orçamento</option>
                    <option value="Ag. Aprovação">Ag. Aprovação</option>
                    <option value="Ag. Pagamento">Ag. Pagamento</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Em Divergência">Em Divergência</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Segunda Div - Informações Financeiras */}
            <div className="w-1/3 bg-green-50 rounded-xl p-6 space-y-8">
              <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" />
                Informações Financeiras
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Status de Pagamento */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaCreditCard className="text-green-600" />
                    Status de Pagamento
                  </h3>
                  <select
                    value={
                      typeof project.payment_status === "object"
                        ? project.payment_status.status
                        : project.payment_status || "Pendente"
                    }
                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Divergência">Divergência</option>
                    <option value="Reembolsado">Reembolsado</option>
                    <option value="Em Reembolso">Em Reembolso</option>
                  </select>
                  {typeof project.payment_status === "object" && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          Pagamento Inicial:
                        </span>
                        <span className="text-gray-800">
                          U${" "}
                          {Number(
                            project.payment_status.initialPayment || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          Pagamento Divergência:
                        </span>
                        <span className="text-gray-800">
                          U${" "}
                          {Number(
                            project.payment_status.divergencePayment || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Total Pago:</span>
                        <span className="text-gray-800">
                          U${" "}
                          {Number(
                            project.payment_status.totalPayment || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nome do Aprovador */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaUserCheck className="text-green-600" />
                    Nome do Aprovador
                  </h3>
                  <span className="text-gray-800">
                    {project.approvedByName
                      ? project.approvedByName.length > 15
                        ? `${project.approvedByName.slice(0, 15)}...`
                        : project.approvedByName
                      : "N/A"}
                  </span>
                </div>

                {/* Informações de Pagamento */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaCalendarAlt className="text-green-600" />
                    Informações de Pagamento
                  </h3>
                  <div className="grid grid-cols-[80px_auto] gap-2 text-sm">
                    <span className="text-gray-600 font-medium">
                      Data Pgto:
                    </span>
                    <span className="text-gray-800 text-right">
                      {typeof project.payment_status === "object" &&
                      project.payment_status.paymentDate
                        ? new Date(
                            project.payment_status.paymentDate
                          ).toLocaleDateString("pt-BR")
                        : project.paidAt
                        ? new Date(project.paidAt).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </span>
                    {typeof project.payment_status === "object" &&
                      project.payment_status.status === "Pago" &&
                      project.payment_status.divergencePayment > 0 && (
                        <>
                          <span className="text-gray-600 font-medium">
                            Divergência:
                          </span>
                          <span className="text-gray-800 text-right">
                            {project.payment_status.paymentDate
                              ? new Date(
                                  project.payment_status.paymentDate
                                ).toLocaleDateString("pt-BR")
                              : "N/A"}
                          </span>
                        </>
                      )}
                  </div>
                </div>

                {/* Detalhes do Reembolso */}
                {project.payment_status &&
                  project.payment_status.status === "Reembolsado" && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                        <FaUndo className="text-green-600" />
                        Detalhes do Reembolso
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">Valor Original:</span>
                        <span className="text-gray-800">
                          U${" "}
                          {project.payment_status.originalAmount?.toFixed(2) ||
                            "0.00"}
                        </span>
                        <span className="text-gray-600">
                          Valor Reembolsado:
                        </span>
                        <span className="text-gray-800">
                          U${" "}
                          {project.payment_status.refundAmount?.toFixed(2) ||
                            "0.00"}
                        </span>
                        <div className="col-span-2 border-t border-gray-200 my-2"></div>
                        <span className="text-gray-600">Motivo:</span>
                        <span className="text-gray-800">
                          {project.payment_status.reason || "N/A"}
                        </span>
                        <span className="text-gray-600">Data:</span>
                        <span className="text-gray-800">
                          {project.payment_status.refundedAt
                            ? new Date(
                                project.payment_status.refundedAt
                              ).toLocaleDateString("pt-BR")
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Seção do Link do Projeto */}
          {((typeof project.payment_status === "object"
            ? project.payment_status.status === "Pago"
            : project.payment_status === "Pago") ||
            project.project_status === "Finalizado") && (
            <div className="bg-white rounded-xl p-6 space-y-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700">
                Link do Projeto
              </h3>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Insira o link do projeto"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <button
                  onClick={handleShareLink}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-[250px]"
                >
                  Compartilhar
                </button>
              </div>
              {project.shareLink && (
                <div className="text-gray-600 mt-4">
                  <strong>Link Atual:</strong>{" "}
                  <a
                    href={project.shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {project.shareLink}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Seção de Arquivos */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-blue-600 flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              Arquivos
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                      Nome do Arquivo
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        Páginas
                        {(project.collection === "b2bdocprojects" ||
                          project.collection === "b2cdocprojects" ||
                          project.collection === "b2bapproval" ||
                          project.collection === "b2csketch") && (
                          <FaEdit
                            className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                            onClick={() => {
                              const initialPages = {};
                              project.files.forEach((file, index) => {
                                initialPages[index] = file.pageCount;
                              });
                              setEditedPages(initialPages);
                              setShowEditPagesModal(true);
                            }}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                      Download
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                      Língua de Origem
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">
                      Língua de Destino
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">
                      Valor (U$)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {project.files.map((file, index) => (
                    <tr
                      key={`${index}-${file.name}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          onClick={async () => {
                            try {
                              const url = await getFileDownloadUrl(
                                file.fileUrl
                              );
                              window.open(url, "_blank");
                            } catch (error) {
                              console.error("Erro ao abrir arquivo:", error);
                              alert(
                                "Erro ao acessar o arquivo. Por favor, tente novamente."
                              );
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          {file.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {file.pageCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <FaDownload
                          className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mx-auto"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const url = await getFileDownloadUrl(
                                file.fileUrl
                              );

                              // Criar link temporário para download
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = file.name || "arquivo";
                              link.target = "_blank"; // Garantir que não abra na mesma aba
                              link.rel = "noopener noreferrer";
                              link.style.display = "none";

                              document.body.appendChild(link);

                              // Tentar forçar download
                              try {
                                link.click();
                              } catch (clickError) {
                                // Se falhar, abrir em nova aba como fallback
                                window.open(
                                  url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }

                              // Cleanup
                              setTimeout(() => {
                                document.body.removeChild(link);
                              }, 100);
                            } catch (error) {
                              console.error("Erro ao baixar arquivo:", error);
                              alert(
                                "Erro ao baixar o arquivo. Por favor, tente novamente."
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        {project.sourceLanguage || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {project.targetLanguage || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        U$ {(Number(file.valuePerPage) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 rounded-lg gap-2 md:gap-0">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base text-gray-700 font-semibold">
                    Total de Páginas Inicial:
                  </span>
                  <span className="text-sm md:text-base text-gray-800">
                    {project.files.reduce(
                      (total, file) => total + (Number(file.pageCount) || 0),
                      0
                    )}
                  </span>
                </div>
                {((typeof project.payment_status === "object" &&
                  project.payment_status.pages > 0) ||
                  (project.divergenceInfo &&
                    project.divergenceInfo.pages > 0)) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Páginas Divergentes:
                      </span>
                      <span className="text-sm md:text-base text-gray-800">
                        {project.divergenceInfo?.pages ||
                          project.payment_status?.pages ||
                          "0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Total de Páginas Final:
                      </span>
                      <span className="text-sm md:text-base text-gray-800">
                        {project.files.reduce(
                          (total, file) =>
                            total + (Number(file.pageCount) || 0),
                          0
                        ) +
                          Number(
                            project.divergenceInfo?.pages ||
                              project.payment_status?.pages ||
                              0
                          )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Valor Divergência:
                      </span>
                      <span className="text-sm md:text-base text-gray-800">
                        U${" "}
                        {Number(
                          project.divergenceInfo?.value ||
                            project.payment_status?.divergencePayment ||
                            0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 mt-1">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Motivo da Divergência:
                      </span>
                      <span className="text-sm md:text-base text-gray-800 bg-white p-2 rounded border border-gray-200">
                        {project.divergenceInfo?.reason ||
                          project.payment_status?.reason ||
                          "N/A"}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base text-gray-700 font-semibold">
                    Valor Total:
                  </span>
                  <span className="text-sm md:text-base text-gray-800">
                    U${" "}
                    {typeof project.payment_status === "object" &&
                    project.payment_status.status === "Reembolsado"
                      ? Number(
                          project.payment_status.originalAmount || 0
                        ).toFixed(2)
                      : Number(
                          typeof project.payment_status === "object"
                            ? project.payment_status.totalPayment
                            : project.totalProjectValue ||
                                project.totalValue ||
                                calculateTotalValue(project.files)
                        ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Movimentações */}
      <div className="glass-card bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          Histórico de Movimentações
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activityLogs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.timestamp?.toDate().toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.action === "criação de projeto"
                          ? "bg-green-100 text-green-800"
                          : log.action === "pagamento realizado"
                          ? "bg-blue-100 text-blue-800"
                          : log.action.includes("alteração")
                          ? "bg-yellow-100 text-yellow-800"
                          : log.action === "envio para aprovação"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {JSON.stringify(log.details, null, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (!project) {
    console.log("Renderizando tela de carregamento - project é null");
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Carregando...
      </div>
    );
  }

  console.log("Renderizando detalhes do projeto:", project);

  return (
    <PageLayout>
      <ResponsiveLayout
        mobile={renderMobileView()}
        desktop={renderDesktopView()}
      />

      {/* Modals */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Editar Nome do Projeto
            </h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              placeholder="Novo nome do projeto"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditNameModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleProjectNameUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Editar Prazo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={newDeadline.date}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    setNewDeadline({ date: selectedDate });
                  }}
                  min={getMinDate()}
                  className={`w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    newDeadline.date && isWeekend(newDeadline.date)
                      ? "border-red-400 bg-red-50"
                      : ""
                  }`}
                />
                {newDeadline.date && isWeekend(newDeadline.date) && (
                  <p className="text-red-500 text-xs mt-1">
                    ⚠️ Finais de semana não são permitidos. Selecione uma data
                    entre segunda e sexta-feira.
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p>
                  <strong>Prazo Atual:</strong> {formatDeadline(project)}
                </p>
                <p className="mt-1">
                  Selecione uma nova data para o prazo de entrega (apenas dias
                  úteis).
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowDeadlineModal(false);
                  setNewDeadline({ date: "" });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeadlineUpdate}
                disabled={!newDeadline.date || isWeekend(newDeadline.date)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Salvar Prazo
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Editar Páginas</h3>
            <EditPagesTable
              files={project.files}
              editedPages={editedPages}
              onPageChange={handlePageChange}
              sourceLanguage={project.sourceLanguage}
              targetLanguage={project.targetLanguage}
              getFileDownloadUrl={getFileDownloadUrl}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCloseEditPagesModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditPagesSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
              {(project.collection === "b2bdocprojects" ||
                project.collection === "b2cdocprojects") && (
                <button
                  onClick={handleSendToApproval}
                  disabled={isSendingApproval}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingApproval ? "Enviando..." : "Enviar para Aprovação"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDivergenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Registrar Divergência
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Páginas
                </label>
                <input
                  type="number"
                  value={divergenceData.pages}
                  onChange={(e) =>
                    setDivergenceData({
                      ...divergenceData,
                      pages: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Total de páginas NÃO pagas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <textarea
                  value={divergenceData.reason}
                  onChange={(e) =>
                    setDivergenceData({
                      ...divergenceData,
                      reason: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Motivo da divergência"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDivergenceModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDivergenceConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Registrar Reembolso</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opção de Reembolso
                </label>
                <select
                  value={selectedRefundOption}
                  onChange={handleRefundOptionChange}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="total">Valor Total</option>
                  <option value="other">Outro Valor</option>
                </select>
              </div>
              {showCustomAmount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor do Reembolso
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Valor do reembolso"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Motivo do reembolso"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRefundConfirm}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Conversão Monetária</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newConvertCurrency}
                  onChange={(e) => setNewConvertCurrency(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">
                  Habilitar conversão monetária
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowConvertCurrencyModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConvertCurrencyUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPriorityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Prioridade</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPriority}
                  onChange={(e) => setNewPriority(e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">
                  Marcar como prioridade
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPriorityModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handlePriorityUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSourceLanguageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Língua de Origem</h3>
            <div className="space-y-4">
              <select
                value={newSourceLanguage}
                onChange={(e) => setNewSourceLanguage(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 text-sm md:text-base"
              >
                <option value="Português (Brasil)">Português (Brasil)</option>
                <option value="Espanhol (América Latina)">
                  Espanhol (América Latina)
                </option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSourceLanguageModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSourceLanguageUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default memo(ProjectDetails);
