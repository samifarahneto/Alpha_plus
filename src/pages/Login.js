import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import fundoImage from "../assets/fundo.webp";
import Hero from "../components/Hero";
import PageLayout from "../components/PageLayout";
import Footer from "../components/Footer";
import FormContainer from "../components/FormContainer";

const Login = () => {
  React.useEffect(() => {
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "";
    };
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userType = userDoc.data().userType.toLowerCase();

        // Redireciona para a rota específica de cada tipo de usuário
        switch (userType) {
          case "master":
            navigate("/company/master/dashboard");
            break;
          case "b2b":
          case "b2c":
          case "colab":
            navigate("/client/projects");
            break;
          case "manager":
            navigate("/company/manager/dashboard");
            break;
          case "formatter":
            navigate("/company/formatter/dashboard");
            break;
          case "linguist":
            navigate("/company/linguist/dashboard");
            break;
          case "reviewer":
            navigate("/company/reviewer/dashboard");
            break;
          case "translator":
            navigate("/company/translator/dashboard");
            break;
          default:
            alert("Tipo de usuário não reconhecido. Contate o suporte.");
        }
      } else {
        alert("Documento de usuário não encontrado.");
      }
    } catch (error) {
      setErro(
        "Erro ao fazer login. Verifique suas credenciais e tente novamente."
      );
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
                title="Faça seu login"
                error={erro}
                footerText="Não possui cadastro?"
                footerLinkText="Registrar-se"
                onFooterClick={() => navigate("/register")}
              >
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Email:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Senha:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Entrar
                  </button>
                </form>
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

export default Login;
