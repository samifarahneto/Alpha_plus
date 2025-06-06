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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Criar Novo Projeto (Master)</h1>

      {/* Input para o email do usuário com autocompletar */}
      <div className="mb-4 relative">
        <label
          htmlFor="userEmail"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Email do Cliente:
        </label>
        <input
          type="email"
          id="userEmail"
          value={userEmail}
          onChange={handleUserEmailChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            userEmailError ? "border-red-500" : ""
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

      {/* Restante do formulário */}
      <div className="mb-4">
        <label
          htmlFor="projectName"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Nome do Projeto:
        </label>
        <input
          type="text"
          id="projectName"
          value={projectName}
          onChange={handleProjectNameChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Ex: Tradução de Documentos Legais"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="sourceLanguage"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Idioma de Origem:
        </label>
        <select
          id="sourceLanguage"
          value={sourceLanguage}
          onChange={handleSourceLanguageChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="">Selecione o idioma de origem</option>
          <option value="portugues brasil">Português (Brasil)</option>
          <option value="espanhol america latina">
            Espanhol (América Latina)
          </option>
          {/* Adicione mais opções conforme necessário */}
        </select>
      </div>

      <div className="mb-4">
        <label
          htmlFor="targetLanguage"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Idioma de Destino:
        </label>
        <select
          id="targetLanguage"
          value={targetLanguage}
          onChange={handleTargetLanguageChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="">Selecione o idioma de destino</option>
          <option value="ingles">Inglês</option>
          {/* Adicione mais opções conforme necessário */}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Tipo de Tradução:
        </label>
        <div className="mt-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="certifiedOption"
              value="true"
              checked={isCertifiedSelected === true}
              onChange={handleIsCertifiedChange}
            />
            <span className="ml-2">Certificada</span>
          </label>
          <label className="inline-flex items-center ml-6">
            <input
              type="radio"
              className="form-radio"
              name="certifiedOption"
              value="false"
              checked={isCertifiedSelected === false}
              onChange={handleIsCertifiedChange}
            />
            <span className="ml-2">Não Certificada</span>
          </label>
        </div>
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={isPriority}
            onChange={handleIsPriorityChange}
          />
          <span className="ml-2">
            Prioritário (entrega mais rápida, custo adicional)
          </span>
        </label>
      </div>

      <div className="mb-4">
        <label
          htmlFor="fileInput"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Anexar Arquivos:
        </label>
        <input
          type="file"
          id="fileInput"
          multiple
          onChange={handleFileChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Arquivos Selecionados:</h3>
          <ul>
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-gray-100 p-2 rounded mb-2"
              >
                <div className="flex items-center">
                  <FontAwesomeIcon
                    icon={renderFileIcon(file.type)}
                    className="mr-2 text-blue-500"
                  />
                  <span>{file.name}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={handleResetForm}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Resetar
        </button>
        {currentStep === 1 && (
          <button
            onClick={convertFilesToPDF}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
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
        {currentStep === 2 && (
          <div className="flex space-x-4">
            <button
              onClick={() => setShowSaveModal(true)}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isSubmitting}
            >
              Salvar Projeto
            </button>
          </div>
        )}
      </div>

      {currentStep === 2 && (
        <div className="mt-8 p-4 border rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Resumo do Projeto</h2>
          <p>
            <strong>Nome do Projeto:</strong> {projectName}
          </p>
          <p>
            <strong>Idioma de Origem:</strong> {sourceLanguage}
          </p>
          <p>
            <strong>Idioma de Destino:</strong> {targetLanguage}
          </p>
          <p>
            <strong>Tradução Certificada:</strong>{" "}
            {isCertifiedSelected ? "Sim" : "Não"}
          </p>
          <p>
            <strong>Prioritário:</strong> {isPriority ? "Sim" : "Não"}
          </p>
          <p>
            <strong>Email do Cliente:</strong> {userEmail}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            Detalhes dos Arquivos:
          </h3>
          <ul>
            {convertedFiles.map((file, index) => (
              <li key={index} className="mb-2">
                {file.name} - {file.pages} páginas - R$ {file.value.toFixed(2)}
                {file.requiresManualQuote && (
                  <span className="text-red-500 ml-2">
                    (Cotação Manual Necessária)
                  </span>
                )}
                {uploadProgress[file.name.replace(/\.[^/.]+$/, "")] === -1 && (
                  <span className="text-red-500 ml-2">(Erro no Upload)</span>
                )}
              </li>
            ))}
          </ul>

          <p className="text-lg font-bold mt-4">
            Total de Páginas: {projectData.totalPages}
          </p>
          <p className="text-lg font-bold">
            Valor por Página: R$ {projectData.valuePerPage.toFixed(2)}
          </p>
          <p className="text-xl font-bold text-green-600 mt-2">
            Valor Total Estimado: R$ {projectData.totalValue.toFixed(2)}
          </p>
          {projectData.hasManualQuoteFiles && (
            <p className="text-red-600 mt-2">
              * Este projeto contém arquivos que requerem cotação manual. O
              valor final pode ser ajustado.
            </p>
          )}
        </div>
      )}

      {/* Modal de Confirmação Salvar Projeto */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">Confirmar Salvar Projeto</h3>
            <p>Deseja salvar este projeto?</p>
            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsDraft}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAddProject;
