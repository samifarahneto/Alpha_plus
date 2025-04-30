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

const ClientBudget = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    setError(null);

    const firestore = getFirestore();

    const fetchProjects = async () => {
      try {
        // Primeiro, buscar o tipo do usuário e seu registeredBy
        const userDoc = await getDocs(
          query(
            collection(firestore, "users"),
            where("email", "==", user.email)
          )
        );

        if (userDoc.empty) {
          console.error("Usuário não encontrado");
          return;
        }

        const userData = userDoc.docs[0].data();
        const userType = userData.userType.toLowerCase();

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Determinar os emails a serem buscados baseado no tipo de usuário
        if (userType === "colab") {
          // Colaborador vê apenas seus próprios projetos
          emailsToSearch = [user.email];
        } else {
          // B2B ou B2C veem seus projetos e de seus colaboradores
          // Primeiro, adiciona o próprio email
          emailsToSearch.push(user.email);

          // Busca todos os usuários que foram registrados por este usuário
          const registeredUsersQuery = query(
            collection(firestore, "users"),
            where("registeredBy", "==", user.email)
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
          collections = ["b2bdocprojects"];
        } else if (
          userType === "b2c" ||
          (userType === "colab" && userData.registeredByType === "b2c")
        ) {
          collections = ["b2cdocprojects"];
        }

        console.log("Configuração de busca:", {
          userType,
          registeredByType: userData.registeredByType,
          emailsToSearch,
          collections,
        });

        // Array para armazenar os unsubscribe functions
        const unsubscribeFunctions = [];

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            // Buscar projetos onde o email é o userEmail
            const q = query(
              collectionRef,
              where("userEmail", "==", email),
              orderBy("createdAt", "desc")
            );

            // Adicionar listener para atualização em tempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
              console.log(
                `Projetos encontrados em ${collectionName} para ${email}:`,
                snapshot.docs.length
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
        });

        setLoading(false);

        // Cleanup function
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
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
    navigate(`/client/projects/${projectId}?collection=docprojects`);
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
          Projetos Aguardando Orçamento
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
            <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                <tr>
                  <th
                    onClick={() => handleSort("projectOwner")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Autor
                      {sortField === "projectOwner" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("userEmail")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Email
                      {sortField === "userEmail" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("projectName")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
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
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
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
                    onClick={() => handleSort("pages")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Págs
                      {sortField === "pages" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("files")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Arqs
                      {sortField === "files" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("sourceLanguage")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
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
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
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
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-right"
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
                  <th
                    onClick={() => handleSort("isPaid")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Pgto
                      {sortField === "isPaid" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("deadlineDate")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Prazo
                      {sortField === "deadlineDate" &&
                        (sortDirection === "asc" ? (
                          <IoMdArrowDropup className="inline ml-1" />
                        ) : (
                          <IoMdArrowDropdown className="inline ml-1" />
                        ))}
                    </div>
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="table-body">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                  >
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {project.projectOwner || "N/A"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {project.userEmail}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {project.projectName && project.projectName.length > 15
                        ? `${project.projectName.slice(0, 15)}...`
                        : project.projectName || "Sem Nome"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {new Date(
                        project.createdAt?.seconds * 1000
                      ).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.totalPages || 0}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.files?.length || 0}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {project.sourceLanguage}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      {project.targetLanguage}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 font-medium">
                      U${" "}
                      {project.totalProjectValue ||
                        calculateTotalValue(project.files)}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                      <span
                        className={`status-badge ${
                          project.isPaid ? "status-approved" : "status-pending"
                        }`}
                      >
                        {project.isPaid ? "PAGO" : "PENDENTE"}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                      <span
                        className={
                          project.deadlineDate ? "font-medium" : "text-gray-500"
                        }
                      >
                        {project.deadlineDate
                          ? new Date(project.deadlineDate).toLocaleDateString(
                              "pt-BR"
                            )
                          : "A ser definido"}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                      <span className="status-badge status-pending">
                        Ag. Orçamento
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

export default ClientBudget;
