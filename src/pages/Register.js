import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import fundoImage from "../assets/fundo.webp";
import Hero from "../components/Hero";
import PageLayout from "../components/PageLayout";
import Footer from "../components/Footer";
import FormContainer from "../components/FormContainer";

const Register = () => {
  React.useEffect(() => {
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "";
    };
  }, []);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [emailCheckResult, setEmailCheckResult] = useState(null);
  const navigate = useNavigate();
  const [emailError] = useState("");

  const handleNext = async () => {
    if (!email.trim()) {
      setErro("Por favor, insira um email.");
      return;
    }

    // Validação do formato do e-mail
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
      setErro("Email inválido. Verifique o formato.");
      return;
    }

    try {
      const q = query(
        collection(db, "emailcheck"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        const registeredBy = docData.registeredBy || null;

        if (!registeredBy) {
          throw new Error(
            "O campo 'registeredBy' está ausente ou vazio na coleção 'emailcheck'."
          );
        }

        const result = { userType: "colab", registeredBy };
        setEmailCheckResult(result);
      } else {
        setEmailCheckResult({ userType: "b2c", registeredBy: null });
        setErro(
          "Email não encontrado na base de colaboradores. Será registrado como cliente."
        );
      }

      setErro(""); // Limpa erros anteriores
      setStep(2); // Avança para a próxima etapa
    } catch (error) {
      console.error("Erro na consulta à coleção emailcheck:", error);
      setErro("Erro ao verificar o email: " + error.message);
    }
  };

  const handleRegister = async () => {
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (!nomeCompleto.trim() || !email.trim() || !senha) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    if (!emailCheckResult) {
      setErro(
        "Erro ao validar o email. Certifique-se de que seguiu o fluxo correto."
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );
      const user = userCredential.user;

      // Determinar o userType e valores de tradução
      let userType = "b2c";
      let pttoen = 0;
      let esptoen = 0;
      let registeredByType = null;
      let canTest = false;

      if (emailCheckResult.userType === "colab") {
        // Buscar informações do usuário que registrou o colaborador
        const q = query(
          collection(db, "users"),
          where("email", "===", emailCheckResult.registeredBy)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const registeredByDoc = querySnapshot.docs[0].data();
          userType = "colab";
          pttoen = registeredByDoc.pttoen || 0;
          esptoen = registeredByDoc.esptoen || 0;
          registeredByType = registeredByDoc.userType;
          canTest = registeredByDoc.canTest || false;

          // Atualizar o log de atividade para o convite de colaborador
          const emailCheckQuery = query(
            collection(db, "emailcheck"),
            where("email", "===", email)
          );
          const emailCheckSnapshot = await getDocs(emailCheckQuery);

          if (!emailCheckSnapshot.empty) {
            const emailCheckDoc = emailCheckSnapshot.docs[0];
            const emailCheckData = emailCheckDoc.data();

            // Criar o log de atividade com a mesma estrutura do AddCollaboratorColab.js
            const logData = {
              timestamp: new Date(),
              userEmail: emailCheckResult.registeredBy,
              action: "convite de colaborador",
              details: {
                emailConvidado: email,
                status: "enviado",
                colaborador: {
                  nome: nomeCompleto,
                  email: email,
                  tipo: userType,
                  status: "ativo",
                  canTest: canTest,
                },
                dataConvite:
                  emailCheckData.createdAt?.toDate().toLocaleString("pt-BR") ||
                  new Date().toLocaleString("pt-BR"),
              },
            };

            // Adicionar o log de atividade
            await addDoc(collection(db, "activity_logs"), logData);

            // Remover o documento do emailcheck após o registro
            await deleteDoc(emailCheckDoc.ref);
          }
        } else {
          throw new Error("Usuário registrador não encontrado");
        }
      } else {
        // Para clientes normais, buscar valores globais
        const priceDocRef = doc(db, "priceperpage", "price");
        const priceDocSnap = await getDoc(priceDocRef);

        if (priceDocSnap.exists()) {
          const priceData = priceDocSnap.data();
          pttoen = priceData.pttoen ?? 0;
          esptoen = priceData.esptoen ?? 0;
        }
      }

      // Criar usuário no Firestore
      await setDoc(doc(db, "users", user.uid), {
        nomeCompleto,
        email,
        userType,
        registeredBy: emailCheckResult.registeredBy,
        registeredByType: registeredByType,
        createdAt: new Date(),
        pttoen,
        esptoen,
      });

      // Remover entrada da coleção emailcheck, se for colaborador
      if (emailCheckResult.userType === "colab") {
        const emailCheckQuery = query(
          collection(db, "emailcheck"),
          where("email", "==", email)
        );
        const emailCheckSnapshot = await getDocs(emailCheckQuery);

        if (!emailCheckSnapshot.empty) {
          await deleteDoc(emailCheckSnapshot.docs[0].ref);
        }
      }

      alert("Usuário registrado com sucesso!");
      setStep(1);
      setNomeCompleto("");
      setEmail("");
      setSenha("");
      setConfirmarSenha("");
      setErro("");
      navigate("/login");
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      setErro("Erro ao registrar usuário: " + error.message);
    }
  };

  return (
    <>
      {/* Hero Section - Fora do PageLayout */}
      <div className="w-screen overflow-hidden">
        <Hero
          backgroundImage={fundoImage}
          title="Portal Alpha Translations"
          height="h-[300px] md:h-[400px]"
          overlay="bg-black/40"
        />
      </div>

      {/* Conteúdo Principal */}
      <div className="relative -mt-[60px] z-10 overflow-hidden">
        <PageLayout>
          <div className="font-poppins text-gray-800 min-h-screen flex flex-col">
            <main className="flex-grow">
              {/* Espaço para o Hero */}
              <div className="h-[300px]"></div>

              <FormContainer
                title="Faça seu cadastro"
                error={erro}
                footerText="Já possui cadastro?"
                footerLinkText="Login"
                onFooterClick={() => navigate("/login")}
              >
                {step === 1 && (
                  <div className="h-[200px] flex flex-col justify-between p-3">
                    <h3 className="text-xl font-semibold text-center mb-4">
                      Insira seu Email
                    </h3>
                    <form
                      onSubmit={(e) => e.preventDefault()}
                      className="flex flex-col flex-1"
                    >
                      <div className="mb-5">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) =>
                            setEmail(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9@._-]/g, "")
                            )
                          }
                          required
                          placeholder="Email"
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                        />
                        {emailError && (
                          <p className="text-red-500 text-sm mt-1">
                            {emailError}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="mt-auto w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 text-base"
                      >
                        Próximo
                      </button>
                    </form>
                  </div>
                )}

                {step === 2 && (
                  <div className="h-[350px]">
                    <h3 className="text-xl font-semibold text-center mb-6">
                      Informações Adicionais
                    </h3>
                    <form
                      onSubmit={(e) => e.preventDefault()}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">
                          Nome Completo:
                        </label>
                        <input
                          type="text"
                          value={nomeCompleto}
                          onChange={(e) => setNomeCompleto(e.target.value)}
                          required
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">
                          Senha:
                        </label>
                        <input
                          type="password"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          required
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">
                          Confirmar Senha:
                        </label>
                        <input
                          type="password"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                          required
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRegister}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                      >
                        Registrar
                      </button>
                    </form>
                  </div>
                )}
              </FormContainer>
            </main>
          </div>
        </PageLayout>
      </div>

      {/* Rodapé */}
      <Footer />
    </>
  );
};

export default Register;
