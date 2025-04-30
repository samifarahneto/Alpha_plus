// src/pages/Home.js
import React, { useState, useEffect } from "react";
import {
  FaGlobe,
  FaBookOpen,
  FaFileSignature,
  FaUserTie,
  FaStar,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import fundoImage from "../assets/fundo.webp";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import PageLayout from "../components/PageLayout";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import Card from "../components/Card";

const Home = () => {
  const [priceHome, setPriceHome] = useState("");

  useEffect(() => {
    const fetchPriceHome = async () => {
      try {
        const priceDocRef = doc(db, "priceperpage", "price");
        const priceDoc = await getDoc(priceDocRef);

        if (priceDoc.exists()) {
          const data = priceDoc.data();
          const price = data.price_home;

          if (price !== undefined && price !== null) {
            const numericValue = parseFloat(price);
            const formattedPrice = numericValue.toFixed(2).replace(".", ",");
            setPriceHome(formattedPrice);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar o preço:", error);
      }
    };

    // Chama a função imediatamente
    fetchPriceHome();

    // Configura um intervalo para atualizar o preço a cada 5 minutos
    const interval = setInterval(fetchPriceHome, 5 * 60 * 1000);

    // Cleanup function
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "";
    };
  }, []);

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
              <div className="h-[400px]"></div>

              {/* Conteúdo Principal */}
              <div className="w-full relative z-10">
                {/* Seção 1 - Cards de Serviços */}
                <section className="w-full mx-auto flex flex-col md:flex-row gap-4 md:gap-8 px-1 md:px-8 mb-16">
                  <Card
                    icon={FaGlobe}
                    title="Tradução Certificada EUA"
                    color="blue"
                    price={`U$${priceHome}`}
                  >
                    <p className="text-base leading-relaxed text-gray-600">
                      Tradução certificada com notarial nos EUA, garantindo
                      aceitação legal e precisão por profissionais certificados.
                    </p>
                  </Card>

                  <Card
                    icon={FaBookOpen}
                    title="Tradução Simples"
                    color="orange"
                  >
                    <p className="text-base leading-relaxed text-gray-600">
                      Traduções precisas e profissionais ideais para uso pessoal
                      ou empresarial, entregues em formato editável.
                    </p>
                  </Card>

                  <Card
                    icon={FaFileSignature}
                    title="Tradução Juramentada"
                    color="green"
                  >
                    <p className="text-base leading-relaxed text-gray-600">
                      Tradução oficial certificada no Brasil com validade legal
                      para processos governamentais e acadêmicos.
                    </p>
                  </Card>
                </section>

                {/* Seção 2 - Sobre a Empresa */}
                <section className="w-full mx-auto flex flex-col md:flex-row gap-6 md:gap-10 justify-between items-stretch px-1 md:px-8 mb-16">
                  {/* Div da Esquerda (Foto) */}
                  <div className="w-full md:flex-1 bg-gray-50 rounded-xl shadow-lg overflow-hidden h-[300px] md:h-auto">
                    <img
                      src={require("../assets/predio.webp")}
                      alt="Logo Cromada no Escritório Moderno"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Div da Direita (Texto) */}
                  <div className="w-full md:flex-1 flex flex-col gap-4 bg-white rounded-xl shadow-lg p-2 md:p-8 leading-relaxed text-gray-800">
                    <h3 className="text-2xl font-bold text-center border-b border-gray-200 pb-2">
                      Nossa Empresa
                    </h3>

                    <p className="text-base md:text-lg font-medium text-gray-700 text-justify leading-relaxed">
                      A <b>Alpha Translations</b>, integrante do{" "}
                      <b>Alpha One World Group</b> e membro corporativo da{" "}
                      <b>ATA</b>, é especializada em traduções certificadas e
                      notarizadas para processos imigratórios e acadêmicos no
                      Brasil e nos <b>EUA</b>. <br />
                      Com experiência destacada e garantia de qualidade, a
                      empresa oferece suporte linguístico e documental
                      excepcional, assegurando precisão e confiabilidade em cada
                      projeto.
                    </p>
                  </div>
                </section>

                {/* Seção 3 - Estatísticas */}
                <section className="w-full mx-auto flex flex-col md:flex-row gap-6 md:gap-10 justify-between text-center bg-white rounded-lg p-2 md:p-10 items-center box-border px-1 md:px-8">
                  <div className="w-full md:flex-1">
                    <FaUsers className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] text-blue-500 mx-auto" />
                    <h4 className="text-xl my-3 text-gray-800">
                      Traduções em 2023
                    </h4>
                    <p className="text-3xl md:text-4xl font-bold text-blue-500 mt-3">
                      7.230+
                    </p>
                  </div>

                  <div className="w-full md:flex-1">
                    <div className="relative inline-block">
                      <FaStar className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] text-orange-500" />
                      <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl font-bold">
                        5.0
                      </span>
                    </div>
                    <h4 className="text-xl my-3 text-gray-800">
                      Clientes Satisfeitos
                    </h4>
                    <p className="text-2xl font-semibold text-orange-500 mt-3">
                      ⭐⭐⭐⭐⭐
                    </p>
                  </div>

                  <div className="w-full md:flex-1">
                    <FaUserTie className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] text-green-500 mx-auto" />
                    <h4 className="text-xl my-3 text-gray-800">
                      Profissionais no Time
                    </h4>
                    <p className="text-3xl md:text-4xl font-bold text-green-500 mt-3">
                      43
                    </p>
                  </div>
                </section>
              </div>

              {/* WhatsApp Flutuante */}
              <a
                href="https://api.whatsapp.com/send?phone=14073859794"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-5 right-5 bg-[#25D366] text-white rounded-full w-[60px] h-[60px] flex items-center justify-center shadow-lg cursor-pointer z-[1001]"
              >
                <FaWhatsapp className="w-8 h-8" />
              </a>
            </main>
          </div>
        </PageLayout>
      </div>

      {/* Rodapé */}
      <Footer />
    </>
  );
};

export default Home;
