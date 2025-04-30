import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

// import "../../styles/Menu.css";
import { useAuth } from "../../../contexts/AuthContext";
import MasterNavigation from "./MasterNavigation";

const ProjectsApproval = () => {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [clientTypes, setClientTypes] = useState({});
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBudgetCount, setUnreadBudgetCount] = useState(0);
  const [unreadApprovalCount, setUnreadApprovalCount] = useState(0);
  const [activeLink, setActiveLink] = useState(() => {
    if (location.pathname.includes("projects-budget")) return "projectsBudget";
    if (location.pathname.includes("projects-approval"))
      return "projectsApproval";
    if (location.pathname.includes("projects-approved"))
      return "projectsCanceled";
    if (location.pathname.includes("ongoing")) return "ongoing";
    if (location.pathname.includes("projects-done")) return "projectsDone";
    if (location.pathname.includes("projects-paid")) return "projectsPaid";
    if (location.pathname.includes("payments")) return "payments";
    if (location.pathname === "/company/master/projects")
      return "masterProjects";
    return "masterProjects";
  });

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

            // Filtrar apenas projetos de aprovação
            const filteredProjects = snapshot.docs
              .filter(
                (doc) =>
                  collectionName === "b2bapproval" ||
                  collectionName === "b2capproval"
              )
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
          Projetos Aguardando Aprovação
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
            <p>
              Por favor, aguarde enquanto os índices são criados ou tente
              novamente mais tarde.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="table-default">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Cliente
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Cliente Origem
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Tipo
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Origem
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Nome do Projeto
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Data
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Mês/Ano
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Origem
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Destino
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Conv.
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Valor (U$)
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Status Pgto
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Prazo
                  </th>
                  <th className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() =>
                      handleRowClick(project.id, project.collection)
                    }
                    className="table-row"
                  >
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center font-medium">
                      {clientTypes[project.userEmail]?.nomeCompleto?.length > 20
                        ? `${clientTypes[project.userEmail]?.nomeCompleto.slice(
                            0,
                            20
                          )}...`
                        : clientTypes[project.userEmail]?.nomeCompleto ||
                          "Nome não disponível"}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center font-medium">
                      {project.userEmail?.length > 20
                        ? `${project.userEmail.slice(0, 20)}...`
                        : project.userEmail}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
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
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {(() => {
                        const text =
                          clientTypes[project.userEmail]?.registeredBy &&
                          clientTypes[
                            project.userEmail
                          ]?.registeredBy.trim() !== ""
                            ? clientTypes[project.userEmail]?.registeredBy
                            : project.userEmail || "N/A";
                        return text.length > 20
                          ? `${text.slice(0, 20)}...`
                          : text;
                      })()}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center font-medium">
                      {project.projectName && project.projectName.length > 10
                        ? `${project.projectName.slice(0, 10)}...`
                        : project.projectName || "Sem Nome"}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {new Date(
                        project.createdAt.seconds * 1000
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.createdAt
                        ? new Date(
                            project.createdAt.seconds * 1000
                          ).toLocaleDateString("pt-BR", {
                            month: "2-digit",
                            year: "2-digit",
                          })
                        : "Sem Data"}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.sourceLanguage}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.targetLanguage}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.convertCurrency ? "Sim" : "Não"}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      U${" "}
                      {Number(
                        project.totalProjectValue ||
                          project.totalValue ||
                          calculateTotalValue(project.files)
                      ).toFixed(2)}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      <span
                        className={`status-badge ${
                          project.isPaid ? "status-approved" : "status-pending"
                        }`}
                      >
                        {project.isPaid ? "PAGO" : "PENDENTE"}
                      </span>
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.deadlineDate
                        ? new Date(project.deadlineDate).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                        : "Sem Prazo"}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      <span className="status-badge status-pending">
                        Ag. Aprovação
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

export default ProjectsApproval;
