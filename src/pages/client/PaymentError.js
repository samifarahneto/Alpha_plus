import React from "react";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useNavigate, useLocation } from "react-router-dom";

const PaymentError = ({ errorMessage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProjects = location.state?.selectedProjects || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <IoIosCloseCircleOutline
                size={120}
                className="text-red-500 animate-bounce"
              />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Erro no Processamento do Pagamento
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              Não foi possível processar o pagamento do projeto. Por favor,
              tente novamente ou entre em contato com nosso suporte se o
              problema persistir.
            </p>

            {errorMessage && (
              <p className="text-lg text-red-600 mb-8 max-w-2xl italic">
                Erro: {errorMessage}
              </p>
            )}

            <div className="space-y-4">
              <button
                onClick={() => {
                  if (selectedProjects.length > 0) {
                    navigate("/client/checkout", {
                      state: { selectedProjects },
                    });
                  } else {
                    navigate("/client/projects");
                  }
                }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-sm text-center font-medium"
              >
                Tentar Novamente
              </button>

              <button
                onClick={() => navigate("/client/projects")}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 shadow-sm text-center font-medium block w-full"
              >
                Voltar para Meus Projetos
              </button>
            </div>

            <div className="mt-8 text-sm text-gray-500">
              <p>
                Se o problema persistir, entre em contato com nosso suporte.
              </p>
              <p className="mt-2">
                Estamos aqui para ajudar em caso de dúvidas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentError;
