import { useEffect, useRef, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

export const useMasterNotifications = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
  } = useNotifications();

  // Referencias para evitar re-renders desnecessários
  const countersRef = useRef({
    unread: new Set(),
    budget: new Set(),
    approval: new Set(),
    approved: new Set(),
    inAnalysis: new Set(),
    onGoing: new Set(),
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
      updateMasterUnreadCount(counters.unread.size);
      updateBudgetCount(counters.budget.size);
      updateApprovalCount(counters.approval.size);
      updateApprovedCount(counters.approved.size);
      updateInAnalysisCount(counters.inAnalysis.size);
      updateOnGoingCount(counters.onGoing.size);
    }, 100); // Debounce de 100ms
  }, [
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
  ]);

  useEffect(() => {
    if (authLoading || !user || isInitializedRef.current) {
      return;
    }

    const userType = user?.userType?.toLowerCase();

    // Só executar para usuário master
    if (userType !== "master") {
      return;
    }

    isInitializedRef.current = true;

    const fetchAllMasterNotifications = async () => {
      try {
        const firestore = getFirestore();

        // Todas as coleções que o Master monitora
        const allCollections = [
          "b2bdocsaved",
          "b2bdocprojects",
          "b2bsketch",
          "b2bapproved",
          "b2bapproval",
          "b2bprojectspaid",
          "b2csketch",
          "b2cdocsaved",
          "b2cdocprojects",
          "b2cprojectspaid",
          "b2capproval",
          "b2capproved",
        ];

        // Resetar contadores
        countersRef.current = {
          unread: new Set(),
          budget: new Set(),
          approval: new Set(),
          approved: new Set(),
          inAnalysis: new Set(),
          onGoing: new Set(),
        };

        // 1. CONTAR TODOS PROJETOS NÃO LIDOS PELO MASTER (MasterRead = false)
        allCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          const q = query(collectionRef, orderBy("createdAt", "desc"));

          const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.MasterRead === false) {
                countersRef.current.unread.add(doc.id);
              }
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe);
        });

        // 2. CONTAR PROJETOS AGUARDANDO ORÇAMENTO (b2bdocprojects e b2cdocprojects)
        ["b2bdocprojects", "b2cdocprojects"].forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          const q = query(collectionRef, orderBy("createdAt", "desc"));

          const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.budget.add(doc.id);
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe);
        });

        // 3. CONTAR PROJETOS AGUARDANDO APROVAÇÃO (b2bapproval e b2capproval)
        ["b2bapproval", "b2capproval"].forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          const q = query(collectionRef, orderBy("createdAt", "desc"));

          const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.approval.add(doc.id);
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe);
        });

        // 4. CONTAR PROJETOS APROVADOS (b2bapproved e b2capproved)
        ["b2bapproved", "b2capproved"].forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          const q = query(collectionRef, orderBy("createdAt", "desc"));

          const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.approved.add(doc.id);
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe);
        });

        // 5. CONTAR PROJETOS EM ANÁLISE
        [
          "b2bapproved",
          "b2bprojectspaid",
          "b2cprojectspaid",
          "b2capproved",
        ].forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Buscar projetos com status "Em Análise" (case-insensitive)
          const q1 = query(
            collectionRef,
            where("project_status", "==", "Em Análise"),
            orderBy("createdAt", "desc")
          );

          const q2 = query(
            collectionRef,
            where("project_status", "==", "em análise"),
            orderBy("createdAt", "desc")
          );

          const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.inAnalysis.add(doc.id);
            });
            updateCounters();
          });

          const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.inAnalysis.add(doc.id);
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe1, unsubscribe2);
        });

        // 6. CONTAR PROJETOS EM ANDAMENTO
        allCollections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          const q = query(
            collectionRef,
            where("project_status", "==", "Em Andamento"),
            orderBy("createdAt", "desc")
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((doc) => {
              countersRef.current.onGoing.add(doc.id);
            });
            updateCounters();
          });

          unsubscribeFunctionsRef.current.push(unsubscribe);
        });

        console.log("✅ Master notifications initialized successfully");
      } catch (error) {
        console.error("❌ Erro ao buscar notificações do master:", error);
      }
    };

    fetchAllMasterNotifications();

    // Cleanup function
    return () => {
      unsubscribeFunctionsRef.current.forEach((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
      unsubscribeFunctionsRef.current = [];
      isInitializedRef.current = false;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, authLoading, updateCounters]);
};
