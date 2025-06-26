import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  writeBatch,
  collection,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  addDoc,
} from "firebase/firestore";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { IoIosArrowBack } from "react-icons/io";

const CheckoutPage = () => {
  const [projects, setProjects] = useState([]);
  const [clientTypes, setClientTypes] = useState({});
  const [paymentDetails, setPaymentDetails] = useState({
    name: "",
    email: "",
    postalCode: "",
  });
  const [requirePostalCode, setRequirePostalCode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const { selectedProjects, isDivergencePayment, divergenceValue } =
    location.state || {
      selectedProjects: [],
      isDivergencePayment: false,
      divergenceValue: 0,
    };
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [paymentLink, setPaymentLink] = useState("");

  // Função para verificar se há páginas zeradas
  const hasZeroPages = (files) => {
    return files.some((file) => file.pageCount === 0);
  };

  const fetchProjects = useCallback(async () => {
    const firestore = getFirestore();
    console.log(
      "Iniciando busca de projetos para pagamento:",
      selectedProjects,
      "isDivergencePayment:",
      isDivergencePayment,
      "divergenceValue:",
      divergenceValue
    );

    const fetchedProjects = await Promise.all(
      selectedProjects.map(async (projectId) => {
        // Lista de coleções para buscar
        const collections = isDivergencePayment
          ? [
              // Coleções B2B
              "b2bapproved",
              "b2bapproval",
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bprojectspaid",
              // Coleções B2C
              "b2capproved",
              "b2capproval",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2csketch",
              "b2cprojectspaid",
            ]
          : [
              // Coleções B2B
              "b2bapproved",
              "b2bapproval",
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              // Coleções B2C
              "b2capproved",
              "b2capproval",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2csketch",
            ];

        console.log(
          "Buscando projeto",
          projectId,
          "nas coleções:",
          collections
        );

        let projectDoc = null;
        let foundCollection = null;

        // Tentar encontrar o projeto em cada coleção
        for (const collectionName of collections) {
          projectDoc = await getDoc(doc(firestore, collectionName, projectId));
          if (projectDoc.exists()) {
            foundCollection = collectionName;
            break;
          }
        }

        if (projectDoc && projectDoc.exists()) {
          const projectData = projectDoc.data();
          // Verificar se o projeto tem páginas zeradas
          if (hasZeroPages(projectData.files)) {
            console.log(`Projeto ${projectId} tem páginas zeradas`);
            return null;
          }
          return {
            id: projectId,
            ...projectData,
            collection: foundCollection,
          };
        }

        console.log(`Projeto ${projectId} não encontrado em nenhuma coleção`);
        return null;
      })
    );

    // Filtrar projetos nulos (não encontrados ou com páginas zeradas)
    const validProjects = fetchedProjects.filter((p) => p !== null);
    console.log("Projetos válidos encontrados:", validProjects);

    if (validProjects.length === 0) {
      console.log("Nenhum projeto válido encontrado. Redirecionando...");
      alert("Nenhum projeto válido encontrado para pagamento.");
      navigate("/client/projects");
      return;
    }

    setProjects(validProjects);
  }, [selectedProjects, navigate, isDivergencePayment, divergenceValue]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Adicionar useEffect para carregar os tipos de usuários
  useEffect(() => {
    const firestore = getFirestore();
    const usersRef = collection(firestore, "users");

    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
  }, []);

  const addBusinessDays = (date, days) => {
    let currentDate = new Date(date);
    let businessDays = days;

    while (businessDays > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        businessDays--;
      }
    }

    return currentDate;
  };

  const generatePaymentLink = async () => {
    try {
      console.log(
        "Iniciando geração de link de pagamento com projetos:",
        projects
      );

      let totalAmount;
      if (isDivergencePayment) {
        totalAmount = projects.reduce((total, project) => {
          // Verificar se o projeto já foi pago parcialmente
          const isPartiallyPaid =
            typeof project.payment_status === "object" &&
            project.payment_status.status === "Divergência" &&
            project.payment_status.initialPayment > 0;

          if (isPartiallyPaid) {
            // Projeto pago parcialmente - pagar apenas a divergência
            const divergenceAmount =
              Number(project.payment_status.divergencePayment) || 0;
            console.log(
              `Projeto ${project.projectName} - Pago parcialmente. Divergência: ${divergenceAmount}`
            );
            return total + divergenceAmount * 100;
          } else {
            // Projeto não pago - pagar valor inicial + divergência
            const initialValue = project.files.reduce((sum, file) => {
              return sum + (Number(file.total) || Number(file.totalValue) || 0);
            }, 0);
            const divergenceAmount =
              Number(project.payment_status?.divergencePayment) || 0;
            const totalProjectValue = initialValue + divergenceAmount;
            console.log(
              `Projeto ${project.projectName} - Não pago. Inicial: ${initialValue}, Divergência: ${divergenceAmount}, Total: ${totalProjectValue}`
            );
            return total + totalProjectValue * 100;
          }
        }, 0);
        console.log("Total de divergência em centavos:", totalAmount);
      } else {
        totalAmount = projects.reduce((total, project) => {
          console.log("Calculando valor para projeto:", project.projectName);
          const projectTotal = project.files.reduce((sum, file) => {
            const fileTotal =
              Number(file.total) || Number(file.totalValue) || 0;
            console.log("Arquivo:", file.name, "Valor:", fileTotal);
            return sum + fileTotal;
          }, 0);
          console.log("Total do projeto:", projectTotal);
          return total + projectTotal * 100;
        }, 0);
        console.log("Valor total em centavos:", totalAmount);
      }

      const response = await fetch(
        "https://us-central1-alpha-translator.cloudfunctions.net/createPaymentIntent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmount,
            currency: "brl",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar o link de pagamento.");
      }

      const { clientSecret } = await response.json();
      console.log("Client secret gerado com sucesso");

      // Incluir mais informações no link de pagamento
      const projectIds = projects.map((project) => project.id).join(",");
      const paymentType = isDivergencePayment ? "divergence" : "normal";
      const totalValue = isDivergencePayment
        ? divergenceValue
        : calculateTotalValue(projects);
      const clientEmail = projects[0]?.userEmail || "";
      const clientType = projects[0]?.userType || "";

      const paymentUrl = `${window.location.origin}/payment?client_secret=${clientSecret}&project_ids=${projectIds}&payment_type=${paymentType}&total_value=${totalValue}&client_email=${clientEmail}&client_type=${clientType}`;

      console.log("Link de pagamento gerado:", paymentUrl);
      setPaymentLink(paymentUrl);
    } catch (error) {
      console.error("Erro ao gerar o link de pagamento:", error.message);
      alert("Erro ao gerar link de pagamento: " + error.message);
    }
  };

  const determineDeadlineDays = (totalPages, isPriority) => {
    let days;
    if (totalPages <= 5) days = 5;
    else if (totalPages <= 20) days = 10;
    else if (totalPages <= 50) days = 12;
    else if (totalPages <= 90) days = 17;
    else if (totalPages <= 130) days = 25;
    else days = 30;

    if (isPriority) {
      days = Math.ceil(days / 2);
    }
    return days;
  };

  const formatDate = (date) => {
    if (!date) return "A definir";

    try {
      // Verificar se é uma data válida
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "A definir";
      }

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      // Verificar se os valores são válidos
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return "A definir";
      }

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "A definir";
    }
  };

  const calculateTotalPages = (files) => {
    return files.reduce((total, file) => total + (file.pageCount || 0), 0);
  };

  const calculateTotalValue = (projects) => {
    return projects
      .reduce((total, project) => {
        // Se é pagamento de divergência
        if (isDivergencePayment) {
          // Verificar se o projeto já foi pago parcialmente
          const isPartiallyPaid =
            typeof project.payment_status === "object" &&
            project.payment_status.status === "Divergência" &&
            project.payment_status.initialPayment > 0;

          if (isPartiallyPaid) {
            // Projeto pago parcialmente - pagar apenas a divergência
            const divergenceAmount =
              Number(project.payment_status.divergencePayment) || 0;
            return total + divergenceAmount;
          } else {
            // Projeto não pago - pagar valor inicial + divergência
            const initialValue = project.files.reduce((sum, file) => {
              return sum + (Number(file.total) || Number(file.totalValue) || 0);
            }, 0);
            const divergenceAmount =
              Number(project.payment_status?.divergencePayment) || 0;
            return total + initialValue + divergenceAmount;
          }
        }

        // Para pagamentos normais, calcular valor dos arquivos
        const projectTotal = project.files.reduce((sum, file) => {
          const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
          return sum + fileTotal;
        }, 0);

        return total + projectTotal;
      }, 0)
      .toFixed(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails({
      ...paymentDetails,
      [name]: value,
    });
  };

  const handleCardChange = (event) => {
    if (event.error) {
      console.error("[error]", event.error);
    } else {
      console.log("[CardElement]", event);
      // Verificar se precisa de código postal com base no tipo de cartão
      if (event.complete && event.brand === "visa" && event.country === "US") {
        setRequirePostalCode(true);
      } else {
        setRequirePostalCode(false);
      }
    }
  };

  const handlePayment = async () => {
    if (!stripe || !elements) {
      alert("Stripe não está pronto!");
      return;
    }

    try {
      setIsProcessing(true);

      let totalAmount;
      if (isDivergencePayment) {
        totalAmount = projects.reduce((total, project) => {
          // Verificar se o projeto já foi pago parcialmente
          const isPartiallyPaid =
            typeof project.payment_status === "object" &&
            project.payment_status.status === "Divergência" &&
            project.payment_status.initialPayment > 0;

          if (isPartiallyPaid) {
            // Projeto pago parcialmente - pagar apenas a divergência
            const divergenceAmount =
              Number(project.payment_status.divergencePayment) || 0;
            return total + divergenceAmount * 100;
          } else {
            // Projeto não pago - pagar valor inicial + divergência
            const initialValue = project.files.reduce((sum, file) => {
              return sum + (Number(file.total) || Number(file.totalValue) || 0);
            }, 0);
            const divergenceAmount =
              Number(project.payment_status?.divergencePayment) || 0;
            return total + (initialValue + divergenceAmount) * 100;
          }
        }, 0);
      } else {
        // Caso contrário, calcular o valor total normal
        totalAmount = projects.reduce((total, project) => {
          const projectTotal = project.files.reduce((sum, file) => {
            const fileTotal =
              Number(file.total) || Number(file.totalValue) || 0;
            return sum + fileTotal;
          }, 0);
          return total + projectTotal * 100;
        }, 0);
      }

      const response = await fetch(
        "https://us-central1-alpha-translator.cloudfunctions.net/createPaymentIntent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmount,
            currency: "brl",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Falha ao criar intenção de pagamento.");
      }

      const { clientSecret } = await response.json();

      const paymentResult = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: paymentDetails.name,
            email: paymentDetails.email,
            address: requirePostalCode
              ? { postal_code: paymentDetails.postalCode }
              : {},
          },
        },
      });

      if (paymentResult.error) {
        console.error("Erro no pagamento:", paymentResult.error.message);

        // Registrar log de erro no pagamento
        const errorLogData = {
          userEmail:
            projects[0]?.userEmail || paymentDetails.email || "Não informado",
          timestamp: serverTimestamp(),
          action: "erro no pagamento",
          details: {
            valor: calculateTotalValue(projects),
            status: "falhou",
            projeto: {
              nome:
                projects.length > 0 ? projects[0].projectName : "Não informado",
              email:
                projects[0]?.userEmail ||
                paymentDetails.email ||
                "Não informado",
            },
            erro: paymentResult.error.message,
            totalProjetos: projects.length,
            tipoPagamento: isDivergencePayment
              ? "Divergência"
              : "Pagamento Inicial",
          },
        };

        console.log("Dados do log de erro:", errorLogData);
        await addDoc(collection(getFirestore(), "activity_logs"), errorLogData);

        navigate("/client/payment-error", {
          state: {
            errorMessage: paymentResult.error.message,
            selectedProjects: projects.map((project) => project.id),
          },
        });
      } else {
        const batch = writeBatch(getFirestore());

        // Debug logs
        console.log("Dados do primeiro projeto:", projects[0]);
        console.log("Email do usuário do projeto:", projects[0]?.userEmail);
        console.log("Email do formulário:", paymentDetails.email);

        // Registrar log de pagamento simplificado
        const logData = {
          userEmail:
            projects[0]?.userEmail || paymentDetails.email || "Não informado",
          timestamp: serverTimestamp(),
          action: "pagamento realizado",
          details: {
            valor: calculateTotalValue(projects),
            status: "sucesso",
            projeto: {
              nome:
                projects.length > 0 ? projects[0].projectName : "Não informado",
              email:
                projects[0]?.userEmail ||
                paymentDetails.email ||
                "Não informado",
            },
            totalProjetos: projects.length,
            tipoPagamento: isDivergencePayment
              ? "Divergência"
              : "Pagamento Inicial",
            ...(isDivergencePayment && {
              detalhePagamento: projects.map((project) => {
                const isPartiallyPaid =
                  typeof project.payment_status === "object" &&
                  project.payment_status.status === "Divergência" &&
                  project.payment_status.initialPayment > 0;
                return {
                  projeto: project.projectName,
                  tipo: isPartiallyPaid
                    ? "Apenas Divergência"
                    : "Inicial + Divergência",
                  valorInicial: isPartiallyPaid
                    ? project.payment_status.initialPayment
                    : project.files.reduce(
                        (sum, file) => sum + (Number(file.total) || 0),
                        0
                      ),
                  valorDivergencia:
                    Number(project.payment_status?.divergencePayment) || 0,
                  jaPago: isPartiallyPaid,
                };
              }),
            }),
          },
        };

        console.log("Dados do log de sucesso:", logData);
        await addDoc(collection(getFirestore(), "activity_logs"), logData);

        // Para cada projeto no pagamento
        for (const project of projects) {
          if (isDivergencePayment) {
            // Se for pagamento de divergência, atualizar o status e adicionar ao histórico
            const projectRef = doc(
              getFirestore(),
              project.collection,
              project.id
            );

            // Criar o objeto de histórico de pagamento
            const paymentHistory = {
              date: new Date().toISOString(),
              amount: Number(divergenceValue),
              type: "divergence",
              status: "completed",
            };

            // Calcular o novo prazo baseado no total de páginas (originais + divergência)
            const originalPages = project.files.reduce(
              (total, file) => total + (Number(file.pageCount) || 0),
              0
            );
            const additionalPages = Number(project.payment_status.pages);
            const totalPages = originalPages + additionalPages;

            const totalDeadlineDays = determineDeadlineDays(
              totalPages,
              project.isPriority
            );
            const newDeadlineDate = addBusinessDays(
              new Date(
                project.createdAt?.toDate?.() || project.createdAt || new Date()
              ),
              totalDeadlineDays
            );

            // Formatar a nova data
            const day = String(newDeadlineDate.getDate()).padStart(2, "0");
            const month = String(newDeadlineDate.getMonth() + 1).padStart(
              2,
              "0"
            );
            const year = newDeadlineDate.getFullYear();
            const formattedDeadlineDate = `${day}/${month}/${year}`;

            // Manter os valores existentes e atualizar apenas o necessário
            const currentPaymentStatus = project.payment_status || {};
            const currentInitialPayment =
              typeof currentPaymentStatus === "object"
                ? currentPaymentStatus.initialPayment ||
                  project.totalProjectValue ||
                  0
                : currentPaymentStatus === "Pago"
                ? project.totalProjectValue || 0
                : 0;

            // Atualizar o documento com o novo histórico e prazo ajustado
            batch.update(projectRef, {
              payment_status: {
                status: "Pago",
                initialPayment: currentInitialPayment,
                divergencePayment: Number(divergenceValue),
                totalPayment: currentInitialPayment + Number(divergenceValue),
                pages: project.payment_status.pages,
                reason: project.payment_status.reason,
                paymentDate: new Date().toISOString(),
              },
              project_status: "Em Análise",
              updatedAt: serverTimestamp(),
              paymentHistory: arrayUnion(paymentHistory),
              deadlineDate: formattedDeadlineDate,
              deadline: `${totalDeadlineDays} dias úteis`,
              paidAt: new Date().toISOString(),
            });
          } else {
            // Lógica existente para pagamento normal
            const totalPages = project.files.reduce(
              (sum, file) => sum + Number(file.pageCount),
              0
            );
            const deadlineDays = determineDeadlineDays(
              totalPages,
              project.isPriority
            );
            const projectDeadline = addBusinessDays(new Date(), deadlineDays);

            const day = String(projectDeadline.getDate()).padStart(2, "0");
            const month = String(projectDeadline.getMonth() + 1).padStart(
              2,
              "0"
            );
            const year = projectDeadline.getFullYear();
            const formattedDeadlineDate = `${day}/${month}/${year}`;

            let targetCollection;
            const userInfo = clientTypes[project.userEmail];

            if (userInfo?.userType === "colab") {
              if (userInfo.registeredByType === "b2b") {
                targetCollection = "b2bprojectspaid";
              } else if (userInfo.registeredByType === "b2c") {
                targetCollection = "b2cprojectspaid";
              }
            } else {
              if (userInfo?.userType === "b2b") {
                targetCollection = "b2bprojectspaid";
              } else if (userInfo?.userType === "b2c") {
                targetCollection = "b2cprojectspaid";
              }
            }

            const projectRef = doc(
              getFirestore(),
              targetCollection,
              project.id
            );

            // Calcular o valor total do projeto
            const totalValue = project.files.reduce((sum, file) => {
              const fileTotal =
                Number(file.total) || Number(file.totalValue) || 0;
              return sum + fileTotal;
            }, 0);

            batch.set(projectRef, {
              ...project,
              payment_status: {
                status: "Pago",
                initialPayment: totalValue,
                divergencePayment: 0,
                totalPayment: totalValue,
                paymentDate: new Date().toISOString(),
              },
              project_status: "Em Análise",
              translation_status: "N/A",
              collection: targetCollection,
              deadlineDate: formattedDeadlineDate,
              paidAt: new Date().toISOString(),
              updatedAt: serverTimestamp(),
            });

            const oldProjectRef = doc(
              getFirestore(),
              project.collection,
              project.id
            );
            batch.delete(oldProjectRef);
          }
        }

        await batch.commit();
        navigate("/client/payment-success", { replace: true });
      }
    } catch (error) {
      console.error("Erro no processamento do pagamento:", error);
      navigate("/client/payment-error", {
        state: { errorMessage: error.message },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="flex items-center mb-8">
          <div
            onClick={() => navigate("/client/projects")}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <IoIosArrowBack size={24} className="mr-2" />
            <span className="text-lg">Voltar</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 flex-1 text-center">
            {isDivergencePayment
              ? "Pagamento de Divergência"
              : "Finalizar Compra"}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna da Esquerda - Resumo dos Projetos */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  Resumo dos Projetos
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {projects.map((project, index) => {
                  const projectDeadline = addBusinessDays(
                    new Date(),
                    determineDeadlineDays(
                      calculateTotalPages(project.files),
                      project.isPriority
                    )
                  );

                  return (
                    <div
                      key={project.id}
                      className={`${
                        index !== projects.length - 1
                          ? "border-b border-gray-100 pb-6"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {project.projectName}
                        </h3>
                        <div className="flex gap-2">
                          {isDivergencePayment && (
                            <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                              Divergência
                            </span>
                          )}
                          {project.isPriority && (
                            <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                              Prioridade
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nota explicativa para pagamento de divergência */}
                      {isDivergencePayment && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-yellow-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-800">
                                <strong>Pagamento de Divergência:</strong> Este
                                valor corresponde às páginas adicionais
                                identificadas durante a análise do projeto.{" "}
                                {projects[0]?.payment_status?.reason &&
                                  `Motivo: ${projects[0].payment_status.reason}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isDivergencePayment ? (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium mr-2">
                                Prazo Original:
                              </span>
                              <span className="text-emerald-600 font-medium">
                                {(() => {
                                  // Calcular o prazo original baseado nas páginas iniciais
                                  const originalPages = project.files.reduce(
                                    (total, file) =>
                                      total + (Number(file.pageCount) || 0),
                                    0
                                  );
                                  const originalDeadlineDays =
                                    determineDeadlineDays(
                                      originalPages,
                                      project.isPriority
                                    );
                                  const originalDeadlineDate = addBusinessDays(
                                    new Date(
                                      project.createdAt?.toDate?.() ||
                                        project.createdAt ||
                                        new Date()
                                    ),
                                    originalDeadlineDays
                                  );
                                  return formatDate(originalDeadlineDate);
                                })()}
                              </span>
                            </div>
                            {project.payment_status &&
                              project.payment_status.pages && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <span className="font-medium mr-2">
                                    Novo Prazo:
                                  </span>
                                  <span className="text-red-600 font-medium">
                                    {(() => {
                                      // Calcular o novo prazo baseado no total de páginas (originais + divergência)
                                      const originalPages =
                                        project.files.reduce(
                                          (total, file) =>
                                            total +
                                            (Number(file.pageCount) || 0),
                                          0
                                        );
                                      const additionalPages = Number(
                                        project.payment_status.pages
                                      );
                                      const totalPages =
                                        originalPages + additionalPages;

                                      const totalDeadlineDays =
                                        determineDeadlineDays(
                                          totalPages,
                                          project.isPriority
                                        );
                                      const newDeadlineDate = addBusinessDays(
                                        new Date(
                                          project.createdAt?.toDate?.() ||
                                            project.createdAt ||
                                            new Date()
                                        ),
                                        totalDeadlineDays
                                      );
                                      return formatDate(newDeadlineDate);
                                    })()}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">
                              Prazo Estimado:
                            </span>
                            <span className="text-emerald-600 font-medium">
                              {formatDate(projectDeadline)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="overflow-hidden rounded-lg border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Arquivo
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Páginas
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Idiomas
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {project.files.map((file, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {file.name
                                    ? file.name.length > 30
                                      ? `${file.name.slice(0, 30)}...`
                                      : file.name
                                    : "Arquivo sem nome"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                  {Number(file.pageCount) || 0}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                  {project.sourceLanguage || "N/A"} →{" "}
                                  {project.targetLanguage || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                  U${" "}
                                  {(
                                    Number(file.total) ||
                                    Number(file.totalValue) ||
                                    0
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            {/* Mostrar informações de divergência se for pagamento de divergência */}
                            {isDivergencePayment && project.divergenceInfo && (
                              <tr className="bg-red-50 hover:bg-red-100">
                                <td className="px-4 py-3 text-sm font-medium text-red-700">
                                  Páginas de Divergência
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 text-center">
                                  {project.divergenceInfo.pages || 0}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 text-center">
                                  {project.sourceLanguage || "N/A"} →{" "}
                                  {project.targetLanguage || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-red-700 text-right">
                                  U${" "}
                                  {Number(
                                    project.divergenceInfo.value || 0
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            )}
                            {/* Se é pagamento de divergência mas não tem divergenceInfo, calcular dinamicamente */}
                            {isDivergencePayment && !project.divergenceInfo && (
                              <tr className="bg-red-50 hover:bg-red-100">
                                <td className="px-4 py-3 text-sm font-medium text-red-700">
                                  Páginas de Divergência
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 text-center">
                                  {(() => {
                                    // Calcular páginas de divergência baseado no divergenceValue
                                    const originalValue = project.files.reduce(
                                      (sum, file) => {
                                        return (
                                          sum +
                                          (Number(file.total) ||
                                            Number(file.totalValue) ||
                                            0)
                                        );
                                      },
                                      0
                                    );
                                    const valuePerPage =
                                      project.files.length > 0
                                        ? Number(
                                            project.files[0].valuePerPage
                                          ) || 0
                                        : 0;
                                    const totalValue = Number(divergenceValue);
                                    const divergenceValueCalc =
                                      totalValue - originalValue;
                                    const divergencePages =
                                      valuePerPage > 0
                                        ? Math.round(
                                            divergenceValueCalc / valuePerPage
                                          )
                                        : 0;
                                    return divergencePages > 0
                                      ? divergencePages
                                      : 0;
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-600 text-center">
                                  {project.sourceLanguage || "N/A"} →{" "}
                                  {project.targetLanguage || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-red-700 text-right">
                                  U${" "}
                                  {(() => {
                                    // Calcular valor de divergência baseado no divergenceValue
                                    const originalValue = project.files.reduce(
                                      (sum, file) => {
                                        return (
                                          sum +
                                          (Number(file.total) ||
                                            Number(file.totalValue) ||
                                            0)
                                        );
                                      },
                                      0
                                    );
                                    const totalValue = Number(divergenceValue);
                                    const divergenceValueCalc =
                                      totalValue - originalValue;
                                    return divergenceValueCalc > 0
                                      ? divergenceValueCalc.toFixed(2)
                                      : "0.00";
                                  })()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-gray-100">
                  {/* Se é pagamento de divergência, mostrar breakdown dos valores */}
                  {isDivergencePayment && (
                    <div className="space-y-2 mb-4">
                      {projects.map((project, projectIndex) => {
                        const isPartiallyPaid =
                          typeof project.payment_status === "object" &&
                          project.payment_status.status === "Divergência" &&
                          project.payment_status.initialPayment > 0;

                        const originalValue = project.files.reduce(
                          (sum, file) => {
                            return (
                              sum +
                              (Number(file.total) ||
                                Number(file.totalValue) ||
                                0)
                            );
                          },
                          0
                        );

                        const divergenceAmount =
                          Number(project.payment_status?.divergencePayment) ||
                          0;

                        return (
                          <div
                            key={projectIndex}
                            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                          >
                            <div className="font-medium text-sm text-gray-700 mb-2">
                              {project.projectName}
                            </div>

                            {isPartiallyPaid ? (
                              // Projeto pago parcialmente
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-green-600">
                                    ✓ Valor Inicial (Pago):
                                  </span>
                                  <span className="text-green-700">
                                    U${" "}
                                    {project.payment_status.initialPayment.toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-red-600">
                                    Divergência (A Pagar):
                                  </span>
                                  <span className="text-red-700 font-medium">
                                    U$ {divergenceAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              // Projeto não pago
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-orange-600">
                                    Valor Inicial (A Pagar):
                                  </span>
                                  <span className="text-orange-700">
                                    U$ {originalValue.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-red-600">
                                    Divergência (A Pagar):
                                  </span>
                                  <span className="text-red-700">
                                    U$ {divergenceAmount.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium border-t border-gray-300 pt-1">
                                  <span className="text-gray-700">
                                    Total do Projeto:
                                  </span>
                                  <span className="text-gray-800">
                                    U${" "}
                                    {(originalValue + divergenceAmount).toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="border-t border-gray-200 my-2"></div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Total {isDivergencePayment ? "a Pagar" : ""}
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      U${" "}
                      {isDivergencePayment
                        ? divergenceValue
                        : calculateTotalValue(projects)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna da Direita - Formulário de Pagamento */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  Informações de Pagamento
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={paymentDetails.name}
                      onChange={handleInputChange}
                      placeholder="Digite seu nome"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={paymentDetails.email}
                      onChange={handleInputChange}
                      placeholder="Digite seu email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  {requirePostalCode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={paymentDetails.postalCode}
                        onChange={handleInputChange}
                        placeholder="Digite seu CEP"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dados do Cartão
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                      <CardElement
                        options={{
                          style: {
                            base: {
                              fontSize: "16px",
                              color: "#424770",
                              "::placeholder": {
                                color: "#aab7c4",
                              },
                            },
                            invalid: {
                              color: "#9e2146",
                            },
                          },
                        }}
                        onChange={handleCardChange}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    <div className="flex gap-4">
                      <button
                        onClick={generatePaymentLink}
                        className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 shadow-sm text-center font-medium"
                      >
                        Gerar Link de Pagamento
                      </button>

                      <button
                        onClick={handlePayment}
                        disabled={isProcessing || !stripe}
                        className={`flex-1 px-6 py-3 rounded-lg transition-all duration-200 shadow-sm text-center font-medium ${
                          isProcessing || !stripe
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {isProcessing
                          ? "Processando..."
                          : `Pagar ${projects.length} Projeto${
                              projects.length > 1 ? "s" : ""
                            }`}
                      </button>
                    </div>

                    {paymentLink && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                          Link de Pagamento Gerado
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 text-center">
                          Clique no link abaixo ou copie para compartilhar:
                        </p>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 break-all">
                          <a
                            href={paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium block text-center"
                          >
                            {paymentLink}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
