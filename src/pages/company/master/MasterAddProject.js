import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
  runTransaction,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const MasterAddProject = () => {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [convertCurrency] = useState(false);
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

  const [projectData, setProjectData] = useState({
    totalPages: 0,
    totalFiles: 0,
    totalValue: 0,
    valuePerPage: 0,
    hasManualQuoteFiles: false,
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);

  // NOVO: Estado para o email do usuário a ser inserido manualmente
  const [userEmail, setUserEmail] = useState("");
  const [userEmailError, setUserEmailError] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      // NOVO: Não busca o usuário logado, mas sim o email inserido manualmente
      if (!userEmail) return; // Espera o email ser inserido

      try {
        const db = getFirestore();
        console.log("Tentando buscar usuário:", userEmail);

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          console.log("Dados iniciais do usuário:", {
            email: userEmail,
            pttoen: userData.pttoen,
            esptoen: userData.esptoen,
            userType: userData.userType,
            clientType: userData.clientType,
            registeredBy: userData.registeredBy,
            nomeCompleto: userData.nomeCompleto,
            canTest: userData.canTest,
            canTestType: typeof userData.canTest,
          });

          setTranslationRates({
            pttoen: Number(userData.pttoen) || 0,
            esptoen: Number(userData.esptoen) || 0,
          });

          setUserType(userData.userType || "b2c");
          const canTestValue =
            userData.canTest === true || userData.canTest === "true";
          console.log("Valor final de canTest:", canTestValue);
          setCanTest(canTestValue);

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
          setUserEmailError(""); // Limpa erro se o email for encontrado
        } else {
          console.error("Usuário não encontrado na coleção users:", userEmail);
          setUserEmailError(
            "Email do usuário não encontrado no banco de dados."
          );
          // Resetar taxas e tipo de usuário se o email não for encontrado
          setTranslationRates({ pttoen: 0, esptoen: 0 });
          setUserType("b2c");
          setRegisteredByType("b2c");
          setCanTest(false);
        }
      } catch (error) {
        console.error("Erro ao buscar dados iniciais do usuário:", error);
        setUserEmailError(
          "Erro ao buscar dados do usuário. Verifique o email."
        );
        setTranslationRates({ pttoen: 0, esptoen: 0 });
        setUserType("b2c");
        setRegisteredByType("b2c");
        setCanTest(false);
      }
    };

    fetchInitialUserData();
  }, [userEmail]); // Depende do userEmail

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
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      return pdfDoc.getPageCount();
    } catch (error) {
      console.error("Erro ao contar páginas do PDF:", error);
      throw error;
    }
  };

  const fetchTranslationRates = async (email) => {
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
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
        console.error("Usuário não encontrado usando email:", email);
        return { pttoen: 0, esptoen: 0 };
      }
    } catch (error) {
      console.error("Erro ao buscar as taxas de tradução:", error);
      return { pttoen: 0, esptoen: 0 };
    }
  };

  useEffect(() => {
    // Removido o uso de getAuth().currentUser aqui
    // A busca de dados do usuário agora depende do estado userEmail
    if (userEmail) {
      const fetchUserData = async () => {
        try {
          const db = getFirestore();
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", userEmail));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            throw new Error("Documento do usuário não encontrado");
          }

          const userData = querySnapshot.docs[0].data();

          if (!userData) {
            throw new Error("Dados do usuário não encontrados");
          }

          console.log("Dados do usuário encontrados:", {
            email: userEmail,
            userType: userData.userType,
            registeredByType: userData.registeredByType,
            registeredBy: userData.registeredBy,
            nomeCompleto: userData.nomeCompleto,
          });

          const userType = userData.userType || "b2c";
          setUserType(userType);

          const rates = await fetchTranslationRates(userEmail);
          console.log("Taxas obtidas:", rates);
          setTranslationRates(rates);

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
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
        }
      };

      fetchUserData();
    }
  }, [
    userEmail, // Adicionado userEmail como dependência
    sourceLanguage,
    targetLanguage,
    isPriority,
    calculateValueWithPriority,
    normalize,
  ]);

  const uploadFileToFirebase = async (fileBlob, fileName) => {
    // NOVO: Usa o userEmail inserido manualmente para o caminho do storage
    if (!userEmail) {
      console.error("Tentativa de upload sem email do usuário definido.");
      throw new Error("Email do usuário não definido. Insira o email.");
    }

    const storage = getStorage();
    // Usando o email como parte do caminho para organizar os arquivos
    const storageRef = ref(
      storage,
      `uploads/${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}/${fileName}`
    );
    console.log(`Iniciando upload para: ${storageRef.fullPath}`);

    const uploadTask = uploadBytesResumable(storageRef, fileBlob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload de ${fileName}: ${progress}% concluído`);
          setUploadProgress((prev) => ({
            ...prev,
            [fileName.replace(/\.[^/.]+$/, "")]: progress,
          }));
        },
        (error) => {
          console.error(
            `Erro no upload do arquivo ${fileName} para ${storageRef.fullPath}:`,
            error
          );
          let userMessage = `Falha no upload de ${fileName}.`;
          if (error.code === "storage/unauthorized") {
            userMessage +=
              " Verifique as permissões de acesso no Firebase Storage.";
          } else if (error.code === "storage/canceled") {
            userMessage += " O upload foi cancelado.";
          } else {
            userMessage += " Tente novamente mais tarde.";
          }
          console.error("Mensagem para usuário:", userMessage);

          setUploadProgress((prev) => ({
            ...prev,
            [fileName.replace(/\.[^/.]+$/, "")]: -1,
          }));
          reject(new Error(userMessage));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(
              `Arquivo ${fileName} enviado com sucesso: ${downloadURL}`
            );
            resolve(downloadURL);
          } catch (error) {
            console.error(
              `Erro ao obter URL de download para ${fileName}:`,
              error
            );
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

          const canCountPages =
            file.type === "application/pdf" || file.type.startsWith("image/");

          if (canCountPages) {
            if (file.type === "application/pdf") {
              try {
                pageCount = await countPdfPages(file);
                console.log(`PDF ${file.name} tem ${pageCount} páginas`);
              } catch (error) {
                console.warn(
                  `Não foi possível contar páginas do PDF ${file.name}, marcando para cotação manual:`,
                  error
                );
                requiresManualQuote = true;
              }
            } else if (file.type.startsWith("image/")) {
              pageCount = 1; // Imagens são contadas como 1 página
            }
          } else {
            // Arquivos que não são PDF ou imagem requerem cotação manual
            requiresManualQuote = true;
          }

          if (!requiresManualQuote) {
            fileTotal = pageCount * calculatedValuePerPage;
            totalPagesCount += pageCount;
            totalValue += fileTotal;
          } else {
            hasManualQuoteFiles = true;
          }

          const downloadURL = await uploadFileToFirebase(file, file.name);

          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            pages: pageCount,
            value: fileTotal,
            downloadURL: downloadURL,
            requiresManualQuote: requiresManualQuote,
          });
        } catch (uploadError) {
          console.error(
            `Erro ao processar o arquivo ${file.name}:`,
            uploadError
          );
          // Se houver erro no upload, ainda adiciona o arquivo para que o usuário possa ver o erro
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            pages: 0,
            value: 0,
            downloadURL: null,
            requiresManualQuote: true, // Marca para cotação manual em caso de erro de upload
            error: uploadError.message,
          });
          hasManualQuoteFiles = true;
        }
      }

      setConvertedFiles(uploadedFiles);
      setProjectData({
        totalPages: totalPagesCount,
        totalFiles: uploadedFiles.length,
        totalValue: totalValue,
        valuePerPage: calculatedValuePerPage,
        hasManualQuoteFiles: hasManualQuoteFiles,
      });
      setCurrentStep(2);
    } catch (error) {
      console.error("Erro durante a conversão e análise de arquivos:", error);
      alert("Erro ao analisar os arquivos. Por favor, tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setConvertedFiles((prevConvertedFiles) =>
      prevConvertedFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleProjectNameChange = (event) => {
    setProjectName(event.target.value);
  };

  const handleSourceLanguageChange = (event) => {
    setSourceLanguage(event.target.value);
  };

  const handleTargetLanguageChange = (event) => {
    setTargetLanguage(event.target.value);
  };

  const handleIsCertifiedChange = (event) => {
    setIsCertifiedSelected(event.target.value === "true");
  };

  const handleIsPriorityChange = (event) => {
    setIsPriority(event.target.checked);
  };

  const handleUserEmailChange = (event) => {
    const value = event.target.value;
    setUserEmail(value);
    setUserEmailError(""); // Limpa o erro ao digitar

    // Buscar sugestões de email se o valor tiver pelo menos 3 caracteres
    if (value.length >= 3) {
      fetchUserSuggestions(value);
    } else {
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const fetchUserSuggestions = async (searchTerm) => {
    try {
      const db = getFirestore();
      const usersRef = collection(db, "users");

      // Buscar usuários cujo email começa com o termo de busca
      // Firestore não suporta diretamente LIKE, então usamos >= e <= para simular
      const startValue = searchTerm.toLowerCase();
      const endValue = startValue + "\uf8ff"; // Caractere Unicode alto para simular LIKE

      const q = query(
        usersRef,
        where("email", ">=", startValue),
        where("email", "<=", endValue)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const suggestions = querySnapshot.docs.map((doc) => ({
          email: doc.data().email,
          nomeCompleto: doc.data().nomeCompleto || "",
        }));

        setUserSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Erro ao buscar sugestões de usuários:", error);
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (email) => {
    setUserEmail(email);
    setShowSuggestions(false);
  };

  const renderFileIcon = (fileType) => {
    if (fileType.includes("pdf")) {
      return faFilePdf;
    } else if (fileType.includes("image")) {
      return faFileImage;
    } else if (
      fileType.includes("word") ||
      fileType.includes("document") ||
      fileType.includes("text")
    ) {
      return faFileWord;
    } else if (fileType.includes("excel") || fileType.includes("sheet")) {
      return faFileExcel;
    } else {
      return faFileWord; // Ícone padrão para outros tipos
    }
  };

  // Função para gerar número de projeto
  const generateProjectNumber = async () => {
    try {
      const db = getFirestore();
      const counterRef = doc(db, "counters", "projects");

      // Usar transação para garantir atomicidade
      const newNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        if (!counterDoc.exists()) {
          // Se o documento não existir, criar com valor inicial
          transaction.set(counterRef, { count: 1 });
          return 1;
        }

        // Incrementar o contador
        const newCount = (counterDoc.data().count || 0) + 1;
        transaction.update(counterRef, { count: newCount });
        return newCount;
      });

      // Retornar apenas o número simples
      return String(newNumber);
    } catch (error) {
      console.error("Erro ao gerar número do projeto:", error);
      // Fallback para timestamp se falhar
      return String(Date.now());
    }
  };

  // Função para calcular prazo de entrega
  const calculateDeadline = useCallback(
    (totalPages) => {
      // Verificar se há arquivos que requerem análise manual
      const hasManualQuoteFiles = convertedFiles.some(
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
    [isPriority, convertedFiles, userType, registeredByType, globalRates]
  );

  // Função para calcular data de entrega
  const calculateDeliveryDate = (days) => {
    if (!days || isNaN(days)) {
      return "";
    }

    const currentDate = new Date();
    let businessDays = Math.ceil(parseFloat(days));
    let currentDay = new Date(currentDate);

    // Adiciona um dia para começar a contar a partir do próximo dia útil
    currentDay.setDate(currentDay.getDate() + 1);

    // Pula finais de semana iniciais
    while (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Conta dias úteis
    while (businessDays > 0) {
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

    return `${day}/${month}/${year}`;
  };

  const saveProjectToFirestore = async (status) => {
    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const auth = getAuth();
      const currentUser = auth.currentUser; // O usuário master logado

      if (!currentUser) {
        throw new Error("Usuário master não autenticado.");
      }

      if (!userEmail) {
        throw new Error("Email do cliente não pode ser vazio.");
      }

      // Buscar o UID do cliente pelo email inserido
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Cliente com o email fornecido não encontrado.");
      }
      const clientUid = querySnapshot.docs[0].id; // UID do cliente
      const clientData = querySnapshot.docs[0].data();

      // Gerar número do projeto
      const projectNumber = await generateProjectNumber();

      // Calcular o prazo em dias úteis
      const deadlineDays = calculateDeadline(projectData.totalPages);

      // Calcular a data de entrega
      let deadlineDate = "";
      if (deadlineDays.includes("dias úteis")) {
        const days = parseInt(deadlineDays.split(" ")[0]);
        if (!isNaN(days)) {
          deadlineDate = calculateDeliveryDate(days);
        }
      }

      // Determinar a coleção correta baseada no tipo de usuário e tipo de arquivo
      const collectionName = projectData.hasManualQuoteFiles
        ? userType === "b2b" ||
          (userType === "colab" && registeredByType === "b2b")
          ? "b2bdocprojects"
          : "b2cdocprojects"
        : userType === "b2b" ||
          (userType === "colab" && registeredByType === "b2b")
        ? canTest
          ? "b2bapproved"
          : "b2bsketch"
        : "b2csketch";

      // Processa os arquivos mantendo a contagem de páginas dos PDFs
      const processedFiles = convertedFiles.map((file) => ({
        fileUrl: file.downloadURL,
        name: file.name,
        pageCount: file.pages,
        total: file.value,
        valuePerPage: projectData.valuePerPage,
      }));

      const projectDataToSave = {
        createdAt: serverTimestamp(),
        projectNumber: projectNumber,
        projectName: projectName,
        projectOwner: clientData.nomeCompleto || "Cliente",
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        totalPages: projectData.totalPages,
        totalProjectValue: projectData.totalValue,
        deadline: deadlineDays,
        deadlineDate: deadlineDate,
        isPriority: isPriority,
        files: processedFiles,
        userEmail: userEmail, // Email do cliente
        registeredBy: currentUser.email, // Email do master que registrou
        registeredByType: "master", // Tipo do usuário que registrou
        project_status: projectData.hasManualQuoteFiles
          ? "Ag. Orçamento"
          : "Em Análise",
        payment_status: "Pendente",
        translation_status: "N/A",
        valuePerPage: projectData.valuePerPage,
        hasManualQuoteFiles: projectData.hasManualQuoteFiles,
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.email,
        approvedByName: currentUser.displayName || "Master",
        collection: collectionName,
        convertCurrency: convertCurrency,
        isCertified: isCertifiedSelected,
        clientUid: clientUid,
        masterEmail: currentUser.email,
      };

      // Criar o documento do projeto na coleção apropriada
      const projectRef = await addDoc(
        collection(db, collectionName),
        projectDataToSave
      );

      // Adicionar log de criação do projeto
      const logData = {
        timestamp: serverTimestamp(),
        userEmail: currentUser.email,
        action: "criação de projeto pelo master",
        details: {
          projeto: projectName,
          numeroProject: projectNumber,
          tipoArquivo: projectData.hasManualQuoteFiles ? "DOCX" : "PDF/Imagens",
          quantidadePaginas: projectData.totalPages || "A ser definido",
          valorTotal: projectData.totalValue || 0,
          idiomaOrigem: sourceLanguage,
          idiomaDestino: targetLanguage,
          clienteEmail: userEmail,
        },
      };
      await addDoc(collection(db, "activity_logs"), logData);

      console.log("Projeto salvo com ID:", projectRef.id);
      alert("Projeto salvo com sucesso!");
      navigate("/company/master/projects"); // Redireciona para a lista de projetos do master
    } catch (error) {
      console.error("Erro ao salvar o projeto:", error);
      alert(`Erro ao salvar o projeto: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowSaveModal(false);
    }
  };

  const handleSaveAsDraft = () => {
    saveProjectToFirestore("saved_draft");
  };

  const handleResetForm = () => {
    setSourceLanguage("");
    setTargetLanguage("");
    setIsCertifiedSelected(true);
    setFiles([]);
    setConvertedFiles([]);
    setProjectName("");
    setCurrentStep(1);
    setTranslationRates({ pttoen: 0, esptoen: 0 });
    setIsPriority(false);
    setUploadProgress({});
    setProjectData({
      totalPages: 0,
      totalFiles: 0,
      totalValue: 0,
      valuePerPage: 0,
      hasManualQuoteFiles: false,
    });
    setUserEmail("");
    setUserEmailError("");
    setUserSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="min-h-screen">
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8">
        <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Criar Novo Projeto
          </h1>
          <p className="text-gray-600 text-sm md:text-base lg:text-lg">
            Painel Master
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Primeira Div - Dados de Entrada */}
          <div className="w-full bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-4 md:mb-6">
              <div className="w-2 md:w-3 h-6 md:h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3 md:mr-4"></div>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
                Dados do Projeto
              </h2>
            </div>

            {/* Input para o email do usuário com autocompletar */}
            <div className="mb-4 md:mb-6 relative">
              <label
                htmlFor="userEmail"
                className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3"
              >
                Email do Cliente:
              </label>
              <input
                type="email"
                id="userEmail"
                value={userEmail}
                onChange={handleUserEmailChange}
                className={`w-full px-3 md:px-4 py-2 md:py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 text-sm md:text-base ${
                  userEmailError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-gray-200"
                }`}
                placeholder="Insira o email do cliente"
                autoComplete="off"
              />
              {userEmailError && (
                <p className="text-red-500 text-xs italic">{userEmailError}</p>
              )}

              {/* Lista de sugestões */}
              {showSuggestions && userSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {userSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectSuggestion(suggestion.email)}
                    >
                      <div className="font-medium">{suggestion.email}</div>
                      {suggestion.nomeCompleto && (
                        <div className="text-sm text-gray-600">
                          {suggestion.nomeCompleto}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4 md:mb-6">
              <label
                htmlFor="projectName"
                className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3"
              >
                Nome do Projeto:
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={handleProjectNameChange}
                className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 text-sm md:text-base"
                placeholder="Ex: Tradução de Documentos Legais"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
              <div>
                <label
                  htmlFor="sourceLanguage"
                  className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3"
                >
                  Idioma de Origem:
                </label>
                <select
                  id="sourceLanguage"
                  value={sourceLanguage}
                  onChange={handleSourceLanguageChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 text-sm md:text-base"
                >
                  <option value="">Selecione o idioma de origem</option>
                  <option value="Português (Brasil)">Português (Brasil)</option>
                  <option value="Espanhol (América Latina)">
                    Espanhol (América Latina)
                  </option>
                  {/* Adicione mais opções conforme necessário */}
                </select>
              </div>

              <div>
                <label
                  htmlFor="targetLanguage"
                  className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3"
                >
                  Idioma de Destino:
                </label>
                <select
                  id="targetLanguage"
                  value={targetLanguage}
                  onChange={handleTargetLanguageChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 text-sm md:text-base"
                >
                  <option value="">Selecione o idioma de destino</option>
                  <option value="Inglês">Inglês</option>
                  {/* Adicione mais opções conforme necessário */}
                </select>
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3">
                Tipo de Tradução:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    className="peer sr-only"
                    name="certifiedOption"
                    value="true"
                    checked={isCertifiedSelected === true}
                    onChange={handleIsCertifiedChange}
                  />
                  <div className="flex items-center justify-center p-3 md:p-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 group-hover:border-blue-300">
                    <span className="font-medium text-gray-700 peer-checked:text-blue-700 text-sm md:text-base">
                      Certificada
                    </span>
                  </div>
                </label>
                <label className="relative cursor-pointer group">
                  <input
                    type="radio"
                    className="peer sr-only"
                    name="certifiedOption"
                    value="false"
                    checked={isCertifiedSelected === false}
                    onChange={handleIsCertifiedChange}
                  />
                  <div className="flex items-center justify-center p-3 md:p-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 group-hover:border-blue-300">
                    <span className="font-medium text-gray-700 peer-checked:text-blue-700 text-sm md:text-base">
                      Não Certificada
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <div
                className={`relative p-3 md:p-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 hover:border-purple-300 ${
                  isPriority
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200"
                }`}
              >
                <label className="cursor-pointer group inline-flex items-center w-full">
                  <input
                    type="checkbox"
                    className="w-4 md:w-5 h-4 md:h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 checked:bg-purple-600 checked:border-purple-600"
                    checked={isPriority}
                    onChange={handleIsPriorityChange}
                  />
                  <span className="ml-2 md:ml-3 font-medium text-gray-700 text-sm md:text-base">
                    Prioritário (entrega mais rápida, custo adicional)
                  </span>
                </label>
              </div>
            </div>

            <div className="mb-4 md:mb-6">
              <label
                htmlFor="fileInput"
                className="block text-gray-700 text-sm font-semibold mb-2 md:mb-3"
              >
                Anexar Arquivos:
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="fileInput"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="fileInput"
                  className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white/50 backdrop-blur-sm hover:bg-blue-50 hover:border-blue-400 transition-all duration-300"
                >
                  <div className="flex flex-col items-center justify-center pt-3 md:pt-5 pb-4 md:pb-6">
                    <svg
                      className="w-6 md:w-8 h-6 md:h-8 mb-2 md:mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-1 md:mb-2 text-xs md:text-sm text-gray-500">
                      <span className="font-semibold">Clique para enviar</span>{" "}
                      ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, imagens
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3 text-gray-700">
                  Arquivos Selecionados:
                </h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 md:p-4 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <FontAwesomeIcon
                          icon={renderFileIcon(file.type)}
                          className="mr-2 md:mr-3 text-blue-600 text-base md:text-lg flex-shrink-0"
                        />
                        <span className="font-medium text-gray-700 text-sm md:text-base truncate">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 md:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 flex-shrink-0 ml-2"
                      >
                        <FontAwesomeIcon
                          icon={faTrash}
                          className="text-sm md:text-base"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
              <button
                onClick={handleResetForm}
                className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm md:text-base"
              >
                Resetar
              </button>
              {currentStep === 1 && (
                <button
                  onClick={convertFilesToPDF}
                  className="w-full md:w-auto px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm md:text-base"
                  disabled={
                    isAnalyzing ||
                    files.length === 0 ||
                    !sourceLanguage ||
                    !targetLanguage ||
                    !projectName ||
                    !userEmail
                  }
                >
                  {isAnalyzing ? "Analisando..." : "Analisar Arquivos"}
                </button>
              )}
            </div>
          </div>

          {/* Segunda Div - Resumo do Projeto */}
          <div className="w-full bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-2xl shadow-xl border border-purple-100 lg:sticky lg:top-6">
            <div className="flex items-center mb-4 md:mb-6">
              <div className="w-2 md:w-3 h-6 md:h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-3 md:mr-4"></div>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
                Resumo do Projeto
              </h2>
            </div>

            <div>
              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                    <span className="font-semibold text-gray-700 text-sm md:text-base">
                      📧 Email do Cliente:
                    </span>
                    <span
                      className={
                        userEmail
                          ? "text-gray-900 font-medium text-sm md:text-base"
                          : "text-gray-500 italic text-sm md:text-base"
                      }
                    >
                      {userEmail || "Não informado"}
                    </span>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                    <span className="font-semibold text-gray-700 text-sm md:text-base">
                      📝 Nome do Projeto:
                    </span>
                    <span
                      className={
                        projectName
                          ? "text-gray-900 font-medium text-sm md:text-base"
                          : "text-gray-500 italic text-sm md:text-base"
                      }
                    >
                      {projectName || "Não informado"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                      <span className="font-semibold text-gray-700 text-sm md:text-base">
                        🌐 Origem:
                      </span>
                      <span
                        className={
                          sourceLanguage
                            ? "text-gray-900 font-medium text-sm md:text-base"
                            : "text-gray-500 italic text-sm md:text-base"
                        }
                      >
                        {sourceLanguage || "Não selecionado"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                      <span className="font-semibold text-gray-700 text-sm md:text-base">
                        🎯 Destino:
                      </span>
                      <span
                        className={
                          targetLanguage
                            ? "text-gray-900 font-medium text-sm md:text-base"
                            : "text-gray-500 italic text-sm md:text-base"
                        }
                      >
                        {targetLanguage || "Não selecionado"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                      <span className="font-semibold text-gray-700 text-sm md:text-base">
                        📜 Certificada:
                      </span>
                      <span
                        className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                          isCertifiedSelected
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isCertifiedSelected ? "✅ Sim" : "❌ Não"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm p-3 md:p-4 rounded-xl border border-white/40">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-0">
                      <span className="font-semibold text-gray-700 text-sm md:text-base">
                        ⚡ Prioritário:
                      </span>
                      <span
                        className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                          isPriority
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isPriority ? "🚀 Sim" : "⏳ Não"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <div className="bg-white/60 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/40">
                  <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-700 flex items-center">
                    📁 Arquivos
                    <span className="ml-2 bg-purple-100 text-purple-800 text-xs sm:text-sm font-medium px-2 py-1 rounded-full">
                      {files.length}
                    </span>
                  </h3>
                  {files.length > 0 ? (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center p-2 bg-white/40 rounded-lg border border-white/60"
                        >
                          <FontAwesomeIcon
                            icon={renderFileIcon(file.type)}
                            className="mr-2 md:mr-3 text-blue-600 text-sm md:text-base flex-shrink-0"
                          />
                          <span className="text-xs md:text-sm font-medium text-gray-700 truncate">
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 sm:py-4">
                      <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">
                        📂
                      </div>
                      <p className="text-gray-500 italic text-xs sm:text-sm">
                        Nenhum arquivo selecionado
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {currentStep === 2 && convertedFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mt-4 mb-2">
                    Detalhes dos Arquivos:
                  </h3>
                  <ul className="space-y-2">
                    {convertedFiles.map((file, index) => (
                      <li key={index} className="text-sm bg-white p-2 rounded">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-gray-600">
                          {file.pages} páginas - R$ {file.value.toFixed(2)}
                        </div>
                        {file.requiresManualQuote && (
                          <span className="text-red-500 text-xs">
                            (Cotação Manual Necessária)
                          </span>
                        )}
                        {uploadProgress[file.name.replace(/\.[^/.]+$/, "")] ===
                          -1 && (
                          <span className="text-red-500 text-xs">
                            (Erro no Upload)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg">
                    <div className="text-center mb-3 sm:mb-4">
                      <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">
                        💰 Resumo Financeiro
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      <div className="bg-white/70 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/60">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                          <span className="font-semibold text-gray-700 text-sm sm:text-base">
                            📄 Total de Páginas:
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-gray-900">
                            {projectData.totalPages}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/70 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/60">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                          <span className="font-semibold text-gray-700 text-sm sm:text-base">
                            💵 Valor por Página:
                          </span>
                          <span className="text-lg sm:text-xl font-bold text-blue-600">
                            R$ {projectData.valuePerPage.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-3 sm:p-4 rounded-xl border-2 border-green-300">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                          <span className="font-bold text-green-800 text-sm sm:text-base">
                            🎯 Valor Total Estimado:
                          </span>
                          <span className="text-xl sm:text-2xl font-bold text-green-700">
                            R$ {projectData.totalValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {projectData.hasManualQuoteFiles && (
                      <div className="mt-3 sm:mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-700 text-xs sm:text-sm font-medium flex items-center">
                          ⚠️ Este projeto contém arquivos que requerem cotação
                          manual. O valor final pode ser ajustado.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão Salvar Projeto */}
                  <div className="mt-4 sm:mt-6 text-center">
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Salvando..." : "Salvar Projeto"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação Salvar Projeto */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md transform animate-pulse">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💾</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Confirmar Salvamento
              </h3>
              <p className="text-gray-600 mb-6">
                Deseja salvar este projeto? Esta ação criará um novo projeto no
                sistema.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsDraft}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAddProject;
