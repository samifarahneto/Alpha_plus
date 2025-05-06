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

const ClientProjectsPaid = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <ClientLayout>
      {!loading && (
        <div className="w-full">
          {error && (
            <div className="text-center p-4 md:p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-4 md:my-5">
              <p>Erro ao carregar os projetos: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center p-4 md:p-8">
              <div className="animate-spin rounded-full h-12 md:h-16 w-12 md:w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
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
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("projectName")}
                        >
                          <div className="flex items-center gap-2">
                            Nome do Projeto
                            {sortField === "projectName" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("projectOwner")}
                        >
                          <div className="flex items-center gap-2">
                            Proprietário
                            {sortField === "projectOwner" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("createdAt")}
                        >
                          <div className="flex items-center gap-2">
                            Data de Criação
                            {sortField === "createdAt" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("sourceLanguage")}
                        >
                          <div className="flex items-center gap-2">
                            Idioma de Origem
                            {sortField === "sourceLanguage" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("targetLanguage")}
                        >
                          <div className="flex items-center gap-2">
                            Idioma de Destino
                            {sortField === "targetLanguage" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort("totalValue")}
                        >
                          <div className="flex items-center gap-2">
                            Valor Total
                            {sortField === "totalValue" && (
                              <span>
                                {sortDirection === "asc" ? (
                                  <IoMdArrowDropup className="w-4 h-4" />
                                ) : (
                                  <IoMdArrowDropdown className="w-4 h-4" />
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
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                              {project.projectName}
                            </td>
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                              {project.projectOwner || "Não informado"}
                            </td>
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                              {new Date(
                                project.createdAt?.seconds * 1000
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                              {project.sourceLanguage}
                            </td>
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                              {project.targetLanguage}
                            </td>
                            <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
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
        </div>
      )}
    </ClientLayout>
  );
};

export default ClientProjectsPaid;
