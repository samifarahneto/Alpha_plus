import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import NavigationLinks from "./NavigationLinks";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

const MasterLayout = () => {
  const [activeLink, setActiveLink] = React.useState("masterProjects");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadBudgetCount, setUnreadBudgetCount] = React.useState(0);
  const [unreadApprovalCount, setUnreadApprovalCount] = React.useState(0);
  const [allUploads, setAllUploads] = useState([]);

  useEffect(() => {
    const db = getFirestore();
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

    // Configurar listeners para cada coleção
    const unsubscribeFunctions = collections.map((collectionName) => {
      const collectionRef = collection(db, collectionName);
      return onSnapshot(collectionRef, (snapshot) => {
        setAllUploads((prevUploads) => {
          const newUploads = [...prevUploads];
          snapshot.docChanges().forEach((change) => {
            const projectData = {
              id: change.doc.id,
              ...change.doc.data(),
              files: change.doc.data().files || [],
              collection: collectionName,
            };

            const index = newUploads.findIndex((p) => p.id === change.doc.id);

            if (change.type === "added" && index === -1) {
              newUploads.push(projectData);
            } else if (change.type === "modified" && index !== -1) {
              newUploads[index] = projectData;
            } else if (change.type === "removed" && index !== -1) {
              newUploads.splice(index, 1);
            }
          });
          return newUploads;
        });
      });
    });

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!allUploads) return;

    // Processar todos os contadores em um único bloco
    const processCounters = () => {
      // Contagem para "Todos Projetos" - projetos não lidos em todas as coleções
      const unreadProjects = allUploads.filter((project) => {
        const hasUnreadFiles = project.files?.some((file) => !file.isRead);
        const isProjectUnread = project.isRead === false;
        return hasUnreadFiles || isProjectUnread;
      });

      // Contagem para "Aguardando Orçamento" - projetos nas coleções b2bdocprojects e b2cdocprojects
      const budgetProjects = allUploads.filter(
        (project) =>
          project.collection === "b2bdocprojects" ||
          project.collection === "b2cdocprojects"
      );

      // Contagem para "Aguardando Aprovação" - projetos nas coleções b2bapproval e b2capproval
      const approvalProjects = allUploads.filter(
        (project) =>
          project.collection === "b2bapproval" ||
          project.collection === "b2capproval"
      );

      // Atualizar todos os contadores de uma vez
      setUnreadCount(unreadProjects.length);
      setUnreadBudgetCount(budgetProjects.length);
      setUnreadApprovalCount(approvalProjects.length);
    };

    processCounters();
  }, [allUploads]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-white">
        <NavigationLinks
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          unreadCount={unreadCount}
          unreadBudgetCount={unreadBudgetCount}
          unreadApprovalCount={unreadApprovalCount}
        />
      </div>
      <div className="flex-1 mt-0">
        <Outlet />
      </div>
    </div>
  );
};

export default MasterLayout;
