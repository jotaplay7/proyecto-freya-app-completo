import React, { useState, useEffect, useRef } from 'react';
import '../styles/calificaciones.css';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const materiasEjemplo = [
  {
    id: 1,
    nombre: 'Matemáticas',
    profesor: 'Dr. García',
    periodo: '2025-1',
    nota: 4.5,
    color: '#2563eb',
    extra: '#2563eb',
  },
  {
    id: 2,
    nombre: 'Física',
    profesor: 'Dra. Rodríguez',
    periodo: '2025-1',
    nota: 3.8,
    color: '#2563eb',
    extra: '#a259f7',
  },
  {
    id: 3,
    nombre: 'Programación',
    profesor: 'Ing. Martínez',
    periodo: '2025-1',
    nota: 4.9,
    color: '#2563eb',
    extra: '#22c55e',
  },
  {
    id: 4,
    nombre: 'Historia',
    profesor: 'Lic. Sánchez',
    periodo: '2025-1',
    nota: 2.7,
    color: '#2563eb',
    extra: '#facc15',
  },
];

function Calificaciones() {
  const [tab, setTab] = useState('resumen');
  const [materias, setMaterias] = useState(materiasEjemplo);
  const [editId, setEditId] = useState(null);
  const [modal, setModal] = useState({ open: false, materia: null });
  const [nuevo, setNuevo] = useState({ nombre: '', profesor: '', periodo: '2025-1', nota: '', color: '#2563eb', extra: '#2563eb' });
  const [error, setError] = useState('');
  const [modalCalc, setModalCalc] = useState(false);
  const [calcMateria, setCalcMateria] = useState('');
  const [calcPorcentaje, setCalcPorcentaje] = useState(30);
  const [calcResultado, setCalcResultado] = useState(null);
  const [calcError, setCalcError] = useState('');
  const [materiaSel, setMateriaSel] = useState(materias[0]?.id || 1);
  const [detalleNotas, setDetalleNotas] = useState({});
  const [modalNota, setModalNota] = useState(false);
  const [notaEdit, setNotaEdit] = useState({ id: null, nombre: '', nota: '' });
  const [errorNota, setErrorNota] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Simulación de usuario (puedes reemplazar por el real)
  const userName = 'Juan Pérez';
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

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
    const recordatoriosCollectionRef = collection(db, 'recordatorios');
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
  }, []);

  // Obtener año actual para el periodo
  const anioActual = new Date().getFullYear();

  const abrirEditar = (materia) => {
    setNuevo({ ...materia });
    setEditId(materia.id);
    setModal({ open: true, materia });
    setError('');
  };

  const abrirNueva = () => {
    setNuevo({ nombre: '', profesor: '', periodo: anioActual + '-1', nota: '', color: '#2563eb', extra: '#2563eb' });
    setEditId(null);
    setModal({ open: true, materia: null });
    setError('');
  };

  const guardarMateria = async () => {
    if (editId) {
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
    }
    if (!nuevo.nombre.trim() || !nuevo.profesor.trim() || !nuevo.periodo.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (editId) {
      setMaterias(materias.map(m => m.id === editId ? { ...nuevo, id: editId } : m));
      Swal.fire('¡Actualizado!', 'Materia modificada correctamente', 'success');
    } else {
      const nuevaMateria = { ...nuevo, id: Date.now() };
      setMaterias([nuevaMateria, ...materias]);
      setDetalleNotas(prev => ({ ...prev, [nuevaMateria.id]: [] }));
      Swal.fire('¡Éxito!', 'Materia agregada correctamente', 'success');
    }
    setModal({ open: false, materia: null });
    setEditId(null);
  };

  const eliminarMateria = async (id) => {
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
    setMaterias(materias.filter(m => m.id !== id));
    Swal.fire('Eliminado!', 'La materia ha sido eliminada.', 'success');
  };

  const abrirCalculadora = () => {
    setModalCalc(true);
    setCalcMateria('');
    setCalcResultado(null);
    setCalcError('');
  };

  const calcularAprobacion = () => {
    if (!calcMateria) {
      setCalcError('Selecciona una materia');
      setCalcResultado(null);
      return;
    }
    const materia = materias.find(m => m.id === Number(calcMateria));
    if (!materia) {
      setCalcError('Materia no encontrada');
      setCalcResultado(null);
      return;
    }
    // Buscar calificaciones de la materia seleccionada
    const notas = detalleNotas[materia.id] || [];
    if (notas.length === 0) {
      setCalcResultado('Agrega al menos una calificación para calcular.');
      setCalcError('');
      return;
    }
    // Calcular la nota necesaria en la próxima calificación para aprobar con 3.0
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    const n = notas.length;
    // (suma + x) / (n + 1) >= 3.0  =>  suma + x >= 3.0 * (n + 1)  =>  x >= 3.0 * (n + 1) - suma
    const necesaria = 3.0 * (n + 1) - suma;
    if (necesaria > 5) {
      setCalcResultado('No es posible aprobar con una sola calificación más.');
      setCalcError('');
      return;
    }
    // Siempre mostrar el cálculo, pero si la nota necesaria es menor que 0, mostrar 0.0
    const necesariaPositiva = necesaria < 0 ? 0 : necesaria;
    setCalcResultado(`Necesitas al menos un ${necesariaPositiva.toFixed(1)} en la próxima calificación para aprobar con 3.0.`);
    setCalcError('');
  };

  // Datos de ejemplo para detalle por materia (sin porcentaje)
  const detalleEjemplo = {
    1: [
      { id: 1, nombre: 'Parcial 1', nota: 4.2 },
      { id: 2, nombre: 'Parcial 2', nota: 4.5 },
      { id: 3, nombre: 'Proyecto Final', nota: 5.0 },
    ],
    2: [
      { id: 1, nombre: 'Parcial 1', nota: 3.5 },
      { id: 2, nombre: 'Parcial 2', nota: 4.0 },
    ],
    3: [
      { id: 1, nombre: 'Examen', nota: 4.9 },
    ],
    4: [
      { id: 1, nombre: 'Ensayo', nota: 2.7 },
    ],
  };

  // Calcular promedio simple de una materia
  const calcPromedioMateria = (notas) => {
    if (!notas.length) return null;
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    return (suma / notas.length).toFixed(1);
  };

  // Calcular promedio general solo con materias que tengan calificaciones
  const promediosMaterias = materias.map(m => {
    const notas = detalleNotas[m.id] || [];
    return calcPromedioMateria(notas);
  });
  const promediosValidos = promediosMaterias.filter(p => p !== null);
  const promedioGeneral = promediosValidos.length > 0 ? (promediosValidos.reduce((acc, p) => acc + Number(p), 0) / promediosValidos.length).toFixed(1) : '-';

  // Acciones para agregar/editar/eliminar calificación
  const abrirNuevaNota = () => {
    setNotaEdit({ id: null, nombre: '', nota: '' });
    setErrorNota('');
    setModalNota(true);
  };
  const abrirEditarNota = (nota) => {
    setNotaEdit({ ...nota });
    setErrorNota('');
    setModalNota(true);
  };
  const guardarNota = async () => {
    if (notaEdit.id) {
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
    }
    const notaNum = parseFloat(notaEdit.nota);
    if (!notaEdit.nombre.trim() || isNaN(notaNum) || notaNum < 0 || notaNum > 5) {
      setErrorNota('Completa todos los campos correctamente');
      return;
    }
    let nuevas = detalleNotas[materiaSel] ? [...detalleNotas[materiaSel]] : [];
    if (notaEdit.id) {
      nuevas = nuevas.map(n => n.id === notaEdit.id ? { ...notaEdit, nota: notaNum } : n);
      Swal.fire('¡Actualizado!', 'Calificación modificada correctamente', 'success');
    } else {
      nuevas.push({ ...notaEdit, id: Date.now(), nota: notaNum });
      Swal.fire('¡Éxito!', 'Calificación agregada correctamente', 'success');
    }
    setDetalleNotas({ ...detalleNotas, [materiaSel]: nuevas });
    setModalNota(false);
  };
  const eliminarNota = async (id) => {
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
    setDetalleNotas({ ...detalleNotas, [materiaSel]: detalleNotas[materiaSel].filter(n => n.id !== id) });
    Swal.fire('Eliminado!', 'La calificación ha sido eliminada.', 'success');
  };

  const handlePeriodoChange = (e) => {
    const [anio, ] = nuevo.periodo.split('-');
    setNuevo({ ...nuevo, periodo: anio + '-' + e.target.value });
  };
  const handleAnioChange = (e) => {
    const [, periodo] = nuevo.periodo.split('-');
    setNuevo({ ...nuevo, periodo: e.target.value + '-' + (periodo || '1') });
  };

  // Inicializar detalleNotas con los datos de ejemplo
  useEffect(() => {
    setDetalleNotas(detalleEjemplo);
  }, []);

  // Cerrar el menú si se hace click fuera de él
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

  // Función para obtener color de barra según promedio
  const getColorBarra = (prom) => {
    if (prom === null) return '#e5e7eb'; // gris si no hay nota
    const p = Number(prom);
    if (p >= 0 && p <= 1) return '#ef4444'; // rojo
    if (p > 1 && p < 2) return '#f97316'; // naranja
    if (p >= 2 && p < 3) return '#facc15'; // amarillo
    if (p >= 3 && p <= 4) return '#4ade80'; // verde claro
    if (p > 4 && p <= 5) return '#059669'; // verde oscuro
    return '#e5e7eb';
  };

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
        {/* Contenido principal */}
        <div className="calificaciones-dashboard__container">
          <div className="calificaciones-dashboard__topbar">
            <div>
              <h1 className="calificaciones-dashboard__title">Calificaciones</h1>
              <p className="calificaciones-dashboard__subtitle">Gestiona tus calificaciones por materia</p>
            </div>
            <div className="calificaciones-dashboard__actions">
              <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={abrirNueva}>+ Nueva Materia</button>
              <button className="calificaciones-dashboard__btn" onClick={abrirCalculadora}>📅 Calculadora de Aprobación</button>
            </div>
          </div>
          {/* Tabs */}
          <div className="calificaciones-dashboard__tabs">
            <button className={tab === 'resumen' ? 'tab active' : 'tab'} onClick={()=>setTab('resumen')}>Resumen</button>
            <button className={tab === 'detalle' ? 'tab active' : 'tab'} onClick={()=>setTab('detalle')}>Detalle por Materia</button>
          </div>
          {/* Resumen */}
          {tab === 'resumen' && (
            <>
              <div className="calificaciones-dashboard__promedio-card">
                <div className="calificaciones-dashboard__promedio-title">Promedio General</div>
                <div className="calificaciones-dashboard__promedio-desc">Tu promedio general de todas las materias</div>
                <div className="calificaciones-dashboard__promedio-valor">{promedioGeneral}</div>
                <div className="calificaciones-dashboard__promedio-bar-bg">
                  <div className="calificaciones-dashboard__promedio-bar" style={{width: `${(promedioGeneral/5)*100}%`}}></div>
                </div>
                <div className="calificaciones-dashboard__promedio-max">de 5.0</div>
              </div>
              <div className="calificaciones-dashboard__materias-grid">
                {materias.map((m, i) => (
                  <div className="calificaciones-dashboard__materia-card" key={m.id}>
                    <div className="calificaciones-dashboard__materia-header">
                      <div className="calificaciones-dashboard__materia-title">{m.nombre}</div>
                    </div>
                    <div className="calificaciones-dashboard__materia-prof">{m.profesor} • {m.periodo}</div>
                    <div className="calificaciones-dashboard__materia-nota">{(() => {
                      const notas = detalleNotas[m.id] || [];
                      const prom = calcPromedioMateria(notas);
                      return prom !== null ? prom : '-';
                    })()}</div>
                    <div className="calificaciones-dashboard__materia-bar-bg">
                      {(() => {
                        const notas = detalleNotas[m.id] || [];
                        const prom = calcPromedioMateria(notas);
                        const color = getColorBarra(prom);
                        const ancho = prom !== null ? (Number(prom)/5)*100 : 0;
                        return <div className="calificaciones-dashboard__materia-bar" style={{width: `${ancho}%`, background: color}}></div>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Detalle por Materia */}
          {tab === 'detalle' && (
            <div className="detalle-materias__grid">
              {/* Panel izquierdo: lista de materias */}
              <div className="detalle-materias__list">
                <div className="detalle-materias__list-title">Materias</div>
                {materias.map((m, i) => (
                  <div
                    key={m.id}
                    className={`detalle-materias__item${materiaSel === m.id ? ' active' : ''}`}
                    onClick={()=>setMateriaSel(m.id)}
                  >
                    <span className="detalle-materias__dot" style={{background: ["#2563eb", "#a259f7", "#22c55e", "#facc15"][i%4]}}></span>
                    {m.nombre}
                  </div>
                ))}
              </div>
              {/* Panel derecho: detalle de la materia seleccionada */}
              <div className="detalle-materias__detail">
                {(() => {
                  const m = materias.find(x => x.id === materiaSel);
                  const notas = detalleNotas[materiaSel] || [];
                  return m ? (
                    <>
                      <div className="detalle-materias__detail-header">
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                          <div>
                            <div className="detalle-materias__detail-title">{m.nombre}</div>
                            <div className="detalle-materias__detail-prof">{m.profesor} • {m.periodo}</div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <span title="Editar" style={{cursor:'pointer', fontSize:'1.15rem'}} onClick={()=>abrirEditar(m)}>✏️</span>
                            <span title="Eliminar" style={{cursor:'pointer', fontSize:'1.15rem'}} onClick={()=>eliminarMateria(m.id)}>🗑️</span>
                            <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={abrirNuevaNota} style={{marginLeft:12}}>+ Nueva Calificación</button>
                          </div>
                        </div>
                      </div>
                      <div className="detalle-materias__detail-nota">{calcPromedioMateria(notas)}</div>
                      <div className="detalle-materias__detail-bar-bg">
                        <div className="detalle-materias__detail-bar" style={{width: `${(calcPromedioMateria(notas)/5)*100}%`}}></div>
                      </div>
                      <table className="detalle-materias__table">
                        <thead>
                          <tr>
                            <th>Evaluación</th>
                            <th>Calificación</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notas.map(n => (
                            <tr key={n.id}>
                              <td>{n.nombre}</td>
                              <td>{Number(n.nota).toFixed(1)}</td>
                              <td>
                                <span style={{cursor:'pointer', marginRight:8}} title="Editar" onClick={()=>abrirEditarNota(n)}>✏️</span>
                                <span style={{cursor:'pointer'}} title="Eliminar" onClick={()=>eliminarNota(n.id)}>🗑️</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : null;
                })()}
                {/* Modal para agregar/editar calificación */}
                {modalNota && (
                  <div className="calificaciones-dashboard__modal-bg" onClick={()=>setModalNota(false)}>
                    <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
                      <h2>{notaEdit.id ? 'Editar Calificación' : 'Nueva Calificación'}</h2>
                      <input className="calificaciones-dashboard__input" type="text" placeholder="Nombre de la evaluación" value={notaEdit.nombre} onChange={e=>setNotaEdit({...notaEdit, nombre:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                      <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{notaEdit.nombre.length}/60</div>
                      <input className="calificaciones-dashboard__input" type="number" placeholder="Nota (0-5)" value={notaEdit.nota} onChange={e=>setNotaEdit({...notaEdit, nota:e.target.value})} min={0} max={5} step={0.1} style={{marginBottom:10, width:'100%'}} />
                      {errorNota && <div style={{color:'#ef4444', marginBottom:8}}>{errorNota}</div>}
                      <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end'}}>
                        <button className="calificaciones-dashboard__btn" onClick={()=>setModalNota(false)}>Cancelar</button>
                        <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={guardarNota}>Guardar</button>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
            </div>
          )}
          {/* Modal Nueva/Editar Materia */}
          {modal.open && (
            <div className="calificaciones-dashboard__modal-bg" onClick={()=>{setModal({open:false, materia:null}); setEditId(null);}}>
              <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()}>
                <h2>{editId ? 'Editar Materia' : 'Nueva Materia'}</h2>
                <input className="calificaciones-dashboard__input" type="text" placeholder="Nombre" value={nuevo.nombre} onChange={e=>setNuevo({...nuevo, nombre:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{nuevo.nombre.length}/60</div>

                <input className="calificaciones-dashboard__input" type="text" placeholder="Profesor" value={nuevo.profesor} onChange={e=>setNuevo({...nuevo, profesor:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{nuevo.profesor.length}/60</div>
                <div style={{display:'flex', gap:8, marginBottom:10, width:'100%'}}>
                  <input className="calificaciones-dashboard__input" type="number" min={2000} max={2100} value={nuevo.periodo.split('-')[0]} onChange={handleAnioChange} style={{width:'60%', minWidth:90}} placeholder="Año" />
                  <select className="calificaciones-dashboard__input" value={nuevo.periodo.split('-')[1]} onChange={handlePeriodoChange} style={{width:'40%', minWidth:60}}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                {error && <div style={{color:'#ef4444', marginBottom:8}}>{error}</div>}
                <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end'}}>
                  <button className="calificaciones-dashboard__btn" onClick={()=>{setModal({open:false, materia:null}); setEditId(null);}}>Cancelar</button>
                  <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={guardarMateria}>Guardar</button>
                </div>
              </div>
            </div>
          )}
          {/* Modal Calculadora de Aprobación */}
          {modalCalc && (
            <div className="calificaciones-dashboard__modal-bg" onClick={()=>setModalCalc(false)}>
              <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <div>
                    <h2 style={{marginBottom:0}}>Calculadora de Aprobación</h2>
                    <div style={{color:'#64748b', fontSize:'1rem', marginBottom:18}}>Calcula la calificación mínima que necesitas en tu próxima evaluación para aprobar la materia con 3.0</div>
            </div>
                  <span style={{cursor:'pointer', fontSize:22, color:'#888'}} onClick={()=>setModalCalc(false)}>✕</span>
          </div>
                <div style={{marginBottom:14, width:'100%'}}>
                  <label style={{fontWeight:500, color:'#222'}}>Materia</label>
                  <select className="calificaciones-dashboard__input" style={{width:'100%', marginTop:4}} value={calcMateria} onChange={e=>setCalcMateria(e.target.value)}>
                    <option value="">Selecciona una materia</option>
                    {materias.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
      </div>
                {calcError && <div style={{color:'#ef4444', marginBottom:8}}>{calcError}</div>}
                {calcResultado && <div style={{color:'#2563eb', fontWeight:500, marginBottom:8}}>{calcResultado}</div>}
                <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end', marginTop:8}}>
                  <button className="calificaciones-dashboard__btn" onClick={()=>setModalCalc(false)}>Cerrar</button>
                  <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={calcularAprobacion}>Calcular</button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default Calificaciones;



