import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ClientGoingOn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });

  useEffect(() => {
    fetchOngoingProjects();
  }, []);

  const fetchOngoingProjects = async () => {
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
      let collections = ["b2bprojectspaid"]; // Apenas b2bprojectspaid para teste

      console.log("Configuração de busca:", {
        userType,
        registeredBy: userData.registeredBy,
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
        console.log(`Iniciando busca na coleção: ${collectionName}`);
        const collectionRef = collection(firestore, collectionName);

        // Buscar projetos com status específicos
        const allProjectsQuery = query(
          collectionRef,
          where("translation_status", "in", [
            "Em Andamento",
            "Em Revisão",
            "Em Certificação",
            "Em tradução",
          ])
        );

        // Adicionar listener para atualização em tempo real
        const unsubscribe = onSnapshot(
          allProjectsQuery,
          (snapshot) => {
            console.log(
              `Número total de documentos na coleção ${collectionName}:`,
              snapshot.size
            );

            if (snapshot.empty) {
              console.log(
                `Nenhum documento encontrado na coleção ${collectionName}`
              );
              return;
            }

            console.log(
              `Detalhes dos documentos em ${collectionName}:`,
              snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  translation_status: data.translation_status,
                  userEmail: data.userEmail,
                  registeredBy: data.registeredBy,
                  projectName: data.projectName,
                  project_status: data.project_status,
                  createdAt: data.createdAt,
                  deadlineDate: data.deadlineDate,
                  files: data.files,
                  totalValue: data.totalValue,
                };
              })
            );

            // Atualizar o estado com todos os projetos
            const allProjects = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
              collection: collectionName,
            }));

            console.log(`Projetos que serão exibidos:`, allProjects);
            setProjects(allProjects);
          },
          (error) => {
            console.error(
              `Erro ao buscar documentos da coleção ${collectionName}:`,
              error
            );
          }
        );

        unsubscribeFunctions.push(unsubscribe);
      });

      setLoading(false);

      // Cleanup function
      return () => {
        unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      };
    } catch (error) {
      console.error("Erro ao buscar projetos em tradução:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const calculateTotalValue = (files) => {
    if (!files || !Array.isArray(files)) return "0.00";
    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  };

  const handleSort = (field) => {
    let direction = "asc";
    if (sortConfig.field === field && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ field, direction });

    const sortedProjects = [...projects].sort((a, b) => {
      if (field === "projectOwner") {
        const nameA = (a.nomeCompleto || a.projectOwner || "").toLowerCase();
        const nameB = (b.nomeCompleto || b.projectOwner || "").toLowerCase();
        return direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      if (field === "createdAt") {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (field === "deadlineDate") {
        const dateA =
          a.deadlineDate && a.deadlineDate.seconds ? a.deadlineDate.seconds : 0;
        const dateB =
          b.deadlineDate && b.deadlineDate.seconds ? b.deadlineDate.seconds : 0;
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

    setProjects(sortedProjects);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/client/projects/${projectId}`);
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos em Andamento
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
            <FolderIcon className="w-4 h-4 mr-2" />
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
            <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
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
            <ArrowPathIcon className="w-4 h-4 mr-2" />
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
            <CheckCircleIcon className="w-4 h-4 mr-2" />
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
            <CheckCircleIcon className="w-4 h-4 mr-2" />
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
            <CurrencyDollarIcon className="w-4 h-4 mr-2" />
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

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Nome do Projeto
                  </th>
                  <th
                    onClick={() => handleSort("projectOwner")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    Autor
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    Data de Recebimento
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Língua de Origem
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Língua de Destino
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                    Valor Total
                  </th>
                  <th
                    onClick={() => handleSort("deadlineDate")}
                    className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                  >
                    Prazo
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
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
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 font-medium text-center">
                      {project.projectName && project.projectName.length > 15
                        ? `${project.projectName.slice(0, 15)}...`
                        : project.projectName || "Sem Nome"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.nomeCompleto || project.projectOwner}
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
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      U$ {calculateTotalValue(project.files)}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {project.deadlineDate || "A definir"}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.translation_status === "Finalizado"
                            ? "bg-green-100 text-green-700"
                            : project.translation_status === "Em Andamento"
                            ? "bg-blue-100 text-blue-700"
                            : project.translation_status === "Em Revisão"
                            ? "bg-yellow-100 text-yellow-700"
                            : project.translation_status === "Em Certificação"
                            ? "bg-orange-100 text-orange-700"
                            : project.translation_status === "Cancelado"
                            ? "bg-gray-100 text-gray-700"
                            : project.translation_status === "Ag. Orçamento"
                            ? "bg-purple-100 text-purple-700"
                            : project.translation_status === "Ag. Aprovação"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {project.translation_status || "N/A"}
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

export default ClientGoingOn;
