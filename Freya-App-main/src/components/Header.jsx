/*
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/header.css';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDropdownRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Cerrar el menú si se hace click fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(event.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        <img className="header__logo__img" src={`${process.env.PUBLIC_URL}/ASSETS/Logo.png`} alt="Logo" />
        <h1 className="header__logo__title">Freya-App</h1>
      </Link>
      <ul className="header__links">
        <li><Link to="/home">📊 Inicio</Link></li>
        <li><Link to="/apuntes">📝 Apuntes</Link></li>
        <li><Link to="/calificaciones">🎯 Calificaciones</Link></li>
        <li><Link to="/recordatorios">⏰ Recordatorios</Link></li>
        <li><Link to="/configuracion">⚙️ Configuración</Link></li>
      </ul>
      <button
        className="header__menu"
        ref={menuButtonRef}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg
          className="header__menu__img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
        >
          <g>
            <path d="M480,224H32c-17.673,0-32,14.327-32,32s14.327,32,32,32h448c17.673,0,32-14.327,32-32S497.673,224,480,224z"/>
            <path d="M32,138.667h448c17.673,0,32-14.327,32-32s-14.327-32-32-32H32c-17.673,0-32,14.327-32,32S14.327,138.667,32,138.667z"/>
            <path d="M480,373.333H32c-17.673,0-32,14.327-32,32s14.327,32,32,32h448c17.673,0,32-14.327,32-32S497.673,373.333,480,373.333z"/>
          </g>
        </svg>
      </button>
      {menuOpen && (
        <nav className="header__menu-dropdown" ref={menuDropdownRef}>
          <ul>
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>📊 Inicio</Link>
            </li>
            <li>
              <Link to="/apuntes" onClick={() => setMenuOpen(false)}>📝 Apuntes</Link>
            </li>
            <li>
              <Link to="/calificaciones" onClick={() => setMenuOpen(false)}>🎯 Calificaciones</Link>
            </li>
            <li>
              <Link to="/recordatorios" onClick={() => setMenuOpen(false)}>⏰ Recordatorios</Link>
            </li>
            <li>
              <Link to="/configuracion" onClick={() => setMenuOpen(false)}>⚙️ Configuración</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
*/