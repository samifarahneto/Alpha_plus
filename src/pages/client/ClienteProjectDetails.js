import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "firebase/firestore";
import { IoIosArrowBack } from "react-icons/io";
import {
  FaEdit,
  FaDownload,
  FaInfoCircle,
  FaFileAlt,
  FaUser,
  FaGlobeAmericas,
  FaGlobe,
  FaExchangeAlt,
  FaStar,
  FaClock,
  FaCalendar,
  FaMoneyBillWave,
  FaCreditCard,
  FaCalendarAlt,
  FaUndo,
  FaCheck,
} from "react-icons/fa";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const ClienteProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditLanguageModal, setShowEditLanguageModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newSourceLanguage, setNewSourceLanguage] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const firestore = getFirestore();

        const urlParams = new URLSearchParams(window.location.search);
        const collectionFromUrl = urlParams.get("collection");

        const collections = [
          "b2bdocprojects",
          "b2bapproval",
          "b2bprojects",
          "b2bapproved",
          "b2bprojectspaid",
          "b2cdocprojects",
          "b2capproval",
          "b2cprojects",
          "b2capproved",
          "b2cprojectspaid",
          "b2bdocsaved",
          "b2cdocsaved",
          "b2bsketch",
          "b2csketch",
        ];

        let projectDoc = null;

        if (collectionFromUrl) {
          projectDoc = await getDoc(
            doc(firestore, collectionFromUrl, projectId)
          );
          if (projectDoc.exists()) {
            setProject({
              id: projectId,
              collection: collectionFromUrl,
              ...projectDoc.data(),
            });
            setLoading(false);
            return;
          }
        }

        for (const collectionName of collections) {
          if (collectionName === collectionFromUrl) continue;
          projectDoc = await getDoc(doc(firestore, collectionName, projectId));
          if (projectDoc.exists()) {
            setProject({
              id: projectId,
              collection: collectionName,
              ...projectDoc.data(),
            });
            setLoading(false);
            return;
          }
        }

        console.error("Projeto não encontrado em nenhuma coleção!");
        navigate("/client/projects");
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar detalhes do projeto:", error);
        setLoading(false);
        navigate("/client/projects");
      }
    };

    const fetchUserData = async () => {
      const userQuery = query(
        collection(getFirestore(), "users"),
        where("email", "==", project?.userEmail)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        setUserData(userSnapshot.docs[0].data());
      }
    };

    if (projectId) {
      fetchProjectDetails();
      if (project?.userEmail) {
        fetchUserData();
      }
    }
  }, [projectId, navigate, project?.userEmail]);

  const calculateTotalPages = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce(
      (total, file) => total + (Number(file.pageCount) || 0),
      0
    );
  };

  const hasZeroPages = (files) => {
    return files.some((file) => file.pageCount === 0);
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

  const getFileDownloadUrl = async (fileUrl) => {
    try {
      const storage = getStorage();
      const filePath = fileUrl.split("/o/")[1]?.split("?")[0];
      if (!filePath) return fileUrl;

      const decodedPath = decodeURIComponent(filePath);
      const fileRef = ref(storage, decodedPath);

      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Erro ao obter URL do arquivo:", error);
      return fileUrl;
    }
  };

  const calculateDeliveryDate = (days) => {
    if (!days || isNaN(days)) {
      return "";
    }

    const currentDate = new Date();
    let businessDays = Math.ceil(parseFloat(days));
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
  };

  const handleProjectNameUpdate = async () => {
    try {
      const firestore = getFirestore();
      let projectRef = null;
      let projectDoc = null;

      if (!project.collection) {
        const collections = [
          "projects",
          "clientprojects",
          "budget",
          "docprojects",
          "approval",
        ];

        for (const collection of collections) {
          projectRef = doc(firestore, collection, projectId);
          projectDoc = await getDoc(projectRef);
          if (projectDoc.exists()) {
            project.collection = collection;
            break;
          }
        }

        if (!projectDoc || !projectDoc.exists()) {
          throw new Error("Projeto não encontrado em nenhuma coleção");
        }
      } else {
        projectRef = doc(firestore, project.collection, projectId);
        projectDoc = await getDoc(projectRef);
      }

      await updateDoc(projectRef, {
        projectName: newProjectName,
      });

      setProject({
        ...project,
        projectName: newProjectName,
      });

      setShowEditNameModal(false);
      alert("Nome do projeto atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar o nome do projeto:", error);
      alert("Erro ao atualizar o nome do projeto. Tente novamente.");
    }
  };

  const handleProjectApproval = async () => {
    try {
      const firestore = getFirestore();
      const usersRef = collection(firestore, "users");

      // Buscar informações do usuário
      const userQuery = query(
        usersRef,
        where("email", "==", project.userEmail)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        throw new Error("Usuário não encontrado");
      }

      const userData = userSnapshot.docs[0].data();
      let targetCollection;

      // Determinar a coleção correta baseada no tipo de usuário
      if (
        userData.userType === "b2b" ||
        (userData.userType === "colab" && userData.registeredByType === "b2b")
      ) {
        targetCollection = "b2bapproved";
      } else if (
        userData.userType === "b2c" ||
        (userData.userType === "colab" && userData.registeredByType === "b2c")
      ) {
        targetCollection = "b2capproved";
      } else {
        throw new Error("Tipo de usuário não reconhecido");
      }

      console.log("Coleção de origem:", project.collection);
      console.log("Coleção de destino:", targetCollection);

      // Verificar se o documento existe na coleção de origem
      let sourceRef = doc(firestore, project.collection, projectId);
      const sourceDoc = await getDoc(sourceRef);

      if (!sourceDoc.exists()) {
        // Tentar encontrar o documento em outras coleções possíveis
        const possibleCollections = ["b2bapproval", "b2capproval"];
        let foundDoc = null;
        let foundCollection = null;

        for (const collection of possibleCollections) {
          const docRef = doc(firestore, collection, projectId);
          const docSnapshot = await getDoc(docRef);
          if (docSnapshot.exists()) {
            foundDoc = docSnapshot;
            foundCollection = collection;
            break;
          }
        }

        if (!foundDoc) {
          throw new Error(
            "Documento não encontrado em nenhuma coleção de aprovação"
          );
        }

        // Atualizar a referência do documento
        sourceRef = doc(firestore, foundCollection, projectId);
      }

      // Criar o documento na coleção correta
      const targetRef = collection(firestore, targetCollection);
      const newProjectRef = doc(targetRef, projectId);

      // Calcular o prazo em dias úteis
      const deadlineDays = project.deadline;
      const deadlineDate = calculateDeliveryDate(
        Number(deadlineDays.split(" ")[0])
      );

      // Atualizar o status do projeto
      const updatedProject = {
        ...project,
        id: projectId,
        status: "Aprovado",
        approvedAt: serverTimestamp(),
        approvedBy: project.userEmail,
        deadline: deadlineDays,
        deadlineDate: deadlineDate,
        collection: targetCollection,
        project_status: "Em Análise",
        payment_status: "Pendente",
        translation_status: "N/A",
      };

      // Primeiro, salvar na nova coleção
      console.log("Salvando na nova coleção...");
      await setDoc(newProjectRef, updatedProject);
      console.log("Documento salvo na nova coleção");

      // Depois, deletar da coleção de origem
      console.log("Deletando da coleção de origem...");
      try {
        await deleteDoc(sourceRef);
        console.log("Documento deletado com sucesso da coleção de origem");
      } catch (deleteError) {
        console.error("Erro ao deletar da coleção de origem:", deleteError);
        throw new Error("Falha ao deletar o documento da coleção de origem");
      }

      // Adicionar log de aprovação do projeto
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: project.userEmail,
        action: "aprovação de projeto",
        details: {
          projeto: project.projectName || "Sem Nome",
          valorTotal:
            project.totalProjectValue || calculateTotalValue(project.files),
          prazo: deadlineDays,
          dataPrazo: deadlineDate,
          idiomaOrigem: project.sourceLanguage,
          idiomaDestino: project.targetLanguage,
          quantidadePaginas:
            project.totalPages || calculateTotalPages(project.files),
          status: "aprovado",
        },
      };
      await addDoc(collection(firestore, "activity_logs"), logData);

      setShowApprovalModal(false);
      alert("Projeto aprovado com sucesso!");

      // Redirecionar para a página de projetos
      window.location.href = "/client/projects";
    } catch (error) {
      console.error("Erro ao aprovar o projeto:", error);
      alert("Erro ao aprovar o projeto. Tente novamente.");
    }
  };

  const handleRequestQuote = async () => {
    try {
      const db = getFirestore();
      const projectRef = doc(db, project.collection, projectId);

      await updateDoc(projectRef, {
        project_status: "Ag. Orçamento",
        translation_status: "N/A",
      });

      const newCollection =
        project.collection === "b2bdocsaved"
          ? "b2bdocprojects"
          : "b2cdocprojects";
      const newProjectRef = doc(db, newCollection, projectId);

      await setDoc(newProjectRef, {
        ...project,
        project_status: "Ag. Orçamento",
        translation_status: "N/A",
        collection: newCollection,
      });

      await deleteDoc(projectRef);

      setProject((prev) => ({
        ...prev,
        project_status: "Ag. Orçamento",
        translation_status: "N/A",
        collection: newCollection,
      }));

      alert("Solicitação de orçamento enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao solicitar orçamento:", error);
      alert("Erro ao solicitar orçamento. Por favor, tente novamente.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "A definir";

    try {
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString("pt-BR");
      }

      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString("pt-BR");
      }

      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (isNaN(date.getTime()) || timestamp === "Invalid Date") {
          return "A definir";
        }
        return date.toLocaleDateString("pt-BR");
      }

      return "A definir";
    } catch (error) {
      return "A definir";
    }
  };

  const truncateFileName = (name) => {
    if (name.length > 40) {
      return name.substring(0, 37) + "...";
    }
    return name;
  };

  const handleSourceLanguageUpdate = async () => {
    try {
      const firestore = getFirestore();
      let projectRef = null;
      let projectDoc = null;

      if (!project.collection) {
        const collections = [
          "projects",
          "clientprojects",
          "budget",
          "docprojects",
          "approval",
        ];

        for (const collection of collections) {
          projectRef = doc(firestore, collection, projectId);
          projectDoc = await getDoc(projectRef);
          if (projectDoc.exists()) {
            project.collection = collection;
            break;
          }
        }

        if (!projectDoc || !projectDoc.exists()) {
          throw new Error("Projeto não encontrado em nenhuma coleção");
        }
      } else {
        projectRef = doc(firestore, project.collection, projectId);
        projectDoc = await getDoc(projectRef);
      }

      await updateDoc(projectRef, {
        sourceLanguage: newSourceLanguage,
      });

      setProject({
        ...project,
        sourceLanguage: newSourceLanguage,
      });

      setShowEditLanguageModal(false);
      alert("Língua de origem atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar a língua de origem:", error);
      alert("Erro ao atualizar a língua de origem. Tente novamente.");
    }
  };

  const handleRefundRequest = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      const refundValue = Number(calculateCorrectTotalValue());

      await updateDoc(projectRef, {
        payment_status: "Em Reembolso",
        project_status: "Cancelado",
        translation_status: "Cancelado",
        refundValue: refundValue,
        refundRequestedAt: serverTimestamp(),
      });

      // Atualizar o estado local
      setProject((prev) => ({
        ...prev,
        payment_status: "Em Reembolso",
        project_status: "Cancelado",
        translation_status: "Cancelado",
        refundValue: refundValue,
      }));

      setShowRefundModal(false);
      alert("Solicitação de reembolso realizada com sucesso!");
    } catch (error) {
      console.error("Erro ao solicitar reembolso:", error);
      alert("Erro ao solicitar reembolso. Por favor, tente novamente.");
    }
  };

  // Nova função para cancelar projeto não pago
  const handleCancelProject = async () => {
    try {
      const firestore = getFirestore();
      const projectRef = doc(firestore, project.collection, projectId);

      await updateDoc(projectRef, {
        project_status: "Cancelado",
        translation_status: "Cancelado",
        payment_status: "Pendente",
      });

      // Atualizar o estado local
      setProject((prev) => ({
        ...prev,
        project_status: "Cancelado",
        translation_status: "Cancelado",
        payment_status: "Pendente",
      }));

      setShowRefundModal(false);
      alert("Projeto cancelado com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar projeto:", error);
      alert("Erro ao cancelar projeto. Por favor, tente novamente.");
    }
  };

  // Função para verificar se o projeto foi pago
  const isProjectPaid = () => {
    // Verifica se tem data de pagamento ou se está em coleção paga
    return (
      (typeof project.payment_status === "object" &&
        project.payment_status.paymentDate) ||
      project.collection === "b2bprojectspaid" ||
      project.collection === "b2cprojectspaid" ||
      project.paidAt
    );
  };

  // Função para calcular o valor total correto do projeto
  const calculateCorrectTotalValue = () => {
    // Se o projeto foi reembolsado, usar o valor original
    if (
      typeof project.payment_status === "object" &&
      project.payment_status.status === "Reembolsado"
    ) {
      return Number(project.payment_status.originalAmount || 0).toFixed(2);
    }

    // Se o projeto foi pago e tem informações de pagamento estruturadas
    if (
      typeof project.payment_status === "object" &&
      project.payment_status.totalPayment
    ) {
      return Number(project.payment_status.totalPayment).toFixed(2);
    }

    // Se o projeto NÃO foi pago anteriormente, calcular: páginas × valor por página
    if (!isProjectPaid()) {
      const totalPages = calculateTotalPages(project.files);
      const valuePerPage =
        project.files && project.files.length > 0
          ? Number(project.files[0].valuePerPage) || 0
          : 0;
      return (totalPages * valuePerPage).toFixed(2);
    }

    // Fallback para valores já salvos no projeto
    return Number(
      project.totalProjectValue ||
        project.totalValue ||
        calculateTotalValue(project.files)
    ).toFixed(2);
  };

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

  const formatDeadlineDate = (dateString) => {
    if (
      !dateString ||
      dateString === "A definir" ||
      dateString === "Não definido"
    ) {
      return "A definir";
    }

    try {
      // Se a data vier no formato ISO (YYYY-MM-DD)
      if (dateString.includes("T")) {
        const date = new Date(dateString);
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }

      // Se a data vier no formato brasileiro (DD/MM/YYYY)
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
      }

      return dateString;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "A definir";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Carregando...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Carregando...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-0 md:px-8 py-4 md:py-8 space-y-4 md:space-y-8">
      <div className="glass-card bg-white rounded-xl shadow-lg py-4 px-0 md:p-6">
        {/* Header com Botão Voltar e Título */}
        <div className="flex items-center mb-4 md:mb-6 relative">
          <div
            className="flex items-center cursor-pointer hover:text-blue-600 transition-colors absolute left-4 md:left-0"
            onClick={() => navigate(-1)}
          >
            <IoIosArrowBack size={20} className="mr-1 md:mr-2" />
            <span className="text-base md:text-lg font-semibold">Voltar</span>
          </div>

          <h1 className="text-xl md:text-3xl font-bold flex-1 text-center bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Detalhes do Projeto
          </h1>
        </div>

        {/* Container Principal */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 space-y-4 md:space-y-8">
          {/* Grid de Informações Básicas */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Primeira Div - Informações do Projeto */}
            <div className="w-full md:w-2/3 bg-gray-50 rounded-xl p-4 md:p-6 space-y-4 md:space-y-8">
              <h3 className="text-base md:text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <FaInfoCircle className="text-blue-600" />
                Informações do Projeto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {/* Nome do Projeto */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaFileAlt className="text-blue-600" />
                    Nome do Projeto
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base text-gray-800">
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
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaUser className="text-blue-600" />
                    Cliente (Email)
                  </h3>
                  <span className="text-sm md:text-base text-gray-800 break-all">
                    {project.userEmail}
                  </span>
                </div>

                {/* Língua de Origem */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaGlobeAmericas className="text-blue-600" />
                    Língua de Origem
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base text-gray-800">
                      {project.sourceLanguage || "N/A"}
                    </span>
                    <FaEdit
                      className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={() => {
                        setNewSourceLanguage(project.sourceLanguage || "");
                        setShowEditLanguageModal(true);
                      }}
                    />
                  </div>
                </div>

                {/* Língua de Destino */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaGlobe className="text-blue-600" />
                    Língua de Destino
                  </h3>
                  <span className="text-sm md:text-base text-gray-800">
                    {project.targetLanguage || "N/A"}
                  </span>
                </div>

                {/* Conversão Monetária */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
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
                  </div>
                </div>

                {/* Prioridade */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
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
                  </div>
                </div>

                {/* Prazo */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaClock className="text-blue-600" />
                    Prazo
                  </h3>
                  <span className="text-gray-800">
                    {formatDeadlineDate(project.deadlineDate) ||
                      formatDeadlineDate(project.deadline)}
                  </span>
                </div>

                {/* Data de Recebimento */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaCalendar className="text-blue-600" />
                    Data de Recebimento
                  </h3>
                  <span className="text-sm md:text-base text-gray-800">
                    {formatDate(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Segunda Div - Informações Financeiras */}
            <div className="w-full md:w-1/3 bg-green-50 rounded-xl p-4 md:p-6 space-y-4 md:space-y-8">
              <h3 className="text-base md:text-lg font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" />
                Informações Financeiras
              </h3>
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {/* Status de Pagamento */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 border-b pb-1 flex items-center gap-2">
                    <FaCreditCard className="text-green-600" />
                    Status de Pagamento
                  </h3>
                  <div className="flex justify-start">
                    <span
                      className={`w-full px-2 py-1 rounded-full border text-center text-xs font-medium ${
                        project.payment_status === "Pago" || project.isPaid
                          ? "bg-green-50 text-green-700 border-green-200"
                          : project.payment_status === "Em Reembolso"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : typeof project.payment_status === "object" &&
                            project.payment_status.status === "Reembolsado"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : typeof project.payment_status === "object" &&
                            project.payment_status.status === "Divergência"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : project.payment_status === "Pendente"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {typeof project.payment_status === "object"
                        ? project.payment_status.status
                        : project.payment_status || "N/A"}
                    </span>
                  </div>
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

                {/* Informações de Pagamento */}
                <div className="bg-white p-3 rounded-lg shadow-sm min-h-[85px]">
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                    <FaCalendarAlt className="text-green-600" />
                    Informações de Pagamento
                  </h3>
                  <div className="grid grid-cols-[80px_auto] gap-2 text-xs md:text-sm">
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
                      <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 border-b pb-1 flex items-center gap-2">
                        <FaUndo className="text-green-600" />
                        Detalhes do Reembolso
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
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
          {/* Seção de Arquivos */}
          <div className="space-y-4">
            <h2 className="text-lg md:text-2xl font-semibold text-blue-600 flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              Arquivos Originais
            </h2>

            {/* Seção do Link do Projeto */}
            {(typeof project.payment_status === "object"
              ? project.payment_status.status === "Pago"
              : project.payment_status === "Pago") &&
              project.shareLink && (
                <div className="bg-white rounded-xl p-4 md:p-6 space-y-4 border border-gray-200">
                  <h3 className="text-base md:text-lg font-semibold text-gray-700">
                    Link do Projeto Concluído
                  </h3>
                  <div className="text-sm md:text-base text-gray-600">
                    <strong>Link Atual:</strong>{" "}
                    <a
                      href={project.shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors break-all"
                    >
                      {project.shareLink}
                    </a>
                  </div>
                </div>
              )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs md:text-sm font-medium text-gray-600">
                      Nome do Arquivo
                    </th>
                    <th className="px-4 py-2 text-center text-xs md:text-sm font-medium text-gray-600 w-16 md:w-24">
                      Páginas
                    </th>
                    <th className="px-4 py-2 text-center text-xs md:text-sm font-medium text-gray-600 w-24 md:w-32">
                      Língua de Origem
                    </th>
                    <th className="px-4 py-2 text-center text-xs md:text-sm font-medium text-gray-600 w-24 md:w-32">
                      Língua de Destino
                    </th>
                    <th className="px-4 py-2 text-right text-xs md:text-sm font-medium text-gray-600 w-24 md:w-32">
                      Valor (U$)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {project.files.map((file) => (
                    <tr
                      key={file.fileUrl}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2 w-48 md:w-64">
                        <button
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
                          className="flex items-center justify-between w-full text-blue-600 hover:text-blue-800 transition-colors cursor-pointer text-xs md:text-sm bg-transparent border-none p-0"
                          title={file.name}
                        >
                          <span className="truncate mr-2">
                            {truncateFileName(file.name)}
                          </span>
                          <FaDownload className="text-xs md:text-sm flex-shrink-0" />
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center text-xs md:text-sm">
                        {file.pageCount}
                      </td>
                      <td className="px-4 py-2 text-center text-xs md:text-sm">
                        {project.sourceLanguage}
                      </td>
                      <td className="px-4 py-2 text-center text-xs md:text-sm">
                        {project.targetLanguage}
                      </td>
                      <td className="px-4 py-2 text-right text-xs md:text-sm">
                        U${" "}
                        {Number(file.total || file.totalValue || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Resumo Financeiro */}
          <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-50 rounded-lg gap-2 md:gap-0">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <span className="text-sm md:text-base text-gray-700 font-semibold">
                  Total de Páginas:
                </span>
                <span className="text-sm md:text-base text-gray-800">
                  {calculateTotalPages(project.files)}
                </span>
              </div>
              {typeof project.payment_status === "object" &&
                project.payment_status.divergencePayment > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Páginas Divergentes:
                      </span>
                      <span className="text-sm md:text-base text-gray-800">
                        {project.payment_status.pages}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base text-gray-700 font-semibold">
                        Valor Divergência:
                      </span>
                      <span className="text-sm md:text-base text-gray-800">
                        U${" "}
                        {Number(
                          project.payment_status.divergencePayment
                        ).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              <div className="flex items-center justify-between">
                <span className="text-sm md:text-base text-gray-700 font-semibold">
                  Valor Total:
                </span>
                <span className="text-sm md:text-base text-gray-800">
                  U$ {calculateCorrectTotalValue()}
                </span>
              </div>
            </div>
          </div>

          {/* Seção de Divergência (se aplicável) */}
          {typeof project.payment_status === "object" &&
            project.payment_status.status === "Divergência" && (
              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <h2 className="text-xl font-semibold mb-4 text-red-700 flex items-center gap-2">
                  <FaInfoCircle className="text-red-700" />
                  Informações da Divergência
                </h2>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                          Páginas Divergentes
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                          Motivo
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                          Valor por Página
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                          Valor Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2 text-sm">
                          {project.payment_status.pages}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {project.payment_status.reason}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          U${" "}
                          {(
                            Number(
                              project.totalProjectValue || project.totalValue
                            ) / calculateTotalPages(project.files)
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-red-700 font-bold">
                          U${" "}
                          {(
                            (Number(
                              project.totalProjectValue || project.totalValue
                            ) /
                              calculateTotalPages(project.files)) *
                            (calculateTotalPages(project.files) +
                              Number(project.payment_status.pages))
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-center mt-6 gap-4">
                  <button
                    onClick={() => {
                      const totalPages = calculateTotalPages(project.files);
                      const divergencePages = Number(
                        project.payment_status.pages
                      );
                      const valuePerPage =
                        project.files && project.files.length > 0
                          ? Number(project.files[0].valuePerPage) || 0
                          : 0;

                      // Se o projeto NÃO foi pago anteriormente, enviar valor total
                      // Se JÁ foi pago, enviar apenas valor da divergência
                      const paymentValue = !isProjectPaid()
                        ? (
                            (totalPages + divergencePages) *
                            valuePerPage
                          ).toFixed(2) // Valor total
                        : (divergencePages * valuePerPage).toFixed(2); // Apenas divergência

                      console.log("Cálculo do valor para pagamento:", {
                        totalPages,
                        divergencePages,
                        valuePerPage,
                        isProjectPaid: isProjectPaid(),
                        paymentValue,
                        type: !isProjectPaid()
                          ? "valor_total"
                          : "apenas_divergencia",
                      });

                      navigate("/client/checkout", {
                        state: {
                          selectedProjects: [projectId],
                          isDivergencePayment: true,
                          divergenceValue: paymentValue,
                        },
                      });
                    }}
                    className="w-[350px] bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <FaCreditCard />
                    {!isProjectPaid()
                      ? "Pagar Projeto Completo"
                      : "Pagar Valor da Divergência"}
                  </button>
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="w-[350px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <FaUndo />
                    {isProjectPaid()
                      ? "Cancelar e Pedir Reembolso"
                      : "Cancelar"}
                  </button>
                </div>
              </div>
            )}
          {/* Seção de Ações */}
          <div className="flex justify-center">
            {userData?.canTest === true &&
            project.collection === "b2bapproval" ? (
              <div className="flex gap-4 flex-col md:flex-row">
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-blue-500 text-white text-sm md:text-base rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <FaCheck />
                  Aprovar
                </button>
                <button
                  onClick={async () => {
                    // Primeiro aprova o projeto
                    await handleProjectApproval();
                    // Depois redireciona para o checkout
                    setTimeout(() => {
                      navigate("/client/checkout", {
                        state: {
                          selectedProjects: [projectId],
                          collection: "b2bapproved", // já será movido para b2bapproved
                        },
                      });
                    }, 1000); // Pequeno delay para garantir que a aprovação foi processada
                  }}
                  className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-green-500 text-white text-sm md:text-base rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <FaCreditCard />
                  Aprovar e Pagar
                </button>
              </div>
            ) : (
              <>
                {(typeof project.payment_status === "object" &&
                  project.payment_status.status === "Reembolsado") ||
                project.payment_status === "Reembolsado" ? (
                  <button
                    disabled
                    className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-gray-500 text-white text-sm md:text-base rounded-lg border-none cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaUndo />
                    Reembolsado
                  </button>
                ) : (typeof project.payment_status === "object" &&
                    project.payment_status.status === "Pago") ||
                  project.payment_status === "Pago" ? (
                  <button
                    disabled
                    className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-gray-500 text-white text-sm md:text-base rounded-lg border-none cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaCreditCard />
                    Pago
                  </button>
                ) : project.project_status === "Ag. Aprovação" ? (
                  <button
                    onClick={() => {
                      navigate("/client/checkout", {
                        state: {
                          selectedProjects: [projectId],
                          collection: project.collection,
                        },
                      });
                    }}
                    className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-blue-500 text-white text-sm md:text-base rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <FaCreditCard />
                    Ir para Pagamento
                  </button>
                ) : project.collection === "b2bdocprojects" ||
                  project.collection === "b2cdocprojects" ? (
                  <button
                    disabled
                    className="w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 bg-gray-500 text-white text-sm md:text-base rounded-lg border-none cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaClock />
                    Aguardando Orçamento
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (
                        project.collection === "b2bdocsaved" ||
                        project.collection === "b2cdocsaved"
                      ) {
                        handleRequestQuote();
                      } else {
                        navigate("/client/checkout", {
                          state: {
                            selectedProjects: [projectId],
                            collection: project.collection,
                          },
                        });
                      }
                    }}
                    disabled={
                      project.collection === "b2bdocsaved" ||
                      project.collection === "b2cdocsaved"
                        ? false
                        : project.collection === "b2bdocprojects" ||
                          project.collection === "b2cdocprojects" ||
                          hasZeroPages(project.files) ||
                          (typeof project.payment_status === "object" &&
                            project.payment_status.status === "Divergência") ||
                          (typeof project.payment_status === "object" &&
                            project.payment_status.status === "Pago") ||
                          project.payment_status === "Pago"
                    }
                    className={`w-full md:w-[350px] px-4 md:px-6 py-2 md:py-3 text-white text-sm md:text-base rounded-lg border-none transition-colors duration-200 flex items-center justify-center gap-2 ${
                      project.collection === "b2bdocsaved" ||
                      project.collection === "b2cdocsaved"
                        ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                        : project.collection === "b2bdocprojects" ||
                          project.collection === "b2cdocprojects" ||
                          hasZeroPages(project.files) ||
                          (typeof project.payment_status === "object" &&
                            project.payment_status.status === "Divergência") ||
                          (typeof project.payment_status === "object" &&
                            project.payment_status.status === "Pago") ||
                          project.payment_status === "Pago"
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                    }`}
                  >
                    {project.collection === "b2bdocsaved" ||
                    project.collection === "b2cdocsaved" ? (
                      <>
                        <FaFileAlt />
                        Solicitar Orçamento
                      </>
                    ) : project.collection === "b2bdocprojects" ||
                      project.collection === "b2cdocprojects" ? (
                      <>
                        <FaClock />
                        Aguardando Orçamento
                      </>
                    ) : hasZeroPages(project.files) ? (
                      <>
                        <FaClock />
                        Aguardando orçamento
                      </>
                    ) : typeof project.payment_status === "object" &&
                      project.payment_status.status === "Divergência" ? (
                      <>
                        <FaCreditCard />
                        Ag. Pagamento da divergência
                      </>
                    ) : (typeof project.payment_status === "object" &&
                        project.payment_status.status === "Pago") ||
                      project.payment_status === "Pago" ? (
                      <>
                        <FaCreditCard />
                        Pago
                      </>
                    ) : (
                      <>
                        <FaCreditCard />
                        Ir para pagamento
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {showApprovalModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 md:p-5 rounded-lg shadow-lg w-full max-w-[384px] text-center">
            <h3 className="mt-0 bg-green-500 text-white p-2 rounded text-center text-sm md:text-base">
              Confirmar Aprovação
            </h3>

            <div className="my-4 md:my-5 flex flex-col items-center gap-3 w-fit mx-auto">
              <p className="text-sm md:text-base">
                Tem certeza que deseja aprovar este projeto?
              </p>
            </div>

            <div className="flex justify-center mt-4 md:mt-5 gap-8 md:gap-12">
              <button
                onClick={handleProjectApproval}
                className="px-3 py-1 bg-green-500 border-none rounded-full cursor-pointer shadow-sm text-white text-sm md:text-base"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-1 bg-red-500 border-none rounded-full cursor-pointer shadow-sm text-white text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditNameModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 md:p-5 rounded-lg shadow-lg w-full max-w-[384px] text-center">
            <h3 className="mt-0 bg-blue-200 p-2 rounded text-center text-sm md:text-base">
              Editar Nome do Projeto
            </h3>

            <div className="my-4 md:my-5 flex flex-col items-center gap-3 w-fit mx-auto">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Digite o novo nome do projeto"
                className="w-full md:w-72 p-2 rounded border border-gray-300 text-sm md:text-base"
              />
            </div>

            <div className="flex justify-center mt-4 md:mt-5 gap-8 md:gap-12">
              <button
                onClick={handleProjectNameUpdate}
                className="px-3 py-1 bg-blue-50 border border-gray-400 rounded-full cursor-pointer shadow-sm text-black text-sm md:text-base"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowEditNameModal(false)}
                className="px-3 py-1 bg-blue-50 border border-gray-400 rounded-full cursor-pointer shadow-sm text-black text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditLanguageModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 md:p-5 rounded-lg shadow-lg w-full max-w-[384px] text-center">
            <h3 className="mt-0 bg-blue-200 p-2 rounded text-center text-sm md:text-base">
              Editar Língua de Origem
            </h3>

            <div className="my-4 md:my-5 flex flex-col items-center gap-3 w-fit mx-auto">
              <select
                value={newSourceLanguage}
                onChange={(e) => setNewSourceLanguage(e.target.value)}
                className="w-full md:w-72 p-2 rounded border border-gray-300 text-sm md:text-base"
              >
                <option value="Português (Brasil)">Português (Brasil)</option>
                <option value="Espanhol (América Latina)">
                  Espanhol (América Latina)
                </option>
              </select>
            </div>

            <div className="flex justify-center mt-4 md:mt-5 gap-8 md:gap-12">
              <button
                onClick={handleSourceLanguageUpdate}
                className="px-3 py-1 bg-blue-50 border border-gray-400 rounded-full cursor-pointer shadow-sm text-black text-sm md:text-base"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowEditLanguageModal(false)}
                className="px-3 py-1 bg-blue-50 border border-gray-400 rounded-full cursor-pointer shadow-sm text-black text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reembolso */}
      {showRefundModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 md:p-5 rounded-lg shadow-lg w-full max-w-[384px] text-center">
            <h3 className="mt-0 bg-blue-200 p-2 rounded text-center text-sm md:text-base">
              {isProjectPaid()
                ? "Confirmar Cancelamento e Reembolso"
                : "Confirmar Cancelamento"}
            </h3>

            <div className="my-4 md:my-5 flex flex-col items-center gap-3 w-fit mx-auto">
              <p className="text-sm md:text-base">
                {isProjectPaid()
                  ? "Ao cancelar e pedir o reembolso, você será extornado do valor pago e seu projeto será cancelado."
                  : "Tem certeza que deseja cancelar este projeto?"}
              </p>
              {isProjectPaid() && (
                <p className="text-base md:text-lg font-bold text-blue-600">
                  Valor do Reembolso: U$ {calculateCorrectTotalValue()}
                </p>
              )}
            </div>

            <div className="flex justify-center mt-4 md:mt-5 gap-8 md:gap-12">
              <button
                onClick={
                  isProjectPaid() ? handleRefundRequest : handleCancelProject
                }
                className="px-3 py-1 bg-blue-500 border-none rounded-full cursor-pointer shadow-sm text-white text-sm md:text-base"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-3 py-1 bg-red-500 border-none rounded-full cursor-pointer shadow-sm text-white text-sm md:text-base"
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

export default ClienteProjectDetails;
