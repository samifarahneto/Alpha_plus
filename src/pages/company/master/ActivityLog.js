import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = collection(db, "activity_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"));

    // Configurar listener em tempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const logsData = snapshot.docs.map((doc) => {
            const data = doc.data();
            console.log("Dados do log recebidos:", data); // Debug
            return {
              id: doc.id,
              timestamp: data.timestamp?.toDate().toLocaleString("pt-BR"),
              userEmail: data.userEmail || "Não informado",
              action: data.action,
              details: data.details || {},
            };
          });
          setLogs(logsData);
        } catch (error) {
          console.error("Erro ao processar logs:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Erro ao configurar listener:", error);
        setLoading(false);
      }
    );

    // Cleanup function para remover o listener quando o componente for desmontado
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-4">Carregando logs...</div>;
  }

  return (
    <div className="w-full max-w-full p-8 space-y-8">
      <div className="glass-card bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Log de Atividades
        </h2>
        <div className="w-full overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.action === "criação de projeto"
                          ? "bg-green-100 text-green-800"
                          : log.action === "pagamento realizado"
                          ? "bg-blue-100 text-blue-800"
                          : log.action === "erro no pagamento"
                          ? "bg-red-100 text-red-800"
                          : log.action === "envio para aprovação"
                          ? "bg-purple-100 text-purple-800"
                          : log.action === "alteração de status do projeto"
                          ? "bg-yellow-100 text-yellow-800"
                          : log.action === "alteração de status de tradução"
                          ? "bg-orange-100 text-orange-800"
                          : log.action === "alteração de prazo do projeto"
                          ? "bg-indigo-100 text-indigo-800"
                          : log.action === "alteração de nome do projeto"
                          ? "bg-pink-100 text-pink-800"
                          : log.action === "alteração de páginas do projeto"
                          ? "bg-teal-100 text-teal-800"
                          : log.action === "botão de aprovação desabilitado"
                          ? "bg-gray-100 text-gray-800"
                          : log.action === "botão de aprovação habilitado"
                          ? "bg-green-100 text-green-800"
                          : log.action === "conversão de moeda"
                          ? "bg-amber-100 text-amber-800"
                          : log.action === "alteração de prioridade"
                          ? "bg-rose-100 text-rose-800"
                          : log.action === "alteração de língua de origem"
                          ? "bg-cyan-100 text-cyan-800"
                          : log.action === "alteração de conversão monetária"
                          ? "bg-gray-100 text-gray-800"
                          : log.action === "solicitação de orçamento"
                          ? "bg-purple-100 text-purple-800"
                          : log.action === "aprovação de projeto"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.action === "pagamento realizado" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor:
                            </span>
                            <span className="text-green-600">
                              R$ {log.details?.valor || "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status:
                            </span>
                            <span className="text-green-600">
                              {log.details?.status || "sucesso"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "criação de projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Tipo:
                            </span>
                            <span>
                              {log.details?.tipoArquivo || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Páginas:
                            </span>
                            <span>
                              {log.details?.quantidadePaginas ||
                                "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor:
                            </span>
                            <span className="text-green-600">
                              R$ {log.details?.valorTotal || "0.00"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Origem:
                            </span>
                            <span>
                              {log.details?.idiomaOrigem || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Destino:
                            </span>
                            <span>
                              {log.details?.idiomaDestino || "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status do projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Anterior:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.projeto?.statusAnterior ===
                                "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : log.details?.projeto?.statusAnterior ===
                                    "em andamento"
                                  ? "bg-blue-100 text-blue-800"
                                  : log.details?.projeto?.statusAnterior ===
                                    "concluído"
                                  ? "bg-green-100 text-green-800"
                                  : log.details?.projeto?.statusAnterior ===
                                    "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.projeto?.statusAnterior || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Novo:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.projeto?.statusNovo === "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : log.details?.projeto?.statusNovo ===
                                    "em andamento"
                                  ? "bg-blue-100 text-blue-800"
                                  : log.details?.projeto?.statusNovo ===
                                    "concluído"
                                  ? "bg-green-100 text-green-800"
                                  : log.details?.projeto?.statusNovo ===
                                    "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.projeto?.statusNovo || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Tradução Anterior:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.projeto?.statusTraducaoAnterior ===
                                "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : log.details?.projeto
                                      ?.statusTraducaoAnterior ===
                                    "em andamento"
                                  ? "bg-blue-100 text-blue-800"
                                  : log.details?.projeto
                                      ?.statusTraducaoAnterior === "concluído"
                                  ? "bg-green-100 text-green-800"
                                  : log.details?.projeto
                                      ?.statusTraducaoAnterior === "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.projeto?.statusTraducaoAnterior ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Tradução Novo:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.projeto?.statusTraducaoNovo ===
                                "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : log.details?.projeto?.statusTraducaoNovo ===
                                    "em andamento"
                                  ? "bg-blue-100 text-blue-800"
                                  : log.details?.projeto?.statusTraducaoNovo ===
                                    "concluído"
                                  ? "bg-green-100 text-green-800"
                                  : log.details?.projeto?.statusTraducaoNovo ===
                                    "cancelado"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.projeto?.statusTraducaoNovo ||
                                "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de prazo do projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prazo Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.prazoAnterior || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prazo Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.prazoNovo || "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de nome do projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Nome Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.nomeAnterior || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Nome Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.nomeNovo || "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status de tradução" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.projeto?.statusAnterior || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.projeto?.statusNovo || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "envio para aprovação" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Total de Páginas:
                            </span>
                            <span>
                              {log.details?.totalPaginas || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor Total:
                            </span>
                            <span className="text-green-600">
                              R$ {log.details?.totalValor || "0.00"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prazo:
                            </span>
                            <span>{log.details?.prazo || "Não informado"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de páginas do projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Páginas Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.paginasAnterior || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Páginas Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.paginasNovo || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "erro no pagamento" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor:
                            </span>
                            <span className="text-red-600">
                              R$ {log.details?.valor || "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status:
                            </span>
                            <span className="text-red-600">falhou</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "botão de aprovação desabilitado" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Usuário:</span>
                          <span>
                            {log.details?.usuario?.nome ||
                              log.details?.usuario?.email?.split("@")[0] ||
                              log.details?.email?.split("@")[0] ||
                              "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Email:</span>
                          <span>
                            {log.details?.usuario?.email ||
                              log.details?.email ||
                              "Não informado"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "botão de aprovação habilitado" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Usuário:</span>
                          <span>
                            {log.details?.usuario?.nome ||
                              log.details?.usuario?.email?.split("@")[0] ||
                              log.details?.email?.split("@")[0] ||
                              "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Email:</span>
                          <span>
                            {log.details?.usuario?.email ||
                              log.details?.email ||
                              "Não informado"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de preços" && (
                      <div className="flex flex-col gap-2">
                        {log.details?.usuariosAfetados?.map(
                          (usuario, index) => (
                            <div key={index} className="flex flex-col gap-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-gray-700">
                                    Usuário:
                                  </span>
                                  <span>
                                    {usuario.nome} ({usuario.email})
                                  </span>
                                </div>
                              </div>
                              {Object.entries(usuario.valoresNovos || {}).map(
                                ([key, value]) => {
                                  const valorAnterior =
                                    usuario.valoresAnteriores?.[key] || "0.00";
                                  const valorAnteriorNum =
                                    parseFloat(valorAnterior);
                                  const valorNovoNum = parseFloat(value);
                                  const label = {
                                    pttoen: "PT/EN",
                                    esptoen: "ES/EN",
                                    b2bTimePercentage: "Desconto no Tempo B2B",
                                    b2bPricePercentage: "Desconto no Preço B2B",
                                    b2cTimePercentage: "Desconto no Tempo B2C",
                                    b2cPricePercentage: "Desconto no Preço B2C",
                                    price_home: "Valor na Home",
                                  }[key];
                                  return (
                                    <div
                                      key={key}
                                      className="flex items-center gap-4"
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium text-gray-700">
                                          {label}:
                                        </span>
                                        <span className="text-yellow-600">
                                          {key === "price_home" ||
                                          key === "pttoen" ||
                                          key === "esptoen"
                                            ? "U$ "
                                            : ""}
                                          {valorAnterior}
                                        </span>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-green-600">
                                          {key === "price_home" ||
                                          key === "pttoen" ||
                                          key === "esptoen"
                                            ? "U$ "
                                            : ""}
                                          {value}
                                        </span>
                                        {valorNovoNum > valorAnteriorNum && (
                                          <span className="text-green-600 text-base font-bold">
                                            ▲
                                          </span>
                                        )}
                                        {valorNovoNum < valorAnteriorNum && (
                                          <span className="text-red-600 text-base font-bold">
                                            ▼
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {log.action === "inserção de link de compartilhamento" && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Projeto:</span>
                          <span>
                            {log.details?.projeto?.nome || "Não informado"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <span className="font-medium">Link Anterior:</span>
                          <span className="text-yellow-600">
                            {log.details?.linkAnterior || "N/A"}
                          </span>
                          <span className="font-medium">Link Novo:</span>
                          <span className="text-green-600">
                            {log.details?.linkNovo || "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de língua de origem" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Idioma Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.idiomaAnterior || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Idioma Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.idiomaNovo || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de conversão monetária" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Conversão Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.conversaoAnterior
                                ? "Ativada"
                                : "Desativada"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Conversão Nova:
                            </span>
                            <span className="text-green-600">
                              {log.details?.conversaoNova
                                ? "Ativada"
                                : "Desativada"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de prioridade" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prioridade Anterior:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.prioridadeAnterior
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.prioridadeAnterior
                                ? "Com Prioridade"
                                : "Sem Prioridade"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prioridade Nova:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.prioridadeNova
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.prioridadeNova
                                ? "Com Prioridade"
                                : "Sem Prioridade"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "solicitação de orçamento" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Tipo de Arquivo:
                            </span>
                            <span>
                              {log.details?.tipoArquivo || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Páginas:
                            </span>
                            <span>
                              {log.details?.quantidadePaginas ||
                                "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Idioma de Origem:
                            </span>
                            <span>
                              {log.details?.idiomaOrigem || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Idioma de Destino:
                            </span>
                            <span>
                              {log.details?.idiomaDestino || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Conversão Monetária:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.conversaoMonetaria
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.conversaoMonetaria
                                ? "Ativada"
                                : "Desativada"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prioridade:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.prioridade
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {log.details?.prioridade
                                ? "Ativada"
                                : "Desativada"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "convite de colaborador" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Colaborador:
                            </span>
                            <span>
                              {log.details?.colaborador?.nome ||
                                "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Email:
                            </span>
                            <span>
                              {log.details?.colaborador?.email ||
                                "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Tipo de Usuário:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.colaborador?.tipo === "b2b"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {log.details?.colaborador?.tipo === "b2b"
                                ? "B2B"
                                : "B2C"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status:
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.details?.colaborador?.status === "ativo"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {log.details?.colaborador?.status === "ativo"
                                ? "Ativo"
                                : "Pendente"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Data do Convite:
                            </span>
                            <span>
                              {log.details?.dataConvite || "Não informado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.action === "alteração de status de pagamento" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Anterior:
                            </span>
                            <span className="text-yellow-600">
                              {log.details?.projeto?.statusAnterior || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Status Novo:
                            </span>
                            <span className="text-green-600">
                              {log.details?.projeto?.statusNovo || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor:
                            </span>
                            <span className="text-gray-800">
                              U${" "}
                              {log.details?.projeto?.valor?.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                        </div>
                        {log.details?.divergencia && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">
                                Páginas Divergentes:
                              </span>
                              <span className="text-red-600">
                                {log.details?.divergencia?.paginas || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-700">
                                Motivo:
                              </span>
                              <span className="text-red-600">
                                {log.details?.divergencia?.motivo || "N/A"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {log.action === "aprovação de projeto" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Projeto:
                            </span>
                            <span>
                              {log.details?.projeto?.nome || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Total de Páginas:
                            </span>
                            <span>
                              {log.details?.totalPaginas || "Não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Valor Total:
                            </span>
                            <span className="text-green-600">
                              U$ {log.details?.totalValor?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">
                              Prazo:
                            </span>
                            <span>{log.details?.prazo || "Não informado"}</span>
                          </div>
                        </div>
                      </div>
                    )}
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

export default ActivityLog;
