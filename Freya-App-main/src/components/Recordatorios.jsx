import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import '../styles/recordatorios.css';
import { db, auth } from '../firebase'; // Importa la instancia de Firestore
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import iconoControl from '../ASSETS/controlar.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

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

function Recordatorios() {
  // Función para formatear la fecha y hora
  const formatDate = (dateValue) => {
    const date = convertFirestoreDate(dateValue);
    if (!date) return { fecha: 'Fecha inválida', hora: '' };
    
    // Formatear la fecha
    const fechaFormateada = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });

    // Formatear la hora
    const hora = date.toTimeString().split(' ')[0].substring(0, 5);

    return {
      fecha: fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1),
      hora: hora
    };
  };

  // Estado que mantiene la lista de recordatorios
  const [recordatorios, setRecordatorios] = useState([]);
  // Nuevo estado para tab activo y notificaciones
  const [tab, setTab] = useState('recordatorios');
  // Tipos de recordatorio
  const tipos = [
    { value: 'Examen', color: '#fee2e2', text: '#b91c1c' },
    { value: 'Tarea', color: '#dcfce7', text: '#166534' },
    { value: 'Presentación', color: '#f3e8ff', text: '#7c3aed' },
    { value: 'Administrativo', color: '#dbeafe', text: '#1e40af' },
  ];
  // Estado para el nuevo recordatorio (título, descripción, fecha, hora)
  const [nuevoRecordatorio, setNuevoRecordatorio] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
    tipo: tipos[0].value,
  });
  // Estado para manejar si estamos editando un recordatorio
  const [editando, setEditando] = useState(null);
  // Estado para mostrar u ocultar el formulario de agregar un nuevo recordatorio
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // Estado para mostrar el modal de edición
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  // Estado para almacenar la hora actual
  const [ahora, setAhora] = useState(new Date());
  // Referencia a la colección de Firestore donde se guardan los recordatorios
  const recordatoriosCollectionRef = collection(db, 'recordatorios');
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Usuario simulado (puedes cambiarlo por el real)
  const [userName, setUserName] = useState('');
  const userInitial = userName?.[0]?.toUpperCase() || 'U';
  // -------------------- Usuario autenticado --------------------
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

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

  // -------------------- Sincronizar recordatorios con Firestore en tiempo real --------------------
  useEffect(() => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    const unsubscribe = onSnapshot(recordatoriosCollectionRef, (snapshot) => {
      const recordatoriosDesdeFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecordatorios(recordatoriosDesdeFirestore);
    });
    return () => unsubscribe();
  }, [userId]);

  // Efecto para actualizar la hora actual cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Efecto para validar la hora si la fecha del nuevo recordatorio cambia
  useEffect(() => {
    // Comentado temporalmente para debug
    /*
    if (
      mostrarFormulario &&
      nuevoRecordatorio.fecha &&
      nuevoRecordatorio.hora &&
      !esHoraValida(nuevoRecordatorio.fecha, nuevoRecordatorio.hora)
    ) {
      setNuevoRecordatorio(prev => ({ ...prev, hora: '' }));
    }
    */
  }, [nuevoRecordatorio.fecha, nuevoRecordatorio.hora, mostrarFormulario]);

  // Efecto para validar la hora si la fecha del recordatorio a editar cambia
  useEffect(() => {
    // Comentado temporalmente para debug
    /*
    if (
      mostrarModalEdicion &&
      editando &&
      editando.fecha &&
      editando.hora &&
      !esHoraValida(editando.fecha, editando.hora)
    ) {
      setEditando(prev => ({ ...prev, hora: '' }));
    }
    */
  }, [editando?.fecha, editando?.hora, mostrarModalEdicion]);

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

  // Función para cambiar el estado de completado de un recordatorio (marcar como completado o no completado)
  const toggleCompletado = async (id) => {
    if (!userId) return;
    const recordatorioDocRef = doc(db, 'usuarios', userId, 'recordatorios', id);
    const recordatorio = recordatorios.find((r) => r.id === id); // Buscar el recordatorio por id
    if (recordatorio) {
      try {
        // Actualizamos el estado de "completado" en Firestore
        await updateDoc(recordatorioDocRef, { completado: !recordatorio.completado });
      } catch (error) {
        // Manejo de errores si no se pudo actualizar el estado
        console.error('Error al actualizar el estado de completado:', error);
        Swal.fire('Error', 'No se pudo actualizar el recordatorio.', 'error');
      }
    }
  };

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const getFechaMinima = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para obtener la hora actual en formato HH:mm
  const getHoraActual = () => {
    const ahora = new Date();
    const hours = String(ahora.getHours()).padStart(2, '0');
    const minutes = String(ahora.getMinutes()).padStart(2, '0');
    const horaActual = `${hours}:${minutes}`;
    console.log('Hora actual obtenida:', horaActual);
    return horaActual;
  };

  // Función para verificar si una hora es válida para la fecha seleccionada
  const esHoraValida = (fecha, hora) => {
    if (!fecha || !hora) return true;
    
    const fechaSeleccionada = new Date(fecha);
    const fechaHoy = new Date();
    
    // Si la fecha es hoy, verificar que la hora no haya pasado
    if (fechaSeleccionada.toDateString() === fechaHoy.toDateString()) {
      const horaActual = getHoraActual();
      return hora >= horaActual;
    }
    
    // Si la fecha es futura, cualquier hora es válida
    return fechaSeleccionada > fechaHoy;
  };

  // Función para obtener el atributo min del input de hora
  const getHoraMinima = (fecha) => {
    if (!fecha) return undefined;
    
    const fechaSeleccionada = new Date(fecha);
    const fechaHoy = new Date();
    
    // Si la fecha es hoy, usar la hora actual
    if (fechaSeleccionada.toDateString() === fechaHoy.toDateString()) {
      return getHoraActual();
    }
    
    // Si la fecha es futura, no hay restricción
    return undefined;
  };

  // Función para generar opciones de hora con validación
  const generarOpcionesHora = (fecha) => {
    const opciones = [];
    const fechaSeleccionada = fecha ? new Date(fecha) : new Date();
    const fechaHoy = new Date();
    const esHoy = fechaSeleccionada.toDateString() === fechaHoy.toDateString();
    const horaActual = esHoy ? getHoraActual() : '00:00';
    
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 15) { // Intervalos de 15 minutos
        const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
        const esHoraPasada = esHoy && horaStr <= horaActual;
        
        opciones.push({
          value: horaStr,
          label: horaStr,
          disabled: esHoraPasada
        });
      }
    }
    
    return opciones;
  };

  // Función para renderizar el selector de hora personalizado
  const renderSelectorHora = (value, onChange, fecha, placeholder = "Selecciona hora") => {
    const opciones = [];
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    
    // Corregir problema de timezone con la fecha del input
    let esHoy = false;
    let fechaSeleccionadaString = 'No hay fecha';
    if (fecha) {
        // El input date devuelve 'YYYY-MM-DD'. Para evitar problemas de timezone,
        // lo separamos y creamos la fecha en la zona horaria local.
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaSeleccionada = new Date(year, month - 1, day); // Meses son 0-indexados
        esHoy = fechaSeleccionada.toDateString() === ahora.toDateString();
        fechaSeleccionadaString = fechaSeleccionada.toDateString();
    }
    
    console.log('TEST - Debug simple:', {
      fecha,
      esHoy,
      horaActual,
      valorActual: value,
      fechaHoy: ahora.toDateString(),
      fechaSeleccionada: fechaSeleccionadaString
    });
    
    // Generar opciones de hora
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 15) {
        const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
        const esHoraPasada = esHoy && horaStr <= horaActual;
        
        // Log para las primeras 5 opciones
        if (hora < 1) {
          console.log(`TEST - Hora ${horaStr}: ${esHoraPasada ? 'DESHABILITADA' : 'HABILITADA'}`);
        }
        
        opciones.push({
          value: horaStr,
          label: horaStr,
          disabled: esHoraPasada
        });
      }
    }
    
    return (
      <div style={{ position: 'relative' }}>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '120px',
            padding: '8px 12px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#111827',
            outline: 'none',
            transition: 'border-color 0.15s ease-in-out',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="" disabled>{placeholder}</option>
          {opciones.map((opcion) => (
            <option
              key={opcion.value}
              value={opcion.value}
              disabled={opcion.disabled}
              style={{
                color: opcion.disabled ? '#9CA3AF' : '#111827',
                backgroundColor: opcion.disabled ? '#F3F4F6' : 'white'
              }}
            >
              {opcion.label} {opcion.disabled ? '(Pasada)' : ''}
            </option>
          ))}
        </select>
        {esHoy && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            fontSize: '0.75rem',
            color: '#6B7280',
            marginTop: '4px'
          }}>
            ⏰ Horas pasadas deshabilitadas
          </div>
        )}
      </div>
    );
  };

  // Función para agregar un nuevo recordatorio
  const agregarRecordatorio = async () => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    if (!nuevoRecordatorio.titulo || !nuevoRecordatorio.descripcion || !nuevoRecordatorio.fecha || !nuevoRecordatorio.hora) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `Por favor completa todos los campos obligatorios: <br><br>
                  ${!nuevoRecordatorio.titulo ? '• <b>Título</b><br>' : ''}
                  ${!nuevoRecordatorio.descripcion ? '• <b>Descripción</b><br>' : ''}
                  ${!nuevoRecordatorio.fecha ? '• <b>Fecha</b><br>' : ''}
                  ${!nuevoRecordatorio.hora ? '• <b>Hora</b>' : ''}`,
        icon: 'error',
        confirmButtonColor: '#5f8cff',
      });
      return;
    }

    // Combinar fecha y hora en un solo timestamp
    const fechaHora = new Date(`${nuevoRecordatorio.fecha}T${nuevoRecordatorio.hora}`);

    try {
      await addDoc(recordatoriosCollectionRef, { 
        ...nuevoRecordatorio, 
        fecha: fechaHora.toISOString(),
        completado: false 
      });
      Swal.fire('¡Éxito!', 'Recordatorio agregado correctamente', 'success');
      setNuevoRecordatorio({ 
        titulo: '', 
        descripcion: '', 
        fecha: '', 
        hora: '',
        tipo: tipos[0].value 
      });
      setMostrarFormulario(false);
    } catch (error) {
      console.error('Error al agregar recordatorio:', error);
      Swal.fire('Error', 'No se pudo agregar el recordatorio.', 'error');
    }
  };

  // Función para eliminar un recordatorio
  const eliminarRecordatorio = async (id) => {
    if (!userId) return;
    const recordatorioDocRef = doc(db, 'usuarios', userId, 'recordatorios', id);
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

    try {
      await deleteDoc(recordatorioDocRef); // Eliminar el recordatorio en Firestore
      Swal.fire('Eliminado!', 'El recordatorio ha sido eliminado.', 'success');
    } catch (error) {
      // Manejo de errores si no se pudo eliminar
      console.error('Error al eliminar recordatorio:', error);
      Swal.fire('Error', 'No se pudo eliminar el recordatorio.', 'error');
    }
  };

  // Función para iniciar la edición de un recordatorio
  const iniciarEdicion = (id) => {
    const recordatorioAEditar = recordatorios.find((r) => r.id === id);
    if (!recordatorioAEditar) {
      console.error('Error: No se encontró el recordatorio para editar.');
      Swal.fire('Error', 'No se pudo encontrar el recordatorio. Intenta de nuevo.', 'error');
      return;
    }

    const fechaObj = convertFirestoreDate(recordatorioAEditar.fecha);
    if (!fechaObj) {
      console.error('Error: La fecha del recordatorio es inválida.');
      Swal.fire('Error', 'La fecha de este recordatorio es inválida.', 'error');
      return;
    }

    // FIX: Usar los componentes locales de la fecha para evitar errores de timezone.
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0'); // getMonth() es 0-indexado
    const day = String(fechaObj.getDate()).padStart(2, '0');
    const fecha = `${year}-${month}-${day}`;

    const hora = fechaObj.toTimeString().split(' ')[0].substring(0, 5);
    
    console.log('Iniciando edición con datos frescos y fecha corregida:', { fecha, hora, recordatorio: recordatorioAEditar });

    setEditando({ ...recordatorioAEditar, fecha, hora });
    setMostrarModalEdicion(true);
  };

  // Función para verificar si la hora actual del recordatorio es válida
  const verificarHoraValida = (fecha, hora) => {
    if (!fecha || !hora) return true;
    
    const fechaSeleccionada = new Date(fecha);
    const fechaHoy = new Date();
    const esHoy = fechaSeleccionada.toDateString() === fechaHoy.toDateString();
    
    if (esHoy) {
      const horaActual = getHoraActual();
      return hora > horaActual;
    }
    
    return true;
  };

  // Función para guardar los cambios al editar un recordatorio
  const guardarEdicion = async () => {
    if (!editando?.titulo || !editando?.descripcion || !editando?.fecha || !editando?.hora) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `Por favor completa todos los campos obligatorios: <br><br>
                  ${!editando?.titulo ? '• <b>Título</b><br>' : ''}
                  ${!editando?.descripcion ? '• <b>Descripción</b><br>' : ''}
                  ${!editando?.fecha ? '• <b>Fecha</b><br>' : ''}
                  ${!editando?.hora ? '• <b>Hora</b><br>' : ''}`,
        icon: 'error',
        confirmButtonColor: '#5f8cff',
      });
      return;
    }

    const fechaHora = new Date(`${editando.fecha}T${editando.hora}`);

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

    try {
      const recordatorioDocRef = doc(recordatoriosCollectionRef, editando.id);
      const { id, hora, ...datos } = editando;
      const datosAActualizar = {
        ...datos,
        fecha: fechaHora.toISOString(),
      };
      await updateDoc(recordatorioDocRef, datosAActualizar);
      Swal.fire('¡Actualizado!', 'Recordatorio modificado correctamente', 'success');
      setMostrarModalEdicion(false);
      setEditando(null);
    } catch (error) {
      console.error('Error al guardar edición:', error);
      Swal.fire('Error', 'No se pudo guardar la edición.', 'error');
    }
  };

  // Función para manejar el cambio de fecha en el formulario de edición
  const handleFechaChange = (nuevaFecha) => {
    console.log('Cambiando fecha de edición a:', nuevaFecha);
    setEditando(prev => ({ ...prev, fecha: nuevaFecha }));
  };

  // Función para manejar el cambio de hora en el formulario de edición
  const handleHoraChange = (nuevaHora) => {
    console.log('Cambiando hora de edición a:', nuevaHora);
    console.log('Estado actual de edición:', editando);
    
    // Si la nueva hora no es válida para la fecha actual, mostrar advertencia
    if (editando?.fecha && !verificarHoraValida(editando.fecha, nuevaHora)) {
      Swal.fire({
        title: 'Hora no válida',
        text: 'La hora seleccionada ya ha pasado para hoy. Por favor, selecciona una hora futura.',
        icon: 'warning',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      return; // No actualizar la hora si no es válida
    }
    
    setEditando(prev => ({ ...prev, hora: nuevaHora }));
  };

  // Función para manejar el cambio de fecha en el formulario de nuevo recordatorio
  const handleNuevaFechaChange = (nuevaFecha) => {
    console.log('Cambiando fecha a:', nuevaFecha);
    setNuevoRecordatorio(prev => ({ ...prev, fecha: nuevaFecha }));
  };

  // Función para manejar el cambio de hora en el formulario de nuevo recordatorio
  const handleNuevaHoraChange = (nuevaHora) => {
    console.log('Cambiando hora a:', nuevaHora);
    setNuevoRecordatorio(prev => ({ ...prev, hora: nuevaHora }));
  };

  // Separar pendientes y completados
  const pendientes = recordatorios.filter(r => !r.completado);
  const completados = recordatorios.filter(r => r.completado);

  // Notificaciones: recordatorios pendientes cuya fecha y hora ya han pasado
  const notificacionesActivas = pendientes.filter(r => {
    const fechaRecordatorio = convertFirestoreDate(r.fecha);
    return fechaRecordatorio instanceof Date && fechaRecordatorio <= ahora;
  });

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
              {notificacionesActivas.length > 0 && (
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
                  {notificacionesActivas.length > 99 ? '99+' : notificacionesActivas.length}
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
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, marginTop:0}}>
            <div>
              <h1 className="main-title" style={{marginBottom:0}}>Recordatorios</h1>
              <p style={{color:'#64748b', fontSize:'1.1rem', marginBottom:0}}>Gestiona tus recordatorios y notificaciones</p>
            </div>
            <button className="add-button" onClick={()=>setMostrarFormulario(true)}>
              + Nuevo Recordatorio
            </button>
          </div>
          {/* Tabs */}
          <div className="tabs-pill">
            <button className={`tab-pill${tab==='recordatorios'?' active':''}`} onClick={()=>setTab('recordatorios')}><span className="tab-icon">📅</span>Recordatorios</button>
            <button className={`tab-pill${tab==='notificaciones'?' active':''}`} onClick={()=>setTab('notificaciones')}><span className="tab-icon">🔔</span>Notificaciones {notificacionesActivas.length > 0 && <span style={{background:'#fee2e2', color:'#b91c1c', borderRadius:8, padding:'2px 10px', marginLeft:6, fontWeight:600}}>{notificacionesActivas.length}</span>}</button>
          </div>
          {/* Contenido de tabs */}
          {tab==='recordatorios' && (
            <>
              <div className="reminders-section-title">Pendientes</div>
              <div className="reminders-container">
                {pendientes.length === 0 && <div className="empty-state">No tienes recordatorios pendientes.</div>}
                {pendientes.map(r => {
                  const tipoInfo = tipos.find(t => t.value === r.tipo) || { color: '#e5e7eb', text: '#222' };
                  // Formato de fecha y hora
                  const { fecha, hora } = formatDate(r.fecha);
                  return (
                    <div key={r.id} className={`reminder-card${r.completado ? ' completed' : ''}`}>  
                      <div className="reminder-header" style={{marginBottom:0, alignItems:'flex-start'}}>
                        <div className="reminder-header-main" style={{gap:0}}>
                          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                            <h3 className="reminder-title" style={{marginBottom:0}}>{r.titulo}</h3>
                            <div className="reminder-actions" style={{marginLeft:16, display:'flex', gap:8}}>
                              <button
                                className={`status-btn${r.completado ? ' completed' : ''}`}
                                onClick={() => toggleCompletado(r.id)}
                                title="Marcar como completado"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  border: r.completado ? '2px solid #22c55e' : '2px solid #e5e7eb',
                                  background: r.completado ? '#22c55e' : '#fff',
                                  color: r.completado ? '#fff' : '#222',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.25rem',
                                  margin: 0,
                                  padding: 0,
                                  transition: 'background 0.18s, border 0.18s',
                                  cursor: 'pointer',
                                  boxShadow: 'none',
                                }}
                              >
                                <img 
                                  src={iconoControl} 
                                  alt="Completar" 
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    filter: r.completado ? 'brightness(0) invert(1)' : 'none'
                                  }}
                                />
                              </button>
                              <button className="edit-btn" onClick={() => iniciarEdicion(r.id)} title="Editar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>✏️</button>
                              <button className="delete-btn" onClick={() => eliminarRecordatorio(r.id)} title="Eliminar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>🗑️</button>
                            </div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:6, marginBottom:2}}>
                            <span className="reminder-type-label" style={{background: tipoInfo.color, color: tipoInfo.text, fontSize:'0.93rem', padding:'2px 12px', minWidth:60}}>{r.tipo}</span>
                            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                              <span className="reminder-date" style={{fontSize:'0.98rem', color:'#64748b', marginLeft:0}}>{fecha}</span>
                              <span style={{fontSize:'0.98rem', color:'#64748b'}}>•</span>
                              <span className="reminder-time" style={{fontSize:'0.98rem', color:'#64748b', fontWeight: 500}}>{hora}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="reminder-description" style={{marginTop:8}}>{r.descripcion}</p>
                    </div>
                  );
                })}
              </div>
              <div className="reminders-section-title">Completados</div>
              <div className="reminders-container">
                {completados.length === 0 && <div className="empty-state">No tienes recordatorios completados.</div>}
                {completados.map(r => {
                  const tipoInfo = tipos.find(t => t.value === r.tipo) || { color: '#e5e7eb', text: '#222' };
                  return (
                    <div key={r.id} className={`reminder-card${r.completado ? ' completed' : ''}`}>
                      <div className="reminder-header">
                        <div className="reminder-header-main">
                          <h3 className="reminder-title">{r.titulo}</h3>
                          <div className="reminder-header-meta">
                            <span className="reminder-type-label" style={{background: tipoInfo.color, color: tipoInfo.text}}>{r.tipo}</span>
                            <span className="reminder-date">{formatDate(r.fecha).fecha}</span>
                          </div>
                        </div>
                        <div className="reminder-actions">
                          <button
                            className={`status-btn${r.completado ? ' completed' : ''}`}
                            onClick={() => toggleCompletado(r.id)}
                            title="Marcar como completado"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              border: r.completado ? '2px solid #22c55e' : '2px solid #e5e7eb',
                              background: r.completado ? '#22c55e' : '#fff',
                              color: r.completado ? '#fff' : '#222',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              margin: 0,
                              padding: 0,
                              transition: 'background 0.18s, border 0.18s',
                              cursor: 'pointer',
                              boxShadow: 'none',
                            }}
                          >
                            <img 
                              src={iconoControl} 
                              alt="Completar" 
                              style={{
                                width: '16px',
                                height: '16px',
                                filter: r.completado ? 'brightness(0) invert(1)' : 'none'
                              }}
                            />
                          </button>
                          <button className="edit-btn" onClick={() => iniciarEdicion(r.id)} title="Editar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>✏️</button>
                          <button className="delete-btn" onClick={() => eliminarRecordatorio(r.id)} title="Eliminar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>🗑️</button>
                        </div>
                      </div>
                      <p className="reminder-description">{r.descripcion}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab==='notificaciones' && (
            <div className="reminders-container">
              {notificacionesActivas.length === 0 && <div className="empty-state">No tienes notificaciones.</div>}
              {notificacionesActivas.map(r => {
                const tipoInfo = tipos.find(t => t.value === r.tipo) || { color: '#e5e7eb', text: '#222' };
                return (
                  <div key={r.id} className={`reminder-card${r.completado ? ' completed' : ''}`}>
                    <div className="reminder-header">
                      <div className="reminder-header-main">
                        <h3 className="reminder-title">{r.titulo}</h3>
                        <div className="reminder-header-meta">
                          <span className="reminder-type-label" style={{background: tipoInfo.color, color: tipoInfo.text}}>{r.tipo}</span>
                          <span className="reminder-date">{formatDate(r.fecha).fecha}</span>
                        </div>
                      </div>
                      <div className="reminder-actions">
                        <button
                          className={`status-btn${r.completado ? ' completed' : ''}`}
                          onClick={() => toggleCompletado(r.id)}
                          title="Marcar como completado"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: r.completado ? '2px solid #22c55e' : '2px solid #e5e7eb',
                            background: r.completado ? '#22c55e' : '#fff',
                            color: r.completado ? '#fff' : '#222',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            margin: 0,
                            padding: 0,
                            transition: 'background 0.18s, border 0.18s',
                            cursor: 'pointer',
                            boxShadow: 'none',
                          }}
                        >
                          <img 
                            src={iconoControl} 
                            alt="Completar" 
                            style={{
                              width: '16px',
                              height: '16px',
                              filter: r.completado ? 'brightness(0) invert(1)' : 'none'
                            }}
                          />
                        </button>
                        <button className="edit-btn" onClick={() => iniciarEdicion(r.id)} title="Editar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>✏️</button>
                        <button className="delete-btn" onClick={() => eliminarRecordatorio(r.id)} title="Eliminar" style={{fontSize:'1.15rem', color:'#222', background:'none', border:'none', padding:0, margin:0}}>🗑️</button>
                      </div>
                    </div>
                    <p className="reminder-description">{r.descripcion}</p>
                  </div>
                );
              })}
            </div>
          )}
          {/* Modal para agregar un nuevo recordatorio */}
          {mostrarFormulario && (
            <div className="modal-overlay" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="modal-container" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setMostrarFormulario(false)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '4px'
                }}>Nuevo recordatorio</h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '24px'
                }}>Crea un nuevo recordatorio para mantenerte organizado</p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Título
                  </label>
                  <input 
                    type="text" 
                    value={nuevoRecordatorio.titulo}
                    onChange={e => setNuevoRecordatorio({ ...nuevoRecordatorio, titulo: e.target.value })}
                    placeholder="Ej. Examen de Matemáticas"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                    }}
                    maxLength={60}
                  />
                  <div style={{fontSize:'0.92em', color:'#94a3b8', textAlign:'right', marginTop: '4px'}}>{(nuevoRecordatorio.titulo?.length || 0)}/60</div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Tipo
                  </label>
                  <select 
                    value={nuevoRecordatorio.tipo}
                    onChange={e => setNuevoRecordatorio({ ...nuevoRecordatorio, tipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Selecciona un tipo</option>
                    {tipos.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Fecha
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="date"
                      value={nuevoRecordatorio.fecha}
                      onChange={e => handleNuevaFechaChange(e.target.value)}
                      min={getFechaMinima()}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#111827',
                        outline: 'none',
                        transition: 'border-color 0.15s ease-in-out'
                      }}
                    />
                    {renderSelectorHora(
                      nuevoRecordatorio.hora,
                      (hora) => handleNuevaHoraChange(hora),
                      nuevoRecordatorio.fecha,
                      "Selecciona hora"
                    )}
                  </div>
                  {nuevoRecordatorio.fecha === getFechaMinima() && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginTop: '4px',
                      marginBottom: '0'
                    }}>
                      ⏰ Las horas pasadas aparecen en gris y están deshabilitadas
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Descripción
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '0.75rem',
                      color: nuevoRecordatorio.descripcion.length > 300 ? '#ef4444' : '#6B7280'
                    }}>
                      ({nuevoRecordatorio.descripcion.length}/300)
                    </span>
                  </label>
                  <textarea 
                    value={nuevoRecordatorio.descripcion}
                    onChange={e => setNuevoRecordatorio({ ...nuevoRecordatorio, descripcion: e.target.value })}
                    placeholder="Describe los detalles de tu recordatorio"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                      minHeight: '100px',
                      resize: 'vertical',
                      borderColor: nuevoRecordatorio.descripcion.length > 300 ? '#ef4444' : '#D1D5DB'
                    }}
                    maxLength={300}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button 
                    onClick={() => setMostrarFormulario(false)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      color: '#374151'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={agregarRecordatorio}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Modal para editar un recordatorio */}
          {mostrarModalEdicion && (
            <div className="modal-overlay" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="modal-container" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setMostrarModalEdicion(false)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '4px'
                }}>Editar Recordatorio</h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '24px'
                }}>Modifica los detalles de tu recordatorio</p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Título
                  </label>
                  <input 
                    type="text" 
                    value={editando?.titulo || ''}
                    onChange={e => setEditando({ ...editando, titulo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                    }}
                    maxLength={60}
                  />
                  <div style={{fontSize:'0.92em', color:'#94a3b8', textAlign:'right', marginTop: '4px'}}>{(editando?.titulo?.length || 0)}/60</div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Tipo
                  </label>
                  <select 
                    value={editando?.tipo || ''}
                    onChange={e => setEditando({ ...editando, tipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {tipos.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Fecha
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="date"
                      value={editando?.fecha || ''}
                      onChange={e => handleFechaChange(e.target.value)}
                      min={getFechaMinima()}
                      style={{
                        flex: '1',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#111827',
                        outline: 'none',
                        transition: 'border-color 0.15s ease-in-out'
                      }}
                    />
                    {renderSelectorHora(
                      editando?.hora || '',
                      (hora) => handleHoraChange(hora),
                      editando?.fecha,
                      "Selecciona hora"
                    )}
                  </div>
                  {editando?.fecha === getFechaMinima() && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginTop: '4px',
                      marginBottom: '0'
                    }}>
                      ⏰ Las horas pasadas aparecen en gris y están deshabilitadas
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Descripción
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '0.75rem',
                      color: (editando?.descripcion?.length || 0) > 300 ? '#ef4444' : '#6B7280'
                    }}>
                      ({editando?.descripcion?.length || 0}/300)
                    </span>
                  </label>
                  <textarea 
                    value={editando?.descripcion || ''}
                    onChange={e => setEditando({ ...editando, descripcion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#111827',
                      outline: 'none',
                      transition: 'border-color 0.15s ease-in-out',
                      minHeight: '100px',
                      resize: 'vertical',
                      borderColor: (editando?.descripcion?.length || 0) > 300 ? '#ef4444' : '#D1D5DB'
                    }}
                    maxLength={300}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button 
                    onClick={() => setMostrarModalEdicion(false)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      color: '#374151'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={guardarEdicion}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Recordatorios;



