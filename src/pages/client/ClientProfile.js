import React, { useState, useEffect } from "react";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

const ClientProfile = () => {
  const [initialUserData, setInitialUserData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [photo, setPhoto] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalCurrentPassword, setModalCurrentPassword] = useState("");
  const [isEmailPendingVerification, setIsEmailPendingVerification] =
    useState(false);
  const [showCancelVerificationModal, setShowCancelVerificationModal] =
    useState(false);

  useEffect(() => {
    if (successMessage || erro) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setErro("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [successMessage, erro]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user && userData) {
      // Verifica se o email do Firebase Auth é diferente do email armazenado no documento
      setIsEmailPendingVerification(user.email !== userData.email);
    }
  }, [userData]);

  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;

    if (user) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Se for um usuário colab, buscar o nome do registeredBy
            if (
              userData.userType?.toLowerCase() === "colab" &&
              userData.registeredBy
            ) {
              const registeredByQuery = query(
                collection(db, "users"),
                where("email", "==", userData.registeredBy)
              );
              const registeredBySnapshot = await getDocs(registeredByQuery);

              if (!registeredBySnapshot.empty) {
                const registeredByData = registeredBySnapshot.docs[0].data();
                userData.registeredByName = registeredByData.nomeCompleto;
              }
            }

            setUserData(userData);
            setInitialUserData(userData);
            setPhoto(userData.photo || null);
          } else {
            console.error("Documento do usuário não encontrado.");
            setErro("Usuário não encontrado.");
          }
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
          setErro("Erro ao carregar dados: " + error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    } else {
      console.error("Nenhum usuário logado.");
      setErro("Nenhum usuário logado.");
      setLoading(false);
    }
  }, [auth]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const photoUrl = reader.result;
      setPhoto(photoUrl);

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { photo: photoUrl });
      } catch (error) {
        console.error("Erro ao atualizar a foto:", error);
        setErro("Erro ao salvar a foto.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhoto(null);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { photo: null });
    } catch (error) {
      console.error("Erro ao remover a foto:", error);
      setErro("Erro ao remover a foto.");
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      setErro("Preencha todos os campos para alterar a senha.");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccessMessage("Senha alterada com sucesso!");
      setErro("");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      setErro("Erro ao alterar senha: " + error.message);
    }
  };

  const handleUpdateInfo = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updateData = {
        nomeCompleto: userData.nomeCompleto,
      };

      // Só atualiza o cpfCnpj se não for um usuário colab
      if (userData?.userType?.toLowerCase() !== "colab") {
        updateData.cpfCnpj = userData.cpfCnpj || null;
      }

      await updateDoc(userRef, updateData);
      setSuccessMessage("Dados atualizados com sucesso!");
      setInitialUserData({ ...userData });
      setErro("");
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      setErro("Erro ao atualizar informações.");
    }
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

      // Primeiro, precisamos obter o registeredBy do usuário que está sendo desvinculado
      const userToDeleteQuery = query(
        collection(firestore, "users"),
        where("email", "==", emailToDelete)
      );
      const userToDeleteSnapshot = await getDocs(userToDeleteQuery);

      if (userToDeleteSnapshot.empty) {
        throw new Error("Usuário a ser desvinculado não encontrado");
      }

      const userToDeleteData = userToDeleteSnapshot.docs[0].data();
      const newOwnerEmail = userToDeleteData.registeredBy || registeredBy;
      const oldClientName = userToDeleteData.nomeCompleto || "N/A";

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

  const handleUnlink = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setErro("Usuário não autenticado.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setErro("Documento do usuário não encontrado.");
        return;
      }

      const userData = userDoc.data();
      const registeredBy = userData.registeredBy;

      // Primeiro, atualiza todos os projetos e documentos do usuário
      await updateAllCollections(db, user.email, registeredBy);

      // Depois atualiza o documento do usuário
      await updateDoc(userRef, {
        registeredBy: null,
        userType: "b2c",
        updatedAt: new Date(),
      });

      // Atualizar o estado local
      setUserData((prev) => ({
        ...prev,
        registeredBy: null,
        userType: "b2c",
      }));

      setSuccessMessage("Desvinculação realizada com sucesso!");
      setShowUnlinkModal(false);
    } catch (error) {
      console.error("Erro ao desvincular:", error);
      setErro("Erro ao realizar a desvinculação. Por favor, tente novamente.");
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      setErro("Por favor, insira um novo email.");
      return;
    }

    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(newEmail)) {
      setErro("Email inválido. Verifique o formato.");
      return;
    }

    if (!modalCurrentPassword) {
      setErro("Por favor, insira sua senha atual.");
      return;
    }

    try {
      setIsUpdatingEmail(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      // Reautenticar o usuário
      const credential = EmailAuthProvider.credential(
        user.email,
        modalCurrentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Verificar se o novo email já está em uso em diferentes coleções
      const collectionsToCheck = [
        "users",
        "b2bprojects",
        "b2bprojectspaid",
        "b2bapproved",
        "b2bdocprojects",
        "b2bapproval",
        "b2cprojectspaid",
        "b2cdocprojects",
        "b2capproval",
      ];

      for (const collectionName of collectionsToCheck) {
        const querySnapshot = await getDocs(
          query(collection(db, collectionName), where("email", "==", newEmail))
        );

        if (!querySnapshot.empty) {
          throw new Error(
            `Este email já está em uso na coleção ${collectionName}.`
          );
        }
      }

      // Enviar email de verificação para o novo email
      await verifyBeforeUpdateEmail(user, newEmail);

      // Atualizar o email no documento do usuário
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        email: newEmail,
        updatedAt: new Date(),
      });

      // Atualizar o email em todas as coleções relacionadas
      const collectionsToUpdate = [
        "b2bprojects",
        "b2bprojectspaid",
        "b2bapproved",
        "b2bdocprojects",
        "b2bapproval",
        "b2cprojectspaid",
        "b2cdocprojects",
        "b2capproval",
        "b2bsketch",
        "b2csketch",
        "b2bdocsaved",
        "b2cdocsaved",
        "b2bprojectspending",
        "b2cprojectspending",
      ];

      for (const collectionName of collectionsToUpdate) {
        // Atualizar documentos onde o email é o userEmail
        const userEmailQuery = query(
          collection(db, collectionName),
          where("userEmail", "==", user.email)
        );
        const userEmailSnapshot = await getDocs(userEmailQuery);

        for (const doc of userEmailSnapshot.docs) {
          await updateDoc(doc.ref, {
            userEmail: newEmail,
            updatedAt: new Date(),
          });
        }

        // Atualizar documentos onde o email é o projectOwner
        const projectOwnerQuery = query(
          collection(db, collectionName),
          where("projectOwner", "==", user.email)
        );
        const projectOwnerSnapshot = await getDocs(projectOwnerQuery);

        for (const doc of projectOwnerSnapshot.docs) {
          await updateDoc(doc.ref, {
            projectOwner: newEmail,
            updatedAt: new Date(),
          });
        }

        // Atualizar documentos onde o email é o registeredBy
        const registeredByQuery = query(
          collection(db, collectionName),
          where("registeredBy", "==", user.email)
        );
        const registeredBySnapshot = await getDocs(registeredByQuery);

        for (const doc of registeredBySnapshot.docs) {
          await updateDoc(doc.ref, {
            registeredBy: newEmail,
            updatedAt: new Date(),
          });
        }
      }

      setSuccessMessage(
        "Email de verificação enviado para o novo endereço. Por favor, verifique seu email e clique no link de verificação. Após a verificação, seu email será atualizado em todos os projetos."
      );
      setNewEmail("");
      setModalCurrentPassword("");
      setShowEmailModal(false);
    } catch (error) {
      console.error("Erro ao atualizar email:", error);
      setErro("Erro ao atualizar email: " + error.message);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleCancelEmailVerification = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      // Atualizar o email no documento do usuário para o email atual do Firebase Auth
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        email: user.email,
        updatedAt: new Date(),
      });

      // Atualizar o estado local
      setUserData((prev) => ({
        ...prev,
        email: user.email,
      }));

      setSuccessMessage("Alteração de email cancelada com sucesso!");
      setShowCancelVerificationModal(false);
    } catch (error) {
      console.error("Erro ao cancelar verificação de email:", error);
      setErro("Erro ao cancelar verificação de email: " + error.message);
    }
  };

  if (loading) {
    return <p style={{ textAlign: "center" }}>Carregando...</p>;
  }

  if (erro) {
    return <p style={{ color: "red", textAlign: "center" }}>{erro}</p>;
  }

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Perfil do Usuário
        </h1>

        {/* Email do usuário com botão Alterar */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="bg-gray-50 px-5 py-3 rounded-lg text-center">
            <p className="text-gray-600 text-sm">{userData?.email}</p>
            {isEmailPendingVerification && (
              <div className="mt-1">
                <p className="text-yellow-600 text-xs">
                  Aguardando verificação do email
                </p>
                <button
                  onClick={() => setShowCancelVerificationModal(true)}
                  className="mt-1 px-3 py-1 bg-red-500 text-white rounded-full cursor-pointer text-xs font-medium shadow-sm hover:bg-red-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-full cursor-pointer text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors w-32 text-center"
          >
            Alterar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 bg-white rounded-xl shadow-lg border border-gray-100 p-10">
          {/* Coluna 1: Foto e Botões */}
          <div className="flex flex-col items-center gap-5">
            <h3 className="text-lg font-medium text-gray-700 text-center w-full">
              Foto do Perfil
            </h3>

            {/* Foto de perfil */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {photo ? (
                <img
                  src={photo}
                  alt="Foto de Perfil"
                  className="w-full h-full rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-full h-full rounded-full border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-500 text-center">
                    Foto do Perfil
                  </span>
                </div>
              )}
            </div>

            {/* Container para os botões */}
            <div className="flex gap-3 justify-center w-full">
              <label className="px-4 py-2 bg-blue-500 text-white rounded-full cursor-pointer text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors w-32 text-center">
                Alterar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleRemovePhoto}
                className="px-4 py-2 bg-red-500 text-white rounded-full cursor-pointer text-sm font-medium shadow-sm hover:bg-red-600 transition-colors w-32"
              >
                Remover
              </button>
            </div>
          </div>

          {/* Coluna 2: Informações */}
          <div className="flex flex-col gap-5">
            <h3 className="text-lg font-medium text-gray-700 text-center">
              Informações
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">
                Nome Completo
              </label>
              <input
                type="text"
                value={userData?.nomeCompleto || ""}
                onChange={(e) =>
                  setUserData({ ...userData, nomeCompleto: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">
                {userData?.userType?.toLowerCase() === "colab"
                  ? "Vínculo"
                  : "CPF/CNPJ"}
              </label>
              <input
                type="text"
                value={
                  userData?.userType?.toLowerCase() === "colab"
                    ? userData?.registeredByName || "Não informado"
                    : userData?.cpfCnpj || ""
                }
                onChange={(e) =>
                  setUserData({ ...userData, cpfCnpj: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                disabled={userData?.userType?.toLowerCase() === "colab"}
              />
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={handleUpdateInfo}
                disabled={
                  JSON.stringify(userData) === JSON.stringify(initialUserData)
                }
                className={`px-6 py-2.5 rounded-full text-sm font-medium shadow-sm w-48 transition-all
                  ${
                    JSON.stringify(userData) === JSON.stringify(initialUserData)
                      ? "bg-gray-300 cursor-not-allowed opacity-60"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
              >
                Atualizar
              </button>
            </div>
          </div>

          {/* Coluna 3: Alterar Senha */}
          <div className="flex flex-col gap-5">
            <h3 className="text-lg font-medium text-gray-700 text-center">
              Alterar Senha
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">
                Senha Atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={handlePasswordChange}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-full text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors w-48"
              >
                Salvar Senha
              </button>
            </div>
          </div>
        </div>

        {/* Botão de Desvincular-se para usuários colab */}
        {userData?.userType?.toLowerCase() === "colab" && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setShowUnlinkModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-full cursor-pointer text-sm font-medium shadow-sm hover:bg-red-700 transition-colors w-48"
            >
              Desvincular-se
            </button>
          </div>
        )}

        {/* Modal de Confirmação de Desvinculação */}
        {showUnlinkModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Confirmar Desvinculação
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-red-600"
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
                  <p className="text-gray-600">
                    Ao confirmar a desvinculação, você perderá o vínculo com o
                    usuário atual, acesso aos projetos já criados e se tornará
                    um usuário independente. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUnlinkModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Confirmar Desvinculação
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensagens de Sucesso e Erro */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 text-center">
            {successMessage}
          </div>
        )}

        {erro && (
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 text-center">
            {erro}
          </div>
        )}

        {/* Modal de Alteração de Email */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Alterar Email
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Novo Email
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o novo email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={modalCurrentPassword}
                      onChange={(e) => setModalCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setNewEmail("");
                      setModalCurrentPassword("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateEmail}
                    disabled={isUpdatingEmail}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingEmail ? "Atualizando..." : "Atualizar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Cancelamento */}
        {showCancelVerificationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Cancelar Alteração de Email
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-center">
                  Tem certeza que deseja cancelar a alteração do email? O email
                  atual será mantido.
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCancelVerificationModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEmailVerification}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Sim, Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientProfile;
