import React, { useState, useEffect, useCallback } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const AddCollaboratorColab = () => {
  const [email, setEmail] = useState("");
  const [registeredEmails, setRegisteredEmails] = useState([]);
  const [pendingEmails, setPendingEmails] = useState([]);
  const [isAddingLoading, setIsAddingLoading] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Adicionar useEffect para limpar mensagens após 5 segundos
  useEffect(() => {
    let timeout;
    if (successMessage || errorMessage) {
      timeout = setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [successMessage, errorMessage]);

  const fetchEmails = useCallback(async () => {
    try {
      const firestore = getFirestore();

      const usersSnapshot = await getDocs(
        query(
          collection(firestore, "users"),
          where("registeredBy", "==", currentUserEmail)
        )
      );
      const registered = usersSnapshot.docs.map((doc) => ({
        email: doc.data().email,
        nomeCompleto: doc.data().nomeCompleto || "N/A",
        registeredBy: doc.data().registeredBy || "N/A",
        projectPermissions: doc.data().projectPermissions || [],
        createdAt: doc.data().createdAt
          ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString(
              "pt-BR"
            )
          : "N/A",
      }));

      const emailCheckSnapshot = await getDocs(
        query(
          collection(firestore, "emailcheck"),
          where("registeredBy", "==", currentUserEmail)
        )
      );
      const pending = emailCheckSnapshot.docs.map((doc) => doc.data().email);

      setRegisteredEmails(registered);
      setPendingEmails(pending);
    } catch (error) {
      console.error("Erro ao buscar emails:", error.message);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      setCurrentUserEmail(currentUser.email);
    } else {
      console.error("Usuário não autenticado.");
    }

    fetchEmails(); // Buscar os emails após definir o usuário atual
  }, [fetchEmails]);

  const handleAddCollaborator = async () => {
    const sanitizedEmail = email
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@._-]/g, "");

    if (!sanitizedEmail) {
      setErrorMessage("Por favor, insira um email.");
      return;
    }

    // Validação do formato do e-mail
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(sanitizedEmail)) {
      setErrorMessage("Email inválido. Verifique o formato.");
      return;
    }

    try {
      setIsAddingLoading(true);
      const firestore = getFirestore();
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage("Usuário não autenticado.");
        setIsAddingLoading(false);
        return;
      }

      const registeredBy = currentUser.email;

      // Verifica se o email já existe na coleção users
      const userCheckQuery = query(
        collection(firestore, "users"),
        where("email", "==", sanitizedEmail)
      );
      const userCheckSnapshot = await getDocs(userCheckQuery);

      if (!userCheckSnapshot.empty) {
        setErrorMessage(
          "Este email já está cadastrado como usuário no sistema."
        );
        setIsAddingLoading(false);
        return;
      }

      // Verifica se o email já foi adicionado como colaborador
      const querySnapshot = await getDocs(
        query(
          collection(firestore, "emailcheck"),
          where("email", "==", sanitizedEmail)
        )
      );
      if (!querySnapshot.empty) {
        setErrorMessage("Este email já foi adicionado como colaborador.");
        setIsAddingLoading(false);
        return;
      }

      if (
        !window.confirm(
          `Tem certeza de que deseja adicionar o email: ${sanitizedEmail}?`
        )
      ) {
        setIsAddingLoading(false);
        return;
      }

      // Busca o documento do usuário atual
      const userQuery = query(
        collection(firestore, "users"),
        where("email", "==", registeredBy)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setErrorMessage("Usuário não encontrado no banco de dados.");
        setIsAddingLoading(false);
        return;
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();

      // Atualiza o array de colaboradores do usuário atual
      const colaboradores = userData.colaboradores || [];
      if (!colaboradores.includes(sanitizedEmail)) {
        colaboradores.push(sanitizedEmail);
        await updateDoc(userDoc.ref, { colaboradores });
      }

      // Adiciona o email na coleção emailcheck com o mesmo canTest do usuário que está convidando
      await addDoc(collection(firestore, "emailcheck"), {
        email: sanitizedEmail,
        registeredBy,
        createdAt: new Date(),
        canTest: userData.canTest || false,
        projectPermissions: [], // Adiciona array vazio de permissões
      });

      // Adicionar log de convite de colaborador
      const logData = {
        timestamp: new Date(),
        userEmail: registeredBy,
        action: "convite de colaborador",
        details: {
          colaborador: {
            nome: sanitizedEmail.split("@")[0],
            email: sanitizedEmail,
            tipo: "colab",
            status: "pendente",
            canTest: userData.canTest || false,
          },
          dataConvite: new Date().toLocaleString("pt-BR"),
        },
      };
      await addDoc(collection(firestore, "activity_logs"), logData);

      setSuccessMessage("Colaborador adicionado com sucesso!");
      setEmail("");
      setErrorMessage("");
      fetchEmails();
    } catch (error) {
      setErrorMessage("Erro ao adicionar colaborador: " + error.message);
    } finally {
      setIsAddingLoading(false);
    }
  };

  const handleOpenPermissionsModal = async (collaborator) => {
    try {
      const firestore = getFirestore();
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage("Usuário não autenticado.");
        return;
      }

      // Busca todos os emails disponíveis (usuário principal e colaboradores)
      const userQuery = query(
        collection(firestore, "users"),
        where("email", "==", currentUser.email)
      );
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0].data();
      const colaboradores = userData.colaboradores || [];

      // Busca as permissões atuais do colaborador
      const collaboratorQuery = query(
        collection(firestore, "users"),
        where("email", "==", collaborator.email)
      );
      const collaboratorSnapshot = await getDocs(collaboratorQuery);
      const collaboratorData = collaboratorSnapshot.docs[0].data();
      const currentPermissions = collaboratorData.projectPermissions || [];

      // Filtra a lista de emails disponíveis, removendo o email do próprio colaborador
      const filteredEmails = [currentUser.email, ...colaboradores].filter(
        (email) => email !== collaborator.email
      );

      setAvailableEmails(filteredEmails);
      setSelectedPermissions(currentPermissions);
      setSelectedCollaborator(collaborator);
      setShowPermissionsModal(true);
    } catch (error) {
      console.error("Erro ao abrir modal de permissões:", error);
      setErrorMessage("Erro ao carregar permissões: " + error.message);
    }
  };

  const handleSavePermissions = async () => {
    try {
      if (!selectedCollaborator) return;

      const firestore = getFirestore();
      const collaboratorQuery = query(
        collection(firestore, "users"),
        where("email", "==", selectedCollaborator.email)
      );
      const collaboratorSnapshot = await getDocs(collaboratorQuery);

      if (!collaboratorSnapshot.empty) {
        const collaboratorDoc = collaboratorSnapshot.docs[0];
        // Garante que o email do próprio colaborador sempre esteja nas permissões
        const finalPermissions = [
          ...new Set([...selectedPermissions, selectedCollaborator.email]),
        ];

        await updateDoc(collaboratorDoc.ref, {
          projectPermissions: finalPermissions,
          updatedAt: new Date(),
        });

        // Adicionar log de atualização de permissões
        const logData = {
          timestamp: new Date(),
          userEmail: currentUserEmail,
          action: "atualização de permissões",
          details: {
            colaborador: selectedCollaborator.email,
            permissões: finalPermissions,
          },
        };
        await addDoc(collection(firestore, "activity_logs"), logData);

        setSuccessMessage("Permissões atualizadas com sucesso!");
        setShowPermissionsModal(false);
        fetchEmails();
      }
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      setErrorMessage("Erro ao salvar permissões: " + error.message);
    }
  };

  const renderPermissionsModal = () => {
    if (!showPermissionsModal || !selectedCollaborator) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-96 bg-white rounded-lg shadow-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Permissões de Visualização
            </h3>
            <p className="text-sm text-gray-600 text-center mt-2">
              Selecione os usuários cujos projetos este colaborador poderá
              visualizar
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Mostra o email do próprio colaborador como fixo */}
            <div className="flex items-center bg-gray-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700 font-medium">
                {selectedCollaborator.email} (Próprio usuário)
              </label>
            </div>

            {/* Lista os outros emails disponíveis */}
            {availableEmails.map((email) => (
              <div key={email} className="flex items-center">
                <input
                  type="checkbox"
                  id={`permission-${email}`}
                  checked={selectedPermissions.includes(email)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPermissions([...selectedPermissions, email]);
                    } else {
                      setSelectedPermissions(
                        selectedPermissions.filter((e) => e !== email)
                      );
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`permission-${email}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {email}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setShowPermissionsModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePermissions}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const updateAllCollections = async (
    firestore,
    emailToDelete,
    registeredBy
  ) => {
    try {
      // Lista de coleções que precisam ser atualizadas
      const collectionsToUpdate = [
        "b2bsketch",
        "b2csketch",
        "b2bdocsaved",
        "b2cdocsaved",
        "b2bdocprojects",
        "b2cdocprojects",
        "b2bapproved",
        "b2bapproval",
        "b2capproval",
        "b2bprojectspaid",
        "b2cprojectspaid",
      ];

      // Primeiro, verifica se o email existe na coleção users
      const userToDeleteQuery = query(
        collection(firestore, "users"),
        where("email", "==", emailToDelete)
      );
      const userToDeleteSnapshot = await getDocs(userToDeleteQuery);

      // Se o usuário não existir na coleção users, retorna true pois não há nada para atualizar
      if (userToDeleteSnapshot.empty) {
        return true;
      }

      const userToDeleteData = userToDeleteSnapshot.docs[0].data();
      const newOwnerEmail = userToDeleteData.registeredBy || registeredBy;
      const oldClientName = userToDeleteData.nomeCompleto || "N/A";

      console.log("Nome do usuário desvinculado:", oldClientName); // Para debug

      // Para cada coleção, atualiza os documentos onde o emailToDelete é o registeredBy ou projectOwner
      for (const collectionName of collectionsToUpdate) {
        try {
          // Atualiza documentos onde o emailToDelete é o registeredBy
          const registeredByQuery = query(
            collection(firestore, collectionName),
            where("registeredBy", "==", emailToDelete)
          );
          const registeredBySnapshot = await getDocs(registeredByQuery);

          const registeredByUpdates = registeredBySnapshot.docs.map((doc) =>
            updateDoc(doc.ref, {
              registeredBy: newOwnerEmail,
              userEmail: newOwnerEmail,
              oldclientEmail: emailToDelete,
              oldclientName: oldClientName,
              updatedAt: new Date(),
            })
          );
          await Promise.all(registeredByUpdates);

          // Atualiza documentos onde o emailToDelete é o projectOwner
          const projectOwnerQuery = query(
            collection(firestore, collectionName),
            where("projectOwner", "==", emailToDelete)
          );
          const projectOwnerSnapshot = await getDocs(projectOwnerQuery);

          const projectOwnerUpdates = projectOwnerSnapshot.docs.map((doc) =>
            updateDoc(doc.ref, {
              projectOwner: newOwnerEmail,
              oldclientEmail: emailToDelete,
              oldclientName: oldClientName,
              updatedAt: new Date(),
            })
          );
          await Promise.all(projectOwnerUpdates);

          // Atualiza documentos onde o emailToDelete é o userEmail
          const userEmailQuery = query(
            collection(firestore, collectionName),
            where("userEmail", "==", emailToDelete)
          );
          const userEmailSnapshot = await getDocs(userEmailQuery);

          const userEmailUpdates = userEmailSnapshot.docs.map((doc) =>
            updateDoc(doc.ref, {
              userEmail: newOwnerEmail,
              oldclientEmail: emailToDelete,
              oldclientName: oldClientName,
              updatedAt: new Date(),
            })
          );
          await Promise.all(userEmailUpdates);

          console.log(
            `Coleção ${collectionName} atualizada com sucesso. Transferido para: ${newOwnerEmail}`
          );
        } catch (collectionError) {
          console.error(
            `Erro ao atualizar coleção ${collectionName}:`,
            collectionError
          );
          // Continua para a próxima coleção mesmo se houver erro em uma
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao atualizar coleções:", error);
      throw error;
    }
  };

  const handleDeleteEmail = async (emailToDelete) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o email: ${emailToDelete}?`
      )
    ) {
      return;
    }

    try {
      setIsDeletingLoading(true);
      const firestore = getFirestore();
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage("Usuário não autenticado.");
        setIsDeletingLoading(false);
        return;
      }

      const registeredBy = currentUser.email;

      // Verifica se o email está na lista de pendingEmails
      const isPendingEmail = pendingEmails.includes(emailToDelete);

      if (isPendingEmail) {
        // Se for um email pendente, apenas remove da coleção emailcheck
        const emailCheckQuery = query(
          collection(firestore, "emailcheck"),
          where("email", "==", emailToDelete)
        );
        const emailCheckSnapshot = await getDocs(emailCheckQuery);

        if (!emailCheckSnapshot.empty) {
          const emailCheckDoc = emailCheckSnapshot.docs[0];
          await deleteDoc(emailCheckDoc.ref);

          // Adicionar log de remoção de colaborador pendente
          const logData = {
            timestamp: new Date(),
            userEmail: currentUser.email,
            action: "remoção de colaborador pendente",
            details: {
              emailRemovido: emailToDelete,
              status: "removido",
            },
          };
          await addDoc(collection(firestore, "activity_logs"), logData);
        }
      } else {
        // Se for um colaborador registrado, executa o processo completo de remoção
        // Primeiro, atualiza todos os projetos e documentos do colaborador
        await updateAllCollections(firestore, emailToDelete, registeredBy);

        // Depois de atualizar todos os projetos, remove o colaborador da lista
        const userQuery = query(
          collection(firestore, "users"),
          where("email", "==", currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          const colaboradores = userData.colaboradores || [];

          // Remove o email da lista de colaboradores
          const updatedColaboradores = colaboradores.filter(
            (email) => email !== emailToDelete
          );

          // Atualiza o documento do usuário com a nova lista de colaboradores
          await updateDoc(userDoc.ref, {
            colaboradores: updatedColaboradores,
            updatedAt: new Date(),
          });
        }

        // Atualiza o documento do colaborador para remover o vínculo
        const colaboradorQuery = query(
          collection(firestore, "users"),
          where("email", "==", emailToDelete)
        );
        const colaboradorSnapshot = await getDocs(colaboradorQuery);

        if (!colaboradorSnapshot.empty) {
          const colaboradorDoc = colaboradorSnapshot.docs[0];
          await updateDoc(colaboradorDoc.ref, {
            registeredBy: null,
            registeredByType: null,
            userType: "b2c",
            updatedAt: new Date(),
          });
        }

        // Adicionar log de remoção de colaborador registrado
        const logData = {
          timestamp: new Date(),
          userEmail: currentUser.email,
          action: "remoção de colaborador",
          details: {
            emailRemovido: emailToDelete,
            status: "removido",
          },
        };
        await addDoc(collection(firestore, "activity_logs"), logData);
      }

      setSuccessMessage(
        isPendingEmail
          ? "Requisição de colaborador removida com sucesso!"
          : "Colaborador removido com sucesso e todos os projetos foram transferidos!"
      );
      setErrorMessage("");
      await fetchEmails();
    } catch (error) {
      console.error("Erro detalhado:", error);
      setErrorMessage("Erro ao excluir colaborador: " + error.message);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
        Gerenciamento de Colaboradores
      </h1>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Primeira Div - Adicionar e Aguardando Cadastro */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 flex-1">
          {/* Seção de Adicionar Colaborador */}
          <div className="mb-6 sm:mb-8">
            {successMessage && (
              <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-700 rounded-lg mb-4">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-lg mb-4">
                {errorMessage}
              </div>
            )}

            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
              Adicionar Colaborador
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite o email do colaborador"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={isAddingLoading}
              />
              <button
                onClick={handleAddCollaborator}
                disabled={isAddingLoading}
                className={`w-full sm:w-[230px] px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
                  isAddingLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isAddingLoading ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </div>

          {/* Seção de Colaboradores Aguardando Cadastro */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
              Colaboradores Aguardando Cadastro
            </h3>
            <div className="overflow-x-auto rounded-2xl shadow-lg border border-gray-100">
              <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
                <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Email
                    </th>
                    <th className="w-10" aria-label="Ações"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingEmails.map((email, index) => (
                    <tr
                      key={index}
                      className="hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <td className="px-3 sm:px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                        {email}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDeleteEmail(email)}
                          disabled={isDeletingLoading}
                          className="text-red-500 hover:text-red-700 transition-colors bg-transparent border-none cursor-pointer p-0"
                          aria-label="Excluir"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Segunda Div - Colaboradores Cadastrados */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Colaboradores Cadastrados
          </h3>
          <div className="overflow-x-auto rounded-2xl shadow-lg border border-gray-100">
            <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
              <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                <tr>
                  <th className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Nome
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Email
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Data de Cadastro
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Permissões
                  </th>
                  <th className="px-3 sm:px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registeredEmails.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-blue-50/50 transition-all duration-200"
                  >
                    <td className="px-3 sm:px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {item.nomeCompleto}
                    </td>
                    <td className="px-3 sm:px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {item.email}
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {item.createdAt}
                    </td>
                    <td className="px-3 sm:px-4 py-1.5 text-sm text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className="text-xs font-medium text-green-600 cursor-help"
                          title={
                            item.projectPermissions &&
                            item.projectPermissions.length > 0
                              ? item.projectPermissions.join("\n")
                              : "Sem permissões"
                          }
                        >
                          {item.projectPermissions
                            ? item.projectPermissions.length
                            : 0}{" "}
                          usuários
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenPermissionsModal(item)}
                          className="text-blue-500 hover:text-blue-700 transition-colors bg-transparent border-none cursor-pointer p-0"
                          aria-label="Permissões"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => handleDeleteEmail(item.email)}
                          disabled={isDeletingLoading}
                          className="text-red-500 hover:text-red-700 transition-colors bg-transparent border-none cursor-pointer p-0"
                          aria-label="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {renderPermissionsModal()}
    </div>
  );
};

export default AddCollaboratorColab;
