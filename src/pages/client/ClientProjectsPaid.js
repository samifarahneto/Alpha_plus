import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ClientProjectsPaid = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const firestore = getFirestore();

        // Buscar informações do usuário atual
        const userDoc = await getDocs(
          query(
            collection(firestore, "users"),
            where("email", "==", currentUser.email)
          )
        );

        if (userDoc.empty) {
          console.error("Documento do usuário não encontrado");
          setLoading(false);
          return;
        }

        const userData = userDoc.docs[0].data();
        const userType = userData.userType.toLowerCase();
        const registeredByType = userData.registeredByType?.toLowerCase();

        console.log("Dados do usuário:", {
          userType,
          registeredByType,
          email: currentUser.email,
        });

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Determinar os emails a serem buscados baseado no tipo de usuário
        if (userType === "colab") {
          // Colaborador vê apenas seus próprios projetos
          emailsToSearch = [currentUser.email];
        } else {
          // B2B ou B2C veem seus projetos e de seus colaboradores
          emailsToSearch.push(currentUser.email);

          // Busca todos os usuários que foram registrados por este usuário
          const registeredUsersQuery = query(
            collection(firestore, "users"),
            where("registeredBy", "==", currentUser.email)
          );
          const registeredUsersSnapshot = await getDocs(registeredUsersQuery);
          registeredUsersSnapshot.forEach((doc) => {
            emailsToSearch.push(doc.data().email);
          });
        }

        // Determinar as coleções baseadas no registeredByType
        let collections = [];
        if (userType === "colab") {
          // Se for colaborador, usa o registeredByType
          if (registeredByType === "b2b") {
            collections = ["b2bprojectspaid"];
          } else if (registeredByType === "b2c") {
            collections = ["b2cprojectspaid"];
          }
        } else {
          // Se for usuário normal (b2b ou b2c), usa o userType
          if (userType === "b2b") {
            collections = ["b2bprojectspaid"];
          } else if (userType === "b2c") {
            collections = ["b2cprojectspaid"];
          }
        }

        console.log("Configuração de busca:", {
          userType,
          registeredByType,
          emailsToSearch,
          collections,
        });

        // Array para armazenar os unsubscribe functions
        const unsubscribeFunctions = [];

        // Limpar os projetos existentes antes de começar a escutar por novos
        setProjects([]);

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            console.log(
              `Buscando projetos para ${email} na coleção ${collectionName}`
            );

            // Buscar projetos onde o email é o userEmail
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              where("payment_status", "==", "Pago"),
              orderBy("createdAt", "desc")
            );

            // Adicionar listener para atualização em tempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} para ${email}:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                }))
              );

              // Primeiro, processar as mudanças
              snapshot.docChanges().forEach((change) => {
                if (change.type === "removed") {
                  setProjects((prevProjects) =>
                    prevProjects.filter(
                      (project) => project.id !== change.doc.id
                    )
                  );
                }
              });

              // Depois, atualizar com os novos dados
              const newProjects = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
                collection: collectionName,
              }));

              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
            });

            unsubscribeFunctions.push(unsubscribe);
          });

          // Buscar também projetos onde o usuário é o registeredBy
          if (!userType.includes("colab")) {
            const registeredByQuery = query(
              collectionRef,
              where("registeredBy", "==", currentUser.email),
              where("payment_status", "==", "Pago"),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(registeredByQuery, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} onde ${currentUser.email} é registeredBy:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                }))
              );

              const newProjects = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
                collection: collectionName,
              }));

              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
            });

            unsubscribeFunctions.push(unsubscribe);
          }
        });

        setLoading(false);

        // Cleanup function
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos pagos:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos Pagos
        </h1>

        {/* Links de Navegação */}
        <div className="flex justify-center gap-2 mb-6 border-b border-gray-200 px-4 overflow-x-auto">
          <span
            onClick={() => navigate("/client/projects")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/projects"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <FolderIcon className="w-5 h-5" />
            Todos Projetos
          </span>
          <span
            onClick={() => navigate("/client/projects-budget")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/projects-budget"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            Projetos Aguardando Orçamento
          </span>

          <span
            onClick={() => navigate("/client/going-on")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/going-on"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <ArrowPathIcon className="w-5 h-5" />
            Em Andamento
          </span>
          <span
            onClick={() => navigate("/client/projects-done")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/projects-done"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <CheckCircleIcon className="w-5 h-5" />
            Projetos Concluídos
          </span>
          <span
            onClick={() => navigate("/client/projects-paid")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/projects-paid"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <CurrencyDollarIcon className="w-5 h-5" />
            Projetos Pagos
          </span>
          <span
            onClick={() => navigate("/client/payments")}
            className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
              location.pathname === "/client/payments"
                ? "nav-link-active"
                : "nav-link-inactive"
            }`}
          >
            <CreditCardIcon className="w-5 h-5" />
            Pagamentos Pendentes
          </span>
        </div>

        {loading && (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando projetos...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-5">
            <p>Erro ao carregar os projetos: {error}</p>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center p-5">
            <p className="text-gray-500">Nenhum projeto encontrado.</p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Nome do Projeto
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Autor
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Data de Recebimento
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Língua de Origem
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Língua de Destino
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Valor Total
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                  >
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.projectName}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.projectOwner || "Não informado"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {new Date(
                        project.createdAt?.seconds * 1000
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.sourceLanguage}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.targetLanguage}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 font-medium text-center">
                      U$ {calculateTotalValue(project.files)}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Pago
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientProjectsPaid;
