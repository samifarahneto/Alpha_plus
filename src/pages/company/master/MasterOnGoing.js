import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import MasterNavigation from "./MasterNavigation";

const MasterOnGoing = ({ style, isMobile }) => {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const [activeLink, setActiveLink] = useState(() => {
    if (location.pathname.includes("projects-budget")) return "projectsBudget";
    if (location.pathname.includes("projects-approval"))
      return "projectsApproval";
    if (location.pathname === "/company/master/projects")
      return "masterProjects";
    if (location.pathname === "/company/master/ongoing") return "ongoing";
    return "ongoing";
  });
  const [clientTypes, setClientTypes] = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBudgetCount, setUnreadBudgetCount] = useState(0);
  const [unreadApprovalCount, setUnreadApprovalCount] = useState(0);

  // Primeiro useEffect para carregar os tipos de usuários
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const firestore = getFirestore();
    const usersRef = collection(firestore, "users");

    const unsubscribeUsers = onSnapshot(
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
        setError(error.message);
      }
    );

    return () => unsubscribeUsers();
  }, [user, navigate]);

  // Segundo useEffect para carregar os projetos
  useEffect(() => {
    if (!clientTypes || !user) return;

    setLoading(true);
    setError(null);

    const firestore = getFirestore();
    const collections = [
      // Coleções B2B
      "b2bprojects",
      "b2bprojectspaid",
      "b2bapproved",
      "b2bdocprojects",
      "b2bapproval",
      // Coleções B2C
      "b2cprojectspaid",
      "b2cdocprojects",
      "b2capproval",
    ];

    try {
      const unsubscribeFunctions = collections.map((collectionName) => {
        const collectionRef = collection(firestore, collectionName);
        return onSnapshot(
          collectionRef,
          (snapshot) => {
            setAllProjects((prevProjects) => {
              const newProjects = [...prevProjects];
              snapshot.docChanges().forEach((change) => {
                const projectData = {
                  id: change.doc.id,
                  ...change.doc.data(),
                  files: change.doc.data().files || [],
                  collection: collectionName,
                };

                const index = newProjects.findIndex(
                  (p) => p.id === change.doc.id
                );

                if (change.type === "added" && index === -1) {
                  newProjects.push(projectData);
                } else if (change.type === "modified" && index !== -1) {
                  newProjects[index] = projectData;
                } else if (change.type === "removed" && index !== -1) {
                  newProjects.splice(index, 1);
                }
              });
              return newProjects;
            });

            // Filtrar apenas projetos com project_status específicos para a tabela
            const filteredProjects = snapshot.docs
              .filter((doc) => doc.data().project_status === "Em Andamento")
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                files: doc.data().files || [],
                collection: collectionName,
              }));

            setProjects((prevProjects) => {
              const otherCollectionsProjects = prevProjects.filter(
                (p) => p.collection !== collectionName
              );
              return [...otherCollectionsProjects, ...filteredProjects];
            });

            setLoading(false);
          },
          (error) => {
            console.error(`Erro ao carregar coleção ${collectionName}:`, error);
            setError(error.message);
          }
        );
      });

      return () => unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    } catch (error) {
      console.error("Erro ao configurar listeners:", error);
      setError(error.message);
      setLoading(false);
    }
  }, [clientTypes, user]);

  // Terceiro useEffect para processar os contadores
  useEffect(() => {
    if (!allProjects) return;

    // Processar todos os contadores em um único bloco
    const processCounters = () => {
      // Contagem para "Todos Projetos" - projetos não lidos em todas as coleções
      const unreadProjects = allProjects.filter((project) => {
        const hasUnreadFiles = project.files?.some((file) => !file.isRead);
        const isProjectUnread = project.isRead === false;
        return hasUnreadFiles || isProjectUnread;
      });

      // Contagem para "Aguardando Orçamento" - projetos nas coleções b2bdocprojects e b2cdocprojects com status "Ag. Orçamento"
      const budgetProjects = allProjects.filter(
        (project) =>
          (project.collection === "b2bdocprojects" ||
            project.collection === "b2cdocprojects") &&
          project.project_status === "Ag. Orçamento"
      );

      // Contagem para "Aguardando Aprovação" - projetos nas coleções b2bapproval e b2capproval com status "Ag. Aprovação"
      const approvalProjects = allProjects.filter(
        (project) =>
          (project.collection === "b2bapproval" ||
            project.collection === "b2capproval") &&
          project.project_status === "Ag. Aprovação"
      );

      // Atualizar todos os contadores de uma vez
      setUnreadCount(unreadProjects.length);
      setUnreadBudgetCount(budgetProjects.length);
      setUnreadApprovalCount(approvalProjects.length);

      console.log("Contagem de notificações:", {
        unreadProjects: unreadProjects.length,
        budgetProjects: budgetProjects.length,
        approvalProjects: approvalProjects.length,
        total:
          unreadProjects.length +
          budgetProjects.length +
          approvalProjects.length,
        collections: allProjects.map((p) => p.collection),
      });
    };

    processCounters();
  }, [allProjects]);

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const handleRowClick = async (projectId, collection) => {
    navigate(`/company/master/project/${projectId}?collection=${collection}`);
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos em Andamento
        </h2>

        <MasterNavigation
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          unreadCount={unreadCount}
          unreadBudgetCount={unreadBudgetCount}
          unreadApprovalCount={unreadApprovalCount}
        />

        {loading && (
          <div className="text-center p-8">
            <p className="text-gray-600">Carregando projetos...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-5">
            <p>Erro ao carregar os projetos: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Nome do Projeto
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Data de Criação
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Prazo
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Valor Total (U$)
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() =>
                      handleRowClick(project.id, project.collection)
                    }
                    className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                  >
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {clientTypes[project.userEmail]?.nomeCompleto || "N/A"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {(() => {
                        const userInfo = clientTypes[project.userEmail];
                        if (!userInfo) return "Desconhecido";

                        if (
                          userInfo.userType === "colaborator" &&
                          userInfo.registeredBy
                        ) {
                          const registeredByInfo =
                            clientTypes[userInfo.registeredBy];
                          if (
                            registeredByInfo &&
                            registeredByInfo.userType === "b2b"
                          ) {
                            return "B2B";
                          } else if (
                            registeredByInfo &&
                            (registeredByInfo.clientType === "Cliente" ||
                              registeredByInfo.clientType === "Colab")
                          ) {
                            return "B2C";
                          }
                        }

                        if (
                          userInfo.clientType === "Colab" ||
                          userInfo.clientType === "Cliente"
                        ) {
                          return "B2C";
                        }

                        return userInfo.clientType || "Desconhecido";
                      })()}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.projectName || "Sem Nome"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.createdAt
                        ? new Date(
                            project.createdAt.seconds * 1000
                          ).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.deadlineDate
                        ? new Date(project.deadlineDate).toLocaleDateString(
                            "pt-BR"
                          )
                        : "A definir"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center font-medium">
                      U$ {calculateTotalValue(project.files)}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.project_status === "Finalizado"
                            ? "bg-green-100 text-green-700"
                            : project.project_status === "Em Andamento"
                            ? "bg-blue-100 text-blue-700"
                            : project.project_status === "Em Revisão"
                            ? "bg-yellow-100 text-yellow-700"
                            : project.project_status === "Em Certificação"
                            ? "bg-orange-100 text-orange-700"
                            : project.project_status === "Cancelado"
                            ? "bg-gray-100 text-gray-700"
                            : project.project_status === "Ag. Orçamento"
                            ? "bg-purple-100 text-purple-700"
                            : project.project_status === "Ag. Aprovação"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {project.project_status || "Sem Status"}
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

export default MasterOnGoing;
