// useAuth es ahora un consumidor del AuthContext singleton (ver context/AuthContext.tsx).
// Se mantiene este módulo como punto de import estable: la firma pública es idéntica
// ({ user, isAuthenticated, isLoading, error, login, loginWithGoogle, registerWithGoogle, logout }).
// NO declarar estado de sesión aquí; el único dueño del estado es AuthProvider.
export { useAuth, getStoredUser } from '../context/AuthContext';
