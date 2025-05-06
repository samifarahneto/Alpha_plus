import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import ClientLayout from "../../components/layouts/ClientLayout";

const ClientPayments = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const firestore = getFirestore();
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
        const registeredByType = userData.registeredByType;
        const userEmail = currentUser.email;

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [userEmail];

        // Determinar as coleções baseadas no tipo de usuário
        let collections = [];
        if (userType === "colab") {
          // Para colaboradores, usa o registeredByType
          if (registeredByType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
          } else if (registeredByType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
          }
        } else {
          // Para usuários normais (b2b/b2c), usa o userType
          if (userType === "b2b") {
            collections = [
              "b2bdocsaved",
              "b2bdocprojects",
              "b2bsketch",
              "b2bapproved",
              "b2bapproval",
              "b2bprojectspaid",
            ];
          } else if (userType === "b2c") {
            collections = [
              "b2csketch",
              "b2cdocsaved",
              "b2cdocprojects",
              "b2cprojectspaid",
            ];
          }
        }

        // Array para armazenar os unsubscribe functions
        const unsubscribeFunctions = [];

        // Para cada coleção
        collections.forEach((collectionName) => {
          const collectionRef = collection(firestore, collectionName);

          // Para cada email relacionado
          emailsToSearch.forEach((email) => {
            // Buscar projetos onde o email é o projectOwner ou userEmail
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

            // Adicionar listeners para atualização em tempo real
            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
              const projectsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                collection: collectionName,
              }));
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                projectsList.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
              setLoading(false);
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
              const projectsList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                collection: collectionName,
              }));
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));
                projectsList.forEach((project) => {
                  projectMap.set(project.id, project);
                });
                return Array.from(projectMap.values());
              });
              setLoading(false);
            });

            unsubscribeFunctions.push(unsubscribe1, unsubscribe2);
          });
        });

        // Cleanup function para remover todos os listeners quando o componente for desmontado
        return () => {
          unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
        };
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar os projetos. Por favor, tente novamente.");
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate();
    return d.toLocaleDateString("pt-BR");
  };

  const calculateTotalValue = (files) => {
    if (!files) return "0.00";
    const total = files.reduce((sum, file) => sum + (file.total || 0), 0);
    return total.toFixed(2);
  };

  return (
    <ClientLayout>
      {error && (
        <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg shadow-sm my-4 md:p-5 md:my-5">
          <p>Erro ao carregar os projetos: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto md:h-16 md:w-16"></div>
          <p className="text-gray-600 mt-4">Carregando projetos...</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="w-full shadow-lg rounded-lg">
            <div className="min-w-full overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("projectName")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Nome do Projeto
                        {sortField === "projectName" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("projectOwner")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Proprietário
                        {sortField === "projectOwner" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Data de Criação
                        {sortField === "createdAt" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("sourceLanguage")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Idioma de Origem
                        {sortField === "sourceLanguage" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("targetLanguage")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Idioma de Destino
                        {sortField === "targetLanguage" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer md:px-4 md:py-3"
                      onClick={() => handleSort("totalValue")}
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        Valor Total
                        {sortField === "totalValue" && (
                          <span>
                            {sortDirection === "asc" ? (
                              <IoMdArrowDropup className="w-3 h-3 md:w-4 md:h-4" />
                            ) : (
                              <IoMdArrowDropdown className="w-3 h-3 md:w-4 md:h-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => {
                    const totalValue = calculateTotalValue(project.files);
                    return (
                      <tr
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                      >
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          {project.projectName}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          {project.projectOwner}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          {formatDate(project.createdAt)}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          {project.sourceLanguage}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          {project.targetLanguage}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 md:px-4 md:text-sm">
                          R$ {totalValue}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
};

export default ClientPayments;
