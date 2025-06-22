import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../styles/configuracion.css';
import { FiUser, FiBell, FiEye, FiLock, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Componente reutilizable para los interruptores
const ToggleSwitch = ({ id, checked, onChange }) => (
  <label htmlFor={id} className="toggle-switch">
    <input id={id} type="checkbox" checked={checked} onChange={onChange} />
    <span className="slider"></span>
  </label>
);

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
  phoneInputValue
}) => {
  return (
    <div className="security-section">
      <div className="security-card">
        <h2 className="section-title">Seguridad de la Cuenta</h2>
        <p className="section-subtitle">Administra la seguridad de tu cuenta</p>

        <div className="security-setting-item">
          <div className="setting-text">
            <h3>Correo electrónico</h3>
            <p>Este correo es tu usuario de acceso</p>
          </div>
          <div className="email-edit-wrapper">
            {isEditingEmail ? (
              <>
                <div className="input-with-button">
                  <input
                    type="email"
                    value={emailInputValue}
                    onChange={e => onEmailInputChange(e.target.value)}
                    className="email-edit-input"
                    placeholder="Nuevo correo electrónico"
                    maxLength={254}
                  />
                  <button className="btn-primary" onClick={onSaveNewEmail} disabled={isSaving}>
                    {isSaving ? 'Enviando...' : 'Guardar nuevo correo'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="input-with-button">
                  <span className="email-current">{securityData.email}</span>
                  <button className="btn-secondary" onClick={onStartEditEmail}>Modificar</button>
                </div>
              </>
            )}
          </div>
          <div style={{fontSize:'0.92em', color:'#6b7280', textAlign:'right', marginTop:'4px'}}>{securityData.email.length}/254</div>
        </div>

        <div className="security-setting-item">
          <div className="setting-text">
            <h3>Número de teléfono</h3>
            <p>Este número se usa para autenticación de dos pasos</p>
          </div>
          <div className="email-edit-wrapper">
            {isEditingPhone ? (
              <>
                <input
                  type="tel"
                  id="phone-number"
                  value={phoneInputValue}
                  onChange={e => onPhoneInputChange(e.target.value)}
                  className="email-edit-input"
                  placeholder="Nuevo número de teléfono"
                  maxLength={13}
                />
                <button className="btn-primary" onClick={onSaveNewPhone} disabled={isSaving}>
                  {isSaving ? 'Enviando...' : 'Guardar nuevo número'}
                </button>
              </>
            ) : (
              <>
                <span className="email-current">{securityData.phoneNumber || 'No registrado'}</span>
                <button className="btn-secondary" onClick={onStartEditPhone}>Modificar</button>
              </>
            )}
          </div>
          <div style={{fontSize:'0.92em', color:'#6b7280', textAlign:'right', marginTop:'4px'}}>{isEditingPhone ? `${phoneInputValue.length}/13` : `${securityData.phoneNumber.length}/13`}</div>
        </div>

        <div className="security-setting-item">
          <div className="setting-text">
            <h3>Autenticación de dos factores</h3>
            <p>Añade una capa adicional de seguridad a tu cuenta</p>
          </div>
          <ToggleSwitch 
            id="twoFactorAuth"
            checked={securityData.twoFactorEnabled}
            onChange={e => onFieldChange('twoFactorEnabled', e.target.checked)}
          />
        </div>

        {securityData.twoFactorEnabled && !securityData.phoneNumber && (
          <div className="security-setting-item animated-field">
            <div className="setting-text">
              <h3>Número de teléfono</h3>
              <p>Se enviará un código de verificación a este número.</p>
            </div>
            <div className="phone-input-wrapper">
              <input
                type="tel"
                id="phoneNumber"
                placeholder="Tu número de teléfono"
                value={securityData.phoneNumber}
                onChange={e => onFieldChange('phoneNumber', e.target.value)}
              />
            </div>
          </div>
        )}

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

        <div className="security-setting-item">
          <div className="setting-text">
            <h3>Sesiones activas</h3>
            <p>Dispositivos donde tu cuenta está actualmente iniciada</p>
          </div>
          <div className="active-sessions">
            <span className="session-count">1</span>
            <button className="btn-secondary" onClick={onLogoutAll}>Cerrar todas las sesiones</button>
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
  const [activeTab, setActiveTab] = useState('perfil');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Nuevo estado para la eliminación
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [profileData, setProfileData] = useState({
    nombre: 'Juan Pérez',
    email: 'juan.perez@ejemplo.com',
    telefono: '555-123-4567',
    carrera: 'Ingeniería en Sistemas Computacionales',
    semestre: '5to Semestre',
    avatar: null,
  });

  // Nuevo estado para las notificaciones
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    reminders: true,
  });

  // Estado para la sección de seguridad
  const [securityData, setSecurityData] = useState({
    password: '',
    newPassword: '',
    confirmPassword: '',
    email: 'juan.perez@example.com',
    phoneNumber: '312 456 7890', // Añadido para la nueva funcionalidad
    currentPassword: '',
    is2FAEnabled: false,
    otp: ''
  });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInputValue, setEmailInputValue] = useState(securityData.email);
  // Teléfono
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInputValue, setPhoneInputValue] = useState(securityData.phoneNumber);

  const [imagePreview, setImagePreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setProfileData(prev => ({ ...prev, avatar: file }));
      
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageRemove = () => {
    setProfileData(prev => ({ ...prev, avatar: null }));
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  // Nueva función para cambiar las preferencias de notificación
  const handleNotificationChange = (key, value) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  // Nueva función para guardar las preferencias de notificación
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    console.log('Guardando preferencias de notificación:', notificationSettings);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    Swal.fire({
      title: '¡Guardado!',
      text: 'Tus preferencias de notificación se han guardado.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('Guardando datos:', profileData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSaving(false);

    Swal.fire({
      title: '¡Guardado!',
      text: 'Tus cambios se han guardado con éxito.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  };

  // Manejador para los campos de seguridad
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

  const handleSaveSecurity = async () => {
    setIsSaving(true);
    // Si 2FA está activa y hay número, pedir código SMS antes de guardar cualquier cambio
    if (securityData.twoFactorEnabled && securityData.phoneNumber) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const { value: code } = await Swal.fire({
        title: 'Verificación de seguridad',
        text: `Ingresa el código que enviamos por SMS al número registrado (${securityData.phoneNumber}) para confirmar los cambios`,
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
        setIsSaving(false);
        return; // Cancelado
      }
      if (code !== '123456') {
        setIsSaving(false);
        Swal.fire({
          icon: 'error',
          title: 'Código incorrecto',
          text: 'El código ingresado no es válido. Intenta nuevamente.'
        });
        return;
      }
      // Si el código es correcto, continuar con el guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      Swal.fire({
        title: '¡Guardado!',
        text: 'Tu configuración de seguridad se ha actualizado.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      setIsSaving(false);
      return;
    }
    // Si no hay 2FA, flujo normal
    await new Promise(resolve => setTimeout(resolve, 1000));
    Swal.fire({
      title: '¡Guardado!',
      text: 'Tu configuración de seguridad se ha actualizado.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
    setIsSaving(false);
  };
  
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

  const handleDeleteAccount = async () => {
    // Si 2FA está activa y hay número, pedir código SMS
    if (securityData.twoFactorEnabled && securityData.phoneNumber) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const { value: code } = await Swal.fire({
        title: 'Verificación de seguridad',
        text: `Ingresa el código que enviamos por SMS al número registrado (${securityData.phoneNumber}) para eliminar la cuenta`,
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
      if (!code) return; // Cancelado
      if (code !== '123456') {
        Swal.fire({
          icon: 'error',
          title: 'Código incorrecto',
          text: 'El código ingresado no es válido. Intenta nuevamente.'
        });
        return;
      }
      // Si el código es correcto, mostrar confirmación final
      Swal.fire({
        title: '¿Estás absolutamente seguro?',
        text: "Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar mi cuenta',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Aquí iría la lógica para eliminar la cuenta
          Swal.fire(
            'Cuenta eliminada',
            'Tu cuenta ha sido eliminada con éxito.',
            'success'
          )
        }
      });
      return;
    }
    // Si no hay 2FA, pedir contraseña como antes
    Swal.fire({
      title: 'Confirma tu identidad',
      text: 'Por favor, ingresa tu contraseña para continuar',
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
    }).then((result) => {
      if (!result.isConfirmed) return;
      // Simulación: contraseña correcta es 'demo123'
      if (result.value !== 'demo123') {
        Swal.fire({
          icon: 'error',
          title: 'Contraseña incorrecta',
          text: 'La contraseña ingresada no es válida.'
        });
        return;
      }
      // Paso 2: Confirmación final
      Swal.fire({
        title: '¿Estás absolutamente seguro?',
        text: "Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar mi cuenta',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // Aquí iría la lógica para eliminar la cuenta
          Swal.fire(
            'Cuenta eliminada',
            'Tu cuenta ha sido eliminada con éxito.',
            'success'
          )
        }
      });
    });
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
    if (password !== 'demo123') {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña incorrecta',
        text: 'La contraseña ingresada no es válida.'
      });
      return;
    }
    setEmailInputValue(securityData.email);
    setIsEditingEmail(true);
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
    // Simular envío de código
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const { value: code } = await Swal.fire({
      title: 'Verifica tu correo',
      text: `Ingresa el código que enviamos a ${emailInputValue}`,
      input: 'text',
      inputLabel: 'Código de verificación',
      inputPlaceholder: 'Ejemplo: 654321',
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
    if (code !== '654321') {
      Swal.fire({
        icon: 'error',
        title: 'Código incorrecto',
        text: 'El código ingresado no es válido. Intenta nuevamente.'
      });
      return;
    }
    // Código correcto: actualizar correo
    setSecurityData(prev => ({ ...prev, email: emailInputValue }));
    setIsEditingEmail(false);
    Swal.fire({
      icon: 'success',
      title: 'Correo actualizado',
      text: 'Tu correo electrónico ha sido actualizado correctamente.'
    });
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
    if (password !== 'demo123') {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña incorrecta',
        text: 'La contraseña ingresada no es válida.'
      });
      return;
    }
    setPhoneInputValue(securityData.phoneNumber);
    setIsEditingPhone(true);
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
    // Código correcto: actualizar teléfono
    setSecurityData(prev => ({ ...prev, phoneNumber: phoneInputValue }));
    setIsEditingPhone(false);
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

            // Asegurarse de que el '+' solo esté al principio
            if (sanitizedValue.lastIndexOf('+') > 0) {
              finalValue = '+' + sanitizedValue.replace(/\+/g, '');
            }

            // Mantener el '+57 ' si el usuario intenta borrarlo
            if (!finalValue.startsWith('+57 ')) {
                if (finalValue.length < 4) {
                    finalValue = '+57 ';
                }
            }
            
            setPhoneInputValue(finalValue);
          }}
          onSaveNewPhone={handleSaveNewPhone}
          isEditingPhone={isEditingPhone}
          phoneInputValue={phoneInputValue}
        />;
      default:
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
          />
        );
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
              J
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

const ProfileSection = ({ profileData, handleInputChange, imagePreview, onImageChange, onImageRemove, onSave, isSaving, securityData }) => {
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
              value={securityData && securityData.phoneNumber ? securityData.phoneNumber : ''}
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
