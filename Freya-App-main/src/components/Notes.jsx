// src/components/Notes.jsx
import React, { useState, useRef, useEffect } from 'react';
import "../styles/apuntes.css";
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const coloresCards = [
  { color: "#e3f0ff", border: "#90c2fa" },
  { color: "#f3e8ff", border: "#d1aaff" },
  { color: "#e6fbe8", border: "#8be9a7" },
  { color: "#fffbe6", border: "#ffe066" },
  { color: "#ffe6e6", border: "#ffb3b3" }
];

// const iniciales = [ ... ]; // (puedes dejarlo comentado o eliminarlo si ya no se usa)

const Notes = () => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ open: false, apunte: null });
  const [notes, setNotes] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({
    titulo: "",
    materia: "",
    fecha: new Date().toLocaleDateString(),
    contenido: "",
    color: coloresCards[notes.length % coloresCards.length].color,
    border: coloresCards[notes.length % coloresCards.length].border,
    fechaCreacion: new Date().toLocaleDateString()
  });
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [colorPicker, setColorPicker] = useState({ show: false, id: null, x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // -------------------- Sincronizar apuntes con Firestore en tiempo real --------------------
  useEffect(() => {
    if (!userId) return;
    const apuntesRef = collection(db, 'usuarios', userId, 'apuntes');
    const unsubscribe = onSnapshot(apuntesRef, (snapshot) => {
      const apuntesFS = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setNotes(apuntesFS);
    });
    return () => unsubscribe();
  }, [userId]);

  // Función auxiliar para convertir fecha de Firestore a objeto Date de JS
  const convertFirestoreDate = (dateValue) => {
    if (!dateValue) return null;
    if (typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };

  useEffect(() => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    const unsubscribe = onSnapshot(recordatoriosCollectionRef, (snapshot) => {
      const recordatorios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const ahora = new Date();
      const notificacionesActivas = recordatorios.filter(r => {
        if (r.completado) return false;
        const fechaRecordatorio = convertFirestoreDate(r.fecha);
        return fechaRecordatorio instanceof Date && fechaRecordatorio <= ahora;
      });
      setNotificacionesCount(notificacionesActivas.length);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleMenuClick = (option) => {
    setMenuOpen(false);
    if (option === 'perfil') navigate('/configuracion?tab=perfil');
    if (option === 'configuracion') navigate('/configuracion');
    if (option === 'logout') navigate('/');
  };

  const filtered = notes.filter(a =>
    a.titulo.toLowerCase().includes(search.toLowerCase()) ||
    a.materia.toLowerCase().includes(search.toLowerCase()) ||
    a.contenido.toLowerCase().includes(search.toLowerCase())
  );

  const abrirNuevo = () => {
    setNuevo({
      titulo: "",
      materia: "",
      fecha: new Date().toLocaleDateString(),
      contenido: "",
      color: coloresCards[notes.length % coloresCards.length].color,
      border: coloresCards[notes.length % coloresCards.length].border,
      fechaCreacion: new Date().toLocaleDateString()
    });
    setError("");
    setEditId(null);
    setModalNuevo(true);
  };

  const abrirEditar = (apunte) => {
    setNuevo({
      titulo: apunte.titulo,
      materia: apunte.materia,
      fecha: apunte.fecha,
      contenido: apunte.contenido,
      color: apunte.color,
      border: apunte.border,
      fechaCreacion: apunte.fechaCreacion || new Date().toLocaleDateString()
    });
    setEditId(apunte.id);
    setError("");
    setModalNuevo(true);
  };

  // -------------------- Guardar o eliminar apuntes (Firestore) --------------------
  const guardarNuevo = async () => {
    if (!userId) {
      setError('Usuario no autenticado');
      return;
    }
    if (!nuevo.titulo.trim() || !nuevo.materia.trim() || !nuevo.contenido.trim()) {
      setError("Completa todos los campos");
      return;
    }
    const apuntesRef = collection(db, 'usuarios', userId, 'apuntes');
    if (editId) {
      // Mensaje de confirmación antes de guardar cambios editados
      const result = await Swal.fire({
        title: '¿Deseas guardar los cambios?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#d33',
        reverseButtons: true
      });
      if (!result.isConfirmed) return;
      await setDoc(doc(apuntesRef, String(editId)), { ...nuevo });
      Swal.fire('¡Actualizado!', 'Apunte modificado correctamente', 'success');
    } else {
      await addDoc(apuntesRef, { ...nuevo });
      Swal.fire('¡Éxito!', 'Apunte agregado correctamente', 'success');
    }
    setModalNuevo(false);
    setEditId(null);
  };
  const eliminarApunte = async (id) => {
    if (!userId) return;
    const result = await Swal.fire({
      title: '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2563eb',
      reverseButtons: false
    });
    if (!result.isConfirmed) return;
    await deleteDoc(doc(db, 'usuarios', userId, 'apuntes', String(id)));
    Swal.fire('Eliminado!', 'El apunte ha sido eliminado.', 'success');
  };

  const abrirColorPicker = (id, e) => {
    const rect = e.target.getBoundingClientRect();
    setColorPicker({ show: true, id, x: rect.left, y: rect.bottom });
  };

  const cambiarColor = (id, color, border) => {
    if (!userId) return;
    setDoc(doc(db, 'usuarios', userId, 'apuntes', String(id)), { ...notes.find(n => n.id === id), color, border });
    setColorPicker({ show: false, id: null, x: 0, y: 0 });
  };

  // Obtener el nombre real del usuario desde Firestore
  useEffect(() => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    const unsubscribe = onSnapshot(perfilRef, (docSnap) => {
      const data = docSnap.data();
      let nombre = data?.profileData?.nombre || '';
      if (nombre) nombre = nombre.trim().split(' ')[0];
      setUserName(nombre || 'Usuario');
    });
    return () => unsubscribe();
  }, [userId]);
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

  return (
    <div className="dashboard__container">
      {/* Sidebar */}
      <aside className="dashboard__sidebar">
        <div className="sidebar__logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={process.env.PUBLIC_URL + "/ASSETS/freya_logo.svg"} alt="Logo Freya" style={{ width: 32, height: 32 }} />
          Freya-app
        </div>
        <nav className="sidebar__nav">
          <a onClick={() => navigate('/home')} className={`sidebar__item ${location.pathname === '/home' ? 'active' : ''}`}><span role="img" aria-label="Inicio">📊</span> Inicio</a>
          <a onClick={() => navigate('/apuntes')} className={`sidebar__item ${location.pathname === '/apuntes' ? 'active' : ''}`}><span role="img" aria-label="Apuntes">📝</span> Apuntes</a>
          <a onClick={() => navigate('/calificaciones')} className={`sidebar__item ${location.pathname === '/calificaciones' ? 'active' : ''}`}><span role="img" aria-label="Calificaciones">🎯</span> Calificaciones</a>
          <a onClick={() => navigate('/recordatorios')} className={`sidebar__item ${location.pathname === '/recordatorios' ? 'active' : ''}`}><span role="img" aria-label="Recordatorios">⏰</span> Recordatorios</a>
          <a onClick={() => navigate('/configuracion')} className={`sidebar__item ${location.pathname.startsWith('/configuracion') ? 'active' : ''}`}><span role="img" aria-label="Configuración">⚙️</span> Configuración</a>
        </nav>
      </aside>
      {/* Main */}
      <div className="dashboard__main">
        {/* Header */}
        <header className="dashboard__header">
          <div></div>
          <div className="header__right">
            <span
              className="header__icon"
              style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
              onClick={() => navigate('/recordatorios')}
            >
              🔔
              {notificacionesCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid white',
                    zIndex: 1
                  }}
                >
                  {notificacionesCount > 99 ? '99+' : notificacionesCount}
                </span>
              )}
            </span>
            <span
              className="header__user"
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => setMenuOpen((v) => !v)}
              ref={userMenuRef}
            >
              {userInitial}
              {menuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-title">Mi cuenta</div>
                  <button className="user-menu-item" onClick={() => handleMenuClick('perfil')}>Perfil</button>
                  <button className="user-menu-item" onClick={() => handleMenuClick('configuracion')}>Configuración</button>
                  <button className="user-menu-item logout" onClick={() => handleMenuClick('logout')}>Cerrar sesión</button>
                </div>
              )}
            </span>
          </div>
        </header>
        {/* Contenido principal de apuntes */}
        <div className="notes-dashboard__container">
          {/* Barra superior */}
          <div className="notes-dashboard__topbar">
            <div>
              <h1 className="notes-dashboard__title">Mis Apuntes</h1>
              <p className="notes-dashboard__subtitle">Gestiona tus notas y apuntes de clase</p>
            </div>
            <div className="notes-dashboard__actions">
              <button className="notes-dashboard__btn notes-dashboard__btn--primary" onClick={abrirNuevo}>+ Nuevo Apunte</button>
            </div>
          </div>
          {/* Buscador */}
          <div className="notes-dashboard__searchbar">
            <input
              type="text"
              placeholder="Buscar en tus apuntes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Cards */}
          <div className="notes-dashboard__cards">
            {filtered.map(apunte => (
              <div
                className="notes-dashboard__card"
                key={apunte.id}
                style={{ background: apunte.color, borderColor: apunte.border, position: 'relative' }}
              >
                <div className="notes-dashboard__card-header">
                  <div>
                    <div className="notes-dashboard__card-title" title={apunte.titulo}>{apunte.titulo}</div>
                    <div className="notes-dashboard__card-meta">
                      {apunte.materia}
                      <br />
                      <span style={{fontSize:'0.93em', color:'#64748b'}}>Creado: {apunte.fechaCreacion}</span>
                    </div>
                  </div>
                  <div className="notes-dashboard__card-icons">
                    <span title="Cambiar color" style={{cursor:'pointer'}} onClick={e => abrirColorPicker(apunte.id, e)}>🎨</span>
                    <span title="Editar" style={{cursor:'pointer'}} onClick={() => abrirEditar(apunte)}>✏️</span>
                    <span title="Eliminar" style={{cursor:'pointer'}} onClick={() => eliminarApunte(apunte.id)}>🗑️</span>
                  </div>
                </div>
                <div className="notes-dashboard__card-content">
                  {apunte.contenido.length > 100 ? apunte.contenido.slice(0, 100) + "..." : apunte.contenido}
                </div>
                <button className="notes-dashboard__card-btn" onClick={() => setModal({ open: true, apunte })}>
                  Ver completo
                </button>
                {/* Paleta de colores */}
                {colorPicker.show && colorPicker.id === apunte.id && (
                  <div className="notes-dashboard__color-picker" style={{position:'absolute', top:40, right:10, zIndex:10, background:'#fff', borderRadius:8, boxShadow:'0 2px 8px rgba(60,60,120,0.13)', padding:'8px 10px', display:'flex', gap:8}}>
                    {coloresCards.map((c, i) => (
                      <span key={i} style={{display:'inline-block', width:22, height:22, borderRadius:'50%', background:c.color, border:`2px solid ${c.border}`, cursor:'pointer'}} onClick={()=>cambiarColor(apunte.id, c.color, c.border)}></span>
                    ))}
                    <span style={{marginLeft:4, cursor:'pointer', color:'#888', fontSize:18}} onClick={()=>setColorPicker({show:false, id:null, x:0, y:0})}>✕</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Modal Ver completo */}
          {modal.open && (
            <div className="notes-dashboard__modal-bg" onClick={() => setModal({ open: false, apunte: null })}>
              <div className="notes-dashboard__modal" onClick={e => e.stopPropagation()}>
                <h2>{modal.apunte.titulo}</h2>
                <div className="notes-dashboard__card-meta" style={{marginBottom:12}}>
                  {modal.apunte.materia} • {modal.apunte.fecha}
                </div>
                <div className="notes-dashboard__modal-content">{modal.apunte.contenido}</div>
                <button className="notes-dashboard__btn notes-dashboard__btn--primary" style={{marginTop:24}} onClick={() => setModal({ open: false, apunte: null })}>Cerrar</button>
              </div>
            </div>
          )}
          {/* Modal Nuevo/Editar Apunte */}
          {modalNuevo && (
            <div className="notes-dashboard__modal-bg" onClick={() => {setModalNuevo(false); setEditId(null);}}>
              <div className="notes-dashboard__modal" onClick={e => e.stopPropagation()} style={{maxWidth:440, width:'100%'}}>
                <h2 style={{fontWeight:700, fontSize:'1.35rem', marginBottom:18, color:'#2563eb'}}>{editId ? 'Editar Apunte' : 'Nuevo Apunte'}</h2>
                <form className="notes-dashboard__modal-form" autoComplete="off" onSubmit={e => {e.preventDefault(); guardarNuevo();}} style={{width:'100%'}}>
                  <div style={{marginBottom:16}}>
                    <label htmlFor="titulo" style={{fontWeight:500, color:'#374151', fontSize:'1rem', marginBottom:4, display:'block'}}>Título</label>
                    <input
                      id="titulo"
                      className="notes-dashboard__input"
                      type="text"
                      placeholder="Título del apunte"
                      value={nuevo.titulo}
                      onChange={e => setNuevo({ ...nuevo, titulo: e.target.value })}
                      style={{marginBottom:0, width:'100%'}}
                      maxLength={100}
                    />
                    <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, textAlign:'right'}}>{nuevo.titulo.length}/100</div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label htmlFor="materia" style={{fontWeight:500, color:'#374151', fontSize:'1rem', marginBottom:4, display:'block'}}>Materia</label>
                    <input
                      id="materia"
                      className="notes-dashboard__input"
                      type="text"
                      placeholder="Materia"
                      value={nuevo.materia}
                      onChange={e => setNuevo({ ...nuevo, materia: e.target.value })}
                      style={{marginBottom:0, width:'100%'}}
                      maxLength={60}
                    />
                    <div style={{fontSize:'0.92em', color:'#64748b', textAlign:'right'}}>{nuevo.materia.length}/60</div>
                  </div>
                  <div style={{marginBottom:18}}>
                    <label htmlFor="contenido" style={{fontWeight:500, color:'#374151', fontSize:'1rem', marginBottom:4, display:'block'}}>Contenido</label>
                    <textarea
                      id="contenido"
                      className="notes-dashboard__input"
                      placeholder="Escribe aquí el contenido del apunte..."
                      value={nuevo.contenido}
                      onChange={e => setNuevo({ ...nuevo, contenido: e.target.value })}
                      style={{marginBottom:0, width:'100%', minHeight:90, resize:'vertical'}}
                      maxLength={10000}
                    />
                    <div style={{fontSize:'0.92em', color:'#64748b', textAlign:'right'}}>{nuevo.contenido.length}/10000</div>
                  </div>
                  {error && <div style={{color:'#ef4444', marginBottom:10, fontWeight:500}}>{error}</div>}
                  <div style={{display:'flex', gap:12, width:'100%', justifyContent:'flex-end', marginTop:8}}>
                    <button type="button" className="notes-dashboard__btn" onClick={()=>{setModalNuevo(false); setEditId(null);}}>Cancelar</button>
                    <button type="submit" className="notes-dashboard__btn notes-dashboard__btn--primary">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
