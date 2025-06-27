import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../styles/configuracion.css';
import { FiUser, FiBell, FiEye, FiLock, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword, updateEmail, sendEmailVerification } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Componente reutilizable para los interruptores de preferencia
const ToggleSwitch = ({ id, checked, onChange }) => (
  <label htmlFor={id} className="toggle-switch">
    <input id={id} type="checkbox" checked={checked} onChange={onChange} />
    <span className="slider"></span>
  </label>
);

// Sección de notificaciones, recibe props y muestra switches
const NotificationsSection = ({ settings, onChange, onSave, isSaving }) => (
  <div className="notifications-section">
    <h2 className="section-title">Preferencias de Notificaciones</h2>
    <p className="section-subtitle">Configura cómo y cuándo quieres recibir notificaciones</p>
    
    <ul className="notification-list">
      <li className="notification-item">
        <div className="notification-text">
          <h3>Notificaciones por correo</h3>
          <p>Recibe notificaciones importantes por correo electrónico</p>
        </div>
        <ToggleSwitch 
          id="emailNotifications"
          checked={settings.email}
          onChange={(e) => onChange('email', e.target.checked)}
        />
      </li>
      <li className="notification-item">
        <div className="notification-text">
          <h3>Recordatorios</h3>
          <p>Recibe alertas sobre tus próximos recordatorios</p>
        </div>
        <ToggleSwitch 
          id="reminderNotifications"
          checked={settings.reminders}
          onChange={(e) => onChange('reminders', e.target.checked)}
        />
      </li>
    </ul>
    
    <div className="form-actions">
      <button className="btn-primary" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Guardando...' : 'Guardar preferencias'}
      </button>
    </div>
  </div>
);

// Sección de seguridad, recibe props y muestra campos de contraseña, email y teléfono
const SecuritySection = ({
  securityData,
  onFieldChange,
  onSave,
  onLogoutAll,
  onDeleteAccount,
  isSaving,
  onStartEditEmail,
  onEmailInputChange,
  onSaveNewEmail,
  isEditingEmail,
  emailInputValue,
  onStartEditPhone,
  onPhoneInputChange,
  onSaveNewPhone,
  isEditingPhone,
  phoneInputValue,
  correo,
  telefono,
  nombre,
  onCancelEditEmail,
  onCancelEditPhone
}) => {
  return (
    <div className="security-section">
      <div className="security-card">
        <h2 className="section-title">Seguridad de la Cuenta</h2>
        <p className="section-subtitle">Administra la seguridad de tu cuenta</p>

        <div className="security-setting-item">
          <div className="setting-text">
            <h3>Cambiar contraseña</h3>
          </div>
          <div className="password-fields">
            <label htmlFor="currentPassword">Contraseña actual</label>
            <input type="password" id="currentPassword" value={securityData.currentPassword} onChange={e => onFieldChange('currentPassword', e.target.value)} />

            <label htmlFor="newPassword">Nueva contraseña</label>
            <input type="password" id="newPassword" value={securityData.newPassword} onChange={e => onFieldChange('newPassword', e.target.value)} />

            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
            <input type="password" id="confirmPassword" value={securityData.confirmPassword} onChange={e => onFieldChange('confirmPassword', e.target.value)} />
          </div>
        </div>

        <div className="form-actions security-actions">
          <button className="btn-primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <div className="danger-zone-text">
          <FiAlertTriangle className="danger-icon" />
          <div>
            <h3>Eliminar cuenta</h3>
            <p>Esta acción no se puede deshacer. Eliminará permanentemente tu cuenta y todos tus datos.</p>
          </div>
        </div>
        <button className="btn-danger" onClick={onDeleteAccount}>Eliminar cuenta</button>
      </div>
    </div>
  );
};

