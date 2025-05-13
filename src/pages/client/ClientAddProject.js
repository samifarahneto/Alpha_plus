import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faClock,
  faCircle,
  faLightbulb,
  faCheckCircle,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFileExcel,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { PDFDocument } from "pdf-lib";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const ClientAddProject = () => {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [convertCurrency, setConvertCurrency] = useState(false);
  const [isCertifiedSelected, setIsCertifiedSelected] = useState(true);
  const [files, setFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState([]);
  const [projectName, setProjectName] = useState("");
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [translationRates, setTranslationRates] = useState({
    pttoen: 0,
    esptoen: 0,
  });

  const [isPriority, setIsPriority] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [valuePerPage, setValuePerPage] = useState(0);

  const [projectData, setProjectData] = useState({
    totalPages: 0,
    totalFiles: 0,
    totalValue: 0,
    valuePerPage: 0,
    hasManualQuoteFiles: false,
    projectType: "pdf",
  });

  // Estado necessário para controle do tipo de usuário e direcionamento da coleção
  const [userType, setUserType] = useState("b2c");
  const [registeredByType, setRegisteredByType] = useState("b2c");
  const [canTest, setCanTest] = useState(false);

  const [globalRates, setGlobalRates] = useState({
    b2bTimePercentage: 0,
    b2bPricePercentage: 0,
    b2cTimePercentage: 0,
    b2cPricePercentage: 0,
  });

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproval, setIsApproval] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveAndCheckoutModal, setShowSaveAndCheckoutModal] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const normalize = useCallback((text) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ");
  }, []);

  useEffect(() => {
    const fetchInitialUserData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        try {
          const db = getFirestore();
          console.log("Tentando buscar usuário:", user.email);

          // Primeiro, tentar buscar usando uma query
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log("Dados iniciais do usuário:", {
              email: user.email,
              pttoen: userData.pttoen,
              esptoen: userData.esptoen,
              userType: userData.userType,
              clientType: userData.clientType,
              registeredBy: userData.registeredBy,
              nomeCompleto: userData.nomeCompleto,
              canTest: userData.canTest,
              canTestType: typeof userData.canTest,
            });

            // Definir as taxas iniciais
            setTranslationRates({
              pttoen: Number(userData.pttoen) || 0,
              esptoen: Number(userData.esptoen) || 0,
            });

            setUserType(userData.userType || "b2c");
            const canTestValue =
              userData.canTest === true || userData.canTest === "true";
            console.log("Valor final de canTest:", canTestValue);
            setCanTest(canTestValue);

            // Buscar o tipo do usuário que registrou
            if (userData.registeredBy) {
              const registeredByQuery = query(
                usersRef,
                where("email", "==", userData.registeredBy)
              );
              const registeredBySnapshot = await getDocs(registeredByQuery);
              if (!registeredBySnapshot.empty) {
                const registeredByData = registeredBySnapshot.docs[0].data();
                setRegisteredByType(registeredByData.userType || "b2c");
              }
            }
          } else {
            console.error(
              "Usuário não encontrado na coleção users:",
              user.email
            );
          }
        } catch (error) {
          console.error("Erro ao buscar dados iniciais do usuário:", error);
          console.error("Email do usuário:", user?.email);
        }
      } else {
        console.log("Aguardando autenticação do usuário...");
        setTimeout(() => {
          const currentUser = auth.currentUser;
          if (currentUser) {
            console.log("Usuário encontrado após delay:", currentUser.email);
            fetchInitialUserData();
          } else {
            console.error("Usuário ainda não autenticado após delay");
          }
        }, 1000);
      }
    };

    fetchInitialUserData();
  }, []);

  useEffect(() => {
    const fetchGlobalRates = async () => {
      try {
        const db = getFirestore();
        const priceDocRef = doc(db, "priceperpage", "price");
        const priceDoc = await getDoc(priceDocRef);
        if (priceDoc.exists()) {
          const data = priceDoc.data();
          setGlobalRates({
            b2bTimePercentage: Number(data.b2bTimePercentage) || 0,
            b2bPricePercentage: Number(data.b2bPricePercentage) || 0,
            b2cTimePercentage: Number(data.b2cTimePercentage) || 0,
            b2cPricePercentage: Number(data.b2cPricePercentage) || 0,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar taxas globais:", error);
      }
    };

    fetchGlobalRates();
  }, []);

  const getPriorityIncrease = useCallback(() => {
    // Retorna a porcentagem de aumento baseado no tipo de usuário
    if (userType === "b2b") {
      return globalRates.b2bPricePercentage / 100; // Converte a porcentagem para decimal
    }
    if (userType === "b2c") {
      return globalRates.b2cPricePercentage / 100;
    }
    if (userType === "colab") {
      // Para colaboradores, verifica o tipo do usuário que o registrou
      return registeredByType === "b2b"
        ? globalRates.b2bPricePercentage / 100
        : globalRates.b2cPricePercentage / 100;
    }
    return globalRates.b2cPricePercentage / 100; // fallback para b2c
  }, [userType, registeredByType, globalRates]);

  const calculateValueWithPriority = useCallback(
    (baseValue) => {
      // Se não for prioritário, retorna o valor base
      if (!isPriority) return baseValue;

      // Se for prioritário, aplica o aumento conforme o tipo de usuário
      const increase = getPriorityIncrease();
      return baseValue * (1 + increase);
    },
    [isPriority, getPriorityIncrease]
  );

  const calculateProjectValue = useCallback(
    (sourceLanguage, targetLanguage, translationRates) => {
      if (!sourceLanguage || !targetLanguage || !translationRates) return 0;

      const normalizedSource = normalize(sourceLanguage);
      const normalizedTarget = normalize(targetLanguage);

      console.log("Valores para cálculo:", {
        sourceLanguage,
        targetLanguage,
        normalizedSource,
        normalizedTarget,
        translationRates,
      });

      if (
        normalizedSource === "portugues brasil" &&
        normalizedTarget === "ingles"
      ) {
        return Number(translationRates.pttoen) || 0;
      }
      if (
        normalizedSource === "espanhol america latina" &&
        normalizedTarget === "ingles"
      ) {
        return Number(translationRates.esptoen) || 0;
      }
      return 0;
    },
    [normalize]
  );

  const countPdfPages = async (pdfBlob) => {
    try {
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer, {
        updateMetadata: false,
        ignoreEncryption: true,
      });
      const pageCount = pdfDoc.getPageCount();
      console.log(`PDF ${pdfBlob.name} tem ${pageCount} páginas`);
      return pageCount;
    } catch (error) {
      console.error("Erro ao contar páginas do PDF:", error);
      throw error;
    }
  };

  const fetchTranslationRates = async (userEmail) => {
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log("Dados brutos do usuário:", userData);

        const rates = {
          pttoen: Number(userData.pttoen) || 0,
          esptoen: Number(userData.esptoen) || 0,
        };

        console.log("Taxas processadas:", rates);
        return rates;
      } else {
        console.error("Usuário não encontrado usando email:", userEmail);
        return { pttoen: 0, esptoen: 0 };
      }
    } catch (error) {
      console.error("Erro ao buscar as taxas de tradução:", error);
      return { pttoen: 0, esptoen: 0 };
    }
  };

  useEffect(() => {
    const auth = getAuth();

    const fetchUserData = async () => {
      const user = auth.currentUser;

      if (user) {
        try {
          const db = getFirestore();
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", user.email));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            throw new Error("Documento do usuário não encontrado");
          }

          const userData = querySnapshot.docs[0].data();

          if (!userData) {
            throw new Error("Dados do usuário não encontrados");
          }

          console.log("Dados do usuário encontrados:", {
            email: user.email,
            userType: userData.userType,
            registeredByType: userData.registeredByType,
            registeredBy: userData.registeredBy,
            nomeCompleto: userData.nomeCompleto,
          });

          const userType = userData.userType || "b2c";
          setUserType(userType);

          // Buscar as taxas de tradução
          const rates = await fetchTranslationRates(user.email);
          console.log("Taxas obtidas:", rates);
          setTranslationRates(rates);

          // Calcular o valor por página inicial se as línguas já estiverem selecionadas
          if (sourceLanguage && targetLanguage) {
            const normalizedSource = normalize(sourceLanguage);
            const normalizedTarget = normalize(targetLanguage);

            let value = 0;
            if (
              normalizedSource === "portugues brasil" &&
              normalizedTarget === "ingles"
            ) {
              value = rates.pttoen;
            } else if (
              normalizedSource === "espanhol america latina" &&
              normalizedTarget === "ingles"
            ) {
              value = rates.esptoen;
            }

            console.log("Valor calculado:", {
              normalizedSource,
              normalizedTarget,
              rates,
              value,
            });

            setValuePerPage(
              isPriority ? calculateValueWithPriority(value) : value
            );
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
        }
      }
    };

    fetchUserData();
  }, [
    sourceLanguage,
    targetLanguage,
    isPriority,
    calculateValueWithPriority,
    normalize,
  ]);

  const uploadPDFToFirebase = async (pdfBlob, fileName) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const storage = getStorage();
    const storageRef = ref(storage, `pdfs/${user.uid}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, pdfBlob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress((prev) => ({
            ...prev,
            [fileName.replace(/\.[^/.]+$/, "")]: progress,
          }));
        },
        (error) => {
          console.error("Erro no upload:", error);
          setUploadProgress((prev) => ({
            ...prev,
            [fileName.replace(/\.[^/.]+$/, "")]: -1,
          }));
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error("Erro ao obter URL de download:", error);
            reject(error);
          }
        }
      );
    });
  };

  const convertFilesToPDF = async () => {
    setIsAnalyzing(true);
    const uploadedFiles = [];
    let totalPagesCount = 0;
    let totalValue = 0;

    try {
      const baseValuePerPage = calculateProjectValue(
        sourceLanguage,
        targetLanguage,
        translationRates
      );

      const calculatedValuePerPage = isPriority
        ? calculateValueWithPriority(baseValuePerPage)
        : baseValuePerPage;

      let hasManualQuoteFiles = false;

      for (const file of files) {
        try {
          let pageCount = 0;
          let fileTotal = 0;
          let requiresManualQuote = false;

          if (file.type === "application/pdf") {
            try {
              pageCount = await countPdfPages(file);
              console.log(`Processando PDF ${file.name}:`, {
                pageCount,
                fileSize: file.size,
                fileType: file.type,
              });
            } catch (error) {
              console.error(`Erro ao processar PDF ${file.name}:`, error);
              requiresManualQuote = true;
              hasManualQuoteFiles = true;
            }
          } else if (file.type.startsWith("image/")) {
            pageCount = 1;
            console.log(`Processando imagem ${file.name}:`, {
              pageCount,
              fileSize: file.size,
              fileType: file.type,
            });
          } else {
            requiresManualQuote = true;
            hasManualQuoteFiles = true;
            console.log(`Arquivo ${file.name} requer análise manual:`, {
              fileType: file.type,
            });
          }

          if (!requiresManualQuote) {
            fileTotal = pageCount * calculatedValuePerPage;
            totalPagesCount += pageCount;
            totalValue += fileTotal;
          }

          const downloadURL = await uploadPDFToFirebase(file, file.name);

          uploadedFiles.push({
            name: file.name,
            url: downloadURL,
            pageCount: pageCount,
            valuePerPage: calculatedValuePerPage,
            total: requiresManualQuote ? 0 : fileTotal,
            requiresManualQuote: requiresManualQuote,
          });

          setUploadProgress((prev) => ({
            ...prev,
            [file.name.replace(/\.[^/.]+$/, "")]: 100,
          }));
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file.name}:`, error);
          setUploadProgress((prev) => ({
            ...prev,
            [file.name.replace(/\.[^/.]+$/, "")]: -1,
          }));
        }
      }

      console.log("Resumo do processamento:", {
        totalPagesCount,
        totalValue,
        hasManualQuoteFiles,
        files: uploadedFiles.map((f) => ({
          name: f.name,
          pageCount: f.pageCount,
          requiresManualQuote: f.requiresManualQuote,
        })),
      });

      setProjectData({
        totalPages: totalPagesCount,
        totalFiles: uploadedFiles.length,
        totalValue: totalValue,
        valuePerPage: calculatedValuePerPage,
        hasManualQuoteFiles: hasManualQuoteFiles,
      });

      setConvertedFiles(uploadedFiles);
      setCurrentStep(2);
    } catch (error) {
      console.error("Erro ao processar arquivos:", error);
      alert("Erro ao processar os arquivos. Por favor, tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateForm = () => {
    if (!projectName.trim()) {
      alert("Por favor, insira o nome do projeto.");
      return false;
    }
    if (!sourceLanguage || !targetLanguage) {
      alert("Por favor, selecione os idiomas de origem e destino.");
      return false;
    }
    if (!convertedFiles.length) {
      alert("Por favor, adicione pelo menos um arquivo.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e, isApproval = false) => {
    e?.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const firestore = getFirestore();
      const user = getAuth().currentUser;

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar dados do usuário atual
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Documento do usuário não encontrado");
      }

      const userData = querySnapshot.docs[0].data();

      if (!userData) {
        throw new Error("Dados do usuário não encontrados");
      }

      const batch = writeBatch(firestore);

      // Processa os arquivos mantendo a contagem de páginas dos PDFs
      const processedFiles = convertedFiles.map((file) => ({
        fileUrl: file.url,
        name: file.name,
        pageCount: file.pageCount,
        total: file.total,
        valuePerPage: file.valuePerPage,
      }));

      // Calcular o prazo em dias úteis
      const deadlineDays = calculateDeadline(projectData.totalPages);
      // Não calcular deadlineDate para projetos na coleção b2bsketch
      const deadlineDate = "";

      // Determinar a coleção correta baseado no tipo de usuário e tipo de arquivo
      const collectionName = projectData.hasManualQuoteFiles
        ? isApproval
          ? userType === "b2b" ||
            (userType === "colab" && registeredByType === "b2b")
            ? "b2bdocprojects"
            : "b2cdocprojects"
          : userType === "b2b" ||
            (userType === "colab" && registeredByType === "b2b")
          ? "b2bdocsaved"
          : "b2cdocsaved"
        : userType === "b2b" ||
          (userType === "colab" && registeredByType === "b2b")
        ? canTest && isApproval
          ? "b2bapproved"
          : "b2bsketch"
        : "b2csketch";

      const projectDataToSave = {
        createdAt: serverTimestamp(),
        projectName,
        projectOwner: userData.nomeCompleto || "Autor do Projeto",
        sourceLanguage,
        targetLanguage,
        totalPages: projectData.totalPages,
        totalProjectValue: projectData.totalValue,
        deadline: deadlineDays,
        deadlineDate: deadlineDate,
        isPriority,
        files: processedFiles,
        userEmail: user.email,
        registeredBy: userType === "colab" ? userData.registeredBy : user.email,
        registeredByType:
          userType === "colab" ? registeredByType : userData.userType || "b2c",
        project_status: projectData.hasManualQuoteFiles
          ? isApproval
            ? "Ag. Orçamento"
            : "Rascunho"
          : isApproval
          ? "Em Análise"
          : "Rascunho",
        payment_status: "Pendente",
        translation_status: "N/A",
        valuePerPage: projectData.valuePerPage,
        hasManualQuoteFiles: projectData.hasManualQuoteFiles,
        approvedAt: serverTimestamp(),
        approvedBy: user.email,
        approvedByName: userData.nomeCompleto || "Usuário Aprovador",
        collection: collectionName,
        convertCurrency: convertCurrency,
      };

      // Criar referência para o novo documento
      const projectsRef = collection(firestore, collectionName);
      const projectRef = doc(projectsRef);

      // Adicionar operação de escrita ao batch
      batch.set(projectRef, projectDataToSave);

      // Executar o batch
      await batch.commit();

      // Adicionar log de criação do projeto
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: user.email,
        action: "criação de projeto",
        details: {
          projeto: projectName,
          tipoArquivo: projectData.hasManualQuoteFiles ? "DOCX" : "PDF/Imagens",
          quantidadePaginas: projectData.totalPages || "A ser definido",
          valorTotal: projectData.totalValue || 0,
          idiomaOrigem: sourceLanguage,
          idiomaDestino: targetLanguage,
        },
      };
      await addDoc(collection(firestore, "activity_logs"), logData);

      // Redirecionar para a página de projetos
      navigate("/client/projects");
    } catch (error) {
      console.error("Erro ao salvar projeto:", error);
      alert("Erro ao salvar projeto. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert(
        "Usuário não está logado. Por favor, faça login para aprovar o projeto."
      );
      return;
    }

    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        alert("Usuário não encontrado no banco de dados.");
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Se for colaborador, buscar dados do usuário que o registrou
      let registeredByData = null;
      if (userType === "colab" && userData.registeredBy) {
        const registeredByQuery = query(
          usersRef,
          where("email", "==", userData.registeredBy)
        );
        const registeredBySnapshot = await getDocs(registeredByQuery);
        if (!registeredBySnapshot.empty) {
          registeredByData = registeredBySnapshot.docs[0].data();
        }
      }

      // Se for B2B com canTest ou colaborador de B2B com canTest, mostrar o modal
      if (
        (userType === "b2b" && canTest) ||
        (userType === "colab" && registeredByData && registeredByData.canTest)
      ) {
        setIsApproval(true);
        setIsApprovalModalOpen(true);
        return;
      }

      // Se não for B2B com canTest ou colaborador de B2B com canTest, salvar diretamente
      await saveApprovedProject();
    } catch (error) {
      console.error("Erro ao aprovar o projeto:", error);
      alert("Erro ao aprovar o projeto. Por favor, tente novamente.");
    }
  };

  const handleApproveAndCheckout = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert(
        "Usuário não está logado. Por favor, faça login para aprovar o projeto."
      );
      return;
    }

    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        alert("Usuário não encontrado no banco de dados.");
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Se for colaborador, buscar dados do usuário que o registrou
      let registeredByData = null;
      if (userType === "colab" && userData.registeredBy) {
        const registeredByQuery = query(
          usersRef,
          where("email", "==", userData.registeredBy)
        );
        const registeredBySnapshot = await getDocs(registeredByQuery);
        if (!registeredBySnapshot.empty) {
          registeredByData = registeredBySnapshot.docs[0].data();
        }
      }

      // Se for B2B com canTest ou colaborador de B2B com canTest, mostrar o modal
      if (
        (userType === "b2b" && canTest) ||
        (userType === "colab" && registeredByData && registeredByData.canTest)
      ) {
        setIsApproval(false);
        setIsCheckoutModalOpen(true);
        return;
      }

      // Se não for B2B com canTest ou colaborador de B2B com canTest, salvar diretamente
      await saveProjectAndCheckout();
    } catch (error) {
      console.error("Erro ao aprovar o projeto:", error);
      alert("Erro ao aprovar o projeto. Por favor, tente novamente.");
    }
  };

  const saveApprovedProject = async (isCheckout = false) => {
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("email", "==", getAuth().currentUser.email)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        alert("Usuário não encontrado no banco de dados.");
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Se for colaborador, buscar dados do usuário que o registrou
      let registeredByData = null;
      if (userType === "colab" && userData.registeredBy) {
        const registeredByQuery = query(
          usersRef,
          where("email", "==", userData.registeredBy)
        );
        const registeredBySnapshot = await getDocs(registeredByQuery);
        if (!registeredBySnapshot.empty) {
          registeredByData = registeredBySnapshot.docs[0].data();
        }
      }

      // Processa os arquivos mantendo a contagem de páginas dos PDFs
      const processedFiles = convertedFiles.map((file) => ({
        fileUrl: file.url,
        name: file.name,
        pageCount: file.pageCount,
        total: file.total,
        valuePerPage: file.valuePerPage,
      }));

      // Calcular o prazo em dias úteis
      const deadlineDays = calculateDeadline(projectData.totalPages);

      // Calcular deadlineDate
      let deadlineDate = "";
      if (deadlineDays.includes("dias úteis")) {
        const days = parseInt(deadlineDays.split(" ")[0]);
        if (!isNaN(days)) {
          deadlineDate = calculateDeliveryDate(days);
          console.log("Calculando deadlineDate:", {
            deadlineDays,
            days,
            deadlineDate,
          });
        }
      }

      // Determinar a coleção correta baseada no tipo de usuário
      const collectionName =
        userType === "b2b" ||
        (userType === "colab" && registeredByType === "b2b")
          ? "b2bapproved"
          : "b2capproved";

      const projectDataToSave = {
        createdAt: serverTimestamp(),
        projectName,
        projectOwner: userData.nomeCompleto || "Autor do Projeto",
        sourceLanguage,
        targetLanguage,
        totalPages: projectData.totalPages,
        totalProjectValue: projectData.totalValue,
        deadline: deadlineDays,
        deadlineDate: deadlineDate,
        isPriority,
        files: processedFiles,
        userEmail: getAuth().currentUser.email,
        registeredBy:
          userType === "colab"
            ? userData.registeredBy
            : getAuth().currentUser.email,
        registeredByType:
          userType === "colab" ? registeredByType : userData.userType || "b2c",
        project_status: collectionName.includes("approved")
          ? "Em Análise"
          : "Rascunho",
        payment_status: "Pendente",
        translation_status: "N/A",
        valuePerPage: projectData.valuePerPage,
        hasManualQuoteFiles: projectData.hasManualQuoteFiles,
        approvedAt: serverTimestamp(),
        approvedBy: getAuth().currentUser.email,
        approvedByName: userData.nomeCompleto || "Usuário Aprovador",
        collection: collectionName,
        convertCurrency: convertCurrency,
      };

      console.log("Dados do projeto a serem salvos:", {
        collectionName,
        deadlineDays,
        deadlineDate,
        projectStatus: "Em Análise",
        userType,
        registeredByType,
        canTest,
        isColab: userType === "colab",
        registeredByData: registeredByData
          ? {
              userType: registeredByData.userType,
              canTest: registeredByData.canTest,
            }
          : null,
      });

      await addDoc(collection(db, collectionName), projectDataToSave);
      alert("Projeto aprovado com sucesso!");
      navigate("/client/projects");
    } catch (error) {
      console.error("Erro ao aprovar o projeto:", error);
      alert("Erro ao aprovar o projeto. Por favor, tente novamente.");
    }
  };

  const handleConfirmApprove = () => {
    setIsApprovalModalOpen(false);
    saveApprovedProject();
  };

  const handleConfirmCheckout = () => {
    setIsCheckoutModalOpen(false);
    saveProjectAndCheckout();
  };

  const calculateDeliveryDate = (days) => {
    if (!days || isNaN(days)) {
      return "";
    }

    const currentDate = new Date();
    let businessDays = Math.ceil(parseFloat(days));
    let currentDay = new Date(currentDate);

    // Adiciona um dia para começar a contar do próximo dia útil
    currentDay.setDate(currentDay.getDate() + 1);

    while (businessDays > 0) {
      // Verifica se é dia útil (segunda a sexta)
      if (currentDay.getDay() !== 0 && currentDay.getDay() !== 6) {
        businessDays -= 1;
      }
      if (businessDays > 0) {
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    const day = currentDay.getDate().toString().padStart(2, "0");
    const month = (currentDay.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDay.getFullYear();

    console.log("Calculando data de entrega:", {
      days,
      currentDate: currentDate.toISOString(),
      finalDate: currentDay.toISOString(),
      formattedDate: `${day}/${month}/${year}`,
    });

    return `${day}/${month}/${year}`;
  };

  const saveProjectAndCheckout = async () => {
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("email", "==", getAuth().currentUser.email)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        alert("Usuário não encontrado no banco de dados.");
        return;
      }

      const userData = userSnapshot.docs[0].data();

      // Processa os arquivos mantendo a contagem de páginas dos PDFs
      const processedFiles = convertedFiles.map((file) => ({
        fileUrl: file.url,
        name: file.name,
        pageCount: file.pageCount,
        total: file.total,
        valuePerPage: file.valuePerPage,
      }));

      // Determinar a coleção correta baseada no tipo de usuário e canTest
      const collectionName =
        (userType === "b2b" && canTest) ||
        (userType === "colab" && registeredByType === "b2b" && canTest)
          ? "b2bapproved"
          : userType === "b2b" ||
            (userType === "colab" && registeredByType === "b2b")
          ? "b2bsketch"
          : "b2csketch";

      // Determinar os status corretos baseado na coleção
      const projectStatus =
        (userType === "b2b" && canTest) ||
        (userType === "colab" && registeredByType === "b2b" && canTest)
          ? "Em Análise"
          : "Rascunho";

      // Calcular o deadline e deadlineDate
      const deadlineDays = calculateDeadline(projectData.totalPages);
      let deadlineDate = "";

      // Se for b2bapproved, calcular a data de entrega
      if (
        collectionName === "b2bapproved" &&
        deadlineDays.includes("dias úteis")
      ) {
        const days = parseInt(deadlineDays.split(" ")[0]);
        if (!isNaN(days)) {
          deadlineDate = calculateDeliveryDate(days);
        }
      }

      const projectDataToSave = {
        createdAt: serverTimestamp(),
        projectName,
        projectOwner: userData.nomeCompleto || "Autor do Projeto",
        sourceLanguage,
        targetLanguage,
        totalPages: projectData.totalPages,
        totalProjectValue: projectData.totalValue,
        deadline: deadlineDays,
        deadlineDate: deadlineDate,
        isPriority,
        files: processedFiles,
        userEmail: getAuth().currentUser.email,
        registeredBy:
          userType === "colab"
            ? userData.registeredBy
            : getAuth().currentUser.email,
        registeredByType:
          userType === "colab" ? registeredByType : userData.userType || "b2c",
        project_status: projectStatus,
        payment_status: "Pendente",
        translation_status: "N/A",
        valuePerPage: projectData.valuePerPage,
        hasManualQuoteFiles: projectData.hasManualQuoteFiles,
        approvedAt: serverTimestamp(),
        approvedBy: getAuth().currentUser.email,
        approvedByName: userData.nomeCompleto || "Usuário Aprovador",
        collection: collectionName,
        convertCurrency: convertCurrency,
      };

      const projectRef = await addDoc(
        collection(db, collectionName),
        projectDataToSave
      );
      alert(
        collectionName === "b2bapproved"
          ? "Projeto aprovado com sucesso!"
          : "Projeto salvo com sucesso!"
      );
      navigate("/client/checkout", {
        state: { selectedProjects: [projectRef.id] },
      });
    } catch (error) {
      console.error("Erro ao salvar o projeto:", error);
      alert("Erro ao salvar o projeto. Por favor, tente novamente.");
    }
  };

  const calculateDeadline = useCallback(
    (totalPages) => {
      // Verificar se há arquivos que requerem análise manual
      const hasManualQuoteFiles = files.some(
        (file) => file.requiresManualQuote
      );

      if (hasManualQuoteFiles) {
        return "A ser definido";
      }

      let days;
      // Primeiro define o prazo normal
      if (totalPages <= 5) days = 5;
      else if (totalPages <= 20) days = 10;
      else if (totalPages <= 50) days = 12;
      else if (totalPages <= 90) days = 17;
      else if (totalPages <= 130) days = 25;
      else days = 30;

      // Se for projeto prioritário, reduz o prazo baseado no tipo de usuário
      if (isPriority) {
        let reductionPercentage;

        if (userType === "b2b") {
          reductionPercentage = globalRates.b2bTimePercentage;
        } else if (userType === "b2c") {
          reductionPercentage = globalRates.b2cTimePercentage;
        } else if (userType === "colab") {
          // Para colaboradores, usa a taxa baseada no tipo do usuário que o registrou
          reductionPercentage =
            registeredByType === "b2b"
              ? globalRates.b2bTimePercentage
              : globalRates.b2cTimePercentage;
        } else {
          reductionPercentage = globalRates.b2cTimePercentage; // fallback para b2c
        }

        days = Math.ceil(days * (1 - reductionPercentage / 100));
      }

      return `${days} dias úteis`;
    },
    [isPriority, files, userType, registeredByType, globalRates]
  );

  const handleSourceLanguageChange = (event) => {
    setSourceLanguage(event.target.value);
  };

  const handleTargetLanguageChange = (event) => {
    setTargetLanguage(event.target.value);
  };

  const handleCurrencyChange = (event) => {
    setConvertCurrency(event.target.checked);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const newFiles = Array.from(event.dataTransfer.files);
    const instantQuoteTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
    ];

    const validFiles = newFiles.filter(
      (file) => !files.some((existingFile) => existingFile.name === file.name)
    );

    validFiles.forEach((file) => {
      file.requiresManualQuote = !instantQuoteTypes.includes(file.type);
    });

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    const instantQuoteTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
    ];

    const validFiles = newFiles.filter(
      (file) => !files.some((existingFile) => existingFile.name === file.name)
    );

    validFiles.forEach((file) => {
      file.requiresManualQuote = !instantQuoteTypes.includes(file.type);
    });

    // Inicializa o progresso para cada arquivo válido
    validFiles.forEach((file) => {
      setUploadProgress((prev) => ({
        ...prev,
        [file.name.replace(/\.[^/.]+$/, "")]: 0,
      }));
    });

    // Verifica se há arquivos DOCX
    const hasDocxFiles = validFiles.some(
      (file) =>
        file.name.toLowerCase().endsWith(".docx") ||
        file.name.toLowerCase().endsWith(".doc")
    );

    // Atualiza o projectData com o tipo de projeto
    setProjectData((prev) => ({
      ...prev,
      projectType: hasDocxFiles ? "docx" : "pdf",
      hasManualQuoteFiles: hasDocxFiles,
    }));

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    event.target.value = null;
  };

  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Modificar o useEffect que atualiza os valores quando a prioridade muda
  useEffect(() => {
    if (
      !convertedFiles.length ||
      !sourceLanguage ||
      !targetLanguage ||
      !translationRates
    )
      return;

    const baseValuePerPage = calculateProjectValue(
      sourceLanguage,
      targetLanguage,
      translationRates
    );

    const calculatedValuePerPage = isPriority
      ? calculateValueWithPriority(baseValuePerPage)
      : baseValuePerPage;

    // Atualizar os arquivos apenas se houver mudança real no valor
    if (calculatedValuePerPage !== valuePerPage) {
      const updatedFiles = convertedFiles.map((file) => ({
        ...file,
        valuePerPage: calculatedValuePerPage,
        total: file.pageCount * calculatedValuePerPage,
      }));

      setConvertedFiles(updatedFiles);

      const totalValue = updatedFiles.reduce(
        (sum, file) => sum + file.total,
        0
      );

      setProjectData((prevData) => ({
        ...prevData,
        totalValue,
        valuePerPage: calculatedValuePerPage,
      }));

      setValuePerPage(calculatedValuePerPage);
    }
  }, [
    isPriority,
    sourceLanguage,
    targetLanguage,
    translationRates,
    calculateProjectValue,
    calculateValueWithPriority,
    convertedFiles,
    valuePerPage,
  ]);

  const getDiscountPercentages = () => {
    if (userType === "b2b") {
      return {
        time: globalRates.b2bTimePercentage,
        price: globalRates.b2bPricePercentage,
      };
    } else if (userType === "b2c") {
      return {
        time: globalRates.b2cTimePercentage,
        price: globalRates.b2cPricePercentage,
      };
    } else if (userType === "colab") {
      return registeredByType === "b2b"
        ? {
            time: globalRates.b2bTimePercentage,
            price: globalRates.b2bPricePercentage,
          }
        : {
            time: globalRates.b2cTimePercentage,
            price: globalRates.b2cPricePercentage,
          };
    }
    return { time: 0, price: 0 };
  };

  const resetForm = () => {
    setSourceLanguage("");
    setTargetLanguage("");
    setConvertCurrency(false);
    setIsCertifiedSelected(true);
    setFiles([]);
    setConvertedFiles([]);
    setProjectName("");
    setIsPriority(false);
    setUploadProgress({});
    setValuePerPage(0);
    setProjectData({
      totalPages: 0,
      totalFiles: 0,
      totalValue: 0,
      valuePerPage: 0,
      hasManualQuoteFiles: false,
      projectType: "pdf",
    });
    setCurrentStep(1);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    try {
      setIsLoading(true);
      setShowSaveModal(false);
      await handleSubmit(null, false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndCheckoutClick = () => {
    setShowSaveAndCheckoutModal(true);
  };

  const handleConfirmSaveAndCheckout = async () => {
    try {
      setIsLoading(true);
      setShowSaveAndCheckoutModal(false);
      await saveProjectAndCheckout();
    } catch (error) {
      console.error("Erro ao salvar e redirecionar:", error);
      alert("Erro ao processar. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    return (
      <div className="w-full max-w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {currentStep === 1 ? "Criar Projeto" : "Resumo do Projeto"}
        </h1>

        <div className="flex flex-col lg:flex-row justify-center items-start gap-4 md:gap-[20px]">
          {/* Step 1 - Tipos de Arquivos */}
          <div className="w-full lg:w-[300px] p-3 md:p-4 shadow-lg rounded-lg bg-white h-[750px]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <FontAwesomeIcon icon={faLightbulb} className="text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-800">
                Tipos de Arquivos
              </h2>
            </div>

            {/* Conteúdo Principal */}
            <div className="h-[calc(100%-50px)] flex flex-col">
              {/* Seção de Orçamento Instantâneo */}
              <div className="flex-none">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faBolt}
                      className="text-green-600 text-sm"
                    />
                  </div>
                  <h4 className="font-medium text-gray-800">
                    Orçamento Instantâneo
                  </h4>
                </div>
                <ul className="space-y-1 ml-8 mb-3">
                  <li className="flex items-center gap-2 text-gray-600">
                    <FontAwesomeIcon
                      icon={faFilePdf}
                      className="text-red-500 text-sm"
                    />
                    <span>PDF</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <FontAwesomeIcon
                      icon={faFileImage}
                      className="text-blue-500 text-sm"
                    />
                    <span>Imagens (JPG, PNG, GIF)</span>
                  </li>
                </ul>
                <div className="flex justify-center gap-3 mb-4">
                  <div className="w-[90px] h-[90px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFilePdf}
                      className="text-red-500 text-3xl"
                    />
                  </div>
                  <div className="w-[90px] h-[90px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFileImage}
                      className="text-blue-500 text-3xl"
                    />
                  </div>
                </div>
              </div>

              {/* Divisória */}
              <div className="border-t border-gray-200 mb-4"></div>

              {/* Seção de Orçamento Manual */}
              <div className="flex-none">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="text-orange-600 text-sm"
                    />
                  </div>
                  <h4 className="font-medium text-gray-800">
                    Orçamento Manual
                  </h4>
                </div>
                <ul className="space-y-1 ml-8 mb-3">
                  <li className="flex items-center gap-2 text-gray-600">
                    <FontAwesomeIcon
                      icon={faFileWord}
                      className="text-blue-600 text-sm"
                    />
                    <span>Documentos Word (DOC, DOCX)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <FontAwesomeIcon
                      icon={faFileExcel}
                      className="text-green-600 text-sm"
                    />
                    <span>Planilhas Excel (XLS, XLSX)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <FontAwesomeIcon
                      icon={faCircle}
                      className="text-orange-500 text-[8px]"
                    />
                    <span>Outros formatos</span>
                  </li>
                </ul>
                <div className="flex justify-center gap-3 mb-4">
                  <div className="w-[90px] h-[90px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFileWord}
                      className="text-blue-600 text-3xl"
                    />
                  </div>
                  <div className="w-[90px] h-[90px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFileExcel}
                      className="text-green-600 text-3xl"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Dica Útil */}
              <div className="flex-none mt-auto">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 justify-center">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="text-blue-600"
                    />
                    <h4 className="font-medium text-gray-800">Dica Útil</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Para converter seus arquivos para PDF, utilize o{" "}
                    <a
                      href="https://www.ilovepdf.com/pt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      iLovePDF
                    </a>
                    , uma ferramenta online gratuita e fácil de usar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 - Formulário de Criação */}
          <div className="w-full lg:w-[500px] p-4 md:p-5 shadow-lg rounded-lg bg-white h-auto lg:h-[750px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Informações do Projeto
              </h2>
            </div>

            <form className="flex flex-col flex-1 relative">
              <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-[5px]">
                <div className="flex flex-col gap-1">
                  <span className="text-md text-gray-800">Nome do Projeto</span>
                  <input
                    type="text"
                    id="projectName"
                    name="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Digite o nome do projeto"
                    className="p-2.5 rounded border border-gray-300 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-md text-gray-800">
                    Língua de Origem
                  </span>
                  <select
                    id="sourceLanguage"
                    name="sourceLanguage"
                    value={sourceLanguage}
                    onChange={handleSourceLanguageChange}
                    className="p-2.5 rounded border border-gray-300 text-sm"
                  >
                    <option value="" disabled>
                      Selecionar
                    </option>
                    <option value="Português (Brasil)">
                      Português (Brasil)
                    </option>
                    <option value="Espanhol (América Latina)">
                      Espanhol (América Latina)
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-md text-gray-800">
                    Língua de Destino
                  </span>
                  <select
                    id="targetLanguage"
                    name="targetLanguage"
                    value={targetLanguage}
                    onChange={handleTargetLanguageChange}
                    className="p-2.5 rounded border border-gray-300 text-sm"
                  >
                    <option value="" disabled>
                      Selecionar
                    </option>
                    <option value="Inglês">Inglês</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-md text-gray-800">
                    Conversão Monetária
                  </span>
                  <input
                    type="checkbox"
                    id="convertCurrency"
                    name="convertCurrency"
                    checked={convertCurrency}
                    onChange={handleCurrencyChange}
                    className="cursor-pointer"
                  />
                  <div
                    className="w-5 h-5 rounded-full bg-gray-200 flex justify-center items-center text-sm text-gray-700 cursor-pointer relative flex-shrink-0"
                    title="Converter Real(R$) para Dólar(U$)"
                  >
                    ℹ
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-md text-gray-800">
                    Certificado nos EUA
                  </span>
                  <input
                    type="checkbox"
                    checked={isCertifiedSelected}
                    onChange={() => setIsCertifiedSelected((prev) => !prev)}
                    className="cursor-pointer"
                  />
                  <div
                    className="w-5 h-5 rounded-full bg-gray-200 flex justify-center items-center text-sm text-gray-700 cursor-pointer relative flex-shrink-0"
                    title="Certificado nos EUA"
                  >
                    ℹ
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-gray-300 p-[40px] text-center rounded-lg cursor-pointer bg-white relative"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <p className="text-sm text-gray-600">
                    Arraste e solte arquivos aqui ou clique para selecionar
                  </p>
                </div>

                {/* Seção de Arquivos */}
                <div className="border-b border-gray-100 pb-4 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Arquivos Selecionados
                    </span>
                    <span className="text-gray-800 font-medium">
                      {files.length} arquivo(s)
                    </span>
                  </div>
                  {files.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsFileModalOpen(true);
                          return false;
                        }}
                        className="w-full mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="text-sm"
                        />
                        Visualizar Arquivos ({files.length})
                      </button>
                      {/* Barra de Progresso */}
                      {isAnalyzing &&
                        Object.values(uploadProgress).length > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">
                                Progresso Total
                              </span>
                              <span className="text-xs font-medium text-blue-600">
                                {Object.values(uploadProgress).some(
                                  (progress) => progress === -1
                                )
                                  ? "Erro"
                                  : `${Math.round(
                                      (Object.values(uploadProgress).reduce(
                                        (a, b) => a + (b >= 0 ? b : 0),
                                        0
                                      ) /
                                        (Object.values(uploadProgress).length *
                                          100)) *
                                        100
                                    )}%`}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  Object.values(uploadProgress).some(
                                    (progress) => progress === -1
                                  )
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                                }`}
                                style={{
                                  width: `${
                                    (Object.values(uploadProgress).reduce(
                                      (a, b) => a + (b >= 0 ? b : 0),
                                      0
                                    ) /
                                      (Object.values(uploadProgress).length *
                                        100)) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={convertFilesToPDF}
                    disabled={!files.length || isAnalyzing || currentStep === 2}
                    className={`px-4 py-1.5 text-white border-none rounded-lg text-sm font-medium cursor-pointer w-[200px] transition-all duration-300 flex items-center justify-center gap-2 ${
                      !files.length || isAnalyzing || currentStep === 2
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isAnalyzing
                      ? "Analisando..."
                      : currentStep === 2
                      ? "Análise Concluída"
                      : "Analisar Documentos"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Step 3 - Resumo do Projeto */}
          <div className="w-full lg:w-[700px] p-4 md:p-5 shadow-lg rounded-lg bg-white h-auto lg:h-[750px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Resumo do Projeto
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
              {/* Botão de Prioridade */}
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => setIsPriority((prev) => !prev)}
                  className={`inline-flex px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 items-center gap-2 w-[250px] justify-center
                    ${
                      isPriority
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-400 text-gray-600 hover:bg-gray-100 "
                    }`}
                >
                  <div className="flex items-center gap-1">
                    {isPriority ? "⭐" : "☆"}
                    <span>Adicionar Prioridade</span>
                    {isPriority && <span className="text-amber-700">✓</span>}
                  </div>
                </button>
              </div>

              {/* Seção de Identificação */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Nome do Projeto
                    </span>
                    <span className="text-gray-800 font-medium">
                      {projectName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Língua de Origem
                    </span>
                    <span className="text-gray-800">
                      {sourceLanguage || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Língua de Destino
                    </span>
                    <span className="text-gray-800">
                      {targetLanguage || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção de Configurações */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Tipo de Tradução
                    </span>
                    <span className="text-gray-800">
                      {isCertifiedSelected
                        ? "Certificada nos EUA"
                        : "Não Certificada"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Conversão Monetária
                    </span>
                    <span className="text-gray-800">
                      {convertCurrency ? "Sim" : "Não"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção de Arquivos */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">
                    Total de Páginas
                  </span>
                  <span className="text-gray-800 font-medium">
                    {projectData.hasManualQuoteFiles
                      ? "Análise Manual"
                      : projectData.totalPages > 0
                      ? projectData.totalPages
                      : "—"}
                  </span>
                </div>
                {convertedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsFileModalOpen(true);
                      return false;
                    }}
                    className="w-full mt-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="text-sm" />
                    Visualizar Arquivos ({convertedFiles.length})
                  </button>
                )}
              </div>

              {/* Seção de Valores e Prazos */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Valor por Página
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800">
                        {projectData.valuePerPage > 0
                          ? `U$ ${projectData.valuePerPage.toFixed(2)}`
                          : "—"}
                      </span>
                      {isPriority && projectData.valuePerPage > 0 && (
                        <span className="text-xs text-green-600">
                          +{getDiscountPercentages().price}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">
                      Prazo de Entrega
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800">
                        {projectData.hasManualQuoteFiles
                          ? "A Definir"
                          : projectData.totalPages > 0
                          ? calculateDeadline(projectData.totalPages)
                          : "—"}
                      </span>
                      {isPriority &&
                        projectData.totalPages > 0 &&
                        !projectData.hasManualQuoteFiles && (
                          <span className="text-xs text-red-600">
                            -{getDiscountPercentages().time}%
                          </span>
                        )}
                    </div>
                  </div>

                  {projectData.totalPages > 0 &&
                    !projectData.hasManualQuoteFiles && (
                      <div className="text-sm text-gray-500 text-green-700 text-right">
                        Previsão de entrega:{" "}
                        {(() => {
                          const days = isPriority
                            ? Number(
                                calculateDeadline(projectData.totalPages).split(
                                  " "
                                )[0]
                              )
                            : Number(
                                calculateDeadline(projectData.totalPages).split(
                                  " "
                                )[0]
                              );
                          return calculateDeliveryDate(days);
                        })()}
                      </div>
                    )}
                </div>
              </div>

              {/* Total do Projeto */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">
                    Total do Projeto
                  </span>
                  <span className="text-xl font-semibold text-gray-900">
                    {projectData.hasManualQuoteFiles
                      ? "Ag. Orçamento"
                      : projectData.totalValue > 0
                      ? `U$ ${projectData.totalValue.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ação - Agora fixos no bottom */}
            {convertedFiles.length > 0 && (
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Resetar
                  </button>
                  {projectData.hasManualQuoteFiles ||
                  projectData.projectType === "docx" ? (
                    <>
                      <button
                        onClick={() => {
                          setIsApproval(false);
                          handleSubmit(null, false);
                        }}
                        disabled={isSubmitting && !isApproval}
                        className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                        {isSubmitting && !isApproval ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        onClick={() => {
                          setIsApproval(true);
                          handleSubmit(null, true);
                        }}
                        className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Solicitar Orçamento
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveClick}
                        className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                        Salvar
                      </button>
                      {(userType === "b2b" && canTest) ||
                      (userType === "colab" &&
                        registeredByType === "b2b" &&
                        canTest) ? (
                        <>
                          <button
                            onClick={handleApprove}
                            className="flex-1 px-4 py-2 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Aprovar
                          </button>
                          <button
                            onClick={handleApproveAndCheckout}
                            className="flex-1 px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Aprovar e Pagar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveAndCheckoutClick}
                            className="flex-1 px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Salvar e Pagar
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Arquivos */}
        {isFileModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                setIsFileModalOpen(false);
              }
            }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Arquivos do Projeto
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Nome do Arquivo
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-20">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentStep === 1 ? files : convertedFiles).map(
                        (file, index) => (
                          <tr key={index} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate text-left">
                                    {(() => {
                                      const maxNameLength = 40;
                                      const [name, extension] =
                                        file.name.split(/\.(?=[^.]+$)/);
                                      if (name.length > maxNameLength) {
                                        return `${name.slice(
                                          0,
                                          maxNameLength
                                        )}... .${extension}`;
                                      }
                                      return file.name;
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentStep === 1) {
                                    handleRemoveFile(index);
                                  } else {
                                    const newFiles = convertedFiles.filter(
                                      (_, i) => i !== index
                                    );
                                    setConvertedFiles(newFiles);
                                    const newTotalPages = newFiles.reduce(
                                      (sum, file) =>
                                        sum +
                                        (file.requiresManualQuote
                                          ? 0
                                          : file.pageCount),
                                      0
                                    );
                                    const newTotalValue = newFiles.reduce(
                                      (sum, file) =>
                                        sum +
                                        (file.requiresManualQuote
                                          ? 0
                                          : file.total),
                                      0
                                    );
                                    setProjectData((prev) => ({
                                      ...prev,
                                      totalPages: newTotalPages,
                                      totalValue: newTotalValue,
                                    }));
                                  }
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-transparent"
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="w-5 h-5"
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer com botão Fechar */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsFileModalOpen(false)}
                    className="w-[150px] px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Salvar */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${
            showSaveModal ? "block" : "hidden"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Confirmar Salvamento
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    Ao salvar o projeto, ele será armazenado como rascunho e
                    você poderá editá-lo posteriormente.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal para Salvar e Pagar */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${
            showSaveAndCheckoutModal ? "block" : "hidden"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Confirmar Salvamento e Pagamento
                </h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    Ao confirmar, o projeto será salvo e você será redirecionado
                    para a página de pagamento.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowSaveAndCheckoutModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSaveAndCheckout}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isLoading ? "Processando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Aprovação */}
        {isApprovalModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Confirmar Aprovação
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-orange-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    Ao confirmar a aprovação, o projeto será liberado para
                    tradução e não poderá mais ser cancelado. Sendo os custos de
                    tradução considerados devidos.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCheckoutModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Confirmar Aprovação
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-orange-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    Ao confirmar a aprovação, o projeto será liberado para
                    tradução e você será redirecionado para a página de
                    pagamento. Sendo os custos de tradução considerados devidos.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCheckout}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Aprovar e Pagar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
};

// Exportação fora de qualquer bloco de código
export default ClientAddProject;
