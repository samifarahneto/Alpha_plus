import React, { useState, useEffect } from "react";
import { db } from "../../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import PageLayout from "../../../components/PageLayout";

const MasterDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    totalValue: 0,
    clientCounts: {
      b2b: 0,
      b2c: 0,
    },
    statusSummary: {
      emAndamento: 0,
      emRevisao: 0,
      emCertificacao: 0,
      finalizado: 0,
      cancelado: 0,
      na: 0,
    },
    receitaTotal: 0,
    pagamentosPendentes: 0,
    divergenciasPagas: 0,
    reembolsosPagos: 0,
    pagamentosB2B: 0,
    pagamentosB2C: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar projetos B2B pagos
        const b2bProjectsSnapshot = await getDocs(
          collection(db, "b2bprojectspaid")
        );
        const b2bTotal = b2bProjectsSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.totalValue || 0);
        }, 0);

        // Contar projetos em andamento em b2bprojectspaid
        const b2bEmAndamento = b2bProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Em Andamento" ? 1 : 0);
        }, 0);

        // Contar projetos em revisão em b2bprojectspaid
        const b2bEmRevisao = b2bProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Em Revisão" ? 1 : 0);
        }, 0);

        // Contar projetos em certificação em b2bprojectspaid
        const b2bEmCertificacao = b2bProjectsSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return (
              count + (data.translation_status === "Em Certificação" ? 1 : 0)
            );
          },
          0
        );

        // Contar projetos finalizados em b2bprojectspaid
        const b2bFinalizado = b2bProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Finalizado" ? 1 : 0);
        }, 0);

        // Contar projetos cancelados em b2bprojectspaid
        const b2bCancelado = b2bProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Cancelado" ? 1 : 0);
        }, 0);

        // Contar projetos N/A em b2bprojectspaid
        const b2bNA = b2bProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "N/A" ? 1 : 0);
        }, 0);

        // Calcular divergências pagas B2B
        const divergenciasPagasB2B = b2bProjectsSnapshot.docs.reduce(
          (sum, doc) => {
            const data = doc.data();
            if (data.paymentHistory) {
              const divergencias = data.paymentHistory.filter(
                (payment) => payment.type === "divergence"
              );
              return (
                sum +
                divergencias.reduce(
                  (total, div) => total + (div.amount || 0),
                  0
                )
              );
            }
            return sum;
          },
          0
        );

        // Calcular reembolsos pagos B2B
        const reembolsosPagosB2B = b2bProjectsSnapshot.docs.reduce(
          (sum, doc) => {
            const data = doc.data();
            if (data.payment_status?.status === "Reembolso") {
              return sum + (data.payment_status.refundAmount || 0);
            }
            return sum;
          },
          0
        );

        // Buscar projetos B2C pagos
        const b2cProjectsSnapshot = await getDocs(
          collection(db, "b2cprojectspaid")
        );
        const b2cTotal = b2cProjectsSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.totalValue || 0);
        }, 0);

        // Calcular divergências pagas B2C
        const divergenciasPagasB2C = b2cProjectsSnapshot.docs.reduce(
          (sum, doc) => {
            const data = doc.data();
            if (data.paymentHistory) {
              const divergencias = data.paymentHistory.filter(
                (payment) => payment.type === "divergence"
              );
              return (
                sum +
                divergencias.reduce(
                  (total, div) => total + (div.amount || 0),
                  0
                )
              );
            }
            return sum;
          },
          0
        );

        // Calcular reembolsos pagos B2C
        const reembolsosPagosB2C = b2cProjectsSnapshot.docs.reduce(
          (sum, doc) => {
            const data = doc.data();
            if (data.payment_status?.status === "Reembolso") {
              return sum + (data.payment_status.refundAmount || 0);
            }
            return sum;
          },
          0
        );

        // Buscar projetos B2B aprovados (pendentes)
        const b2bApprovedSnapshot = await getDocs(
          collection(db, "b2bapproved")
        );
        const b2bPendingTotal = b2bApprovedSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.totalProjectValue || data.totalValue || 0);
        }, 0);

        // Contar projetos em andamento em b2bapproved
        const b2bApprovedEmAndamento = b2bApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Em Andamento" ? 1 : 0);
          },
          0
        );

        // Contar projetos em revisão em b2bapproved
        const b2bApprovedEmRevisao = b2bApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Em Revisão" ? 1 : 0);
          },
          0
        );

        // Contar projetos em certificação em b2bapproved
        const b2bApprovedEmCertificacao = b2bApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return (
              count + (data.translation_status === "Em Certificação" ? 1 : 0)
            );
          },
          0
        );

        // Contar projetos finalizados em b2bapproved
        const b2bApprovedFinalizado = b2bApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Finalizado" ? 1 : 0);
          },
          0
        );

        // Contar projetos cancelados em b2bapproved
        const b2bApprovedCancelado = b2bApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Cancelado" ? 1 : 0);
          },
          0
        );

        // Contar projetos N/A em b2bapproved
        const b2bApprovedNA = b2bApprovedSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "N/A" ? 1 : 0);
        }, 0);

        // Buscar projetos B2C aprovados (pendentes)
        const b2cApprovedSnapshot = await getDocs(
          collection(db, "b2capproved")
        );
        const b2cPendingTotal = b2cApprovedSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.totalProjectValue || data.totalValue || 0);
        }, 0);

        // Contar projetos em andamento em b2cprojectspaid
        const b2cEmAndamento = b2cProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Em Andamento" ? 1 : 0);
        }, 0);

        // Contar projetos em revisão em b2cprojectspaid
        const b2cEmRevisao = b2cProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Em Revisão" ? 1 : 0);
        }, 0);

        // Contar projetos em certificação em b2cprojectspaid
        const b2cEmCertificacao = b2cProjectsSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return (
              count + (data.translation_status === "Em Certificação" ? 1 : 0)
            );
          },
          0
        );

        // Contar projetos finalizados em b2cprojectspaid
        const b2cFinalizado = b2cProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Finalizado" ? 1 : 0);
        }, 0);

        // Contar projetos cancelados em b2cprojectspaid
        const b2cCancelado = b2cProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "Cancelado" ? 1 : 0);
        }, 0);

        // Contar projetos N/A em b2cprojectspaid
        const b2cNA = b2cProjectsSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "N/A" ? 1 : 0);
        }, 0);

        // Contar projetos em andamento em b2capproved
        const b2cApprovedEmAndamento = b2cApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Em Andamento" ? 1 : 0);
          },
          0
        );

        // Contar projetos em revisão em b2capproved
        const b2cApprovedEmRevisao = b2cApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Em Revisão" ? 1 : 0);
          },
          0
        );

        // Contar projetos em certificação em b2capproved
        const b2cApprovedEmCertificacao = b2cApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return (
              count + (data.translation_status === "Em Certificação" ? 1 : 0)
            );
          },
          0
        );

        // Contar projetos finalizados em b2capproved
        const b2cApprovedFinalizado = b2cApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Finalizado" ? 1 : 0);
          },
          0
        );

        // Contar projetos cancelados em b2capproved
        const b2cApprovedCancelado = b2cApprovedSnapshot.docs.reduce(
          (count, doc) => {
            const data = doc.data();
            return count + (data.translation_status === "Cancelado" ? 1 : 0);
          },
          0
        );

        // Contar projetos N/A em b2capproved
        const b2cApprovedNA = b2cApprovedSnapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          return count + (data.translation_status === "N/A" ? 1 : 0);
        }, 0);

        // Atualizar o estado com todos os valores
        setDashboardData((prev) => ({
          ...prev,
          receitaTotal:
            b2bTotal +
            divergenciasPagasB2B -
            reembolsosPagosB2B +
            (b2cTotal + divergenciasPagasB2C - reembolsosPagosB2C),
          pagamentosPendentes: b2bPendingTotal + b2cPendingTotal,
          divergenciasPagas: divergenciasPagasB2B + divergenciasPagasB2C,
          reembolsosPagos: reembolsosPagosB2B + reembolsosPagosB2C,
          pagamentosB2B: b2bTotal + divergenciasPagasB2B - reembolsosPagosB2B,
          pagamentosB2C: b2cTotal + divergenciasPagasB2C - reembolsosPagosB2C,
          statusSummary: {
            ...prev.statusSummary,
            emAndamento:
              b2bEmAndamento +
              b2bApprovedEmAndamento +
              b2cEmAndamento +
              b2cApprovedEmAndamento,
            emRevisao:
              b2bEmRevisao +
              b2bApprovedEmRevisao +
              b2cEmRevisao +
              b2cApprovedEmRevisao,
            emCertificacao:
              b2bEmCertificacao +
              b2bApprovedEmCertificacao +
              b2cEmCertificacao +
              b2cApprovedEmCertificacao,
            finalizado:
              b2bFinalizado +
              b2bApprovedFinalizado +
              b2cFinalizado +
              b2cApprovedFinalizado,
            cancelado:
              b2bCancelado +
              b2bApprovedCancelado +
              b2cCancelado +
              b2cApprovedCancelado,
            na: b2bNA + b2bApprovedNA + b2cNA + b2cApprovedNA,
          },
        }));
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <PageLayout>
      <div className="w-full max-w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
        <div className="glass-card">
          {/* Grid de 4 cards (1 coluna no mobile, 2 colunas no desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Card 1 - Financeiro */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="bg-blue-500 p-2 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  Financeiro
                </h3>
              </div>

              {/* Grid de cards financeiros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Receita Total */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Receita Total
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      R${" "}
                      {dashboardData.receitaTotal.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total acumulado
                    </p>
                  </div>
                </div>

                {/* Pagamentos Pendentes */}
                <div className="bg-gradient-to-br from-white to-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Pagamentos Pendentes
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      R${" "}
                      {dashboardData.pagamentosPendentes.toLocaleString(
                        "pt-BR",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aguardando pagamento
                    </p>
                  </div>
                </div>

                {/* Divergências Pagas */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Divergências Pagas
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      R${" "}
                      {dashboardData.divergenciasPagas.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total de divergências
                    </p>
                  </div>
                </div>

                {/* Reembolsos Pagos */}
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-lg shadow-md p-3 sm:p-4 border border-yellow-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Reembolsos Pagos
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      R${" "}
                      {dashboardData.reembolsosPagos.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total de reembolsos
                    </p>
                  </div>
                </div>

                {/* Pagamentos de B2B */}
                <div className="bg-gradient-to-br from-white to-purple-50 rounded-lg shadow-md p-3 sm:p-4 border border-purple-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Pagamentos de B2B
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      R${" "}
                      {dashboardData.pagamentosB2B.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total B2B</p>
                  </div>
                </div>

                {/* Pagamentos de B2C */}
                <div className="bg-gradient-to-br from-white to-indigo-50 rounded-lg shadow-md p-3 sm:p-4 border border-indigo-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Pagamentos de B2C
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-600">
                      R${" "}
                      {dashboardData.pagamentosB2C.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total B2C</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Tradução */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="bg-green-500 p-2 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                  </span>
                  Tradução
                </h3>
              </div>

              {/* Grid de status de tradução */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Em Andamento */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Em Andamento
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {dashboardData.statusSummary.emAndamento}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Projetos ativos
                    </p>
                  </div>
                </div>

                {/* Em Revisão */}
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-lg shadow-md p-3 sm:p-4 border border-yellow-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Em Revisão
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {dashboardData.statusSummary.emRevisao}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Em análise</p>
                  </div>
                </div>

                {/* Em Certificação */}
                <div className="bg-gradient-to-br from-white to-purple-50 rounded-lg shadow-md p-3 sm:p-4 border border-purple-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Em Certificação
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      {dashboardData.statusSummary.emCertificacao}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Em certificação
                    </p>
                  </div>
                </div>

                {/* Finalizado */}
                <div className="bg-gradient-to-br from-white to-green-50 rounded-lg shadow-md p-3 sm:p-4 border border-green-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Finalizado
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {dashboardData.statusSummary.finalizado}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Projetos concluídos
                    </p>
                  </div>
                </div>

                {/* Cancelado */}
                <div className="bg-gradient-to-br from-white to-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Cancelado
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      {dashboardData.statusSummary.cancelado}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Projetos cancelados
                    </p>
                  </div>
                </div>

                {/* N/A */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    N/A
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-600">
                      {dashboardData.statusSummary.na}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Não aplicável</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 - Projetos */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="bg-purple-500 p-2 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </span>
                  Projetos
                </h3>
              </div>

              {/* Grid de status de projeto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Rascunho */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md p-3 sm:p-4 border border-gray-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Rascunho
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Em rascunho</p>
                  </div>
                </div>

                {/* Ag. Orçamento */}
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-lg shadow-md p-3 sm:p-4 border border-yellow-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Ag. Orçamento
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aguardando orçamento
                    </p>
                  </div>
                </div>

                {/* Ag. Aprovação */}
                <div className="bg-gradient-to-br from-white to-orange-50 rounded-lg shadow-md p-3 sm:p-4 border border-orange-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Ag. Aprovação
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aguardando aprovação
                    </p>
                  </div>
                </div>

                {/* Ag. Pagamento */}
                <div className="bg-gradient-to-br from-white to-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Ag. Pagamento
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aguardando pagamento
                    </p>
                  </div>
                </div>

                {/* Em Análise */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Em Análise
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Em análise</p>
                  </div>
                </div>

                {/* Em Andamento */}
                <div className="bg-gradient-to-br from-white to-green-50 rounded-lg shadow-md p-3 sm:p-4 border border-green-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Em Andamento
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Em desenvolvimento
                    </p>
                  </div>
                </div>

                {/* Cancelado */}
                <div className="bg-gradient-to-br from-white to-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Cancelado
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Projetos cancelados
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4 - Pagamentos */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <span className="bg-orange-500 p-2 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  Pagamentos
                </h3>
              </div>

              {/* Grid de status de pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Pendente */}
                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-lg shadow-md p-3 sm:p-4 border border-yellow-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Pendente
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      R$ 0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Aguardando pagamento
                    </p>
                  </div>
                </div>

                {/* Pago */}
                <div className="bg-gradient-to-br from-white to-green-50 rounded-lg shadow-md p-3 sm:p-4 border border-green-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Pago
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      R$ 0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Pagamentos realizados
                    </p>
                  </div>
                </div>

                {/* Divergência */}
                <div className="bg-gradient-to-br from-white to-red-50 rounded-lg shadow-md p-3 sm:p-4 border border-red-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Divergência
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      R$ 0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Divergências pendentes
                    </p>
                  </div>
                </div>

                {/* Reembolso */}
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-md p-3 sm:p-4 border border-blue-100 transition-all hover:shadow-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    Reembolso
                  </p>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      R$ 0
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Reembolsos pendentes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default MasterDashboard;
