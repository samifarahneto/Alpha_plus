import React, { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import ClientLayout from "../../components/layouts/ClientLayout";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import {
  FaFileAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

const ClientDashboard = () => {
  const [totalProjects, setTotalProjects] = useState(0);
  const [projects, setProjects] = useState([]);
  const [statusStats, setStatusStats] = useState({ completed: 0, pending: 0 });
  const [monthlyProjects, setMonthlyProjects] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const firestore = getFirestore();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const userEmail = currentUser.email;

          // Coleções no Firestore
          const projectsCollection = collection(firestore, "projects");
          const b2cProjectsCollection = collection(firestore, "b2cprojects");
          const usersCollection = collection(firestore, "users");

          // Consulta para encontrar colaboradores vinculados
          const collaboratorsQuery = query(
            usersCollection,
            where("registeredBy", "==", userEmail)
          );
          const collaboratorsSnapshot = await getDocs(collaboratorsQuery);

          // Obter e-mails dos colaboradores vinculados
          const collaboratorEmails = collaboratorsSnapshot.docs.map(
            (doc) => doc.data().email
          );

          // Adicionar o e-mail do usuário atual à lista de e-mails
          const emailsToQuery = [userEmail, ...collaboratorEmails];

          // Buscar projetos para todos os e-mails relacionados
          const projectQueries = emailsToQuery
            .map((email) => [
              query(projectsCollection, where("userEmail", "==", email)),
              query(b2cProjectsCollection, where("userEmail", "==", email)),
            ])
            .flat();

          // Executar todas as consultas de projetos
          const projectSnapshots = await Promise.all(
            projectQueries.map((q) => getDocs(q))
          );

          // Consolidar projetos em uma lista única
          const projectsList = projectSnapshots
            .flatMap((snapshot) =>
              snapshot.docs.map((doc) => {
                const data = doc.data();
                console.log("=== Dados Completos do Projeto ===");
                console.log("ID:", doc.id);
                console.log("Nome:", data.projectName);
                console.log("Dados:", data);
                console.log("Collection:", data.collection);
                console.log("Source:", data.source);
                console.log("isPaid:", data.isPaid);
                console.log("Status:", data.status);
                console.log("------------------------");

                // Calcular o valor total do projeto usando a mesma lógica do ClientProjects.js
                const totalValue =
                  data.files?.reduce((acc, file) => {
                    const fileTotal = Number(file.total) || 0;
                    console.log(
                      `Arquivo ${file.name || "sem nome"} do projeto ${
                        data.projectName
                      }: valor = ${fileTotal}`
                    );
                    return acc + fileTotal;
                  }, 0) || 0;

                console.log(
                  `Projeto ${data.projectName}: Valor Total = ${totalValue}, isPaid = ${data.isPaid}`
                );

                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate() || null,
                  deadlineDate: data.deadlineDate,
                  totalPages:
                    data.files?.reduce(
                      (sum, file) => sum + (parseInt(file.pageCount) || 0),
                      0
                    ) || 0,
                  totalValue: totalValue,
                };
              })
            )
            .filter(
              (project, index, self) =>
                index === self.findIndex((p) => p.id === project.id)
            );

          // Separar projetos pagos e não pagos com log detalhado
          const paidProjects = projectsList.filter((p) => {
            console.log("Verificando projeto pago:", p.projectName, {
              isPaid: p.isPaid,
              collection: p.collection,
              source: p.source,
            });
            return p.isPaid;
          });

          const unpaidProjects = projectsList.filter((p) => {
            console.log("Verificando projeto não pago:", p.projectName, {
              isPaid: p.isPaid,
              collection: p.collection,
              source: p.source,
            });
            return !p.isPaid;
          });

          console.log("=== Detalhamento de Projetos ===");
          console.log(
            "Projetos Pagos:",
            paidProjects.map((p) => ({
              nome: p.projectName,
              valor: p.totalValue,
              isPaid: p.isPaid,
              collection: p.collection,
              source: p.source,
            }))
          );
          console.log(
            "Projetos Pendentes:",
            unpaidProjects.map((p) => ({
              nome: p.projectName,
              valor: p.totalValue,
              isPaid: p.isPaid,
              collection: p.collection,
              source: p.source,
            }))
          );

          // Calcular totais usando a mesma lógica do ClientProjects.js
          const paidTotal = paidProjects.reduce((sum, project) => {
            const projectTotal =
              project.files?.reduce((acc, file) => {
                const fileTotal = Number(file.total) || 0;
                return acc + fileTotal;
              }, 0) || 0;
            console.log(`Projeto pago ${project.projectName}: ${projectTotal}`);
            return sum + projectTotal;
          }, 0);

          const unpaidTotal = unpaidProjects.reduce((sum, project) => {
            const projectTotal =
              project.files?.reduce((acc, file) => {
                const fileTotal = Number(file.total) || 0;
                return acc + fileTotal;
              }, 0) || 0;
            console.log(
              `Projeto pendente ${project.projectName}: ${projectTotal}`
            );
            return sum + projectTotal;
          }, 0);

          console.log("=== Resumo dos Cálculos ===");
          console.log(`Total de projetos: ${projectsList.length}`);
          console.log(`Projetos pagos: ${paidProjects.length}`);
          console.log(`Projetos pendentes: ${unpaidProjects.length}`);
          console.log(`Valor total pago: ${paidTotal}`);
          console.log(`Valor total pendente: ${unpaidTotal}`);

          // Atualizar estados
          setTotalPaid(paidTotal);
          setTotalUnpaid(unpaidTotal);
          setStatusStats({
            completed: paidProjects.length,
            pending: unpaidProjects.length,
          });

          // Calcular projetos por mês
          const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return date.toLocaleString("default", { month: "short" });
          }).reverse();

          const monthlyCount = last6Months.map((month) => {
            return projectsList.filter((project) => {
              if (!project.createdAt) return false;
              return (
                project.createdAt.toLocaleString("default", {
                  month: "short",
                }) === month
              );
            }).length;
          });

          setMonthlyProjects({ labels: last6Months, data: monthlyCount });
          setProjects(projectsList);
          setTotalProjects(projectsList.length);
        }
      } catch (error) {
        console.error("Erro ao buscar projetos do cliente:", error);
      }
    };

    fetchProjects();
  }, []);

  const formatDate = (date) => {
    if (!date) return "A definir";

    let dateObj;
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (typeof date === "string") {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return "A definir";
    }

    if (isNaN(dateObj.getTime())) {
      return "A definir";
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const chartData = {
    labels: monthlyProjects.labels,
    datasets: [
      {
        label: "Projetos por Mês",
        data: monthlyProjects.data,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ["Concluídos", "Pendentes"],
    datasets: [
      {
        data: [statusStats.completed, statusStats.pending],
        backgroundColor: ["rgb(34, 197, 94)", "rgb(239, 68, 68)"],
      },
    ],
  };

  return (
    <ClientLayout>
      <div className="w-full pt-0 pb-4 md:pb-6 lg:pb-8 space-y-4 md:space-y-6 lg:space-y-8 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 text-blue-600 sm:bg-gradient-to-r sm:from-blue-600 sm:to-purple-600 sm:bg-clip-text sm:text-transparent">
          Dashboard
        </h1>

        <div className="glass-card">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaFileAlt className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Projetos</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {totalProjects}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FaCheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Projetos Pagos</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {statusStats.completed}
                  </p>
                  <p className="text-sm text-green-600">
                    R$ {totalPaid.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <FaClock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Pendentes de Pagamento
                  </p>
                  <p className="text-2xl font-bold text-gray-800">
                    {statusStats.pending}
                  </p>
                  <p className="text-sm text-red-600">
                    R$ {totalUnpaid.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FaCalendarAlt className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Páginas</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {projects.reduce(
                      (sum, project) => sum + project.totalPages,
                      0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Projetos por Mês
              </h3>
              <div className="h-[200px]">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Status dos Projetos
              </h3>
              <div className="h-[200px] flex items-center justify-center">
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lista de Projetos */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Projetos Recentes
            </h3>
            <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-100">
              <table className="min-w-full bg-white divide-y divide-gray-200 shadow-sm rounded-lg">
                <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">
                      Nome do Projeto
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Autor
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Páginas
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Valor U$
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Data de Criação
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Prazo
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                    .slice(0, 5)
                    .map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-blue-50/50 transition-all duration-200"
                      >
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                          {project.projectName || "Sem Nome"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                          {project.projectOwner || "Não informado"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                          {project.totalPages}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center font-medium">
                          U$ {project.totalValue?.toFixed(2) || "0.00"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                          {formatDate(project.createdAt)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700 text-center">
                          {formatDate(project.deadlineDate)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-sm text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              project.isPaid
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {project.isPaid ? "PAGO" : "PENDENTE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
