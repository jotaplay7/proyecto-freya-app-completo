import React, { useState, useRef, useEffect } from 'react';
import "../styles/home.css";
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import menu from "../ASSETS/menu-hamburguesa.png"
// Puedes instalar react-icons si lo deseas, aquí uso emojis para simplicidad

// Datos de resumen para las tarjetas principales
const resumen = [
  { titulo: 'Promedio General', valor: '4.0', desc: '', icon: '🎓' },
  { titulo: 'Materias Cursando', valor: 6, desc: 'Semestre actual', icon: '📄' },
  { titulo: 'Notificaciones', valor: 0, desc: 'Sin leer', icon: '🔔', dynamic: true },
];

// Recomendaciones para las tarjetas
const recomendaciones = [
  {
    icono: '🗓️',
    color: '#e3f0ff',
    iconBg: '#2563eb',
    titulo: 'Planifica tu semana',
    texto: 'Organiza tus actividades académicas al comenzar la semana. La claridad evita el estrés.',
    pie: 'Recomendado para ti'
  },
  {
    icono: '⏳',
    color: '#e6fbe8',
    iconBg: '#22c55e',
    titulo: 'Estudia por bloques de tiempo',
    texto: 'Estudiar en sesiones cortas y enfocadas mejora la concentración y retención.',
    pie: 'Mejora tu enfoque'
  },
  {
    icono: '🛌',
    color: '#f3e8ff',
    iconBg: '#a259f7',
    titulo: 'Respeta tus horas de sueño',
    texto: 'Dormir bien potencia la memoria, el estado de ánimo y el rendimiento.',
    pie: 'Tip científico'
  },
  {
    icono: '🎯',
    color: '#fffbe6',
    iconBg: '#facc15',
    titulo: 'Fija metas diarias',
    texto: 'Establecer pequeños objetivos diarios te mantiene motivado y enfocado.',
    pie: 'Motivación diaria'
  },
  {
    icono: '🔁',
    color: '#e6fbe8',
    iconBg: '#22c55e',
    titulo: 'Repasa con frecuencia',
    texto: 'El repaso constante es más efectivo que estudiar todo de una vez al final.',
    pie: 'Aprendizaje efectivo'
  },
  {
    icono: '🥗',
    color: '#ffe6e6',
    iconBg: '#ffb3b3',
    titulo: 'Aliméntate bien e hidrátate',
    texto: 'Una mente activa necesita energía y agua. Tu cuerpo también estudia contigo.',
    pie: 'Salud y energía'
  },
  {
    icono: '🧑‍🤝‍🧑',
    color: '#e3f0ff',
    iconBg: '#2563eb',
    titulo: 'Estudiar acompañado ayuda',
    texto: 'Compartir conocimientos con otros mejora la comprensión y la memoria.',
    pie: 'Aprende en grupo'
  },
  {
    icono: '🚫📱',
    color: '#f3e8ff',
    iconBg: '#a259f7',
    titulo: 'Reduce las distracciones',
    texto: 'Aleja el celular y redes sociales mientras estudias. Tu enfoque lo agradecerá.',
    pie: 'Concéntrate mejor'
  }
];

// Colores RYB para identificar materias
const coloresRYB = [
  '#ff0000', // rojo
  '#ff8000', // naranja
  '#ffff00', // amarillo
  '#80ff00', // amarillo verdoso
  '#00ff00', // verde
  '#00ff80', // verde azulado
  '#00ffff', // cian
  '#0080ff', // azul
  '#0000ff', // azul puro
  '#8000ff', // violeta
  '#ff00ff', // magenta
  '#ff0080'  // rosa
];

