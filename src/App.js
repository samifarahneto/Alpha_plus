import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { UnreadCountProvider } from "./contexts/UnreadCountContext";
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

          {/* Rotas do Cliente */}
          <Route path="/client" element={<ClientProjects />} />
          <Route path="/client/projects" element={<ClientProjects />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/client/projects-budget" element={<ClientBudget />} />
          <Route
            path="/client/projects-budget-received"
            element={<ClientBudgetReady />}
          />
          <Route
            path="/client/projects-analysis"
            element={<ClientAnalysis />}
          />
          <Route
            path="/client/projects-done"
            element={<ClientProjectsDone />}
          />
          <Route
            path="/client/projects-paid"
            element={<ClientProjectsPaid />}
          />
          <Route path="/client/payments" element={<ClientPayments />} />
          <Route path="/client/going-on" element={<ClientGoingOn />} />
          <Route path="/client/projects-refund" element={<ClientRefund />} />
          <Route
            path="/client/projects-divergence"
            element={<ClientDivergence />}
          />
          <Route
            path="/client/projects/clientaddproject"
            element={<ClientAddProject />}
          />
          <Route
            path="/client/projects/:projectId"
            element={<ClienteProjectDetails />}
          />
          <Route path="/client/checkout" element={<CheckoutPage />} />
          <Route path="/client/payment-success" element={<PaymentSuccess />} />
          <Route path="/client/payment-error" element={<PaymentError />} />
          <Route
            path="/client/add-collaborator"
            element={
              <ProtectedRoute allowedUserTypes={["b2b", "b2c"]}>
                <AddCollaboratorColab />
              </ProtectedRoute>
            }
          />

          {/* Rotas do Master */}
          <Route
            path="/company/master/dashboard"
            element={<MasterDashboard />}
          />
          <Route
            path="/company/master/activity-logs"
            element={<ActivityLog />}
          />
          <Route path="/company/master/clients" element={<MasterClient />} />
          <Route
            path="/company/master/employees"
            element={<MasterEmployee />}
          />
          <Route path="/company/master" element={<MasterLayout />}>
            <Route index element={<MasterProjects />} />
            <Route path="projects" element={<MasterProjects />} />
            <Route path="projects-budget" element={<ProjectsBudget />} />
            <Route path="projects-approval" element={<ProjectsApproval />} />
            <Route path="projects-approved" element={<ProjectsApproved />} />
            <Route
              path="projects-in-analysis"
              element={<ProjectsInAnalysis />}
            />
            <Route path="ongoing" element={<MasterOnGoing />} />
            <Route path="projects-done" element={<ProjectsDone />} />
            <Route path="projects-paid" element={<ProjectsPaid />} />
            <Route path="payments" element={<MasterPayments />} />
          </Route>
          <Route
            path="/company/master/project/:id"
            element={<ProjectDetails />}
          />

          {/* Rota de Pagamento */}
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnreadCountProvider>
          <Elements stripe={stripePromise}>
            <AppContent />
          </Elements>
        </UnreadCountProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
