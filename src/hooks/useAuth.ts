import { useAuth as useAuthContext } from '../contexts/AuthContext';

// Hook reutilizable que envuelve AuthContext
export const useAuth = () => {
  const { user, loading, login, logout } = useAuthContext();

  // Podrías agregar lógica adicional aquí si quieres, ej. roles
  const isAdmin = user?.rol === 'ADMIN';
  const isDocente = user?.rol === 'DOCENTE';

  return { user, loading, login, logout, isAdmin, isDocente };
};
