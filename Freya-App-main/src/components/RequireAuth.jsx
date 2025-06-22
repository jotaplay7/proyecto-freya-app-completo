// src/components/RequireAuth.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Navigate, useLocation } from 'react-router-dom';

const RequireAuth = ({ children }) => {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingStatus(false);
    });
    return () => unsubscribe();
  }, []);

  if (checkingStatus) {
    // Mientras determinamos si el usuario ya inició sesión
    return <div>Cargando...</div>;
  }

  if (!user) {
    // Si no está logueado, redirigir a /login. 
    // Con `state` guardamos a dónde quería acceder originalmente
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está logueado, mostrar el componente hijo
  return children;
};

export default RequireAuth;
