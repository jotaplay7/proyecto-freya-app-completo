// src/components/Register.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import Header_bn from "./Header_Bn"

import '../styles/bienvenida.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/'); // redirige a la ruta protegida (Notes)
    } catch (error) {
      alert('No se pudo registrar. Verifica los datos.');
      console.error(error);
    }
  };

  return (
    <>
    <Header_bn />
    <div className="login__container">
      <form onSubmit={handleRegister} className="login__form">
        <h2>Crear Cuenta</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit">Registrarme</button>
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="register__link">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
    </>
  );
};

export default Register;
