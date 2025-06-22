import React, { useState } from 'react';
import { resetPassword } from '../firebase'; 
import '../styles/bienvenida.css';
import { useNavigate, Link } from 'react-router-dom';
import Header_bn from "./Header_Bn"

function ResetPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await resetPassword(email);
  };

  return (
    <>
    <Header_bn/>
    <div className="login__container">
      <h2 className='reset_title'>Recuperar contraseña</h2>
      <form className="login__form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo registrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Enviar enlace</button>
      </form>
              <p>
                ¿Ya tienes cuenta?{' '}
                <Link to="/" className="register__link">
                  Inicia sesión
                </Link>
              </p>
    </div>
    </>  
  );
}

export default ResetPassword;
