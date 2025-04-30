import React, { useEffect, useState, useCallback } from "react";
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
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import {
  IoMdArrowDropup,
  IoMdArrowDropdown,
  IoMdSettings,
} from "react-icons/io";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { FaDownload } from "react-icons/fa";
import "../../styles/Pagination.css";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableColumn = ({
  column,
  isFixed,
  onSort,
  sortField,
  sortDirection,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isFixed) {
      onSort(column.id);
    }
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${
        isFixed ? "cursor-not-allowed" : "cursor-move"
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-center gap-2">
        {column.label}
        <div className="flex flex-col">
          <IoMdArrowDropup
            className={`inline ml-1 ${
              sortField === column.id && sortDirection === "asc"
                ? "text-blue-500"
                : "text-gray-300"
            }`}
          />
          <IoMdArrowDropdown
            className={`inline ml-1 ${
              sortField === column.id && sortDirection === "desc"
                ? "text-blue-500"
                : "text-gray-300"
            }`}
          />
        </div>
      </div>
    </th>
  );
};

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
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
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
          "projectOwner", // Autor (fixo)
          "userEmail", // Email (fixo)
          "projectName", // Projeto (fixo)
          "createdAt", // Data
          "pages", // Págs
          "files", // Arqs
          "sourceLanguage", // Origem
          "targetLanguage", // Destino
          "totalValue", // Valor U$
          "isPaid", // Pgto
          "deadlineDate", // Prazo
          "project_status", // Status
          "translation_status", // Tradução
          "selector", // Sel. (fixo)
        ];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem("clientProjectsRowsPerPage");
    return savedRowsPerPage ? parseInt(savedRowsPerPage) : 10;
  });
  const [showRowsDropdown, setShowRowsDropdown] = useState(false);
  const [columnOrder, setColumnOrder] = useState(() => {
    const savedColumnOrder = localStorage.getItem("clientProjectsColumnOrder");
    return savedColumnOrder ? JSON.parse(savedColumnOrder) : visibleColumns;
  });

  const fixedColumns = ["projectOwner", "userEmail", "projectName", "selector"];

  const availableColumns = [
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

  const navigate = useNavigate();
  const location = useLocation();

  // Função para verificar se há páginas zeradas
  const hasZeroPages = (files) => {
    return files.some((file) => file.pageCount === 0);
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

        // Array para armazenar os emails dos projetos a serem buscados
        let emailsToSearch = [];

        // Se for colab, busca apenas os projetos do próprio usuário
        if (userType === "colab") {
          if (currentUser.email) {
            emailsToSearch = [currentUser.email];
          }
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
              if (!snapshot.empty) {
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

                setProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });

                setAllProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });
              } else {
                // Se a coleção estiver vazia, limpar os projetos dessa coleção
                setProjects((prevProjects) =>
                  prevProjects.filter((p) => p.collection !== collectionName)
                );
                setAllProjects((prevProjects) =>
                  prevProjects.filter((p) => p.collection !== collectionName)
                );
              }
            });

            const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
              if (!snapshot.empty) {
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

                setProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });

                setAllProjects((prevProjects) => {
                  const projectMap = new Map(
                    prevProjects.map((p) => [p.id, p])
                  );
                  newProjects.forEach((project) => {
                    projectMap.set(project.id, project);
                  });
                  return Array.from(projectMap.values());
                });
              } else {
                // Se a coleção estiver vazia, limpar os projetos dessa coleção
                setProjects((prevProjects) =>
                  prevProjects.filter((p) => p.collection !== collectionName)
                );
                setAllProjects((prevProjects) =>
                  prevProjects.filter((p) => p.collection !== collectionName)
                );
              }
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

  const calculateTotalPages = useCallback((files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
      const pageCount = parseInt(file.pageCount) || 0;
      return total + pageCount;
    }, 0);
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

    // Se a data vier como string no formato dd/mm/yyyy, manter o formato
    if (typeof date === "string" && date.includes("/")) {
      const [day, month, year] = date.split("/");
      return `${day}/${month}/${year.slice(-2)}`;
    }

    let dateObj;
    if (date.seconds) {
      // Caso seja um timestamp do Firestore
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      // Caso seja um objeto Date
      dateObj = date;
    } else if (typeof date === "string" && date !== "A ser definido") {
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

  // Adicionar useEffect para manter a ordenação
  useEffect(() => {
    if (projects.length > 0) {
      const sortedProjects = [...projects].sort((a, b) => {
        let compareA, compareB;

        switch (sortField) {
          case "projectOwner":
            compareA = a.authorName?.toLowerCase() || "";
            compareB = b.authorName?.toLowerCase() || "";
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

        if (sortDirection === "asc") {
          return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
        } else {
          return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
        }
      });

      // Atualiza os projetos ordenados
      setProjects(sortedProjects);
    }
  }, [
    sortField,
    sortDirection,
    projects,
    calculateTotalPages,
    calculateTotalValue,
  ]);

  const handleSort = (field) => {
    if (field === sortField) {
      // Se clicar no mesmo campo, alterna a direção
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Se clicar em um campo diferente, define o novo campo e reseta a direção
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePaymentClick = () => {
    if (selectedProjects.length === 0) {
      alert("Por favor, selecione ao menos um projeto para pagar.");
      return;
    }

    // Filtrar projetos selecionados que não têm páginas zeradas
    const validProjects = selectedProjects.filter((projectId) => {
      const project = projects.find((p) => p.id === projectId);
      return project && !hasZeroPages(project.files);
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

      // Salvar as colunas visíveis no localStorage
      localStorage.setItem(
        "clientProjectsVisibleColumns",
        JSON.stringify(newVisibleColumns)
      );
      return newVisibleColumns;
    });
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

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowColumnSelector(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(
          "clientProjectsColumnOrder",
          JSON.stringify(newOrder)
        );
        return newOrder;
      });
    }
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      {/* Modal de Aprovação */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-2 text-gray-800">
              Projetos Aguardando Aprovação
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Os seguintes projetos estão aguardando aprovação e não podem ser
              pagos neste momento:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="space-y-3">
                {projectsAwaitingApproval.map((projectName, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {projectName}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="w-[150px] py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="glass-card">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Todos Projetos
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

        {error && (
          <div className="text-center p-5 bg-red-50 text-red-600 rounded-lg shadow-sm my-5">
            <p>Erro ao carregar os projetos: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando projetos...</p>
          </div>
        ) : (
          <>
            {/* Filtros e Botões */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                padding: "0 20px",
                marginBottom: "20px",
              }}
            >
              <input
                type="text"
                name="authorName"
                value={filters.authorName}
                onChange={handleFilterChange}
                placeholder="Filtrar por autor do projeto"
                style={{
                  padding: "5px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                  width: "200px",
                }}
              />
              <input
                type="text"
                name="projectName"
                value={filters.projectName}
                onChange={handleFilterChange}
                placeholder="Filtrar por nome do projeto"
                style={{
                  padding: "5px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                  width: "200px",
                }}
              />
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                placeholder="Data de Início"
                style={{
                  padding: "5px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                }}
              />
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                placeholder="Data de Término"
                style={{
                  padding: "5px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  fontSize: "14px",
                }}
              />

              {/* Botão Novo Projeto */}
              <button
                onClick={() => navigate("/client/projects/clientaddproject")}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#333",
                  whiteSpace: "nowrap",
                  width: "auto",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  transition:
                    "background-color 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                Novo Projeto
              </button>

              {/* Botão Pagar */}
              <button
                onClick={handlePaymentClick}
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

              {/* Botão Personalizar Colunas */}
              <button
                onClick={() => setShowColumnSelector(true)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#E0F7FA",
                  border: "1px solid grey",
                  borderRadius: "20px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#333",
                  whiteSpace: "nowrap",
                  width: "auto",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  transition:
                    "background-color 0.3s ease, box-shadow 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IoMdSettings />
                Personalizar Colunas
              </button>
            </div>

            {/* Tabela */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
                <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
                  <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                    <tr>
                      <SortableContext
                        items={columnOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        {columnOrder
                          .filter((columnId) =>
                            visibleColumns.includes(columnId)
                          )
                          .map((columnId) => {
                            const column = availableColumns.find(
                              (col) => col.id === columnId
                            );
                            if (!column) return null;

                            return (
                              <SortableColumn
                                key={column.id}
                                column={column}
                                isFixed={fixedColumns.includes(column.id)}
                                onSort={handleSort}
                                sortField={sortField}
                                sortDirection={sortDirection}
                              />
                            );
                          })}
                      </SortableContext>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRows.map((project) => {
                      const totalValue = calculateTotalValue(project.files);
                      const isPendingPayment =
                        project.payment_status === "Pendente" &&
                        totalValue !== "0.00";

                      return (
                        <tr
                          key={project.id}
                          onClick={() =>
                            handleProjectClick(project.id, project.collection)
                          }
                          className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200"
                        >
                          {columnOrder
                            .filter((columnId) =>
                              visibleColumns.includes(columnId)
                            )
                            .map((columnId) => {
                              const column = availableColumns.find(
                                (col) => col.id === columnId
                              );
                              if (!column) return null;

                              return (
                                <td
                                  key={column.id}
                                  className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center"
                                >
                                  {column.id === "projectOwner" && (
                                    <span>
                                      {project.oldclientName ||
                                        (project.authorName &&
                                        project.authorName.length > 15
                                          ? `${project.authorName.slice(
                                              0,
                                              15
                                            )}...`
                                          : project.authorName ||
                                            "Não informado")}
                                    </span>
                                  )}
                                  {column.id === "userEmail" && (
                                    <span>
                                      {project.oldclientEmail ||
                                        project.userEmail ||
                                        "Não informado"}
                                    </span>
                                  )}
                                  {column.id === "projectName" && (
                                    <span>
                                      {project.projectName &&
                                      project.projectName.length > 15
                                        ? `${project.projectName.slice(
                                            0,
                                            15
                                          )}...`
                                        : project.projectName || "Sem Nome"}
                                    </span>
                                  )}
                                  {column.id === "createdAt" && (
                                    <span>{formatDate(project.createdAt)}</span>
                                  )}
                                  {column.id === "pages" && (
                                    <span>
                                      {calculateTotalPages(project.files)}
                                    </span>
                                  )}
                                  {column.id === "files" && (
                                    <div className="flex items-center justify-center gap-1">
                                      <span>{project.files?.length || 0}</span>
                                      {project.files?.length > 0 && (
                                        <FaDownload
                                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFiles(project.files);
                                            setShowFilesModal(true);
                                          }}
                                          size={14}
                                        />
                                      )}
                                    </div>
                                  )}
                                  {column.id === "sourceLanguage" && (
                                    <span>{project.sourceLanguage}</span>
                                  )}
                                  {column.id === "targetLanguage" && (
                                    <span>{project.targetLanguage}</span>
                                  )}
                                  {column.id === "totalValue" && (
                                    <span>U$ {totalValue}</span>
                                  )}
                                  {column.id === "isPaid" && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        typeof project.payment_status ===
                                          "object" &&
                                        project.payment_status.status === "Pago"
                                          ? "!bg-green-100 !text-green-700"
                                          : typeof project.payment_status ===
                                              "object" &&
                                            project.payment_status.status ===
                                              "Pendente"
                                          ? "!bg-yellow-100 !text-yellow-700"
                                          : typeof project.payment_status ===
                                              "object" &&
                                            project.payment_status.status ===
                                              "Divergência"
                                          ? "!bg-red-100 !text-red-700"
                                          : typeof project.payment_status ===
                                              "object" &&
                                            project.payment_status.status ===
                                              "Reembolso"
                                          ? "!bg-orange-100 !text-orange-700"
                                          : project.payment_status === "Pago"
                                          ? "!bg-green-100 !text-green-700"
                                          : project.payment_status ===
                                            "Pendente"
                                          ? "!bg-yellow-100 !text-yellow-700"
                                          : project.payment_status ===
                                            "Divergência"
                                          ? "!bg-red-100 !text-red-700"
                                          : project.payment_status ===
                                            "Reembolso"
                                          ? "!bg-orange-100 !text-orange-700"
                                          : "!bg-gray-100 !text-gray-700"
                                      }`}
                                    >
                                      {(() => {
                                        const status = project.payment_status;
                                        if (!status) return "Pendente";
                                        if (typeof status === "string")
                                          return status;
                                        if (
                                          typeof status === "object" &&
                                          status.status
                                        )
                                          return status.status;
                                        return "Pendente";
                                      })()}
                                    </span>
                                  )}
                                  {column.id === "deadlineDate" && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        project.deadlineDate
                                          ? "font-medium"
                                          : ""
                                      }`}
                                    >
                                      {project.deadlineDate
                                        ? formatDate(project.deadlineDate)
                                        : "A definir"}
                                    </span>
                                  )}
                                  {column.id === "project_status" && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        project.project_status === "Finalizado"
                                          ? "!bg-green-100 !text-green-700"
                                          : project.project_status ===
                                            "Em Andamento"
                                          ? "!bg-blue-100 !text-blue-700"
                                          : project.project_status ===
                                            "Em Revisão"
                                          ? "!bg-yellow-100 !text-yellow-700"
                                          : project.project_status ===
                                            "Em Certificação"
                                          ? "!bg-orange-100 !text-orange-700"
                                          : project.project_status ===
                                            "Cancelado"
                                          ? "!bg-red-100 !text-red-700"
                                          : project.project_status ===
                                            "Ag. Orçamento"
                                          ? "!bg-purple-100 !text-purple-700"
                                          : project.project_status ===
                                            "Ag. Aprovação"
                                          ? "!bg-indigo-100 !text-indigo-700"
                                          : project.project_status ===
                                            "Ag. Pagamento"
                                          ? "!bg-pink-100 !text-pink-700"
                                          : "!bg-gray-100 !text-gray-700"
                                      }`}
                                    >
                                      {(() => {
                                        const status = project.project_status;
                                        if (!status) return "N/A";
                                        if (typeof status === "string")
                                          return status;
                                        if (
                                          typeof status === "object" &&
                                          status.status
                                        )
                                          return status.status;
                                        return "N/A";
                                      })()}
                                    </span>
                                  )}
                                  {column.id === "translation_status" && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        project.translation_status ===
                                        "Em Análise"
                                          ? "!bg-yellow-100 !text-yellow-700"
                                          : project.translation_status ===
                                              "Em Tradução" ||
                                            project.translation_status ===
                                              "Em Andamento"
                                          ? "!bg-blue-100 !text-blue-700"
                                          : project.translation_status ===
                                            "Finalizado"
                                          ? "!bg-green-100 !text-green-700"
                                          : project.translation_status ===
                                            "Cancelado"
                                          ? "!bg-red-100 !text-red-700"
                                          : "!bg-gray-100 !text-gray-700"
                                      }`}
                                    >
                                      {(() => {
                                        const status =
                                          project.translation_status;
                                        if (!status) return "N/A";
                                        if (typeof status === "string")
                                          return status;
                                        if (
                                          typeof status === "object" &&
                                          status.status
                                        )
                                          return status.status;
                                        return "N/A";
                                      })()}
                                    </span>
                                  )}
                                  {column.id === "selector" && (
                                    <td
                                      className="px-4 py-1.5 whitespace-nowrap text-sm text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isPendingPayment &&
                                        !hasZeroPages(project.files) && (
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
                                      {hasZeroPages(project.files) && (
                                        <span className="text-xs text-red-500">
                                          {project.collection === "b2bdocsaved"
                                            ? "Solicitar Orçamento"
                                            : project.collection ===
                                              "b2cdocsaved"
                                            ? "Solicitar Orçamento"
                                            : "Aguardando Orçamento"}
                                        </span>
                                      )}
                                    </td>
                                  )}
                                </td>
                              );
                            })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DndContext>

            {/* Paginação */}
            <nav className="pagination-container">
              <div className="pagination-rows-per-page">
                <span className="pagination-rows-label">
                  Projetos por página
                </span>
                <div className="pagination-rows-dropdown">
                  <div
                    id="rows-button"
                    onClick={() => setShowRowsDropdown(!showRowsDropdown)}
                    className="pagination-rows-button"
                  >
                    <span>{rowsPerPage}</span>
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
                  </div>
                  {showRowsDropdown && (
                    <div
                      id="rows-dropdown"
                      className="pagination-rows-dropdown-content"
                    >
                      <div className="p-2 space-y-2">
                        {[10, 25, 50, 100].map((value) => (
                          <div
                            key={value}
                            onClick={() => handleRowsPerPageChange(value)}
                            className="pagination-rows-option"
                          >
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <ul className="pagination-pages">
                <li>
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-page-button"
                  >
                    Anterior
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <li key={page}>
                      <button
                        onClick={() => paginate(page)}
                        className={`pagination-page-button ${
                          currentPage === page ? "active" : ""
                        }`}
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-page-button"
                  >
                    Próximo
                  </button>
                </li>
              </ul>
            </nav>
          </>
        )}
      </div>
      {renderFilesModal()}
      {renderColumnSelector()}
    </div>
  );
};

export default ClientProjects;
