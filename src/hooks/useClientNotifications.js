import { useEffect, useRef, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

export const useClientNotifications = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    updateClientUnreadCount,
    updateClientBudgetCount,
    updateClientBudgetReadyCount,
    updateClientDivergenceCount,
    updateClientAnalysisCount,
    updateClientGoingOnCount,
    updateClientPaymentsCount,
  } = useNotifications();

  // Referencias para evitar re-renders desnecessários
  const countersRef = useRef({
    unread: new Set(),
    budget: new Set(),
    budgetReady: new Set(),
    divergence: new Set(),
    analysis: new Set(),
    goingOn: new Set(),
    payments: new Set(),
  });

  const unsubscribeFunctionsRef = useRef([]);
  const isInitializedRef = useRef(false);
  const timeoutRef = useRef(null);

  // Debounce para atualizações
  const updateCounters = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const counters = countersRef.current;
      updateClientUnreadCount(counters.unread.size);
      updateClientBudgetCount(counters.budget.size);
      updateClientBudgetReadyCount(counters.budgetReady.size);
      updateClientDivergenceCount(counters.divergence.size);
      updateClientAnalysisCount(counters.analysis.size);
      updateClientGoingOnCount(counters.goingOn.size);
      updateClientPaymentsCount(counters.payments.size);
    }, 100); // Debounce de 100ms
  }, [
    updateClientUnreadCount,
    updateClientBudgetCount,
    updateClientBudgetReadyCount,
    updateClientDivergenceCount,
    updateClientAnalysisCount,
    updateClientGoingOnCount,
    updateClientPaymentsCount,
  ]);

  useEffect(() => {
    if (authLoading || !user || isInitializedRef.current) {
      return;
    }

    const userType = user?.userType?.toLowerCase();

    // Só executar para usuários cliente
    if (!["b2b", "b2c", "colab"].includes(userType)) {
      return;
    }

    isInitializedRef.current = true;

    const fetchAllNotifications = async () => {
      try {
        const firestore = getFirestore();

        // Buscar dados do usuário
        const userDoc = await getDocs(
          query(
            collection(firestore, "users"),
            where("email", "==", user.email)
          )
        );

        if (userDoc.empty) {
          console.error("Documento do usuário não encontrado");
          return;
        }

        const userData = userDoc.docs[0].data();
        const userRegisteredBy = userData.registeredBy;
        const registeredByType = userData.registeredByType;
        const colaboradores = userData.colaboradores || [];
        const projectPermissions = userData.projectPermissions || [];

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Se for colab, busca apenas os projetos do próprio usuário e dos usuários que ele tem permissão
        if (userType === "colab") {
          emailsToSearch = [user.email, ...projectPermissions];
        } else {
          // Para b2b/b2c, busca projetos do usuário e dos vinculados
          const usersWithSameRegisteredBy = query(
            collection(firestore, "users"),
            where("registeredBy", "==", userRegisteredBy || user.email)
          );
          const usersSnapshot = await getDocs(usersWithSameRegisteredBy);
          emailsToSearch = usersSnapshot.docs
            .map((doc) => doc.data().email)
            .filter((email) => email);

          // Adicionar o email do usuário atual à lista se ele não estiver incluído
          if (user.email && !emailsToSearch.includes(user.email)) {
            emailsToSearch.push(user.email);
          }

          // Adicionar os emails dos colaboradores
          colaboradores.forEach((colab) => {
            if (colab.email && !emailsToSearch.includes(colab.email)) {
              emailsToSearch.push(colab.email);
            }
          });
        }

        // Determinar as coleções baseadas no tipo de usuário
        let collections = [];
        let budgetCollections = [];
        let budgetReadyCollections = [];
        let analysisCollections = [];
        let goingOnCollections = [];

        if (userType === "colab") {
          if (registeredByType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
            budgetCollections = ["b2bdocprojects"];
            budgetReadyCollections = ["b2bapproval"];
            analysisCollections = ["b2bapproved", "b2bprojectspaid"];
            goingOnCollections = ["b2bprojectspaid", "b2bapproved"];
          } else if (registeredByType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
            budgetCollections = ["b2cdocprojects"];
            budgetReadyCollections = ["b2capproval"];
            analysisCollections = ["b2cprojectspaid"];
            goingOnCollections = ["b2cprojectspaid"];
          }
        } else {
          if (userType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
            budgetCollections = ["b2bdocprojects"];
            budgetReadyCollections = ["b2bapproval"];
            analysisCollections = ["b2bapproved", "b2bprojectspaid"];
            goingOnCollections = ["b2bprojectspaid", "b2bapproved"];
          } else if (userType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
            budgetCollections = ["b2cdocprojects"];
            budgetReadyCollections = ["b2capproval"];
            analysisCollections = ["b2cprojectspaid"];
            goingOnCollections = ["b2cprojectspaid"];
          }
        }

        // Resetar contadores
        countersRef.current = {
          unread: new Set(),
          budget: new Set(),
          budgetReady: new Set(),
          divergence: new Set(),
          analysis: new Set(),
          goingOn: new Set(),
          payments: new Set(),
        };

        // 1. CONTAR TODOS PROJETOS (ClientRead = false)
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              orderBy("createdAt", "desc")
            );

            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              orderBy("createdAt", "desc")
            );

            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.ClientRead === false) {
                  countersRef.current.unread.add(doc.id);
                }
              });
              updateCounters();
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.ClientRead === false) {
                  countersRef.current.unread.add(doc.id);
                }
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe1, unsubscribe2);
          });
        });

        // 2. CONTAR AGUARDANDO ORÇAMENTO
        budgetCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              where("project_status", "==", "Ag. Orçamento"),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.budget.add(doc.id);
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe);
          });
        });

        // 3. CONTAR ORÇAMENTO RECEBIDO
        budgetReadyCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              where("project_status", "in", [
                "Orçamento Recebido",
                "Ag. Pagamento",
              ]),
              orderBy("createdAt", "desc")
            );

            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              where("project_status", "in", [
                "Orçamento Recebido",
                "Ag. Pagamento",
              ]),
              orderBy("createdAt", "desc")
            );

            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.budgetReady.add(doc.id);
              });
              updateCounters();
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.budgetReady.add(doc.id);
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe1, unsubscribe2);
          });
        });

        // 4. CONTAR EM ANÁLISE
        analysisCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const createQueries = (emailField, emailValue) => {
              return [
                query(
                  collectionRef,
                  where(emailField, "==", emailValue),
                  where("project_status", "==", "Em Análise"),
                  orderBy("createdAt", "desc")
                ),
                query(
                  collectionRef,
                  where(emailField, "==", emailValue),
                  where("project_status", "==", "Em análise"),
                  orderBy("createdAt", "desc")
                ),
              ];
            };

            const projectOwnerQueries = createQueries("projectOwner", email);
            const userEmailQueries = createQueries("userEmail", email);
            const allQueries = [...projectOwnerQueries, ...userEmailQueries];

            allQueries.forEach((queryObj) => {
              const unsubscribe = onSnapshot(queryObj, (snapshot) => {
                snapshot.docs.forEach((doc) => {
                  countersRef.current.analysis.add(doc.id);
                });
                updateCounters();
              });

              unsubscribeFunctionsRef.current.push(unsubscribe);
            });
          });
        });

        // 5. CONTAR EM ANDAMENTO
        goingOnCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              where("translation_status", "==", "Em Tradução"),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.goingOn.add(doc.id);
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe);
          });
        });

        // 6. CONTAR DIVERGÊNCIA
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                const project = doc.data();
                const paymentStatus =
                  typeof project.payment_status === "object"
                    ? project.payment_status.status
                    : project.payment_status;

                if (
                  paymentStatus === "Em Divergência" ||
                  paymentStatus === "Divergência"
                ) {
                  countersRef.current.divergence.add(doc.id);
                }
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe);
          });
        });

        // 7. CONTAR PAGAMENTOS PENDENTES
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          emailsToSearch.forEach((email) => {
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              where("payment_status", "==", "Pendente"),
              orderBy("createdAt", "desc")
            );

            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              where("payment_status", "==", "Pendente"),
              orderBy("createdAt", "desc")
            );

            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.payments.add(doc.id);
              });
              updateCounters();
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
              snapshot.docs.forEach((doc) => {
                countersRef.current.payments.add(doc.id);
              });
              updateCounters();
            });

            unsubscribeFunctionsRef.current.push(unsubscribe1, unsubscribe2);
          });
        });
      } catch (error) {
        console.error("Erro ao buscar notificações do cliente:", error);
      }
    };

    fetchAllNotifications();

    // Cleanup function
    return () => {
      unsubscribeFunctionsRef.current.forEach((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
      unsubscribeFunctionsRef.current = [];
      isInitializedRef.current = false;
    };
  }, [user, authLoading, updateCounters]);
};
