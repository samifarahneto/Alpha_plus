import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const useRouteProtection = () => {
  const { user, loading, canAccessRoute } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Não fazer verificação enquanto carrega
    if (loading) return;

    const currentPath = location.pathname;

    // Verificar se o usuário pode acessar a rota atual
    if (!canAccessRoute(currentPath)) {
      console.warn(`Tentativa de acesso não autorizado à rota: ${currentPath}`);

      if (!user) {
        // Usuário não autenticado - redirecionar para login
        navigate("/login", { replace: true });
      } else {
        // Usuário autenticado mas sem permissão - redirecionar para dashboard apropriado
        const userType = user.userType?.toLowerCase();
        if (userType === "master") {
          navigate("/company/master/dashboard", { replace: true });
        } else {
          navigate("/client/dashboard", { replace: true });
        }
      }
    }
  }, [user, loading, location.pathname, navigate, canAccessRoute]);

  return { user, loading };
};
