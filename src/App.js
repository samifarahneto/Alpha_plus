import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UnreadCountProvider } from "./contexts/UnreadCountContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Header from "./components/Header";
import MasterLayout from "./components/MasterLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Importações das páginas
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Client
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProfile from "./pages/client/ClientProfile";
import ClientProjects from "./pages/client/ClientProjects";
import ClientAddProject from "./pages/client/ClientAddProject";
import ClienteProjectDetails from "./pages/client/ClienteProjectDetails";
import CheckoutPage from "./pages/client/CheckoutPage";
import PaymentSuccess from "./pages/client/PaymentSuccess";
import PaymentError from "./pages/client/PaymentError";
import AddCollaboratorColab from "./pages/client/AddCollaboratorColab";
import PaymentPage from "./pages/client/PaymentPage";
import ClientBudget from "./pages/client/ClientBudget";
import ClientProjectsDone from "./pages/client/ClientProjectsDone";
import ClientProjectsPaid from "./pages/client/ClientProjectsPaid";
import ClientPayments from "./pages/client/ClientPayments";
import ClientGoingOn from "./pages/client/ClientGoingOn";
import ClientAnalysis from "./pages/client/ClientAnalysis";
import ClientBudgetReady from "./pages/client/ClientBudgetReady";
import ClientRefund from "./pages/client/ClientRefund";
import ClientDivergence from "./pages/client/ClientDivergence";

// Master
import MasterClient from "./pages/company/master/MasterClient";
import MasterEmployee from "./pages/company/master/MasterEmployee";
import MasterProjects from "./pages/company/master/MasterProjects";
import ProjectDetails from "./pages/company/master/ProjectDetails";
import ProjectsBudget from "./pages/company/master/ProjectsBudget";
import ProjectsApproval from "./pages/company/master/ProjectsApproval";
import ProjectsDone from "./pages/company/master/ProjectsDone";
import ProjectsPaid from "./pages/company/master/ProjectsPaid";
import MasterPayments from "./pages/company/master/MasterPayments";
import MasterOnGoing from "./pages/company/master/MasterOnGoing";
import ProjectsApproved from "./pages/company/master/ProjectsApproved";
import ProjectsInAnalysis from "./pages/company/master/ProjectsInAnalysis";
import MasterDashboard from "./pages/company/master/MasterDashboard";
import ActivityLog from "./pages/company/master/ActivityLog";
import MasterAddProject from "./pages/company/master/MasterAddProject";
import MasterRefund from "./pages/company/master/MasterRefund";

// Outras configurações
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import "./global.css";

const stripePromise = loadStripe(
  "pk_test_51PBy5m2KZJRPZsUMCgqZvvPNMn9noozCE9hAoOYPrIMOl1XBbdWv5MU146TguaaRDip4bqavCKqTKpZY0FBIvABJ00WrEB6Cze"
);

const AppContent = () => {
  const [, setUnreadCount] = useState(0);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const firestore = getFirestore();
    const uploadsCollection = collection(firestore, "uploads");

    const unsubscribe = onSnapshot(uploadsCollection, (snapshot) => {
      const unreadUploads = snapshot.docs.filter(
        (doc) => !doc.data().isRead
      ).length;
      setUnreadCount(unreadUploads);
    });

    return () => unsubscribe();
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mt-[70px]">
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas do Cliente - Todas Protegidas */}
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientProjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-budget"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientBudget />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-budget-received"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientBudgetReady />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-analysis"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-done"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientProjectsDone />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-paid"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientProjectsPaid />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/payments"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/going-on"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientGoingOn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-refund"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientRefund />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects-divergence"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientDivergence />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects/clientaddproject"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClientAddProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/projects/:projectId"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <ClienteProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/checkout"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/payment-success"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/payment-error"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c", "colab"]}>
                <PaymentError />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/add-collaborator"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c"]}>
                <AddCollaboratorColab />
              </ProtectedRoute>
            }
          />

          {/* Rotas do Master - Todas Protegidas */}
          <Route
            path="/company/master"
            element={
              <ProtectedRoute allowedUserTypes={["master"]}>
                <MasterLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="activity-logs"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="clients"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterClient />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterEmployee />
                </ProtectedRoute>
              }
            />
            <Route
              index
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-budget"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsBudget />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-approval"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-approved"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsApproved />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-in-analysis"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsInAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="ongoing"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterOnGoing />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-done"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsDone />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects-paid"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <ProjectsPaid />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="refunds"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterRefund />
                </ProtectedRoute>
              }
            />
            <Route
              path="add-project"
              element={
                <ProtectedRoute allowedUserTypes={["master"]}>
                  <MasterAddProject />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            path="/company/master/project/:id"
            element={
              <ProtectedRoute allowedUserTypes={["master"]}>
                <ProjectDetails />
              </ProtectedRoute>
            }
          />

          {/* Rota de Pagamento - Protegida */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <UnreadCountProvider>
            <Elements stripe={stripePromise}>
              <AppContent />
            </Elements>
          </UnreadCountProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
