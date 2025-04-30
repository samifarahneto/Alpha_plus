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
import { IoMdArrowDropup, IoMdArrowDropdown } from "react-icons/io";

const ClientPayments = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const firestore = getFirestore();

      // Buscar informações do usuário atual
      const userDoc = await getDocs(
        query(collection(firestore, "users"), where("email", "==", user.email))
      );

      if (userDoc.empty) {
        console.error("Documento do usuário não encontrado");
        setLoading(false);
        return;
      }

      const userData = userDoc.docs[0].data();
      const userType = userData.userType.toLowerCase();
      const registeredByType = userData.registeredByType?.toLowerCase();

      // Determinar as coleções baseadas no tipo de usuário
      let collections = [];
      if (userType === "colab") {
        // Para colaboradores, usa o registeredByType
        if (registeredByType === "b2b") {
          collections = [
            "b2bapproved",
            "b2bdocsaved",
            "b2bdocprojects",
            "b2bapproval",
            "b2bsketch",
          ];
        } else if (registeredByType === "b2c") {
          collections = [
            "b2capproved",
            "b2cdocsaved",
            "b2cdocprojects",
            "b2capproval",
            "b2csketch",
          ];
        }
      } else {
        // Para usuários normais, usa o userType
        if (userType === "b2b") {
          collections = [
            "b2bapproved",
            "b2bdocsaved",
            "b2bdocprojects",
            "b2bapproval",
            "b2bsketch",
          ];
        } else if (userType === "b2c") {
          collections = [
            "b2capproved",
            "b2cdocsaved",
            "b2cdocprojects",
            "b2capproval",
            "b2csketch",
          ];
        }
      }

      const projectsData = [];

      // Buscar usuários registrados pelo usuário atual
      const usersQuery = query(
        collection(firestore, "users"),
        where("registeredBy", "==", user.email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const registeredEmails = usersSnapshot.docs.map(
        (doc) => doc.data().email
      );

      // Adicionar o email do usuário atual à lista
      registeredEmails.push(user.email);

      // Para cada coleção
      for (const collectionName of collections) {
        const collectionRef = collection(firestore, collectionName);

        // Configurar listeners para cada email
        registeredEmails.forEach((email) => {
          const q1 = query(
            collectionRef,
            where("projectOwner", "==", email),
            where("payment_status", "in", ["Pendente", "Divergência"]),
            orderBy("createdAt", "desc")
          );

          const q2 = query(
            collectionRef,
            where("userEmail", "==", email),
            where("payment_status", "in", ["Pendente", "Divergência"]),
            orderBy("createdAt", "desc")
          );

          const unsubscribe1 = onSnapshot(q1, handleSnapshot);
          const unsubscribe2 = onSnapshot(q2, handleSnapshot);

          return () => {
            unsubscribe1();
            unsubscribe2();
          };
        });
      }

      function handleSnapshot(snapshot) {
        const newProjects = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          collection: snapshot.query._query.path.segments[0],
        }));

        projectsData.push(...newProjects);

        setProjects((prevProjects) => {
          const projectMap = new Map(
            [...prevProjects, ...projectsData].map((p) => [p.id, p])
          );
          return Array.from(projectMap.values());
        });

        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar pagamentos pendentes:", error);
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
      if (field === "userEmail") {
        return direction === "asc"
          ? a.userEmail.localeCompare(b.userEmail)
          : b.userEmail.localeCompare(a.userEmail);
      }
      if (field === "projectName") {
        return direction === "asc"
          ? a.projectName.localeCompare(b.projectName)
          : b.projectName.localeCompare(a.projectName);
      }
      if (field === "createdAt") {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (field === "pageCount") {
        const pagesA =
          a.files?.reduce((sum, file) => sum + (file.pageCount || 0), 0) || 0;
        const pagesB =
          b.files?.reduce((sum, file) => sum + (file.pageCount || 0), 0) || 0;
        return direction === "asc" ? pagesA - pagesB : pagesB - pagesA;
      }
      if (field === "sourceLanguage") {
        return direction === "asc"
          ? a.sourceLanguage.localeCompare(b.sourceLanguage)
          : b.sourceLanguage.localeCompare(a.sourceLanguage);
      }
      if (field === "targetLanguage") {
        return direction === "asc"
          ? a.targetLanguage.localeCompare(b.targetLanguage)
          : b.targetLanguage.localeCompare(a.targetLanguage);
      }
      if (field === "totalValue") {
        const valueA = parseFloat(calculateTotalValue(a.files));
        const valueB = parseFloat(calculateTotalValue(b.files));
        return direction === "asc" ? valueA - valueB : valueB - valueA;
      }
      if (field === "status") {
        return direction === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
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
          Pagamentos Pendentes
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

        {!loading && !error && (
          <div>
            {/* Botão Pagar */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  if (selectedProjects.length > 0) {
                    navigate("/client/checkout", {
                      state: { selectedProjects },
                    });
                  } else {
                    alert(
                      "Por favor, selecione ao menos um projeto para pagar."
                    );
                  }
                }}
                style={{
                  padding: "5px 10px",
                  backgroundColor:
                    selectedProjects.length > 0 ? "#E0F7FA" : "#fff",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  fontSize: "14px",
                  cursor:
                    selectedProjects.length > 0 ? "pointer" : "not-allowed",
                  color: "#333",
                  whiteSpace: "nowrap",
                  width: "auto",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  transition:
                    "background-color 0.3s ease, box-shadow 0.3s ease",
                }}
                disabled={selectedProjects.length === 0}
              >
                Pagar Projetos
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
              <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
                <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                  <tr>
                    <th
                      onClick={() => handleSort("projectOwner")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Autor
                        {sortConfig.field === "projectOwner" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("userEmail")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Email
                        {sortConfig.field === "userEmail" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("projectName")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Nome do Projeto
                        {sortConfig.field === "projectName" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("createdAt")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Data
                        {sortConfig.field === "createdAt" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("pageCount")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Págs
                        {sortConfig.field === "pageCount" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("sourceLanguage")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Origem
                        {sortConfig.field === "sourceLanguage" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("targetLanguage")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Destino
                        {sortConfig.field === "targetLanguage" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("totalValue")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Valor U$
                        {sortConfig.field === "totalValue" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Status
                        {sortConfig.field === "status" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("deadlineDate")}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap text-center"
                    >
                      <div className="flex items-center justify-center">
                        Prazo
                        {sortConfig.field === "deadlineDate" &&
                          (sortConfig.direction === "asc" ? (
                            <IoMdArrowDropup className="inline ml-1" />
                          ) : (
                            <IoMdArrowDropdown className="inline ml-1" />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        Sel.
                      </div>
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
                        <div className="flex items-center justify-center">
                          {project.nomeCompleto || project.projectOwner}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.userEmail}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.projectName &&
                          project.projectName.length > 15
                            ? `${project.projectName.slice(0, 15)}...`
                            : project.projectName || "Sem Nome"}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {new Date(
                            project.createdAt?.seconds * 1000
                          ).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.files?.reduce(
                            (sum, file) =>
                              sum + (parseInt(file.pageCount) || 0),
                            0
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.sourceLanguage}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.targetLanguage}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          U$ {calculateTotalValue(project.files)}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              project.isPaid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {project.isPaid ? "PAGO" : "PENDENTE"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        <div className="flex items-center justify-center">
                          {project.deadlineDate && project.deadlineDate.seconds
                            ? new Date(
                                project.deadlineDate.seconds * 1000
                              ).toLocaleDateString("pt-BR")
                            : "A definir"}
                        </div>
                      </td>
                      <td
                        className="px-4 py-1.5 whitespace-nowrap text-sm text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          {!project.isPaid && (
                            <input
                              type="checkbox"
                              checked={selectedProjects.some(
                                (p) => p === project.id
                              )}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setSelectedProjects([
                                    ...selectedProjects,
                                    project.id,
                                  ]);
                                } else {
                                  setSelectedProjects(
                                    selectedProjects.filter(
                                      (id) => id !== project.id
                                    )
                                  );
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPayments;
