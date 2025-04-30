import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { IoMdArrowDropup } from "react-icons/io";
import { IoMdArrowDropdown } from "react-icons/io";

// import "../../styles/Menu.css";
import { useAuth } from "../../../contexts/AuthContext";
import MasterNavigation from "./MasterNavigation";

const ProjectsApproved = () => {
  const [allUploads, setAllUploads] = useState([]);
  const [filteredUploads, setFilteredUploads] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const location = useLocation();
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
  const [currentSort, setCurrentSort] = useState({
    field: "createdAt",
    direction: "desc",
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadBudgetCount, setUnreadBudgetCount] = useState(0);
  const [unreadApprovalCount, setUnreadApprovalCount] = useState(0);
  const [clientTypes, setClientTypes] = useState({});

  const navigate = useNavigate();
  const { user } = useAuth();

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
      }
    );

    return () => unsubscribeUsers();
  }, [user, navigate]);

  // Segundo useEffect para carregar os projetos
  useEffect(() => {
    if (!clientTypes || !user) return;

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

            // Filtrar apenas projetos aprovados
            const filteredProjects = snapshot.docs
              .filter(
                (doc) =>
                  collectionName === "b2bapproved" ||
                  collectionName === "b2capproved"
              )
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                files: doc.data().files || [],
                collection: collectionName,
              }));

            setAllUploads((prevProjects) => {
              const otherCollectionsProjects = prevProjects.filter(
                (p) => p.collection !== collectionName
              );
              return [...otherCollectionsProjects, ...filteredProjects];
            });

            setFilteredUploads((prevProjects) => {
              const otherCollectionsProjects = prevProjects.filter(
                (p) => p.collection !== collectionName
              );
              return [...otherCollectionsProjects, ...filteredProjects];
            });
          },
          (error) => {
            console.error(`Erro ao carregar coleção ${collectionName}:`, error);
          }
        );
      });

      return () => unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    } catch (error) {
      console.error("Erro ao configurar listeners:", error);
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

  const handleSort = (field) => {
    setCurrentSort((prevSort) => {
      const isSameField = prevSort.field === field;
      const newDirection =
        isSameField && prevSort.direction === "asc" ? "desc" : "asc";

      const sortedData = [...filteredUploads].sort((a, b) => {
        let valA, valB;

        switch (field) {
          case "projectName":
            valA = (a.projectName || "").toLowerCase();
            valB = (b.projectName || "").toLowerCase();
            break;
          case "clientName":
            valA = (a.clientName || "").toLowerCase();
            valB = (b.clientName || "").toLowerCase();
            break;
          case "createdAt":
            valA = a.createdAt?.seconds
              ? new Date(a.createdAt.seconds * 1000)
              : new Date(0);
            valB = b.createdAt?.seconds
              ? new Date(b.createdAt.seconds * 1000)
              : new Date(0);
            break;
          case "status":
            valA = (a.status || "").toLowerCase();
            valB = (b.status || "").toLowerCase();
            break;
          case "totalPages":
            valA = calculateTotalPages(a.files);
            valB = calculateTotalPages(b.files);
            break;
          case "files":
            valA = a.files?.length || 0;
            valB = b.files?.length || 0;
            break;
          case "total":
            valA = calculateTotalValue(a);
            valB = calculateTotalValue(b);
            break;
          case "clientType":
            valA = getClientType(a);
            valB = getClientType(b);
            break;
          default:
            valA = (a[field] || "").toString().toLowerCase();
            valB = (b[field] || "").toString().toLowerCase();
        }

        if (valA === valB) return 0;

        if (newDirection === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });

      setFilteredUploads(sortedData);
      return { field, direction: newDirection };
    });
  };

  const handleRowClick = async (uploadId) => {
    const firestore = getFirestore();

    // Encontrar o projeto em todas as listas
    const selectedUpload = allUploads.find((upload) => upload.id === uploadId);

    if (!selectedUpload) {
      console.error("Projeto não encontrado");
      return;
    }

    // Determinar a coleção correta
    const collectionName = selectedUpload.collection;

    const uploadDoc = doc(firestore, collectionName, uploadId);

    // Atualiza os arquivos como lidos
    const updatedFiles = selectedUpload.files.map((file) => ({
      ...file,
      isRead: true,
    }));

    // Atualiza o documento no Firestore
    await updateDoc(uploadDoc, { files: updatedFiles });

    // Atualiza o estado local
    setAllUploads((prevUploads) =>
      prevUploads.map((upload) =>
        upload.id === uploadId ? { ...upload, files: updatedFiles } : upload
      )
    );

    // Recalcula os projetos não lidos
    const unreadProjects = allUploads.filter((upload) =>
      upload.files.some((file) => !file.isRead)
    ).length;

    // Atualiza os contadores de não lidos
    setUnreadCount(unreadProjects);

    // Navega para a página do projeto clicado incluindo a coleção na URL
    navigate(
      `/company/master/project/${uploadId}?collection=${collectionName}`
    );
  };

  const calculateTotalPages = (files) => {
    if (!files || !Array.isArray(files)) return 0;
    return files.reduce((total, file) => {
      const pageCount = Number(file.pageCount) || 0;
      return total + pageCount;
    }, 0);
  };

  const calculateTotalValue = (project) => {
    if (!project) return 0;

    // Se já tiver um valor total definido no projeto, use-o
    if (project.totalProjectValue) {
      return Number(project.totalProjectValue);
    }

    // Caso contrário, some os valores dos arquivos
    if (!project.files || !Array.isArray(project.files)) return 0;

    return project.files.reduce((total, file) => {
      const fileTotal = Number(file.total) || Number(file.totalValue) || 0;
      return total + fileTotal;
    }, 0);
  };

  const getClientType = (project) => {
    if (!project || !project.userEmail || !clientTypes[project.userEmail])
      return "N/A";

    const userData = clientTypes[project.userEmail];
    if (
      userData.userType === "b2b" ||
      (userData.userType === "colab" && userData.registeredByType === "b2b")
    ) {
      return "B2B";
    } else if (
      userData.userType === "b2c" ||
      (userData.userType === "colab" && userData.registeredByType === "b2c")
    ) {
      return "B2C";
    }
    return "N/A";
  };

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Projetos Aprovados
        </h2>

        <MasterNavigation
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          unreadCount={unreadCount}
          unreadBudgetCount={unreadBudgetCount}
          unreadApprovalCount={unreadApprovalCount}
        />

        <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
          <table className="table-default">
            <thead className="table-header">
              <tr>
                <th
                  onClick={() => handleSort("projectName")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[150px] truncate cursor-pointer text-center"
                >
                  Nome do Projeto
                  {currentSort.field === "projectName" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("clientName")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[150px] truncate cursor-pointer text-center"
                >
                  Cliente
                  {currentSort.field === "clientName" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("clientType")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Tipo
                  {currentSort.field === "clientType" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Data
                  {currentSort.field === "createdAt" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("totalPages")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Páginas
                  {currentSort.field === "totalPages" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("files")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Arquivos
                  {currentSort.field === "files" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("total")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Total
                  {currentSort.field === "total" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="table-header-cell !py-2 whitespace-nowrap max-w-[100px] truncate cursor-pointer text-center"
                >
                  Status
                  {currentSort.field === "status" &&
                    (currentSort.direction === "asc" ? (
                      <IoMdArrowDropup className="inline ml-1" />
                    ) : (
                      <IoMdArrowDropdown className="inline ml-1" />
                    ))}
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredUploads.map((upload) => (
                <tr
                  key={upload.id}
                  onClick={() => handleRowClick(upload.id)}
                  className={`table-row ${
                    upload.files?.some((file) => !file.isRead)
                      ? "bg-blue-50 hover:bg-blue-100"
                      : ""
                  }`}
                >
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[150px] truncate text-center">
                    {upload.projectName || "Sem Nome"}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[150px] truncate text-center">
                    {upload.projectOwner || "N/A"}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getClientType(upload) === "B2B"
                          ? "bg-blue-100 text-blue-800"
                          : getClientType(upload) === "B2C"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getClientType(upload)}
                    </span>
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    {upload.createdAt
                      ? new Date(
                          upload.createdAt.seconds * 1000
                        ).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    {calculateTotalPages(upload.files)}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    {upload.files?.length || 0}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    R$ {calculateTotalValue(upload).toFixed(2)}
                  </td>
                  <td className="table-cell !py-1.5 whitespace-nowrap max-w-[100px] truncate text-center">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Aprovado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectsApproved;
