import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import { IoMdArrowDropup, IoMdArrowDropdown } from "react-icons/io";
import ClientLayout from "../../components/layouts/ClientLayout";

const ClientGoingOn = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const db = getFirestore();
        const projectsRef = collection(db, "projects");
        const q = query(
          projectsRef,
          where("clientId", "==", auth.currentUser.uid),
          where("status", "==", "Em Andamento"),
          orderBy(sortField, sortDirection)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const projectsList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setProjects(projectsList);
            setLoading(false);
          },
          (error) => {
            console.error("Erro ao buscar projetos:", error);
            setError(
              "Erro ao carregar os projetos. Por favor, tente novamente."
            );
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        setError("Erro ao carregar os projetos. Por favor, tente novamente.");
        setLoading(false);
      }
    };

    fetchProjects();
  }, [sortField, sortDirection]);

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
    const total = files.reduce((sum, file) => sum + (file.value || 0), 0);
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

export default ClientGoingOn;
