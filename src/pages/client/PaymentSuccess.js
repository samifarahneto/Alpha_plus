import React from "react";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { useNavigate } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <IoIosCheckmarkCircleOutline
                size={120}
                className="text-emerald-500 animate-bounce"
              />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Pagamento Concluído com Sucesso!
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              O pagamento do projeto foi processado com sucesso. Nossa equipe já
              foi notificada e começará a trabalhar no seu projeto em breve.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate("/client/projects")}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm text-center font-medium w-full"
              >
                Voltar para Meus Projetos
              </button>
            </div>

            <div className="mt-8 text-sm text-gray-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
