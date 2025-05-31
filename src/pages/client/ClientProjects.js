import React, { useEffect, useState, useCallback } from "react";
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
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { IoMdSettings } from "react-icons/io";
import { FaDownload } from "react-icons/fa";
import "../../styles/Pagination.css";
import Filter from "../../components/Filter";
import "../../components/FilterBar.css";
import ClientLayout from "../../components/layouts/ClientLayout";
import "../../styles/Navigation.css";
import DataTable from "../../components/DataTable";
import "../../styles/Table.css";

const ClientProjects = () => {
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [docProjects, setDocProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [filters, setFilters] = useState({
    projectName: "",
    authorName: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [projectsAwaitingApproval, setProjectsAwaitingApproval] = useState([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const savedVisibleColumns = localStorage.getItem(
      "clientProjectsVisibleColumns"
    );
    return savedVisibleColumns
      ? JSON.parse(savedVisibleColumns)
      : [
          "projectNumber",
          "projectOwner",
          "userEmail",
          "projectName",
          "createdAt",
          "pages",
          "files",
          "sourceLanguage",
          "targetLanguage",
          "totalValue",
          "isPaid",
          "deadlineDate",
          "project_status",
          "translation_status",
          "selector",
        ];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientProjectsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientProjectsColumnOrder");
    return savedColumnOrder ? JSON.parse(savedColumnOrder) : visibleColumns;
  });
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const navigate = useNavigate();

  const fixedColumns = ["projectOwner", "userEmail", "projectName", "selector"];

  const availableColumns = [
    { id: "projectNumber", label: "Nº" },
    { id: "projectOwner", label: "Autor", fixed: true },
    { id: "userEmail", label: "Email", fixed: true },
    { id: "projectName", label: "Projeto", fixed: true },
    { id: "createdAt", label: "Data" },
    { id: "pages", label: "Págs" },
    { id: "files", label: "Arqs" },
    { id: "sourceLanguage", label: "Origem" },
    { id: "targetLanguage", label: "Destino" },
    { id: "totalValue", label: "Valor U$" },
    { id: "isPaid", label: "Pgto" },
    { id: "deadlineDate", label: "Prazo" },
    { id: "project_status", label: "Status" },
    { id: "translation_status", label: "Tradução" },
    { id: "selector", label: "Sel.", fixed: true },
  ];

  // Função para verificar se há páginas zeradas
  const hasZeroPages = (files, project) => {
    // Usar a mesma lógica do calculateTotalPages para determinar o total
    const totalPages = calculateTotalPages(files, project);
    return totalPages === 0;
  };

  useEffect(() => {
    const fetchAuthorNames = async () => {
      const firestore = getFirestore();
      const usersCollection = collection(firestore, "users");

      // Atualizar projetos regulares
      const updatedProjects = await Promise.all(
        allProjects.map(async (project) => {
          if (project.projectOwner) {
            try {
              const q = query(
                usersCollection,
                where("email", "==", project.projectOwner)
              );
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                return {
                  ...project,
                  authorName: userData.nomeCompleto || project.projectOwner,
                };
              }
            } catch (error) {
              console.error(
                `Erro ao buscar nome para o email ${project.projectOwner}:`,
                error
              );
            }
          }
          return {
            ...project,
            authorName: project.projectOwner || "Não informado",
          };
        })
      );
      setAllProjects(updatedProjects);
      setProjects(updatedProjects);

      // Atualizar projetos em análise
      const updatedDocProjects = await Promise.all(
        docProjects.map(async (project) => {
          if (project.projectOwner) {
            try {
              const q = query(
                usersCollection,
                where("email", "==", project.projectOwner)
              );
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                return {
                  ...project,
                  authorName: userData.nomeCompleto || project.projectOwner,
                };
              }
            } catch (error) {
              console.error(
                `Erro ao buscar nome para o email ${project.projectOwner}:`,
                error
              );
            }
          }
          return {
            ...project,
            authorName: project.projectOwner || "Não informado",
          };
        })
      );
      setDocProjects(updatedDocProjects);
    };

    if (allProjects.length > 0 || docProjects.length > 0) {
      fetchAuthorNames();
    }
  }, [allProjects, docProjects]);

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
        const userRegisteredBy = userData.registeredBy;
        const userType = userData.userType.toLowerCase();
        const registeredByType = userData.registeredByType;
        const colaboradores = userData.colaboradores || [];
        const projectPermissions = userData.projectPermissions || [];

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Se for colab, busca apenas os projetos do próprio usuário e dos usuários que ele tem permissão
        if (userType === "colab") {
          emailsToSearch = [currentUser.email, ...projectPermissions];
        } else {
          // Para b2b/b2c, busca projetos do usuário e dos vinculados
          const usersWithSameRegisteredBy = query(
            collection(firestore, "users"),
            where("registeredBy", "==", userRegisteredBy || currentUser.email)
          );
          const usersSnapshot = await getDocs(usersWithSameRegisteredBy);
          emailsToSearch = usersSnapshot.docs
            .map((doc) => doc.data().email)
            .filter((email) => email); // Remove emails undefined/null

          // Adicionar o email do usuário atual à lista se ele não estiver incluído
          if (
            currentUser.email &&
            !emailsToSearch.includes(currentUser.email)
          ) {
            emailsToSearch.push(currentUser.email);
          }

          // Adicionar os emails dos colaboradores listados no campo colaboradores
          colaboradores.forEach((colab) => {
            if (colab.email && !emailsToSearch.includes(colab.email)) {
              emailsToSearch.push(colab.email);
            }
          });
        }

        // Verificar se há emails para buscar
        if (emailsToSearch.length === 0) {
          console.warn("Nenhum email válido para buscar projetos");
          setLoading(false);
          return;
        }

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

        console.log("Configuração de busca:", {
          userType,
          registeredByType,
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
            // Buscar projetos onde o email é o projectOwner
            const q1 = query(
              collectionRef,
              where("projectOwner", "==", email),
              orderBy("createdAt", "desc")
            );

            // Buscar projetos onde o email é o userEmail
            const q2 = query(
              collectionRef,
              where("userEmail", "==", email),
              orderBy("createdAt", "desc")
            );

            // Adicionar listeners para atualização em tempo real
            const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
              const newProjects = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const projectData = doc.data();
                  const firestore = getFirestore();
                  const usersCollection = collection(firestore, "users");

                  let authorName = "Não informado";
                  if (projectData.projectOwner) {
                    try {
                      const userQuery = query(
                        usersCollection,
                        where("email", "==", projectData.projectOwner)
                      );
                      const userSnapshot = await getDocs(userQuery);
                      if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        authorName = userData.nomeCompleto || "Não informado";
                      }
                    } catch (error) {
                      console.error("Erro ao buscar nome do autor:", error);
                    }
                  }

                  return {
                    ...projectData,
                    id: doc.id,
                    collection: collectionName,
                    authorName: authorName,
                    projectOwner: projectData.projectOwner || "Não informado",
                    userEmail: projectData.userEmail || "Não informado",
                  };
                })
              );

              // Atualizar o estado com os novos dados
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));

                // Adicionar novos projetos
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });

                return Array.from(projectMap.values());
              });

              setAllProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));

                // Adicionar novos projetos
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });

                return Array.from(projectMap.values());
              });
            });

            const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
              const newProjects = await Promise.all(
                snapshot.docs.map(async (doc) => {
                  const projectData = doc.data();
                  const firestore = getFirestore();
                  const usersCollection = collection(firestore, "users");

                  let authorName = "Não informado";
                  if (projectData.projectOwner) {
                    try {
                      const userQuery = query(
                        usersCollection,
                        where("email", "==", projectData.projectOwner)
                      );
                      const userSnapshot = await getDocs(userQuery);
                      if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        authorName = userData.nomeCompleto || "Não informado";
                      }
                    } catch (error) {
                      console.error("Erro ao buscar nome do autor:", error);
                    }
                  }

                  return {
                    ...projectData,
                    id: doc.id,
                    collection: collectionName,
                    authorName: authorName,
                    projectOwner: projectData.projectOwner || "Não informado",
                    userEmail: projectData.userEmail || "Não informado",
                  };
                })
              );

              // Atualizar o estado com os novos dados
              setProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));

                // Adicionar novos projetos
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });

                return Array.from(projectMap.values());
              });

              setAllProjects((prevProjects) => {
                const projectMap = new Map(prevProjects.map((p) => [p.id, p]));

                // Adicionar novos projetos
                newProjects.forEach((project) => {
                  projectMap.set(project.id, project);
                });

                return Array.from(projectMap.values());
              });
            });

            unsubscribeFunctions.push(unsubscribe1, unsubscribe2);
          });
        });

        setLoading(false);

        // Cleanup function para remover todos os listeners quando o componente for desmontado
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

  // useEffect para atualizar dados filtrados quando allProjects muda
  useEffect(() => {
    if (allProjects.length > 0) {
      filterData(filters, allProjects);
    }
  }, [allProjects, filters]);

  // Adicionar useEffect para fechar o dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("rows-dropdown");
      const button = document.getElementById("rows-button");
      if (
        dropdown &&
        button &&
        !dropdown.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setShowRowsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    setShowRowsDropdown(false);
    localStorage.setItem("clientProjectsRowsPerPage", value.toString());
  };

  // Calcular índices para paginação
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = projects.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(projects.length / rowsPerPage);

  // Função para mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    filterData(newFilters, allProjects);
  };

  const filterData = (currentFilters, projectsToFilter) => {
    let filteredData = [...projectsToFilter];

    if (currentFilters.projectName) {
      filteredData = filteredData.filter((project) =>
        project.projectName
          ?.toLowerCase()
          .includes(currentFilters.projectName.toLowerCase())
      );
    }
    if (currentFilters.authorName) {
      filteredData = filteredData.filter((project) =>
        project.authorName
          ?.toLowerCase()
          .includes(currentFilters.authorName.toLowerCase())
      );
    }
    if (currentFilters.startDate && currentFilters.endDate) {
      const startDate = new Date(`${currentFilters.startDate}T00:00:00`);
      const endDate = new Date(`${currentFilters.endDate}T23:59:59`);

      filteredData = filteredData.filter((project) => {
        const createdAt = project.createdAt?.seconds
          ? new Date(project.createdAt.seconds * 1000)
          : null;
        return createdAt && createdAt >= startDate && createdAt <= endDate;
      });
    }

    setProjects(filteredData);
  };

  const calculateTotalPages = useCallback((files, row) => {
    // Primeiro, calcular as páginas dos arquivos originais
    let originalPages = 0;
    if (files && Array.isArray(files)) {
      originalPages = files.reduce((total, file) => {
        // Converter pageCount para número, lidando com diferentes tipos
        let pageCount = 0;
        if (file.pageCount !== undefined && file.pageCount !== null) {
          if (typeof file.pageCount === "string") {
            pageCount = parseInt(file.pageCount) || 0;
          } else if (typeof file.pageCount === "number") {
            pageCount = file.pageCount;
          }
        }
        return total + pageCount;
      }, 0);
    }

    // Se há payment_status com páginas de divergência, somar ao valor original
    if (row?.payment_status?.pages) {
      const divergencePages =
        typeof row.payment_status.pages === "string"
          ? parseInt(row.payment_status.pages) || 0
          : row.payment_status.pages || 0;

      return originalPages + divergencePages;
    }

    // Se não há divergência, retornar apenas as páginas originais
    return originalPages;
  }, []);

  const calculateTotalValue = useCallback((files) => {
    if (!files || !Array.isArray(files)) return "0.00";

    return files
      .reduce((acc, file) => {
        const fileTotal = Number(file.total) || 0;
        return acc + fileTotal;
      }, 0)
      .toFixed(2);
  }, []);

  const handleProjectClick = (projectId, collection) => {
    navigate(`/client/projects/${projectId}?collection=${collection}`);
  };

  const formatDate = (date) => {
    if (!date) return "A definir";

    // Verificar casos específicos de valores inválidos
    if (typeof date === "string") {
      // Se contém NaN ou é uma string inválida
      if (
        date.includes("NaN") ||
        date === "A ser definido" ||
        date === "Invalid Date"
      ) {
        return "A definir";
      }

      // Se a data vier como string no formato dd/mm/yyyy, manter o formato
      if (date.includes("/")) {
        const [day, month, year] = date.split("/");
        // Verificar se os componentes são válidos
        if (
          day &&
          month &&
          year &&
          !day.includes("NaN") &&
          !month.includes("NaN") &&
          !year.includes("NaN")
        ) {
          return `${day}/${month}/${year.slice(-2)}`;
        } else {
          return "A definir";
        }
      }
    }

    let dateObj;
    if (date.seconds) {
      // Caso seja um timestamp do Firestore
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      // Caso seja um objeto Date
      dateObj = date;
    } else if (typeof date === "string") {
      // Caso seja uma string ISO (como o deadlineDate)
      try {
        dateObj = new Date(date);
      } catch (error) {
        console.error("Erro ao converter data:", error);
        return "A definir";
      }
    } else {
      return "A definir";
    }

    if (isNaN(dateObj.getTime())) {
      return "A definir";
    }

    // Garantir que a data seja exibida no formato dd/mm/aa
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = String(dateObj.getFullYear()).slice(-2);

    // Retornar no formato dd/mm/aa
    return `${day}/${month}/${year}`;
  };

  const handlePaymentClick = () => {
    if (selectedProjects.length === 0) {
      alert("Por favor, selecione ao menos um projeto para pagar.");
      return;
    }

    // Filtrar projetos selecionados que não têm páginas zeradas
    const validProjects = selectedProjects.filter((projectId) => {
      const project = projects.find((p) => p.id === projectId);
      return project && !hasZeroPages(project.files, project);
    });

    if (validProjects.length === 0) {
      alert(
        "Todos os projetos selecionados têm páginas zeradas. Por favor, selecione projetos válidos."
      );
      return;
    }

    // Verificar se algum projeto está na coleção approval
    const projectsInApproval = validProjects.filter((projectId) => {
      const project = projects.find((p) => p.id === projectId);
      return project && project.collection === "approval";
    });

    if (projectsInApproval.length > 0) {
      const projectNames = projectsInApproval.map((projectId) => {
        const project = projects.find((p) => p.id === projectId);
        return project.projectName;
      });
      setProjectsAwaitingApproval(projectNames);
      setShowApprovalModal(true);
      return;
    }

    navigate("/client/checkout", {
      state: { selectedProjects: validProjects },
    });
  };

  const renderFilesModal = () => {
    if (!showFilesModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
          <div className="p-6">
            {/* Cabeçalho do Modal */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 text-center">
                Visualizar Arquivos
              </h3>
            </div>

            {/* Lista de Arquivos */}
            <div className="space-y-4">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {file.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {file.pageCount || 0} páginas
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const url = await getDownloadURL(
                            ref(getStorage(), file.fileUrl)
                          );
                          window.open(url, "_blank");
                        } catch (error) {
                          console.error("Erro ao abrir arquivo:", error);
                          alert(
                            "Erro ao acessar o arquivo. Por favor, tente novamente."
                          );
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowFilesModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleColumnToggle = (columnId) => {
    if (fixedColumns.includes(columnId)) return;

    setVisibleColumns((prev) => {
      const newVisibleColumns = prev.includes(columnId)
        ? prev.filter((col) => col !== columnId)
        : [...prev, columnId];
      return newVisibleColumns;
    });
  };

  const handleSaveColumns = () => {
    // Salvar as colunas visíveis no localStorage
    localStorage.setItem(
      "clientProjectsVisibleColumns",
      JSON.stringify(visibleColumns)
    );
    setShowColumnSelector(false);
  };

  const renderColumnSelector = () => {
    if (!showColumnSelector) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-96 bg-white rounded-lg shadow-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Personalizar Colunas
            </h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableColumns.map((column) => (
              <div key={column.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={column.id}
                  checked={column.fixed || visibleColumns.includes(column.id)}
                  onChange={() => handleColumnToggle(column.id)}
                  disabled={column.fixed}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={column.id}
                  className={`ml-2 text-sm ${
                    column.fixed ? "text-gray-500" : "text-gray-700"
                  }`}
                >
                  {column.label}
                  {column.fixed && (
                    <span className="ml-2 text-xs text-gray-400">(Fixa)</span>
                  )}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleSaveColumns}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salvar
            </button>
            <button
              onClick={() => setShowColumnSelector(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterBar = () => {
    return (
      <div className="filter-bar">
        <div className="filter-group">
          <Filter
            type="text"
            name="authorName"
            value={filters.authorName}
            onChange={handleFilterChange}
            placeholder="Filtrar por autor"
            label="Autor"
          />
        </div>
        <div className="filter-group">
          <Filter
            type="text"
            name="projectName"
            value={filters.projectName}
            onChange={handleFilterChange}
            placeholder="Filtrar por nome"
            label="Nome do Projeto"
          />
        </div>
        <div className="filter-group">
          <Filter
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            placeholder="Data Início"
            label="Data Início"
          />
        </div>
        <div className="filter-group">
          <Filter
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            placeholder="Data Fim"
            label="Data Fim"
          />
        </div>
      </div>
    );
  };

  const renderApprovalModal = () => {
    if (!showApprovalModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-96 bg-white rounded-lg shadow-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Projetos Aguardando Aprovação
            </h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {projectsAwaitingApproval.map((projectName, index) => (
              <div key={index} className="flex items-center">
                <span className="text-sm text-gray-700">{projectName}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowApprovalModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentStatusBadge = (status) => {
    const statusConfig = {
      Pago: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      Pendente: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      Atrasado: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      Divergência: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      "N/A": {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      },
    };

    const config = statusConfig[status] || statusConfig["N/A"];

    return (
      <div
        className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
      >
        {status || "N/A"}
      </div>
    );
  };

  const renderProjectStatusBadge = (status) => {
    const statusConfig = {
      "Em Andamento": {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      Finalizado: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      "Em Revisão": {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      Cancelado: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      "Em Análise": {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      "Ag. Orçamento": {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
      },
      "Ag. Aprovação": {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      },
      "Ag. Pagamento": {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      },
      "Em Divergência": {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      "N/A": {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      },
    };

    const config = statusConfig[status] || statusConfig["N/A"];

    return (
      <div
        className={`w-full px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-center text-xs font-medium`}
      >
        {status || "N/A"}
      </div>
    );
  };

  const columns = [
    {
      id: "projectNumber",
      label: "Nº",
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value || "N/A"}
        </span>
      ),
    },
    {
      id: "projectOwner",
      label: "Autor",
      fixed: true,
      render: (value, row) => (
        <span>
          {row.oldclientName ||
            (row.authorName && row.authorName.length > 15
              ? `${row.authorName.slice(0, 15)}...`
              : row.authorName || "Não informado")}
        </span>
      ),
    },
    {
      id: "userEmail",
      label: "Email",
      fixed: true,
      render: (value, row) => (
        <span>{row.oldclientEmail || row.userEmail || "Não informado"}</span>
      ),
    },
    {
      id: "projectName",
      label: "Projeto",
      fixed: true,
      render: (value) => (
        <span>
          {value && value.length > 15
            ? `${value.slice(0, 15)}...`
            : value || "Sem Nome"}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: "Data",
      render: (value) => formatDate(value),
    },
    {
      id: "pages",
      label: "Págs",
      render: (value, row) => {
        const totalPages = calculateTotalPages(row.files, row);
        return (
          <span key={`${row.id}-pages-${row.files?.length || 0}-${Date.now()}`}>
            {totalPages}
          </span>
        );
      },
    },
    {
      id: "files",
      label: "Arqs",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <span>{row.files?.length || 0}</span>
          {row.files?.length > 0 && (
            <FaDownload
              className="text-blue-600 hover:text-blue-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFiles(row.files);
                setShowFilesModal(true);
              }}
              size={14}
            />
          )}
        </div>
      ),
    },
    {
      id: "sourceLanguage",
      label: "Origem",
    },
    {
      id: "targetLanguage",
      label: "Destino",
    },
    {
      id: "totalValue",
      label: "Valor U$",
      render: (value, row) => `U$ ${calculateTotalValue(row.files)}`,
    },
    {
      id: "isPaid",
      label: "Pgto",
      render: (value, row) => {
        const status = row.payment_status;
        const statusText = !status
          ? "Pendente"
          : typeof status === "string"
          ? status
          : typeof status === "object" && status.status
          ? status.status
          : "Pendente";

        return renderPaymentStatusBadge(statusText);
      },
    },
    {
      id: "deadlineDate",
      label: "Prazo",
      render: (value) => (
        <span className="text-xs font-medium">
          {value ? formatDate(value) : "A definir"}
        </span>
      ),
    },
    {
      id: "project_status",
      label: "Status",
      render: (value) => renderProjectStatusBadge(value),
    },
    {
      id: "translation_status",
      label: "Tradução",
      render: (value) => renderProjectStatusBadge(value),
    },
    {
      id: "selector",
      label: "Sel.",
      fixed: true,
      render: (value, row) => {
        const isPendingPayment =
          row.payment_status === "Pendente" &&
          calculateTotalValue(row.files) !== "0.00";
        const hasZeroPagesValue = hasZeroPages(row.files, row);

        return (
          <div onClick={(e) => e.stopPropagation()}>
            {isPendingPayment && !hasZeroPagesValue && (
              <input
                type="checkbox"
                checked={selectedProjects.some((p) => p === row.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.checked) {
                    setSelectedProjects([...selectedProjects, row.id]);
                  } else {
                    setSelectedProjects(
                      selectedProjects.filter((id) => id !== row.id)
                    );
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            )}
            {hasZeroPagesValue && (
              <span className="text-xs text-red-500">
                {row.collection === "b2bdocsaved" ||
                row.collection === "b2cdocsaved"
                  ? "Solicitar Orçamento"
                  : "Aguardando Orçamento"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // Filtrar as colunas com base nas colunas visíveis
  const visibleColumnsData = columns.filter(
    (column) => visibleColumns.includes(column.id) || column.fixed
  );

  return (
    <ClientLayout>
      {!loading && (
        <>
          <div className="flex flex-col md:flex-row items-end gap-2.5 mb-8 px-2 md:px-10">
            {/* Versão Mobile - Aba Expansível */}
            <div className="w-full lg:hidden">
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors mb-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span className="font-medium">Filtros</span>
                  {isFiltersExpanded && (
                    <span className="text-sm text-gray-500">
                      (Clique para recolher)
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isFiltersExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Conteúdo dos Filtros Mobile */}
              <div
                className={`grid grid-cols-1 gap-4 transition-all duration-300 ease-in-out ${
                  isFiltersExpanded
                    ? "opacity-100 max-h-[500px] overflow-y-auto"
                    : "opacity-0 max-h-0 overflow-hidden"
                }`}
              >
                {renderFilterBar()}
              </div>

              {/* Botões Mobile */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => navigate("/client/projects/clientaddproject")}
                  className="flex-1 h-[38px] px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Novo Projeto
                </button>

                <button
                  onClick={handlePaymentClick}
                  disabled={selectedProjects.length === 0}
                  className={`flex-1 h-[38px] px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    selectedProjects.length > 0
                      ? "bg-green-50 hover:bg-green-100 text-green-700"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Pagar Projetos
                </button>

                <button
                  onClick={() => setShowColumnSelector(true)}
                  className="flex-1 h-[38px] px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <IoMdSettings className="w-4 h-4" />
                  <span>Personalizar Colunas</span>
                </button>
              </div>
            </div>

            {/* Versão Desktop */}
            <div className="hidden lg:flex w-full items-end gap-2.5">
              <div className="flex-1">{renderFilterBar()}</div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/client/projects/clientaddproject")}
                  className="h-[38px] px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Novo Projeto
                </button>

                <button
                  onClick={handlePaymentClick}
                  disabled={selectedProjects.length === 0}
                  className={`h-[38px] px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    selectedProjects.length > 0
                      ? "bg-green-50 hover:bg-green-100 text-green-700"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Pagar Projetos
                </button>

                <button
                  onClick={() => setShowColumnSelector(true)}
                  className="h-[38px] px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <IoMdSettings className="w-4 h-4" />
                  <span>Personalizar Colunas</span>
                </button>
              </div>
            </div>
          </div>

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
            <>
              <div className="w-full overflow-x-auto">
                <div className="w-full shadow-lg rounded-lg">
                  <DataTable
                    columns={visibleColumnsData}
                    data={currentRows}
                    initialColumnOrder={columnOrder}
                    fixedColumns={fixedColumns}
                    onRowClick={(row) =>
                      handleProjectClick(row.id, row.collection)
                    }
                    getRowClassName={(row) =>
                      "hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                    }
                  />
                </div>
              </div>

              {/* Paginação */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Projetos por página:
                  </span>
                  <div className="relative">
                    <button
                      id="rows-button"
                      onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {rowsPerPage}
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showRowsDropdown && (
                      <div
                        id="rows-dropdown"
                        className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg"
                      >
                        <div className="py-1">
                          {[10, 25, 50, 100].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleRowsPerPageChange(value)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`w-8 h-8 text-sm border rounded-lg ${
                            currentPage === page
                              ? "bg-blue-500 text-white border-blue-500"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {renderFilesModal()}
      {renderColumnSelector()}
      {renderApprovalModal()}
    </ClientLayout>
  );
};

export default ClientProjects;
