import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import Apuntes from './components/Notes';
import Calificaciones from './components/Calificaciones';
import Recordatorios from './components/Recordatorios';
import Configuracion from './components/Configuracion';
import Register from './components/Register';
import RequireAuth from './components/RequireAuth';
import ResetPassword from './components/ResetPassword';
import Bienvenida from './components/Bienvenida';

function App() {
  const location = useLocation();
  const hiddenHeaderRoutes = ['/', '/register', '/reset-password', '/home', '/apuntes', '/calificaciones', '/recordatorios', '/configuracion'];

  return (
    <div>
      {!hiddenHeaderRoutes.includes(location.pathname) && <Header />}

      <Routes>
        <Route path="/" element={<Bienvenida />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/home"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/apuntes"
          element={
            <RequireAuth>
              <Apuntes />
            </RequireAuth>
          }
        />
        <Route
          path="/calificaciones"
          element={
            <RequireAuth>
              <Calificaciones />
            </RequireAuth>
          }
        />
        <Route
          path="/recordatorios"
          element={
            <RequireAuth>
              <Recordatorios />
            </RequireAuth>
          }
        />
        <Route
          path="/configuracion"
          element={
            <RequireAuth>
              <Configuracion />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
