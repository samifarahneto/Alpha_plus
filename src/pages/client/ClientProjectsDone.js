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
import { IoMdArrowDropup, IoMdArrowDropdown } from "react-icons/io";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ClientProjectsDone = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
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

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Determinar os emails a serem buscados baseado no tipo de usuário
        if (userType === "colab") {
          // Colaborador vê apenas seus próprios projetos
          emailsToSearch = [currentUser.email];
        } else {
          // B2B ou B2C veem seus projetos e de seus colaboradores
          // Primeiro, adiciona o próprio email
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

        // Determinar as coleções baseadas no tipo de usuário
        let collections = [];
        if (
          userType === "b2b" ||
          (userType === "colab" && userData.registeredByType === "b2b")
        ) {
          collections = ["b2bprojectspaid", "b2bapproved"];
        } else if (
          userType === "b2c" ||
          (userType === "colab" && userData.registeredByType === "b2c")
        ) {
          collections = ["b2cprojectspaid", "b2capproved"];
        }

        console.log("Configuração de busca:", {
          userType,
          registeredByType: userData.registeredByType,
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

            // Buscar projetos onde o email é o userEmail e translation_status é "Finalizado"
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              where("translation_status", "==", "Finalizado"),
              orderBy("createdAt", "desc")
            );

            // Adicionar listener para atualização em tempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} para ${email}:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  translation_status: doc.data().translation_status,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                  projectName: doc.data().projectName,
                  project_status: doc.data().project_status,
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
              where("translation_status", "==", "Finalizado"),
              where("registeredBy", "==", currentUser.email),
              orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(registeredByQuery, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} onde ${currentUser.email} é registeredBy:`,
                snapshot.docs.length,
                snapshot.docs.map((doc) => ({
                  id: doc.id,
                  translation_status: doc.data().translation_status,
                  userEmail: doc.data().userEmail,
                  registeredBy: doc.data().registeredBy,
                  projectName: doc.data().projectName,
                  project_status: doc.data().project_status,
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
        console.error("Erro ao buscar projetos concluídos:", error);
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

  const calculateTotalPages = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => total + (file.pageCount || 0), 0);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  const handleSort = (field) => {
    const newDirection =
      field === sortField && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sortedProjects = [...projects].sort((a, b) => {
      let compareA, compareB;

      switch (field) {
        case "projectOwner":
          compareA = a.projectOwner?.toLowerCase() || "";
          compareB = b.projectOwner?.toLowerCase() || "";
          break;
        case "userEmail":
          compareA = a.userEmail?.toLowerCase() || "";
          compareB = b.userEmail?.toLowerCase() || "";
          break;
        case "projectName":
          compareA = a.projectName?.toLowerCase() || "";
          compareB = b.projectName?.toLowerCase() || "";
          break;
        case "createdAt":
          compareA = a.createdAt?.seconds || 0;
          compareB = b.createdAt?.seconds || 0;
          break;
        case "pages":
          compareA = calculateTotalPages(a.files) || 0;
          compareB = calculateTotalPages(b.files) || 0;
          break;
        case "files":
          compareA = a.files?.length || 0;
          compareB = b.files?.length || 0;
          break;
        case "sourceLanguage":
          compareA = a.sourceLanguage?.toLowerCase() || "";
          compareB = b.sourceLanguage?.toLowerCase() || "";
          break;
        case "targetLanguage":
          compareA = a.targetLanguage?.toLowerCase() || "";
          compareB = b.targetLanguage?.toLowerCase() || "";
          break;
        case "totalValue":
          compareA = Number(calculateTotalValue(a.files)) || 0;
          compareB = Number(calculateTotalValue(b.files)) || 0;
          break;
        case "isPaid":
          compareA = a.isPaid ? 1 : 0;
          compareB = b.isPaid ? 1 : 0;
          break;
        case "deadlineDate":
          compareA = a.deadlineDate ? new Date(a.deadlineDate).getTime() : 0;
          compareB = b.deadlineDate ? new Date(b.deadlineDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (newDirection === "asc") {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    setProjects(sortedProjects);
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos Concluídos
        </h2>

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
            <p className="text-gray-600">Carregando projetos...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-5">
            <p>Erro ao carregar os projetos: {error}</p>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
            <p className="text-gray-600">Nenhum projeto encontrado.</p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="table-default">
              <thead className="table-header">
                <tr>
                  <th
                    onClick={() => handleSort("projectName")}
                    className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Projeto
                      {sortField === "projectName" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Data
                      {sortField === "createdAt" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sourceLanguage")}
                    className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Origem
                      {sortField === "sourceLanguage" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("targetLanguage")}
                    className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Destino
                      {sortField === "targetLanguage" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("totalValue")}
                    className="table-header-cell !py-2 whitespace-nowrap max-w-[120px] text-center cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Valor U$
                      {sortField === "totalValue" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
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
                    onClick={() => handleProjectClick(project.id)}
                    className="table-row"
                  >
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center font-medium">
                      {project.projectName}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {new Date(
                        project.createdAt?.seconds * 1000
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.sourceLanguage}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      {project.targetLanguage}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      U$ {calculateTotalValue(project.files)}
                    </td>
                    <td className="table-cell !py-1.5 whitespace-nowrap max-w-[120px] text-center">
                      <span
                        className={`status-badge ${
                          project.project_status === "Finalizado"
                            ? "status-approved"
                            : project.project_status === "Em Andamento"
                            ? "status-ongoing"
                            : project.project_status === "Em Revisão"
                            ? "status-review"
                            : project.project_status === "Em Certificação"
                            ? "status-certification"
                            : project.project_status === "Cancelado"
                            ? "status-default"
                            : project.project_status === "Ag. Orçamento"
                            ? "status-budget"
                            : project.project_status === "Ag. Aprovação"
                            ? "status-approval"
                            : "status-default"
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

export default ClientProjectsDone;