const Home = () => {
  // Manejo la pestaña activa
  const [tab, setTab] = useState('calificaciones');
  // Estado del menú de usuario
  const [menuOpen, setMenuOpen] = useState(false);
  // Número de notificaciones activas
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  // Referencia para cerrar el menú de usuario al hacer click fuera
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Nombre del usuario autenticado
  const [userName, setUserName] = useState('');
  // Índice para el carrusel de recomendaciones
  const [recomendacionIndex, setRecomendacionIndex] = useState(0);
  // Número de tarjetas visibles en el carrusel
  const recomendacionesVisibles = 3; // Se muestran 3 tarjetas a la vez
  // Total de páginas para el carrusel
  const totalPaginas = recomendaciones.length - recomendacionesVisibles + 1; // Cambio en el cálculo para movimiento de una en una
  // Fecha seleccionada en el calendario
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  // Fechas que tienen recordatorios para marcarlas en el calendario
  const [fechasConRecordatorios, setFechasConRecordatorios] = useState([]);

  // -------------------- Usuario autenticado --------------------
  // Guardo el ID del usuario autenticado
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    // Escucho cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Obtengo el nombre real del usuario desde Firestore
  useEffect(() => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    const unsubscribe = onSnapshot(perfilRef, (docSnap) => {
      const data = docSnap.data();
      let nombre = data?.profileData?.nombre || '';
      // Solo el primer nombre
      if (nombre) nombre = nombre.trim().split(' ')[0];
      setUserName(nombre || 'Usuario');
    });
    return () => unsubscribe();
  }, [userId]);

  // -------------------- Materias y notas desde Firestore --------------------
  // Lista de materias del usuario
  const [materias, setMaterias] = useState([]);
  // Notas por materia (diccionario)
  const [detalleNotas, setDetalleNotas] = useState({});
  useEffect(() => {
    if (!userId) return;
    const materiasRef = collection(db, 'usuarios', userId, 'materias');
    // Listener de materias
    const unsubscribeMaterias = onSnapshot(materiasRef, (snapshot) => {
      const materiasFS = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMaterias(materiasFS);
      // Listeners de notas por cada materia
      const unsubNotas = {};
      materiasFS.forEach(materia => {
        const notasRef = collection(db, 'usuarios', userId, 'materias', materia.id, 'notas');
        unsubNotas[materia.id] = onSnapshot(notasRef, (notasSnap) => {
          setDetalleNotas(prev => ({
            ...prev,
            [materia.id]: notasSnap.docs.map(n => ({ id: n.id, ...n.data() }))
          }));
        });
      });
      // Limpiar listeners de notas al desmontar o cambiar materias
      return () => {
        Object.values(unsubNotas).forEach(unsub => unsub && unsub());
      };
    });
    return () => unsubscribeMaterias();
  }, [userId]);

  // Función auxiliar para convertir fecha de Firestore a objeto Date de JS
  const convertFirestoreDate = (dateValue) => {
    if (!dateValue) return null;
    // Si es un objeto Timestamp de Firestore
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    // Si es un string (formato ISO)
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      // Verificar que el string se haya podido convertir a una fecha válida
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null; // Devolver null si el formato no es reconocido
  };

  // Efecto para obtener las notificaciones activas
  useEffect(() => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    const unsubscribe = onSnapshot(recordatoriosCollectionRef, (snapshot) => {
      const recordatorios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Calcular notificaciones activas: recordatorios pendientes cuya fecha y hora ya han pasado
      const ahora = new Date();
      const notificacionesActivas = recordatorios.filter(r => {
        if (r.completado) return false; // Solo recordatorios no completados
        const fechaRecordatorio = convertFirestoreDate(r.fecha);
        return fechaRecordatorio instanceof Date && fechaRecordatorio <= ahora;
      });
      setNotificacionesCount(notificacionesActivas.length);
      const fechas = recordatorios
        .filter(r => !r.completado) // Filtrar solo los no completados
        .map(r => convertFirestoreDate(r.fecha))
        .filter(fecha => fecha instanceof Date);
      setFechasConRecordatorios(fechas);
    });
    return () => unsubscribe();
  }, [userId]);

  // Efecto para el carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setRecomendacionIndex((prev) => {
        if (prev >= totalPaginas - 1) {
          return 0; // Volver al inicio cuando llegue al final
        }
        return prev + 1;
      });
    }, 7000); // 7 segundos

    return () => clearInterval(interval);
  }, [totalPaginas]);

  // Función para calcular promedio simple de una materia
  const calcPromedioMateria = (notas) => {
    if (!notas || !notas.length) return null;
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    return parseFloat((suma / notas.length).toFixed(1));
  };

  // Prepara los datos para la gráfica
  const materiasOrdenadas = [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  const datosGrafica = materiasOrdenadas.map((materia) => {
    const notas = detalleNotas[materia.id] || [];
    const promedio = calcPromedioMateria(notas);
    return {
      ...materia,
      nota: promedio,
      color: materia.color,
    };
  });

  // Componente personalizado para los ticks del eje X de la gráfica
  const CustomXAxisTick = ({ x, y, payload }) => {
    if (!payload || !payload.value) return null;
    const materia = datosGrafica.find(m => m.nombre === payload.value);
    const color = materia ? materia.color : '#ccc';

    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-60} y={5} width={120} height={22}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: color,
              flexShrink: 0
            }}></span>
            <span style={{ color: '#666', fontSize: '14px', whiteSpace: 'nowrap' }}>{payload.value}</span>
          </div>
        </foreignObject>
      </g>
    );
  };

  // Función para obtener color de barra según la nota (escala 1-10)
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

  // Cierro el menú si se hace click fuera de él
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

  // Manejo las opciones del menú de usuario
  const handleMenuClick = (option) => {
    setMenuOpen(false);
    if (option === 'perfil') navigate('/configuracion?tab=perfil');
    if (option === 'configuracion') navigate('/configuracion');
    if (option === 'logout') navigate('/');
  };

  // Configuración para el calendario
  const modifiers = {
    conRecordatorio: fechasConRecordatorios,
  };
  const modifiersClassNames = {
    conRecordatorio: 'rdp-day_conRecordatorio'
  };

  // Manejo la navegación del carrusel de recomendaciones
  const handlePrev = () => {
    setRecomendacionIndex((prev) => {
      if (prev <= 0) {
        return totalPaginas - 1; // Ir al final cuando esté en el inicio
      }
      return prev - 1;
    });
  };
  const handleNext = () => {
    setRecomendacionIndex((prev) => {
      if (prev >= totalPaginas - 1) {
        return 0; // Volver al inicio cuando llegue al final
      }
      return prev + 1;
    });
  };

  // Calculo el promedio general usando los datos reales
  const promedioGeneral = (() => {
    const promedios = datosGrafica.map(m => m.nota).filter(n => typeof n === 'number' && !isNaN(n));
    if (!promedios.length) return '—';
    return (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1);
  })();
  // Actualizo el resumen con los datos reales
  const resumen = [
    { titulo: 'Promedio General', valor: promedioGeneral, desc: '', icon: '🎓' },
    { titulo: 'Materias Cursando', valor: materias.length, desc: 'Semestre actual', icon: '📄' },
    { titulo: 'Notificaciones', valor: notificacionesCount, desc: 'Sin leer', icon: '🔔', dynamic: true },
  ];

  // Inicial para el avatar del usuario
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

   const [menumOpen, setMenumOpen] = useState(false);

    const toggleMenu = () => {
        setMenumOpen(!menumOpen);
    };

  return (
    <div className="dashboard__container">
      {/* Sidebar */}
      <aside className="dashboard__sidebar">
        <div className="sidebar__logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={process.env.PUBLIC_URL + "/ASSETS/freya_logo.svg"} alt="Logo Freya" style={{ width: 32, height: 32 }} />
          Freya-app
        </div>
        <button className='button_mobile' onClick={toggleMenu}><img src={menu}/></button>
        <nav className="sidebar__nav">
          <a onClick={() => navigate('/home')} className={`sidebar__item ${location.pathname === '/home' ? 'active' : ''}`}><span role="img" aria-label="Inicio">📊</span> Inicio</a>
          <a onClick={() => navigate('/apuntes')} className={`sidebar__item ${location.pathname === '/apuntes' ? 'active' : ''}`}><span role="img" aria-label="Apuntes">📝</span> Apuntes</a>
          <a onClick={() => navigate('/calificaciones')} className={`sidebar__item ${location.pathname === '/calificaciones' ? 'active' : ''}`}><span role="img" aria-label="Calificaciones">🎯</span> Calificaciones</a>
          <a onClick={() => navigate('/recordatorios')} className={`sidebar__item ${location.pathname === '/recordatorios' ? 'active' : ''}`}><span role="img" aria-label="Recordatorios">⏰</span> Recordatorios</a>
          <a onClick={() => navigate('/configuracion')} className={`sidebar__item ${location.pathname.startsWith('/configuracion') ? 'active' : ''}`}><span role="img" aria-label="Configuración">⚙️</span> Configuración</a>
        </nav>
      </aside>
             {menumOpen && (
                <div className="mobile-menu">
                    <ul className="mobile-menu__lista">
                        <li><a onClick={() => navigate('/home')} className={`sidebar__item ${location.pathname === '/home' ? 'active' : ''}`}><span role="img" aria-label="Inicio">📊</span> Inicio</a></li>
                        <li><a onClick={() => navigate('/apuntes')} className={`sidebar__item ${location.pathname === '/apuntes' ? 'active' : ''}`}><span role="img" aria-label="Apuntes">📝</span> Apuntes</a></li>
                        <li><a onClick={() => navigate('/calificaciones')} className={`sidebar__item ${location.pathname === '/calificaciones' ? 'active' : ''}`}><span role="img" aria-label="Calificaciones">🎯</span> Calificaciones</a></li>
                        <li><a onClick={() => navigate('/recordatorios')} className={`sidebar__item ${location.pathname === '/recordatorios' ? 'active' : ''}`}><span role="img" aria-label="Recordatorios">⏰</span> Recordatorios</a></li>
                        <li><a onClick={() => navigate('/configuracion')} className={`sidebar__item ${location.pathname.startsWith('/configuracion') ? 'active' : ''}`}><span role="img" aria-label="Configuración">⚙️</span> Configuración</a></li>
                    </ul>
                </div>
            )}
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
        <div className="dashboard__content">
          <h1 className="dashboard__title">Bienvenido, {userName}</h1>
          <p className="dashboard__subtitle">Aquí tienes un resumen de tu progreso académico</p>
          {/* Tarjetas de resumen y recomendaciones */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            {/* Tarjeta de Promedio General */}
            <div className="resumen__card" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0', paddingLeft: '32px' }}>
              <img
                src={process.env.PUBLIC_URL + '/ASSETS/animacion_1.png'}
                alt="Animación"
                style={{
                  height: '200px',
                  maxWidth: '240px',
                  objectFit: 'contain',
                  marginRight: '-40px',
                  marginLeft: '0',
                  zIndex: 2,
                }}
              />
              <div className="resumen__info" style={{ display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center', zIndex: 1 }}>
                <div>
                  <div className="resumen__valor" style={{ fontSize: '6.9rem', fontWeight: 700 }}>{resumen[0].valor}</div>
                  <div className="resumen__titulo" style={{ fontSize: '1.7rem', fontWeight: 500 }}>{resumen[0].titulo}</div>
                  <div className="resumen__desc">{resumen[0].desc}</div>
                </div>
              </div>
            </div>
            {/* Tarjeta de recomendaciones */}
            <div style={{ flex: 2, minWidth: 0, background: 'white', borderRadius: '18px', boxShadow: '0 2px 8px #0001', padding: '24px 0 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '18px', color: '#222', marginLeft: '32px', marginBottom: '10px' }}>Recomendaciones</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <button onClick={handlePrev} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Anterior">&#8592;</button>
                <div style={{ overflow: 'hidden', width: 'calc(3 * 320px + 32px)' }}>
                  <div style={{ display: 'flex', transition: 'transform 0.4s', transform: `translateX(-${recomendacionIndex * 336}px)` }}>
                    {recomendaciones.map((rec, idx) => (
                      <div key={idx} style={{ minWidth: 320, maxWidth: 320, marginRight: 16, background: rec.color, borderRadius: '16px', boxShadow: '0 2px 8px #0001', padding: '18px 18px 12px 18px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '110px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ background: rec.iconBg, color: '#fff', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 1px 4px #0001' }}>{rec.icono}</span>
                          <span style={{ fontWeight: 600, fontSize: '16px', color: '#222' }}>{rec.titulo}</span>
                        </div>
                        <div style={{ color: '#555', fontSize: '14px', marginLeft: '50px', marginTop: '-6px' }}>{rec.texto}</div>
                        <div style={{ color: '#888', fontSize: '13px', marginLeft: '50px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '15px' }}>⭐</span> {rec.pie}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleNext} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Siguiente">&#8594;</button>
              </div>
              {/* Indicadores de página */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 6 }}>
                {Array.from({ length: totalPaginas }).map((_, i) => (
                  <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === recomendacionIndex ? '#2563eb' : '#cbd5e1', display: 'inline-block', transition: 'background 0.2s' }}></span>
                ))}
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="dashboard__tabs">
            <button className={tab === 'calificaciones' ? 'tab active' : 'tab'} onClick={()=>setTab('calificaciones')}>Calificaciones Recientes</button>
          </div>
          {/* Calificaciones Recientes y Recomendaciones */}
          {tab === 'calificaciones' && (
            <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
              {/* Gráfica de barras */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ width: '100%', height: 350, background: 'white', borderRadius: '16px', padding: '24px', boxSizing: 'border-box', boxShadow: '0 2px 8px #0001' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                      <Bar dataKey="nota" name="Calificación" radius={[8, 8, 0, 0]}>
                        {datosGrafica.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Tarjeta de calendario */}
              <div style={{ width: 340, height: 350, background: 'white', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 2px 8px #0001', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div className="calendario-wrapper">
                  <h3 style={{ marginBottom: '16px', color: '#2563eb' }}>Calendario</h3>
                  <DayPicker
                    mode="single"
                    selected={fechaSeleccionada}
                    onSelect={setFechaSeleccionada}
                    locale={es}
                    className="calendario-day-picker"
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Exporto el componente para usarlo en la aplicación
export default Home;
