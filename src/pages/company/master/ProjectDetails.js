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
  FaProjectDiagram,
} from "react-icons/fa";
// import "../../styles/CommonStyles.css";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import debounce from "lodash/debounce";

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

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectDetails, setProjectDetails] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [link, setLink] = useState("");
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState({ date: "", time: "" });
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

  // Memoização dos cálculos
  const totalPages = useMemo(() => {
    if (!projectDetails?.files) return 0;
    return projectDetails.files.reduce((total, file) => {
      const pageCount = parseInt(file.pageCount) || 0;
      return total + pageCount;
    }, 0);
  }, [projectDetails?.files]);

  const totalValue = useMemo(() => {
    if (!projectDetails?.files) return "0.00";
    return projectDetails.files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  }, [projectDetails?.files]);

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

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const { state } = location;

        if (!state || !state.collection) {
          console.error("Coleção não encontrada no estado:", state);
          return;
        }

        const projectRef = doc(getFirestore(), state.collection, projectId);
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
          const projectData = projectDoc.data();
          setProjectDetails(projectData);
          setProject(projectData);
          setLoading(false);
        } else {
          console.error("Projeto não encontrado");
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do projeto:", error);
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId, location]);

  const handleShareLink = async () => {
    try {
      // Validar e formatar o link
      let formattedLink = link;

      // Verificar se o link começa com http:// ou https://
      if (!link.startsWith("http://") && !link.startsWith("https://")) {
        formattedLink = `https://${link}`;
      }

      const firestore = getFirestore();
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: projectDetails.userEmail,
        action: "inserção de link de compartilhamento",
        details: {
          projeto: {
            nome: projectDetails.projectName,
            email: projectDetails.userEmail,
          },
          linkAnterior: projectDetails.shareLink || "N/A",
          linkNovo: formattedLink,
        },
      };

      await updateDoc(projectRef, { shareLink: formattedLink });

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      alert("Link compartilhado com sucesso!");
      setProjectDetails({ ...projectDetails, shareLink: formattedLink });
      setLink(formattedLink);
    } catch (error) {
      console.error("Erro ao compartilhar o link:", error.message);
      alert("Erro ao compartilhar o link. Tente novamente.");
    }
  };

  const handleDeadlineUpdate = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      // Criar um objeto Date com a data e hora selecionadas
      const [year, month, day] = newDeadline.date.split("-");
      const [hours, minutes] = newDeadline.time.split(":");

      // Criar a data no fuso horário GMT-3
      const updatedDeadline = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );

      // Ajustar para GMT-3
      updatedDeadline.setHours(updatedDeadline.getHours() + 3);

      // Formatar a data para exibição
      const formattedDeadline = updatedDeadline.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

      const updateData = {
        deadline: formattedDeadline,
        deadlineDate: updatedDeadline.toISOString(),
      };

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: projectDetails.userEmail,
        action: "alteração de prazo do projeto",
        details: {
          projeto: {
            nome: projectDetails.projectName,
            email: projectDetails.userEmail,
          },
          prazoAnterior: projectDetails.deadline || "Não definido",
          prazoNovo: formattedDeadline,
        },
      };

      await updateDoc(projectRef, updateData);

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Atualizar o estado local do projeto
      setProjectDetails((prevProject) => ({
        ...prevProject,
        ...updateData,
      }));

      setShowDeadlineModal(false);
      alert("Prazo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o prazo:", error);
      alert("Erro ao atualizar o prazo. Tente novamente.");
    }
  };

  const handleProjectNameUpdate = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: projectDetails.userEmail,
        action: "alteração de nome do projeto",
        details: {
          projeto: projectDetails.projectName,
          nomeAnterior: projectDetails.projectName,
          nomeNovo: newProjectName,
          email: projectDetails.userEmail,
        },
      };

      await updateDoc(projectRef, {
        projectName: newProjectName,
      });

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      setProjectDetails({
        ...projectDetails,
        projectName: newProjectName,
      });

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

  const disableWeekends = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    // Criar string de datas desabilitadas
    let disabledDates = [];
    let date = new Date(year, today.getMonth(), 1);

    while (date.getMonth() === today.getMonth()) {
      if (date.getDay() === 0 || date.getDay() === 6) {
        // 0 = Domingo, 6 = Sábado
        const day = String(date.getDate()).padStart(2, "0");
        disabledDates.push(`${year}-${month}-${day}`);
      }
      date.setDate(date.getDate() + 1);
    }

    return disabledDates.join(",");
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
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      // 1. Busca as taxas do usuário
      const userQuery = query(
        collection(firestore, "users"),
        where("email", "==", projectDetails.userEmail)
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
      if (
        projectDetails.userType === "b2b" ||
        userData.registeredByType === "b2b"
      ) {
        priceIncrease = Number(priceData.b2bPricePercentage) / 100;
      } else if (
        projectDetails.userType === "b2c" ||
        userData.registeredByType === "b2c"
      ) {
        priceIncrease = Number(priceData.b2cPricePercentage) / 100;
      }

      // 4. Atualiza os arquivos com as novas páginas e valores
      const updatedFiles = projectDetails.files.map((file, index) => {
        const pageCount = editedPages[index] || file.pageCount;
        let valuePerPage = file.valuePerPage;

        if (!valuePerPage) {
          if (
            projectDetails.sourceLanguage === "Português (Brasil)" &&
            projectDetails.targetLanguage === "Inglês"
          ) {
            valuePerPage = Number(userRates.pttoen);
          } else if (
            projectDetails.sourceLanguage === "Espanhol (América Latina)" &&
            projectDetails.targetLanguage === "Inglês"
          ) {
            valuePerPage = Number(userRates.esptoen);
          }

          if (projectDetails.isPriority) {
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
        userEmail: projectDetails.userEmail,
        action: "alteração de páginas do projeto",
        details: {
          projeto: {
            nome: projectDetails.projectName,
            email: projectDetails.userEmail,
          },
          arquivos: updatedFiles.map((file, index) => ({
            nome: file.name,
            paginasAnteriores: projectDetails.files[index].pageCount,
            paginasNovas: file.pageCount,
            valorAnterior: projectDetails.files[index].total,
            valorNovo: file.total,
          })),
          totalAnterior: projectDetails.totalProjectValue,
          totalNovo: newTotalProjectValue,
          idiomaOrigem: projectDetails.sourceLanguage,
          idiomaDestino: projectDetails.targetLanguage,
          prazo: projectDetails.deadline,
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
      setProjectDetails({
        ...projectDetails,
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
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      const isPaid = newStatus === "Pago";

      // Criar log da alteração
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: projectDetails.userEmail,
        action: "alteração de status de pagamento",
        details: {
          projeto: {
            nome: projectDetails.projectName,
            email: projectDetails.userEmail,
            statusAnterior:
              typeof projectDetails.payment_status === "object"
                ? projectDetails.payment_status.status
                : projectDetails.payment_status,
            statusNovo: newStatus,
            valor:
              projectDetails.totalProjectValue ||
              projectDetails.totalValue ||
              0,
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
      let targetCollection = projectDetails.collection;
      if (
        isPaid &&
        (projectDetails.userType === "b2c" ||
          projectDetails.registeredByType === "b2c")
      ) {
        targetCollection = "b2cprojectspaid";
      }

      const updateData = {
        isPaid: isPaid,
        paidAt: isPaid ? new Date().toISOString() : null,
        payment_status: divergenceInfo
          ? {
              status: newStatus,
              pages: divergenceInfo.pages,
              reason: divergenceInfo.reason,
            }
          : newStatus,
        collection: targetCollection,
        ...(divergenceInfo && {
          project_status: "Em Divergência",
          translation_status: "N/A",
        }),
        ...(isPaid && {
          project_status: "Em Análise",
          translation_status: "N/A",
        }),
      };

      if (isPaid && targetCollection !== projectDetails.collection) {
        const newProjectRef = doc(firestore, targetCollection, projectId);
        await setDoc(newProjectRef, {
          ...projectDetails,
          ...updateData,
        });
        await deleteDoc(projectRef);
      } else {
        await updateDoc(projectRef, updateData);
      }

      // Adicionar log
      await addDoc(collection(firestore, "activity_logs"), logData);

      setProjectDetails({
        ...projectDetails,
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
  };

  const handleRefundOptionChange = (e) => {
    const option = e.target.value;
    setSelectedRefundOption(option);
    setShowCustomAmount(option === "other");
    if (option === "total") {
      const totalValue = Number(
        projectDetails.payment_status?.originalAmount ||
          projectDetails.totalProjectValue ||
          projectDetails.totalValue ||
          calculateTotalValue(projectDetails.files)
      );
      setRefundAmount(totalValue.toFixed(2));
    } else if (option === "other") {
      setRefundAmount("");
    }
  };

  const handleRefundConfirm = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, projectDetails.collection, projectId);

      const originalAmount = Number(
        projectDetails.payment_status?.originalAmount ||
          projectDetails.totalProjectValue ||
          projectDetails.totalValue ||
          calculateTotalValue(projectDetails.files)
      );

      const refundData = {
        status: "Reembolsado",
        originalAmount: originalAmount,
        refundAmount: Number(refundAmount) || originalAmount,
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
      const paymentHistory = projectDetails.paymentHistory || [];
      paymentHistory.push({
        type: "refund",
        amount: Number(refundAmount) || originalAmount,
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
        setProjectDetails({
          ...updatedProjectDoc.data(),
          collection: projectDetails.collection,
        });
      }
    } catch (error) {
      console.error("Erro ao registrar reembolso:", error);
      alert("Erro ao registrar reembolso. Por favor, tente novamente.");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Criar objeto de atualização
      const updateData = {
        translation_status: newStatus,
      };

      // Se o status for Em Andamento, Cancelado ou Finalizado, atualizar também o project_status
      if (
        newStatus === "Em Andamento" ||
        newStatus === "Cancelado" ||
        newStatus === "Finalizado"
      ) {
        updateData.project_status = newStatus;
      }

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
      setProject({
        ...project,
        ...updateData,
      });

      alert("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status. Tente novamente.");
    }
  };

  const handleProjectStatusChange = async (newStatus) => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      // Se o status for Em Andamento, Finalizado ou Cancelado, atualizar ambos os status
      const updateData = {
        project_status: newStatus,
        ...(newStatus === "Em Andamento" && {
          translation_status: "Em Andamento",
        }),
        ...(newStatus === "Finalizado" && { translation_status: "Finalizado" }),
        ...(newStatus === "Cancelado" && { translation_status: "Cancelado" }),
      };

      console.log("Status sendo atualizado:", updateData); // Para debug

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

      setProject({
        ...project,
        ...updateData,
      });

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

      // Criar o documento na coleção de destino
      const projectData = {
        ...project,
        collection: targetCollection,
        files: updatedFiles,
        totalPages: totalPages,
        totalProjectValue: newTotalProjectValue,
        deadline: `${deadlineDays} dias úteis`,
        status: "Aprovado",
        updatedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: project.userEmail,
        approvedByName: userData.nomeCompleto || "N/A",
        project_status:
          project.collection === "b2cdocprojects"
            ? "Ag. Pagamento"
            : "Ag. Aprovação",
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
          statusNovo: "Ag. Aprovação",
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

      // Atualizar o estado do projeto com o novo valor
      setProject((prevProject) => ({
        ...prevProject,
        convertCurrency: newConvertCurrency,
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
      // Se for um timestamp do Firestore
      if (date.seconds) {
        const dateObj = new Date(date.seconds * 1000);
        return dateObj.toLocaleDateString("pt-BR");
      }

      // Se for uma string de data
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

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";

    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Carregando detalhes do projeto...
          </p>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">Projeto não encontrado</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
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
                    <span className="text-gray-800">
                      {project.projectName || "Sem Nome"}
                    </span>
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.convertCurrency
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {project.convertCurrency
                        ? "Com Conversão"
                        : "Sem Conversão"}
                    </span>
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.isPriority
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {project.isPriority ? "Com Prioridade" : "Sem Prioridade"}
                    </span>
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
                  <span className="text-gray-800">
                    {(
                      typeof project.payment_status === "object"
                        ? project.payment_status.status === "Pago"
                        : project.payment_status === "Pago"
                    )
                      ? project.deadlineDate || "Não definido"
                      : formatDate(project.deadline)}
                  </span>
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
                    value={project.translation_status || "N/A"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium cursor-pointer transition-colors"
                  >
                    <option value="N/A">N/A</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Em Certificação">Em Certificação</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Status do Projeto */}
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaProjectDiagram className="text-blue-600" />
                    Status do Projeto
                  </h3>
                  <select
                    value={project.project_status || "Rascunho"}
                    onChange={(e) => handleProjectStatusChange(e.target.value)}
                    disabled={project.project_status === "Em Divergência"}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium transition-colors ${
                      project.project_status === "Em Divergência"
                        ? "bg-red-50 text-red-700 border-red-200 cursor-not-allowed"
                        : "text-gray-700 cursor-pointer"
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
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
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
                    className={`w-full px-3 py-2 rounded-lg border ${
                      project.payment_status === "Pago"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : project.payment_status === "Divergência"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : project.payment_status === "Reembolsado" ||
                          project.payment_status === "Em Reembolso"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    } text-sm font-medium cursor-pointer transition-colors`}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Divergência">Divergência</option>
                    <option value="Reembolsado">Reembolsado</option>
                    <option value="Em Reembolso">Em Reembolso</option>
                  </select>
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
                <div className="bg-white p-3 rounded-lg shadow-sm h-[85px]">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaCalendarAlt className="text-green-600" />
                    Informações de Pagamento
                  </h3>
                  <div className="grid grid-cols-[80px_auto] gap-2 text-sm">
                    <span className="text-gray-600 font-medium">Data:</span>
                    <span className="text-gray-800">
                      {project.paidAt
                        ? new Date(project.paidAt).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </span>
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
          {(typeof project.payment_status === "object"
            ? project.payment_status.status === "Pago"
            : project.payment_status === "Pago") &&
            project.project_status === "Finalizado" && (
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
            <div className="flex justify-between items-center px-6 py-4 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-700 font-medium">
                <strong>Total de Páginas:</strong> {totalPages}
              </p>
              <p className="text-gray-700 font-medium">
                <strong>Valor Total:</strong> U$ {totalValue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição de Prazo */}
      {showDeadlineModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              width: "400px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                marginTop: "0px",
                backgroundColor: "lightblue",
                padding: "10px",
                borderRadius: "5px",
                textAlign: "center",
              }}
            >
              Alterar Prazo
            </h3>

            <div
              style={{
                margin: "20px auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
                width: "fit-content",
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "center",
                  }}
                >
                  Data:
                </label>
                <input
                  type="date"
                  value={newDeadline.date}
                  min={getMinDate()}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + "T00:00:00");
                    const day = selectedDate.getDay();

                    if (day !== 0 && day !== 6) {
                      // 0 = Domingo, 6 = Sábado
                      setNewDeadline((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }));
                    } else {
                      alert("Não é possível selecionar sábados ou domingos.");
                    }
                  }}
                  data-days-disabled={disableWeekends()}
                  style={{
                    width: "200px",
                    padding: "10px",
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    margin: "0 auto",
                  }}
                />
              </div>
              <div style={{ textAlign: "center", width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    textAlign: "center",
                  }}
                >
                  Hora:
                </label>
                <input
                  type="time"
                  value={newDeadline.time}
                  onChange={(e) =>
                    setNewDeadline((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  style={{
                    width: "200px",
                    padding: "10px",
                    borderRadius: "5px",
                    border: "1px solid #ddd",
                    margin: "0 auto",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
                gap: "50px",
              }}
            >
              <button
                onClick={() => {
                  handleDeadlineUpdate();
                }}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  color: "black",
                }}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowDeadlineModal(false)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  color: "black",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição do Nome do Projeto */}
      {showEditNameModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              width: "400px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                marginTop: "0px",
                backgroundColor: "lightblue",
                padding: "10px",
                borderRadius: "5px",
                textAlign: "center",
              }}
            >
              Editar Nome do Projeto
            </h3>

            <div
              style={{
                margin: "20px auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "15px",
                width: "fit-content",
              }}
            >
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Digite o novo nome do projeto"
                style={{
                  width: "300px",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
                gap: "50px",
              }}
            >
              <button
                onClick={handleProjectNameUpdate}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  color: "black",
                }}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowEditNameModal(false)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  color: "black",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Páginas */}
      {showEditPagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Editar Número de Páginas
            </h3>
            <EditPagesTable
              files={project.files}
              editedPages={editedPages}
              onPageChange={handlePageChange}
              sourceLanguage={project.sourceLanguage}
              targetLanguage={project.targetLanguage}
              getFileDownloadUrl={getFileDownloadUrl}
            />
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={handleEditPagesSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isSendingApproval}
              >
                Salvar
              </button>
              <button
                onClick={handleSendToApproval}
                className={`px-4 py-2 text-white rounded ${
                  isSendingApproval
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={isSendingApproval}
              >
                {isSendingApproval ? "Aguardando envio..." : "Enviar Aprovação"}
              </button>
              <button
                onClick={handleCloseEditPagesModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                disabled={isSendingApproval}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Divergência */}
      {showDivergenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-xl font-semibold mb-4">
              Informações da Divergência
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Total de Páginas Faltando
                </label>
                <input
                  type="number"
                  value={divergenceData.pages}
                  onChange={(e) =>
                    setDivergenceData((prev) => ({
                      ...prev,
                      pages: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite a quantidade de páginas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da Divergência(Informação a ser enviada ao cliente.)
                </label>
                <textarea
                  value={divergenceData.reason}
                  onChange={(e) =>
                    setDivergenceData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Digite o motivo da divergência"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDivergenceModal(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDivergenceConfirm}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reembolso */}
      {showRefundModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-[500px] text-center">
            <h3 className="mt-0 bg-blue-200 p-2 rounded text-center">
              Registrar Valor de Reembolso
            </h3>

            <div className="my-5 flex flex-col items-center gap-3 w-full">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total do Projeto
                </label>
                <div className="text-lg font-semibold text-gray-800 mb-4">
                  U${" "}
                  {Number(
                    project.totalProjectValue ||
                      project.totalValue ||
                      calculateTotalValue(project.files)
                  ).toFixed(2)}
                </div>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Reembolso
                </label>
                <select
                  value={selectedRefundOption}
                  onChange={handleRefundOptionChange}
                  className="w-[350px] mx-auto p-2 rounded border border-gray-300"
                >
                  <option value="total">Valor Total</option>
                  <option value="other">Outro Valor</option>
                </select>
              </div>

              {showCustomAmount && (
                <div className="w-full">
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Digite o valor do reembolso"
                    className="w-full p-2 rounded border border-gray-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo do Reembolso
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Descreva o motivo do reembolso"
                  className="w-full p-2 rounded border border-gray-300 h-24"
                />
              </div>
            </div>

            <div className="flex justify-center mt-5 gap-12">
              <button
                onClick={handleRefundConfirm}
                className="px-3 py-1 bg-blue-500 border-none rounded-full cursor-pointer shadow-sm text-white"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundAmount("");
                  setRefundReason("");
                  setSelectedRefundOption("total");
                  setShowCustomAmount(false);
                }}
                className="px-3 py-1 bg-red-500 border-none rounded-full cursor-pointer shadow-sm text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {log.action === "pagamento realizado" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>{log.details?.projeto || "Não informado"}</span>
                          <span className="font-medium">Valor:</span>
                          <span className="text-green-600">
                            R$ {log.details?.valor || "0.00"}
                          </span>
                          <span className="font-medium">Status:</span>
                          <span className="text-green-600">
                            {log.details?.status || "sucesso"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "criação de projeto" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>{log.details?.projeto || "Não informado"}</span>
                          <span className="font-medium">Tipo:</span>
                          <span>
                            {log.details?.tipoArquivo || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Páginas:</span>
                          <span>
                            {log.details?.quantidadePaginas || "Não informado"}
                          </span>
                          <span className="font-medium">Valor:</span>
                          <span className="text-green-600">
                            R$ {log.details?.valorTotal || "0.00"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Origem:</span>
                          <span>
                            {log.details?.idiomaOrigem || "Não informado"}
                          </span>
                          <span className="font-medium">Destino:</span>
                          <span>
                            {log.details?.idiomaDestino || "Não informado"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status do projeto" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Status Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.projeto?.statusAnterior || "N/A"}
                          </span>
                          <span className="font-medium">Status Novo:</span>
                          <span className="text-green-600">
                            {log.details?.projeto?.statusNovo || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">
                            Status Tradução Anterior:
                          </span>
                          <span className="text-yellow-600">
                            {log.details?.projeto?.statusTraducaoAnterior ||
                              "N/A"}
                          </span>
                          <span className="font-medium">
                            Status Tradução Novo:
                          </span>
                          <span className="text-green-600">
                            {log.details?.projeto?.statusTraducaoNovo || "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de prazo do projeto" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Prazo Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.prazoAnterior || "Não informado"}
                          </span>
                          <span className="font-medium">Prazo Novo:</span>
                          <span className="text-green-600">
                            {log.details?.prazoNovo || "Não informado"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de nome do projeto" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Nome Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.nomeAnterior || "Não informado"}
                          </span>
                          <span className="font-medium">Nome Novo:</span>
                          <span className="text-green-600">
                            {log.details?.nomeNovo || "Não informado"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status de tradução" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Status Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.projeto?.statusAnterior || "N/A"}
                          </span>
                          <span className="font-medium">Status Novo:</span>
                          <span className="text-green-600">
                            {log.details?.projeto?.statusNovo || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">
                            Status Projeto Anterior:
                          </span>
                          <span className="text-yellow-600">
                            {log.details?.projeto?.statusProjetoAnterior ||
                              "N/A"}
                          </span>
                          <span className="font-medium">
                            Status Projeto Novo:
                          </span>
                          <span className="text-green-600">
                            {log.details?.projeto?.statusProjetoNovo || "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "inserção de link de compartilhamento" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Link Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.linkAnterior || "N/A"}
                          </span>
                          <span className="font-medium">Link Novo:</span>
                          <span className="text-green-600">
                            {log.details?.linkNovo || "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "envio para aprovação" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Arquivos:</span>
                          <span>
                            {log.details?.arquivos?.map((file, index) => (
                              <div
                                key={index}
                                className="flex flex-wrap gap-x-2"
                              >
                                <span className="font-medium">Nome:</span>
                                <span>{file.nome || "Não informado"}</span>
                                <span className="font-medium">
                                  Páginas Anteriores:
                                </span>
                                <span className="text-yellow-600">
                                  {file.paginasAnteriores || "N/A"}
                                </span>
                                <span className="font-medium">
                                  Páginas Novas:
                                </span>
                                <span className="text-green-600">
                                  {file.paginasNovas || "N/A"}
                                </span>
                                <span className="font-medium">
                                  Valor Anterior:
                                </span>
                                <span className="text-yellow-600">
                                  U$ {file.valorAnterior?.toFixed(2) || "0.00"}
                                </span>
                                <span className="font-medium">Valor Novo:</span>
                                <span className="text-green-600">
                                  U$ {file.valorNovo?.toFixed(2) || "0.00"}
                                </span>
                              </div>
                            )) || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Total Anterior:</span>
                          <span className="text-yellow-600">
                            U${" "}
                            {log.details?.totalAnterior?.toFixed(2) || "0.00"}
                          </span>
                          <span className="font-medium">Total Novo:</span>
                          <span className="text-green-600">
                            U$ {log.details?.totalNovo?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de páginas do projeto" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Arquivos:</span>
                          <span>
                            {log.details?.arquivos?.map((file, index) => (
                              <div
                                key={index}
                                className="flex flex-wrap gap-x-2"
                              >
                                <span className="font-medium">Nome:</span>
                                <span>{file.nome || "Não informado"}</span>
                                <span className="font-medium">
                                  Páginas Anteriores:
                                </span>
                                <span className="text-yellow-600">
                                  {file.paginasAnteriores || "N/A"}
                                </span>
                                <span className="font-medium">
                                  Páginas Novas:
                                </span>
                                <span className="text-green-600">
                                  {file.paginasNovas || "N/A"}
                                </span>
                                <span className="font-medium">
                                  Valor Anterior:
                                </span>
                                <span className="text-yellow-600">
                                  U$ {file.valorAnterior?.toFixed(2) || "0.00"}
                                </span>
                                <span className="font-medium">Valor Novo:</span>
                                <span className="text-green-600">
                                  U$ {file.valorNovo?.toFixed(2) || "0.00"}
                                </span>
                              </div>
                            )) || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Total Anterior:</span>
                          <span className="text-yellow-600">
                            U${" "}
                            {log.details?.totalAnterior?.toFixed(2) || "0.00"}
                          </span>
                          <span className="font-medium">Total Novo:</span>
                          <span className="text-green-600">
                            U$ {log.details?.totalNovo?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status de pagamento" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome ||
                                log.details?.projeto ||
                                "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.statusAnterior ||
                                log.details?.projeto?.statusAnterior ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.statusNovo ||
                                log.details?.projeto?.statusNovo ||
                                "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor:
                            </span>
                            <span className="text-gray-800">
                              U${" "}
                              {log.details?.valor?.toFixed(2) ||
                                log.details?.projeto?.valor?.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                        </div>
                        {log.details?.divergencia && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">
                                Páginas Divergentes:
                              </span>
                              <span className="text-red-600">
                                {log.details?.divergencia?.paginas || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">
                                Motivo:
                              </span>
                              <span className="text-red-600">
                                {log.details?.divergencia?.motivo || "N/A"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Conversão Monetária */}
      {showConvertCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
            <h3 className="text-xl font-semibold text-center mb-6 bg-blue-50 py-2 rounded-lg">
              Alterar Conversão Monetária
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newConvertCurrency}
                    onChange={() => setNewConvertCurrency(true)}
                    className="form-radio text-blue-600"
                  />
                  <span>Com Conversão</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!newConvertCurrency}
                    onChange={() => setNewConvertCurrency(false)}
                    className="form-radio text-blue-600"
                  />
                  <span>Sem Conversão</span>
                </label>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleConvertCurrencyUpdate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowConvertCurrencyModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prioridade */}
      {showPriorityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
            <h3 className="text-xl font-semibold text-center mb-6 bg-blue-50 py-2 rounded-lg">
              Alterar Prioridade
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newPriority}
                    onChange={() => setNewPriority(true)}
                    className="form-radio text-blue-600"
                  />
                  <span>Com Prioridade</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!newPriority}
                    onChange={() => setNewPriority(false)}
                    className="form-radio text-blue-600"
                  />
                  <span>Sem Prioridade</span>
                </label>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handlePriorityUpdate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowPriorityModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Língua de Origem */}
      {showSourceLanguageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
            <h3 className="text-xl font-semibold text-center mb-6 bg-blue-50 py-2 rounded-lg">
              Alterar Língua de Origem
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newSourceLanguage === "Português"}
                    onChange={() => setNewSourceLanguage("Português")}
                    className="form-radio text-blue-600"
                  />
                  <span>Português</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={newSourceLanguage === "Espanhol"}
                    onChange={() => setNewSourceLanguage("Espanhol")}
                    className="form-radio text-blue-600"
                  />
                  <span>Espanhol</span>
                </label>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleSourceLanguageUpdate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowSourceLanguageModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ProjectDetails);