function Configuracion() {
  // Manejo la pestaña activa (perfil, notificaciones, seguridad)
  const [activeTab, setActiveTab] = useState('perfil');
  // Estado para mostrar spinner de guardado
  const [isSaving, setIsSaving] = useState(false);
  // Estado para mostrar spinner de eliminación
  const [isDeleting, setIsDeleting] = useState(false); // Nuevo estado para la eliminación
  // Estado del menú de usuario
  const [menuOpen, setMenuOpen] = useState(false);
  // Número de notificaciones activas
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  // Referencia para cerrar el menú de usuario al hacer click fuera
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para los datos del perfil
  const [profileData, setProfileData] = useState({
    nombre: '',
    email: '',
    carrera: '',
    semestre: '',
    avatar: null,
  });

  // Estado para las preferencias de notificación
  const [notificationSettings, setNotificationSettings] = useState({
    email: false,
    reminders: false,
  });

  // Estado para la sección de seguridad
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    email: '',
    phoneNumber: '',
    twoFactorEnabled: false,
  });
  // Estados para edición de email y teléfono
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInputValue, setPhoneInputValue] = useState('');

  // Estado para la previsualización de la imagen de perfil
  const [imagePreview, setImagePreview] = useState(null);
  // Estado para el archivo de imagen seleccionado
  const [avatarFile, setAvatarFile] = useState(null); // Nuevo estado para el archivo seleccionado

  // -------------------- Usuario autenticado --------------------
  // Guardo el ID y nombre del usuario autenticado
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  useEffect(() => {
    // Escucho cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      // Si hay usuario autenticado, sincronizo el correo real en securityData
      if (user) {
        setSecurityData(prev => ({ ...prev, email: user.email }));
        setEmailInputValue(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // -------------------- Sincronizar perfil con Firestore en tiempo real --------------------
  useEffect(() => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    const unsubscribe = onSnapshot(perfilRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data.profileData || profileData);
        setNotificationSettings(data.notificationSettings || notificationSettings);
        // Al actualizar securityData, asegúrate de que los campos de password estén vacíos
        const cleanSecurityData = { ...(data.securityData || securityData) };
        cleanSecurityData.currentPassword = '';
        cleanSecurityData.newPassword = '';
        cleanSecurityData.confirmPassword = '';
        // Si hay usuario autenticado, sincronizo el correo real
        if (auth.currentUser && auth.currentUser.email) {
          cleanSecurityData.email = auth.currentUser.email;
        }
        setSecurityData(cleanSecurityData);
        setEmailInputValue(cleanSecurityData.email || '');
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // Obtengo el nombre real del usuario desde Firestore para mostrarlo en el header
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

  // Inicial para el avatar del usuario
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

  // -------------------- Guardar datos en Firestore --------------------
  // Manejo el guardado de los datos del perfil, incluyendo la imagen
  const handleSave = async () => {
    setIsSaving(true);
    let updatedProfileData = { ...profileData };
    try {
      if (avatarFile) {
        const avatarRef = ref(storage, `usuarios/${userId}/avatar.jpg`);
        await uploadBytes(avatarRef, avatarFile);
        const url = await getDownloadURL(avatarRef);
        updatedProfileData.avatar = url;
        setImagePreview(url);
        setAvatarFile(null);
      }
      if (!updatedProfileData.avatar || typeof updatedProfileData.avatar !== 'string') {
        updatedProfileData.avatar = null;
      }
      await guardarEnFirestore(updatedProfileData, null, null);
      Swal.fire({
        title: '¡Guardado!',
        text: 'Tus cambios se han guardado con éxito.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (error) {
      // El error ya fue mostrado en guardarEnFirestore
    } finally {
      setIsSaving(false);
    }
  };

  // Función para guardar datos en Firestore (perfil, notificaciones, seguridad)
  const guardarEnFirestore = async (nuevoPerfil, nuevasNotificaciones, nuevaSeguridad) => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    let cleanSecurityData = nuevaSeguridad || securityData;
    cleanSecurityData = { ...cleanSecurityData };
    delete cleanSecurityData.currentPassword;
    delete cleanSecurityData.newPassword;
    delete cleanSecurityData.confirmPassword;
    let cleanProfileData = nuevoPerfil || profileData;
    cleanProfileData = { ...cleanProfileData };
    if (!cleanProfileData.avatar || typeof cleanProfileData.avatar !== 'string') {
      cleanProfileData.avatar = null;
    }
    try {
      await setDoc(perfilRef, {
        profileData: cleanProfileData,
        notificationSettings: nuevasNotificaciones || notificationSettings,
        securityData: cleanSecurityData,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error.message || 'No se pudo guardar el perfil. Intenta de nuevo.'
      });
      throw error;
    }
  };

  // Manejo los cambios en los campos del perfil
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejo el cambio de imagen de perfil
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
      setProfileData(prev => ({ ...prev, avatar: null })); // Limpiar la URL hasta guardar
    }
  };

  // Elimino la imagen de perfil seleccionada
  const handleImageRemove = () => {
    setAvatarFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setProfileData(prev => ({ ...prev, avatar: null }));
  };

  // Manejo el cambio de switches de notificaciones
  const handleNotificationChange = (key, value) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  // Manejo los cambios en los campos de seguridad (contraseña, 2FA, etc.)
  const handleSecurityChange = async (field, value) => {
    // Si se intenta desactivar 2FA y hay número, pedir código SMS
    if (field === 'twoFactorEnabled' && !value && securityData.phoneNumber) {
      const { value: code } = await Swal.fire({
        title: 'Confirma desactivación',
        text: 'Ingresa el código que recibiste por SMS para desactivar la autenticación de dos pasos',
        input: 'text',
        inputLabel: 'Código de verificación',
        inputPlaceholder: 'Ejemplo: 123456',
        showCancelButton: true,
        confirmButtonText: 'Verificar',
        cancelButtonText: 'Cancelar',
        inputAttributes: {
          maxlength: 6,
          autocapitalize: 'off',
          autocorrect: 'off',
        },
        inputValidator: (value) => {
          if (!value) {
            return 'Por favor ingresa el código';
          }
          if (!/^[0-9]{6}$/.test(value)) {
            return 'El código debe tener 6 dígitos';
          }
          return undefined;
        }
      });
      if (!code) {
        // Cancelado, no cambiar nada
        return;
      }
      if (code !== '123456') {
        Swal.fire({
          icon: 'error',
          title: 'Código incorrecto',
          text: 'El código ingresado no es válido. Intenta nuevamente.'
        });
        return;
      }
      // Código correcto: desactivar 2FA y limpiar número
      setSecurityData(prev => ({ 
        ...prev, 
        twoFactorEnabled: false, 
        phoneNumber: '' 
      }));
      Swal.fire({
        icon: 'success',
        title: 'Autenticación de dos pasos desactivada',
        text: 'La autenticación de dos pasos ha sido desactivada correctamente.'
      });
      return;
    }
    // Si se desactiva 2FA sin número, solo limpiar
    if (field === 'twoFactorEnabled' && !value) {
      setSecurityData(prev => ({ 
        ...prev, 
        twoFactorEnabled: false, 
        phoneNumber: '' 
      }));
    } else {
      setSecurityData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Simulación de cerrar sesión en todos los dispositivos
  const handleLogoutAll = () => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Se cerrará la sesión en todos los demás dispositivos.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cerrar sesiones',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log("Cerrando todas las sesiones...");
        Swal.fire(
          '¡Hecho!',
          'Se han cerrado todas las demás sesiones.',
          'success'
        )
      }
    })
  };

  // Manejo la eliminación de cuenta, con reautenticación y borrado en Firestore y Auth
  const handleDeleteAccount = async () => {
    if (!userId) return;
    // Solicitar contraseña antes de eliminar la cuenta
    const { value: password } = await Swal.fire({
      title: 'Confirma tu identidad',
      text: 'Por seguridad, ingresa tu contraseña para eliminar la cuenta',
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: 'Tu contraseña',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar tu contraseña';
        }
        return undefined;
      }
    });
    if (!password) return;
    // Reautenticación real con Firebase
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña incorrecta',
        text: 'La contraseña ingresada no es válida.'
      });
      return;
    }
    // Confirmación final
    const result = await Swal.fire({
      title: '¿Estás absolutamente seguro?',
      text: 'Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.',
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar mi cuenta',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      // 1. Eliminar todos los datos del usuario en Firestore
      const usuarioRef = doc(db, 'usuarios', userId);
      // Eliminar subcolecciones (perfil, materias, apuntes, recordatorios)
      const subcolecciones = ['perfil', 'materias', 'apuntes', 'recordatorios'];
      for (const sub of subcolecciones) {
        const subColRef = collection(db, 'usuarios', userId, sub);
        const docsSnap = await getDocs(subColRef);
        for (const docu of docsSnap.docs) {
          await deleteDoc(docu.ref);
        }
      }
      // Eliminar el documento principal del usuario (si existe)
      await deleteDoc(usuarioRef);
      // 2. Eliminar el usuario de Firebase Auth
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      // 3. Cerrar sesión y redirigir
      await signOut(auth);
      Swal.fire('Cuenta eliminada', 'Tu cuenta ha sido eliminada con éxito.', 'success');
      navigate('/');
    } catch (error) {
      Swal.fire('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.', 'error');
      console.error(error);
    }
  };

  // Iniciar edición de correo
  const handleStartEditEmail = async () => {
    const { value: password } = await Swal.fire({
      title: 'Confirma tu identidad',
      text: 'Por seguridad, ingresa tu contraseña para modificar el correo',
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: 'Tu contraseña',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar tu contraseña';
        }
        return undefined;
      }
    });
    if (!password) return;
    // Reautenticación real con Firebase
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setEmailInputValue(securityData.email);
      setIsEditingEmail(true);
    } catch (error) {
      let msg = 'No se pudo actualizar el correo.';
      if (error.code === 'auth/email-already-in-use') msg = 'El correo electrónico ya está registrado por otro usuario.';
      if (error.code === 'auth/wrong-password') msg = 'La contraseña ingresada no es válida.';
      if (error.code === 'auth/requires-recent-login') msg = 'Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.';
      if (!msg || msg === 'No se pudo actualizar el correo.') msg += (error.message ? `\n${error.message}` : '');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg
      });
      setIsSaving(false);
      return;
    }
  };

  // Guardar nuevo correo (simulación de envío de código y verificación)
  const handleSaveNewEmail = async () => {
    if (!emailInputValue || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailInputValue)) {
      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: 'Por favor ingresa un correo electrónico válido.'
      });
      return;
    }
    // Pide la contraseña actual para reautenticación
    const { value: password } = await Swal.fire({
      title: 'Confirma tu identidad',
      text: 'Por seguridad, ingresa tu contraseña para modificar el correo',
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: 'Tu contraseña',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar tu contraseña';
        }
        return undefined;
      }
    });
    if (!password) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, emailInputValue);
      setSecurityData(prev => ({ ...prev, email: emailInputValue }));
      setProfileData(prev => ({ ...prev, email: emailInputValue }));
      setIsEditingEmail(false);
      await guardarEnFirestore({ ...profileData, email: emailInputValue }, null, { ...securityData, email: emailInputValue });
      setIsSaving(false);
      Swal.fire({
        icon: 'success',
        title: 'Correo actualizado',
        text: 'Tu correo electrónico ha sido actualizado correctamente.'
      }).then(() => {
        setTimeout(async () => {
          await signOut(auth);
          navigate('/');
        }, 1000);
      });
    } catch (error) {
      let msg = 'No se pudo actualizar el correo.';
      if (error.code === 'auth/email-already-in-use') msg = 'El correo electrónico ya está registrado por otro usuario.';
      if (error.code === 'auth/wrong-password') msg = 'La contraseña ingresada no es válida.';
      if (error.code === 'auth/requires-recent-login') msg = 'Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.';
      if (!msg || msg === 'No se pudo actualizar el correo.') msg += (error.message ? `\n${error.message}` : '');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg
      });
      setIsSaving(false);
      return;
    }
  };

  // Iniciar edición de teléfono
  const handleStartEditPhone = async () => {
    const { value: password } = await Swal.fire({
      title: 'Confirma tu identidad',
      text: 'Por seguridad, ingresa tu contraseña para modificar el número de teléfono',
      input: 'password',
      inputLabel: 'Contraseña',
      inputPlaceholder: 'Tu contraseña',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar tu contraseña';
        }
        return undefined;
      }
    });
    if (!password) return;
    // Reautenticación real con Firebase
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setPhoneInputValue(securityData.phoneNumber);
      setIsEditingPhone(true);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña incorrecta',
        text: 'La contraseña ingresada no es válida.'
      });
    }
  };

  // Guardar nuevo teléfono (simulación de envío de código y verificación)
  const handleSaveNewPhone = async () => {
    if (!phoneInputValue || !/^\+?[0-9]{8,15}$/.test(phoneInputValue)) {
      Swal.fire({
        icon: 'error',
        title: 'Número inválido',
        text: 'Por favor ingresa un número de teléfono válido.'
      });
      return;
    }
    // Simular envío de código
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const { value: code } = await Swal.fire({
      title: 'Verifica tu número',
      text: `Ingresa el código que enviamos por SMS a ${phoneInputValue}`,
      input: 'text',
      inputLabel: 'Código de verificación',
      inputPlaceholder: 'Ejemplo: 123456',
      showCancelButton: true,
      confirmButtonText: 'Verificar',
      cancelButtonText: 'Cancelar',
      inputAttributes: {
        maxlength: 6,
        autocapitalize: 'off',
        autocorrect: 'off',
      },
      inputValidator: (value) => {
        if (!value) {
          return 'Por favor ingresa el código';
        }
        if (!/^[0-9]{6}$/.test(value)) {
          return 'El código debe tener 6 dígitos';
        }
        return undefined;
      }
    });
    setIsSaving(false);
    if (!code) return; // Cancelado
    if (code !== '123456') {
      Swal.fire({
        icon: 'error',
        title: 'Código incorrecto',
        text: 'El código ingresado no es válido. Intenta nuevamente.'
      });
      return;
    }
    // Código correcto: actualizar teléfono en ambos estados y en Firestore
    setSecurityData(prev => ({ ...prev, phoneNumber: phoneInputValue }));
    setProfileData(prev => ({ ...prev, telefono: phoneInputValue }));
    setIsEditingPhone(false);
    // Guardar en Firestore
    await guardarEnFirestore({ ...profileData, telefono: phoneInputValue }, null, { ...securityData, phoneNumber: phoneInputValue });
    Swal.fire({
      icon: 'success',
      title: 'Número actualizado',
      text: 'Tu número de teléfono ha sido actualizado correctamente.'
    });
  };

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

  // -------------------- Sincronizar notificaciones con recordatorios del usuario --------------------
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

  // Simulación de navegación y logout
  const handleMenuClick = (option) => {
    setMenuOpen(false);
    if (option === 'perfil') setActiveTab('perfil');
    if (option === 'configuracion') setActiveTab('seguridad');
    if (option === 'logout') {
      // Redirigir inmediatamente sin mostrar aviso
      navigate('/');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'perfil') setActiveTab('perfil');
    if (tab === 'seguridad') setActiveTab('seguridad');
    if (tab === 'notificaciones') setActiveTab('notificaciones');
  }, [location.search]);

  // Guardar cambios en notificaciones
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await guardarEnFirestore(null, notificationSettings, null);
      Swal.fire({
        title: '¡Guardado!',
        text: 'Tus preferencias de notificación se han guardado.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (error) {
      // El error ya fue mostrado en guardarEnFirestore
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar cambios en seguridad
  const handleSaveSecurity = async () => {
    setIsSaving(true);
    try {
      // Validar campos de contraseña
      if (securityData.currentPassword || securityData.newPassword || securityData.confirmPassword) {
        if (!securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword) {
          Swal.fire({
            icon: 'error',
            title: 'Campos incompletos',
            text: 'Debes completar todos los campos de contraseña para cambiarla.'
          });
          setIsSaving(false);
          return;
        }
        if (securityData.newPassword !== securityData.confirmPassword) {
          Swal.fire({
            icon: 'error',
            title: 'Contraseñas no coinciden',
            text: 'La nueva contraseña y la confirmación no coinciden.'
          });
          setIsSaving(false);
          return;
        }
        try {
          const user = auth.currentUser;
          const credential = EmailAuthProvider.credential(user.email, securityData.currentPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, securityData.newPassword);
          Swal.fire({
            icon: 'success',
            title: 'Contraseña actualizada',
            text: 'Tu contraseña ha sido cambiada correctamente.'
          }).then(() => {
            setTimeout(async () => {
              await signOut(auth);
              navigate('/');
            }, 1000);
          });
          setSecurityData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
        } catch (error) {
          let msg = 'No se pudo cambiar la contraseña.';
          if (error.code === 'auth/wrong-password') msg = 'La contraseña actual es incorrecta.';
          if (error.code === 'auth/weak-password') msg = 'La nueva contraseña es demasiado débil.';
          if (error.code === 'auth/requires-recent-login') msg = 'Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.';
          if (!msg || msg === 'No se pudo cambiar la contraseña.') msg += (error.message ? `\n${error.message}` : '');
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg
          });
          setIsSaving(false);
          return;
        }
      }
      await guardarEnFirestore(null, null, securityData);
      Swal.fire({
        title: '¡Guardado!',
        text: 'Tu configuración de seguridad se ha actualizado.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (error) {
      // El error ya fue mostrado en guardarEnFirestore
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <ProfileSection 
            profileData={profileData} 
            handleInputChange={handleInputChange}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            onSave={handleSave}
            isSaving={isSaving}
            securityData={securityData}
            correo={profileData.email || securityData.email}
            telefono={profileData.telefono || 'No registrado'}
            nombre={profileData.nombre}
          />
        );
      case 'notificaciones':
        return <NotificationsSection 
          settings={notificationSettings}
          onChange={handleNotificationChange}
          onSave={handleSaveNotifications}
          isSaving={isSaving}
        />;
      case 'seguridad':
        return <SecuritySection 
          securityData={securityData}
          onFieldChange={handleSecurityChange}
          onSave={handleSaveSecurity}
          onLogoutAll={handleLogoutAll}
          onDeleteAccount={handleDeleteAccount}
          isSaving={isSaving}
          onStartEditEmail={handleStartEditEmail}
          onEmailInputChange={setEmailInputValue}
          onSaveNewEmail={handleSaveNewEmail}
          isEditingEmail={isEditingEmail}
          emailInputValue={emailInputValue}
          onStartEditPhone={handleStartEditPhone}
          onPhoneInputChange={(value) => {
            // Permite el '+' al inicio y solo números después.
            const sanitizedValue = value.replace(/[^0-9+]/g, '');
            let finalValue = sanitizedValue;
            setPhoneInputValue(finalValue);
          }}
          onSaveNewPhone={handleSaveNewPhone}
          isEditingPhone={isEditingPhone}
          phoneInputValue={phoneInputValue}
          correo={profileData.email || securityData.email}
          telefono={profileData.telefono || securityData.phoneNumber}
          nombre={profileData.nombre}
          onCancelEditEmail={() => { setIsEditingEmail(false); setEmailInputValue(securityData.email); }}
          onCancelEditPhone={() => { setIsEditingPhone(false); setPhoneInputValue(securityData.phoneNumber); }}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard__container">
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
        <div className="configuracion-wrapper">
          <div className="main-content-config">
            <header className="page-header">
              <h1>Configuración</h1>
              <p>Administra tu cuenta y preferencias</p>
            </header>
            <div className="tabs">
              <button onClick={() => setActiveTab('perfil')} className={`tab-button ${activeTab === 'perfil' ? 'active' : ''}`}>
                <FiUser /> Perfil
              </button>
              <button onClick={() => setActiveTab('notificaciones')} className={`tab-button ${activeTab === 'notificaciones' ? 'active' : ''}`}>
                <FiBell /> Notificaciones
              </button>
              <button onClick={() => setActiveTab('seguridad')} className={`tab-button ${activeTab === 'seguridad' ? 'active' : ''}`}>
                <FiLock /> Seguridad
              </button>
            </div>
            <div className="tab-content">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProfileSection = ({ profileData, handleInputChange, imagePreview, onImageChange, onImageRemove, onSave, isSaving, securityData, correo, telefono, nombre }) => {
  const fileInputRef = useRef(null);
  
  return (
    <div className="profile-section">
      <h2 className="section-title">Información Personal</h2>
      <p className="section-subtitle">Actualiza tu información personal y académica</p>
      
      <div className="profile-grid">
        <div className="avatar-section">
          <div className="avatar-placeholder">
            {imagePreview ? (
              <img src={imagePreview} alt="Avatar" className="avatar-preview" />
            ) : (
              <FiUser />
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onImageChange}
            accept="image/png, image/jpeg"
            style={{ display: 'none' }} 
          />
          <div className="avatar-buttons">
            <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
              Cambiar
            </button>
            <button className="btn-danger" onClick={onImageRemove}>
              Eliminar
            </button>
          </div>
        </div>

        <div className="form-fields">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={profileData.nombre}
              onChange={handleInputChange}
              maxLength={80}
            />
            <div style={{fontSize:'0.92em', color:'#6b7280', textAlign:'right', marginTop:'4px'}}>{profileData.nombre.length}/80</div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input type="email" id="email" name="email" value={profileData.email} onChange={handleInputChange} readOnly/>
          </div>
          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={profileData.telefono || ''}
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className="form-actions">
        <button className="btn-primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
};

export default Configuracion; 
