import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import PageLayout from "../../components/PageLayout";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const clientSecret = searchParams.get("client_secret");
  const [clientTypes, setClientTypes] = useState({});

  const projectIds = useMemo(
    () => searchParams.get("project_ids")?.split(",") || [],
    [searchParams]
  );

  const stripe = useStripe();
  const elements = useElements();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [userData, setUserData] = useState({
    nomeCompleto: "",
    email: "",
  });

  useEffect(() => {
    const fetchProjects = async () => {
      if (!projectIds.length) return;

      try {
        const firestore = getFirestore();
        const fetchedProjects = await Promise.all(
          projectIds.map(async (id) => {
            // Lista de todas as coleções possíveis onde o projeto pode estar
            const collections = [
              "b2bapproved",
              "b2bprojectspaid",
              "b2bprojectpaid",
              "b2bsketch",
              "b2csketch",
              "b2bdocprojects",
              "b2cdocprojects",
              "b2bapproval",
            ];

            // Tentar buscar em todas as coleções
            for (const collection of collections) {
              const projectDoc = await getDoc(doc(firestore, collection, id));

              if (projectDoc.exists()) {
                const projectData = projectDoc.data();
                console.log(
                  `Projeto encontrado na coleção ${collection}:`,
                  projectData
                );

                // Validar e processar os dados do projeto
                if (!projectData.files || !Array.isArray(projectData.files)) {
                  console.error("Arquivos do projeto inválidos:", projectData);
                  continue;
                }

                // Garantir que os valores dos arquivos estejam corretos
                const updatedFiles = projectData.files.map((file) => {
                  const pageCount = Number(file.pageCount) || 0;
                  const valuePerPage = Number(file.valuePerPage) || 0;
                  const total =
                    Number(file.total) ||
                    Number(file.totalValue) ||
                    pageCount * valuePerPage;

                  return {
                    ...file,
                    pageCount,
                    valuePerPage,
                    total,
                  };
                });

                // Calcular o valor total do projeto
                const totalProjectValue = updatedFiles.reduce(
                  (sum, file) => sum + file.total,
                  0
                );

                // Verificar se o valor total corresponde ao valor esperado
                const expectedValue =
                  Number(searchParams.get("total_value")) || 0;
                if (Math.abs(totalProjectValue - expectedValue) > 0.01) {
                  console.warn(
                    `Valor total do projeto (${totalProjectValue}) não corresponde ao valor esperado (${expectedValue})`
                  );
                }

                return {
                  id: projectDoc.id,
                  ...projectData,
                  files: updatedFiles,
                  totalProjectValue,
                  collection,
                };
              }
            }

            console.error(`Projeto ${id} não encontrado em nenhuma coleção`);
            return null;
          })
        );

        const validProjects = fetchedProjects.filter((p) => p !== null);
        console.log("Projetos carregados:", validProjects);
        setProjects(validProjects);

        // Se houver projetos carregados, preencher os dados do usuário
        if (validProjects.length > 0) {
          const firstProject = validProjects[0];
          setUserData({
            nomeCompleto: firstProject.userName || "",
            email: firstProject.userEmail || "",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setPaymentStatus("Erro ao carregar informações dos projetos");
      }
    };

    fetchProjects();
  }, [projectIds, searchParams]);

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

  const addBusinessDays = (startDate, days) => {
    let currentDate = new Date(startDate);
    while (days > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        days -= 1;
      }
    }
    return currentDate;
  };

  const updateProjectsStatus = async () => {
    try {
      const firestore = getFirestore();
      await Promise.all(
        projectIds.map(async (id) => {
          // Tentar atualizar na coleção projects primeiro
          let projectRef = doc(firestore, "projects", id);
          let projectDoc = await getDoc(projectRef);

          // Se não encontrar na coleção projects, tentar na clientprojects
          if (!projectDoc.exists()) {
            projectRef = doc(firestore, "clientprojects", id);
            projectDoc = await getDoc(projectRef);
          }

          if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            const totalPages = projectData.files.reduce(
              (sum, file) => sum + file.pageCount,
              0
            );
            const deadlineDays = determineDeadlineDays(
              totalPages,
              projectData.isPriority
            );
            const deadlineDate = addBusinessDays(new Date(), deadlineDays);

            // Determinar a coleção correta baseada no tipo de usuário
            let targetCollection;
            const userInfo = clientTypes[projectData.userEmail];

            if (userInfo?.userType === "colab") {
              // Para colaboradores, usa o registeredByType
              if (userInfo.registeredByType === "b2b") {
                targetCollection = "b2bprojectspaid";
              } else if (userInfo.registeredByType === "b2c") {
                targetCollection = "b2cprojectspaid";
              }
            } else {
              // Para usuários normais, usa o userType
              if (userInfo?.userType === "b2b") {
                targetCollection = "b2bprojectspaid";
              } else if (userInfo?.userType === "b2c") {
                targetCollection = "b2cprojectspaid";
              }
            }

            // Criar referência para o novo documento na coleção correta
            const newProjectRef = doc(firestore, targetCollection, id);

            // Atualizar o projeto na nova coleção
            await updateDoc(newProjectRef, {
              ...projectData,
              payment_status: "Pago",
              project_status: "Em análise",
              deadlineDate: deadlineDate.toISOString(),
              paidAt: new Date().toISOString(),
              collection: targetCollection,
            });

            // Deletar o projeto da coleção antiga
            await deleteDoc(projectRef);
          }
        })
      );

      return true;
    } catch (error) {
      console.error("Erro ao atualizar status dos projetos:", error);
      throw error;
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: userData.nomeCompleto,
              email: userData.email,
            },
          },
        }
      );

      if (error) {
        setPaymentStatus(`Erro: ${error.message}`);
      } else if (paymentIntent.status === "succeeded") {
        try {
          await updateProjectsStatus();
          setPaymentStatus("Pagamento realizado com sucesso!");
          setPaymentSuccessful(true);
        } catch (updateError) {
          console.error("Erro ao atualizar projetos:", updateError);
          setPaymentStatus("Erro ao atualizar status dos projetos");
        }
      }
    } catch (error) {
      setPaymentStatus(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <PageLayout hideHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Pagamento
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
                      project.files.reduce(
                        (sum, file) => sum + file.pageCount,
                        0
                      ),
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
                        {project.isPriority && (
                          <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                            Prioridade
                          </span>
                        )}
                      </div>

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
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      U${" "}
                      {projects
                        .reduce((total, project) => {
                          const projectTotal = project.files.reduce(
                            (sum, file) => {
                              const fileTotal =
                                Number(file.total) ||
                                Number(file.totalValue) ||
                                0;
                              return sum + fileTotal;
                            },
                            0
                          );
                          return total + projectTotal;
                        }, 0)
                        .toFixed(2)}
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
                <form onSubmit={handlePayment}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={userData.nomeCompleto}
                        onChange={(e) =>
                          setUserData({
                            ...userData,
                            nomeCompleto: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                        placeholder="Digite seu nome completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={userData.email}
                        onChange={(e) =>
                          setUserData({ ...userData, email: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                        placeholder="Digite seu email"
                      />
                    </div>

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
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!stripe || loading || paymentSuccessful}
                      className={`w-full px-6 py-3 rounded-lg transition-all duration-200 shadow-sm text-center font-medium ${
                        loading || paymentSuccessful
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {loading
                        ? "Processando..."
                        : paymentSuccessful
                        ? "Pagamento Realizado"
                        : `Pagar U$ ${projects
                            .reduce((total, project) => {
                              const projectTotal = project.files.reduce(
                                (sum, file) => {
                                  const fileTotal =
                                    Number(file.total) ||
                                    Number(file.totalValue) ||
                                    0;
                                  return sum + fileTotal;
                                },
                                0
                              );
                              return total + projectTotal;
                            }, 0)
                            .toFixed(2)}`}
                    </button>
                  </div>
                </form>

                {paymentStatus && (
                  <div
                    className={`mt-4 p-4 rounded-lg text-center ${
                      paymentStatus.includes("Erro")
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {paymentStatus.includes("Erro") ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {paymentStatus}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default PaymentPage;
