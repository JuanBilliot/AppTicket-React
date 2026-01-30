import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = 'http://127.0.0.1:5002';

// Sistema SLA Inteligente y Adaptativo
const slaCategories = {
  'urgente': {
    maxHours: 2,
    maxDays: 0,
    color: '#ef4444',
    description: 'Crítico - Resolución inmediata',
    examples: 'Remoto no funciona, sistema caído, pérdida total de servicio'
  },
  'normal': {
    maxHours: 0,
    maxDays: 3,
    color: '#f59e0b',
    description: 'Estándar - Resolución normal',
    examples: 'Cambios de equipo, configuraciones, instalación de software'
  },
  'complejo': {
    maxHours: 0,
    maxDays: 10,
    color: '#8b5cf6',
    description: 'Complejo - Requiere planificación',
    examples: 'Compras grandes, proyectos especiales, infraestructura'
  },
  'bajo': {
    maxHours: 0,
    maxDays: 7,
    color: '#10b981',
    description: 'Baja prioridad - Sin urgencia',
    examples: 'Consultas, mejoras menores, solicitudes de información'
  }
};

// Función para convertir fecha argentina a formato JavaScript
const parseArgentineDate = (dateString) => {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  try {
    // Si ya está en formato ISO, devolverla directamente
    if (dateString.includes('T') || dateString.includes('-')) {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Formato argentino: dd/mm/yyyy
    const parts = dateString.trim().split('/');
    if (parts.length !== 3) {
      return null;
    }
    
    const [day, month, year] = parts;
    
    // Validar que sean números
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    // Crear fecha en formato YYYY-MM-DD
    const isoString = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(isoString);
    
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
};

// Función para calcular SLA automáticamente
const calculateSLA = (creationDate, closeDate, ticketType = 'normal') => {
  if (!creationDate) return { status: 'unknown', days: 0, hours: 0, percentage: 0 };
  
  const sla = slaCategories[ticketType] || slaCategories['normal'];
  
  try {
    // Convertir fechas argentinas
    const creation = parseArgentineDate(creationDate);
    const close = closeDate ? parseArgentineDate(closeDate) : new Date();
    
    // Validar fechas
    if (!creation || !close) {
      return { status: 'unknown', days: 0, hours: 0, percentage: 0 };
    }
    
    // Calcular diferencia en milisegundos
    const diffMs = close - creation;
    
    // Si la diferencia es negativa, usar 0
    const diffMsPositive = Math.max(0, diffMs);
    
    // Calcular diferencia en horas y días
    const diffHours = Math.floor(diffMsPositive / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    // Calcular tiempo máximo permitido en horas
    const maxAllowedHours = (sla.maxDays * 24) + sla.maxHours;
    
    // Calcular porcentaje de SLA utilizado
    const percentage = maxAllowedHours > 0 ? Math.min(100, (diffHours / maxAllowedHours) * 100) : 0;
    
    // Determinar estado
    let status;
    if (percentage > 100) {
      status = 'exceeded'; // Excedido
    } else if (percentage > 80) {
      status = 'warning';  // Advertencia
    } else if (percentage > 50) {
      status = 'moderate'; // Moderado
    } else {
      status = 'good';     // Bueno
    }
    
    return {
      status,
      days: diffDays,
      hours: remainingHours,
      percentage: Math.round(percentage),
      slaCategory: sla,
      maxAllowedHours,
      actualHours: diffHours
    };
  } catch (error) {
    console.error('❌ Error calculating SLA:', error);
    return { status: 'unknown', days: 0, hours: 0, percentage: 0 };
  }
};

// Función para determinar tipo de ticket basado en contenido
const determineTicketType = (details, type = '') => {
  const detailsLower = (details || '').toLowerCase();
  const typeLower = (type || '').toLowerCase();
  
  // Palabras clave para cada categoría
  const urgentKeywords = ['no funciona', 'caído', 'no abre', 'error crítico', 'urgente', 'remoto', 'acceso', 'bloqueado', 'pérdida'];
  const complexKeywords = ['comprar', 'adquirir', 'proyecto', 'infraestructura', 'migración', 'implementación', 'servidor nuevo'];
  const lowKeywords = ['consulta', 'duda', 'información', 'mejora', 'sugerencia', 'recomendación'];
  
  // Detectar palabras clave urgentes
  if (urgentKeywords.some(keyword => detailsLower.includes(keyword) || typeLower.includes(keyword))) {
    return 'urgente';
  }
  
  // Detectar palabras clave complejas
  if (complexKeywords.some(keyword => detailsLower.includes(keyword) || typeLower.includes(keyword))) {
    return 'complejo';
  }
  
  // Detectar palabras clave baja prioridad
  if (lowKeywords.some(keyword => detailsLower.includes(keyword) || typeLower.includes(keyword))) {
    return 'bajo';
  }
  
  // Por defecto, normal
  return 'normal';
};

// Componente para mostrar SLA visualmente (versión optimizada)
const SLAIndicator = ({ creationDate, closeDate, details, type }) => {
  const ticketType = determineTicketType(details, type);
  const sla = calculateSLA(creationDate, closeDate, ticketType);
  
  // Colores dinámicos según porcentaje de SLA (rangos más específicos)
  const getDynamicColor = () => {
    const percentage = sla.percentage;
    
    // Colores graduales por rango de porcentaje (umbral del 95% para rojo)
    if (percentage > 100) return '#dc2626';      // Rojo intenso - Claramente vencido (>100%)
    if (percentage > 95) return '#f97316';      // Naranja rojizo - Vencido (96-100%)
    if (percentage > 90) return '#f59e0b';        // Naranja - Justo a tiempo (91-95%)
    if (percentage > 75) return '#fbbf24';        // Naranja claro - Preocupante (76-90%)
    if (percentage > 50) return '#fde047';        // Amarillo - Advertencia (51-75%)
    if (percentage > 25) return '#fde68a';        // Amarillo verdoso - Regular (26-50%)
    if (percentage > 10) return '#fde047';        // Amarillo - Bueno (11-25%)
    
    // Colores según tipo de ticket cuando está bien (≤10%)
    if (ticketType === 'urgente') return '#059669';     // Verde intenso
    if (ticketType === 'normal') return '#10b981';     // Verde estándar
    if (ticketType === 'complejo') return '#7c3aed';   // Púrpura
    if (ticketType === 'bajo') return '#0891b2';       // Azul
    
    return '#10b981'; // Verde por defecto
  };
  
  const dynamicColor = getDynamicColor();
  
  // Determinar texto del estado
  const getStatusText = () => {
    if (sla.percentage > 120) return 'CRÍTICO';
    if (sla.percentage > 100) return 'VENCIDO';
    if (sla.percentage > 90) return 'JUSTO A TIEMPO';
    if (sla.percentage > 70) return 'OK';
    return 'OK';
  };
  
  // Manejar valores NaN
  const displayDays = isNaN(sla.days) || sla.days < 0 ? 0 : sla.days;
  const displayHours = isNaN(sla.hours) || sla.hours < 0 ? 0 : sla.hours;
  const displayPercentage = isNaN(sla.percentage) ? 0 : sla.percentage;
  
  return (
    <span 
      className={`sla-badge sla-${sla.status}`}
      style={{ 
        background: `${dynamicColor}20`,
        color: dynamicColor,
        border: `1px solid ${dynamicColor}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}
    >
      <i className="fas fa-percentage" style={{ fontSize: '0.6rem' }}></i>
      {displayPercentage}% ({getStatusText()})
    </span>
  );
};

// DatePicker Component
const DatePicker = ({ value, onChange, placeholder = "Seleccionar fecha" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const calendarRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Parse existing value if any
    if (value && value !== 'None') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setCurrentDate(new Date(year, month, 1));
        }
      }
    }
  }, [value]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    onChange(formatDate(newDate));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(formatDate(today));
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push({
        day,
        isCurrentMonth: true,
        date,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate && date.toDateString() === selectedDate.toDateString()
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day)
      });
    }

    return days;
  };

  return (
    <div className="date-picker-container" ref={calendarRef}>
      <input
        type="text"
        className="date-picker-input"
        value={selectedDate ? formatDate(selectedDate) : ''}
        placeholder={placeholder}
        onClick={() => setIsOpen(!isOpen)}
        readOnly
      />
      
      {isOpen && (
        <div className="date-picker-calendar">
          <div className="calendar-header">
            <h3 className="calendar-title">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="calendar-nav">
              <button className="calendar-btn" onClick={handlePrevMonth}>
                ‹
              </button>
              <button className="calendar-btn" onClick={handleNextMonth}>
                ›
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {weekDays.map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-days">
            {renderCalendar().map((dayInfo, index) => (
              <div
                key={index}
                className={`calendar-day ${
                  dayInfo.isCurrentMonth ? '' : 'other-month'
                } ${
                  dayInfo.isSelected ? 'selected' : ''
                } ${
                  dayInfo.isToday ? 'today' : ''
                }`}
                onClick={() => dayInfo.isCurrentMonth && handleDateClick(dayInfo.day)}
              >
                {dayInfo.day}
              </div>
            ))}
          </div>

          <div className="calendar-footer">
            <button className="calendar-today" onClick={handleToday}>
              Hoy
            </button>
            <button className="calendar-close" onClick={() => setIsOpen(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LatencyChart = ({ data, colorClass }) => {
  if (!data || data.length === 0) return <div className="chart-placeholder">Esperando datos...</div>;

  const maxLat = Math.max(...data, 100);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / maxLat) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="chart-container">
      <svg className="sparkline-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          className={`sparkline-path ${colorClass}`}
        />
      </svg>
    </div>
  );
};

function App() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [servers, setServers] = useState([]);
  const [serverMonitoring, setServerMonitoring] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pingResults, setPingResults] = useState({}); // { [ip]: { msg, timestamp } }
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: '', type: '' });
  const [viewMode, setViewMode] = useState('list'); // 'list', 'view', 'edit'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showEditServerModal, setShowEditServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [newServerData, setNewServerData] = useState({
    branch: '', branch_code: '', primary_service_provider: '',
    primary_service_ip: '', primary_service_speed: '',
    secondary_service_provider: '', secondary_service_ip: '', secondary_service_speed: ''
  });
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settingsTab, setSettingsTab] = useState('users');
  const [settingsUsers, setSettingsUsers] = useState([]);
  const [settingsBranches, setSettingsBranches] = useState([]);
  const [settingsAgents, setSettingsAgents] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsNewName, setSettingsNewName] = useState('');
  const [branchSuggestions, setBranchSuggestions] = useState([]);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [activeServerCategory, setActiveServerCategory] = useState('main');
  const [notifications, setNotifications] = useState([]);
  const [lastTicketCount, setLastTicketCount] = useState(0);
  const [lastServerStatus, setLastServerStatus] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Bandera para evitar múltiples inicializaciones
  const ticketsInitialized = useRef(false);
  // Estados persistentes para evitar reseteos
  const persistentTicketCount = useRef(0);
  const persistentServerStatus = useRef({});

  const fileInputRef = useRef(null);
  const ticketsPerPage = 50;
  const scrollPos = useRef(0);

  // Efecto para scroll al cambiar de pestaña
  useEffect(() => {
    window.scrollTo(0, 0);
    scrollPos.current = 0; // Resetear posición guardada al cambiar de sección
  }, [activeTab]);

  // Efecto para manejar scroll al entrar/salir de detalle/edición
  useEffect(() => {
    if (viewMode === 'view' || viewMode === 'edit') {
      // Si entramos a ver/editar y venimos de scrollear la lista, guardamos la posición
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > 0 && viewMode !== 'edit') { // Solo guardar si venimos de 'list'
        scrollPos.current = currentScroll;
      }
      window.scrollTo(0, 0);
    } else if (viewMode === 'list') {
      // Al volver al listado, restauramos la posición previa
      if (scrollPos.current > 0) {
        setTimeout(() => {
          window.scrollTo({ top: scrollPos.current, behavior: 'instant' });
        }, 0);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
    fetchGroups();
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    fetchServersStatus();
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchServersStatus();
      }
    }, 600000); // 10 minutos = 600,000 ms
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    if (activeTab === 'servers') {
      fetchServersData();
      // NO llamar a fetchServersStatus aquí para evitar duplicados
      // El monitoreo automático cada 10 minutos se encarga de actualizar
    }
  }, [activeTab]);

  // Manejo del botón "Atrás" del navegador
  useEffect(() => {
    const handleBackButton = (e) => {
      if (viewMode !== 'list') {
        e.preventDefault();
        if (viewMode === 'edit') setViewMode('view');
        else { setViewMode('list'); setSelectedTicket(null); }
        window.history.pushState(null, null, window.location.pathname);
      }
    };

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [viewMode]);

  const fetchGroups = async () => {
    try {
      const [aR, uR, bR] = await Promise.all([
        fetch(`${API_BASE}/api/agents`),
        fetch(`${API_BASE}/api/users`),
        fetch(`${API_BASE}/api/branches`)
      ]);
      setAgents(await aR.json());
      setUsers(await uR.json());
      setBranches(await bR.json());
    } catch (e) { console.error(e); }
  };

  const fetchSettingsAll = async () => {
    setSettingsLoading(true);
    setSettingsError('');
    try {
      const [uR, bR, aR] = await Promise.all([
        fetch(`${API_BASE}/api/settings/users?all=1`),
        fetch(`${API_BASE}/api/settings/branches?all=1`),
        fetch(`${API_BASE}/api/settings/agents?all=1`)
      ]);

      const [uJ, bJ, aJ] = await Promise.all([uR.json(), bR.json(), aR.json()]);

      if (!uR.ok) throw new Error(uJ?.message || 'Error cargando usuarios');
      if (!bR.ok) throw new Error(bJ?.message || 'Error cargando sucursales');
      if (!aR.ok) throw new Error(aJ?.message || 'Error cargando agentes');

      setSettingsUsers(Array.isArray(uJ) ? uJ : []);
      setSettingsBranches(Array.isArray(bJ) ? bJ : []);
      setSettingsAgents(Array.isArray(aJ) ? aJ : []);
    } catch (e) {
      setSettingsError('No se pudo cargar Configuración');
      console.error(e);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettingsAll();
    }
  }, [activeTab]);

  // Helper functions for ticket display
  const getDelayClass = (delay) => {
    if (!delay) return 'unknown';
    if (delay.includes('minutos') || delay.includes('min')) return 'good';
    if (delay.includes('horas') && parseInt(delay) < 24) return 'warning';
    if (delay.includes('días') || delay.includes('día')) return 'danger';
    return 'unknown';
  };

  const formatDelay = (delay) => {
    if (!delay) return 'Sin datos';
    return delay;
  };

  // Función para asignar colores únicos a agentes
  const getAgentColor = (agentName) => {
    if (!agentName || agentName === 'Sin agente') return '#6b7280';
    
    // Lista expandida de colores para mayor variedad
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#a855f7', '#eab308', '#f43f5e', '#0ea5e9',
      '#d946ef', '#0891b2', '#65a30d', '#dc2626', '#7c3aed',
      '#db2777', '#0284c7', '#16a34a', '#ea580c', '#4f46e5',
      '#059669', '#9333ea', '#ca8a04', '#e11d48', '#0284c7'
    ];
    
    // Crear un mapa de colores asignados para evitar duplicados
    if (!window.agentColorMap) {
      window.agentColorMap = {};
    }
    
    // Si ya tenemos un color asignado para este agente, retornarlo
    if (window.agentColorMap[agentName]) {
      return window.agentColorMap[agentName];
    }
    
    // Encontrar colores no usados
    const usedColors = Object.values(window.agentColorMap);
    const availableColors = colors.filter(color => !usedColors.includes(color));
    
    // Si hay colores disponibles, usar uno de ellos
    if (availableColors.length > 0) {
      // Generar hash para selección consistente pero única
      let hash = 0;
      for (let i = 0; i < agentName.length; i++) {
        hash = agentName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colorIndex = Math.abs(hash) % availableColors.length;
      const selectedColor = availableColors[colorIndex];
      window.agentColorMap[agentName] = selectedColor;
      return selectedColor;
    }
    
    // Si todos los colores están usados, generar uno único basado en hash
    let hash = 0;
    for (let i = 0; i < agentName.length; i++) {
      hash = agentName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const selectedColor = colors[colorIndex];
    window.agentColorMap[agentName] = selectedColor;
    return selectedColor;
  };

  // Función para formatear fecha de actividad reciente
  const formatActivityDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    
    console.log(`🔍 [DEBUG] Fecha recibida: "${dateString}"`);
    
    try {
      let date;
      
      // Intentar parseo directo primero
      date = new Date(dateString);
      console.log(`🔍 [DEBUG] Date parseado directo: ${date}, isValid: ${!isNaN(date.getTime())}`);
      
      // Si falla, intentar formato DD/MM/YYYY
      if (isNaN(date.getTime())) {
        // Verificar si es formato DD/MM/YYYY
        if (dateString.includes('/') && dateString.split('/').length === 3) {
          const parts = dateString.split('/');
          if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
            // Convertir DD/MM/YYYY a YYYY-MM-DD
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            const isoDate = `${year}-${month}-${day}`;
            console.log(`🔍 [DEBUG] Convertido DD/MM/YYYY a ISO: "${isoDate}"`);
            
            date = new Date(isoDate);
            console.log(`🔍 [DEBUG] Date parseado DD/MM/YYYY: ${date}, isValid: ${!isNaN(date.getTime())}`);
          }
        }
      }
      
      // Si sigue siendo inválido, devolver original
      if (isNaN(date.getTime())) {
        console.log(`🔍 [DEBUG] Todos los intentos fallaron, devolviendo original`);
        return dateString;
      }
      
      return formatValidDate(date);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return dateString;
    }
  };
  
  // Función auxiliar para formatear fecha válida
  const formatValidDate = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Resetear horas para comparación correcta
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Formato de hora
    const time = date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    if (activityDate.getTime() === today.getTime()) {
      return `Hoy, ${time}`;
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return `Ayer, ${time}`;
    } else {
      // Si es de esta semana, mostrar día de la semana
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      if (activityDate >= weekAgo) {
        const dayName = date.toLocaleDateString('es-AR', { weekday: 'long' });
        return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${time}`;
      } else {
        // Formato completo para fechas más antiguas
        return date.toLocaleDateString('es-AR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit' 
        }) + `, ${time}`;
      }
    }
  };
  
  // Función para asignar colores a SLA
  const getSLAColor = (slaText) => {
    if (!slaText || slaText === 'Sin SLA') return '#6b7280';
    
    const slaLower = slaText.toLowerCase();
    
    // Colores basados en el contenido del SLA - más específicos
    if (slaLower.includes('correcto') || slaLower.includes('ok') || slaLower.includes('dentro') || slaLower.includes('en tiempo') || slaLower.includes('cumplido')) {
      return '#10b981'; // Verde - SLA cumplido correctamente
    } else if (slaLower.includes('excedido') || slaLower.includes('excedente') || slaLower.includes('fuera de tiempo') || slaLower.includes('vencido') || slaLower.includes('incumplido')) {
      return '#ef4444'; // Rojo - SLA excedido/incumplido
    } else if (slaLower.includes('peligro') || slaLower.includes('warning') || slaLower.includes('advertencia') || slaLower.includes('casi') || slaLower.includes('por vencer')) {
      return '#f59e0b'; // Amarillo - SLA en peligro
    } else if (slaLower.includes('en progreso') || slaLower.includes('procesando') || slaLower.includes('pendiente')) {
      return '#3b82f6'; // Azul - SLA en proceso
    } else {
      return '#8b5cf6'; // Púrpura (default para otros casos)
    }
  };

  // Función para asignar colores a estados (manteniendo colores existentes)
  const getStatusColor = (statusText) => {
    if (!statusText) return '#6b7280';
    
    // Mantener los colores existentes del CSS
    const statusLower = statusText.toLowerCase();
    
    if (statusLower.includes('abierto') || statusLower.includes('open')) {
      return '#ef4444'; // Rojo (como status-abierto existente)
    } else if (statusLower.includes('cerrado') || statusLower.includes('closed')) {
      return '#10b981'; // Verde (como status-cerrado existente)
    } else if (statusLower.includes('en progreso') || statusLower.includes('progress')) {
      return '#3b82f6'; // Azul (como status-en-progreso existente)
    } else if (statusLower.includes('espera') || statusLower.includes('waiting')) {
      return '#f59e0b'; // Amarillo (como status-espera existente)
    } else if (statusLower.includes('resuelto') || statusLower.includes('resolved')) {
      return '#8b5cf6'; // Púrpura (como status-resuelto existente)
    } else if (statusLower.includes('derivado') || statusLower.includes('derived')) {
      return '#06b6d4'; // Cian (como status-derivado existente)
    } else if (statusLower.includes('pendiente') || statusLower.includes('pending')) {
      return '#eab308'; // Amarillo lima (como status-pendiente existente)
    } else {
      return '#6b7280'; // Gris (default)
    }
  };

  // Función para obtener icono de estado
  const getStatusIcon = (statusText) => {
    if (!statusText) return 'fas fa-question-circle';
    
    const statusLower = statusText.toLowerCase();
    
    if (statusLower.includes('abierto') || statusLower.includes('open')) {
      return 'fas fa-door-open'; // Puerta abierta
    } else if (statusLower.includes('cerrado') || statusLower.includes('closed')) {
      return 'fas fa-check-circle'; // Check verde
    } else if (statusLower.includes('en progreso') || statusLower.includes('progress')) {
      return 'fas fa-spinner'; // Spinner en progreso
    } else if (statusLower.includes('espera') || statusLower.includes('waiting')) {
      return 'fas fa-clock'; // Reloj de espera
    } else if (statusLower.includes('resuelto') || statusLower.includes('resolved')) {
      return 'fas fa-check-double'; // Doble check
    } else if (statusLower.includes('derivado') || statusLower.includes('derived')) {
      return 'fas fa-share'; // Compartir/derivar
    } else if (statusLower.includes('pendiente') || statusLower.includes('pending')) {
      return 'fas fa-hourglass-half'; // Reloj de arena
    } else {
      return 'fas fa-circle'; // Círculo genérico
    }
  };

  // Función para agregar notificaciones
  const addNotification = (type, title, message) => {
    console.log(`📢 [DEBUG] addNotification llamado: type=${type}, title=${title}, message=${message}`);
    
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type, // 'success', 'warning', 'error', 'info'
      title,
      message,
      timestamp: new Date()
    };
    
    console.log(`📢 [DEBUG] Notificación creada:`, notification);
    console.log(`📢 [DEBUG] Estado actual de notifications:`, notifications);
    
    setNotifications(prev => {
      const newNotifications = [...prev, notification];
      console.log(`📢 [DEBUG] Nuevo estado de notifications:`, newNotifications);
      return newNotifications;
    });
    
    // NO auto-eliminar - Las notificaciones se quedan hasta que el usuario las borre
    console.log(`📢 [DEBUG] Notificación agregada permanentemente`);
  };

  // Función para detectar nuevos tickets
  const checkForNewTickets = (newTickets) => {
    const currentCount = newTickets.length;
    const lastCount = persistentTicketCount.current;
    
    console.log(`🎫 [DEBUG] checkForNewTickets: lastCount=${lastCount}, currentCount=${currentCount}, initialized=${ticketsInitialized.current}`);
    
    // Si es la primera carga, solo inicializar el contador sin notificar
    if (!ticketsInitialized.current) {
      console.log(`🎫 [INIT] Inicializando contador de tickets: ${currentCount}`);
      persistentTicketCount.current = currentCount;
      setLastTicketCount(currentCount);
      ticketsInitialized.current = true;
      return;
    }
    
    if (currentCount > lastCount) {
      const newCount = currentCount - lastCount;
      console.log(`🎉 [NUEVOS TICKETS] Detectados ${newCount} tickets nuevos`);
      console.log(`🎫 [DETAILS] Antes: ${lastCount}, Ahora: ${currentCount}, Diferencia: ${newCount}`);
      
      addNotification(
        'success',
        '🎫 Nuevo Ticket',
        `${newCount} ticket${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`
      );
      
      // Sonido de notificación para tickets (importante!)
      playNotificationSound();
    } else if (currentCount < lastCount) {
      console.log(`🎫 [INFO] Tickets eliminados/cerrados: ${lastCount - currentCount}`);
    } else {
      console.log(`🎫 [INFO] Sin cambios en tickets: ${currentCount}`);
    }
    
    persistentTicketCount.current = currentCount;
    setLastTicketCount(currentCount);
  };

  // Función para detectar cambios en servidores
  const checkServerChanges = (newStatus) => {
    const lastStatus = persistentServerStatus.current;
    console.log(`🖥️ [DEBUG] checkServerChanges: newStatus=${JSON.stringify(newStatus)}`);
    console.log(`🖥️ [DEBUG] checkServerChanges: lastStatus=${JSON.stringify(lastStatus)}`);
    
    Object.keys(newStatus).forEach(ip => {
      const oldStatus = lastStatus[ip];
      const newServerStatus = newStatus[ip];
      
      console.log(`🖥️ [DEBUG] Servidor ${ip}: old=${oldStatus?.status}, new=${newServerStatus.status}`);
      
      // Si es la primera vez que vemos este servidor, notificar su estado inicial
      if (!oldStatus) {
        if (newServerStatus.status === 'error' || newServerStatus.status === 'offline') {
          console.log(`🔴 [SERVIDOR CAÍDO - INICIAL] ${ip}`);
          
          addNotification(
            'error',
            '🔴 Servidor Caído',
            `Servidor ${ip} fuera de línea`
          );
          playNotificationSound();
        }
        // No notificar servidores online inicialmente para evitar spam
      } else if (oldStatus.status !== newServerStatus.status) {
        // SOLO NOTIFICAR SI EL ESTADO CAMBIÓ REALMENTE
        if (newServerStatus.status === 'error' || newServerStatus.status === 'offline') {
          console.log(`🔴 [SERVIDOR CAÍDO - CAMBIO DE ESTADO] ${ip}: de ${oldStatus.status} a ${newServerStatus.status}`);
          
          addNotification(
            'error',
            '🔴 Servidor Caído',
            `Servidor ${ip} fuera de línea`
          );
          playNotificationSound();
        } else if ((oldStatus.status === 'error' || oldStatus.status === 'offline') && newServerStatus.status === 'success') {
          console.log(`🟢 [SERVIDOR RECUPERADO - CAMBIO DE ESTADO] ${ip}: de ${oldStatus.status} a ${newServerStatus.status}`);
          
          addNotification(
            'success',
            '🟢 Servidor Recuperado',
            `Servidor ${ip} en línea`
          );
        }
      } else {
        // MISMO ESTADO - NO NOTIFICAR PARA EVITAR SPAM
        console.log(`🔇 [MISMO ESTADO] ${ip}: sigue ${newServerStatus.status} - no se notifica`);
      }
    });
    
    // Actualizar estados persistentes
    persistentServerStatus.current = newStatus;
    setLastServerStatus(newStatus);
  };

  // Función para reproducir sonido (opcional)
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS2Oy9diMFl2+z5N17');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Silenciar error si el navegador bloquea autoplay
    } catch (e) {
      // Silenciar error de audio
    }
  };
  const fetchBranchSuggestions = async (userName) => {
    if (!userName || userName.trim() === '') {
      setBranchSuggestions([]);
      setShowBranchSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/suggest_branch/${encodeURIComponent(userName.trim())}`);
      const data = await response.json();
      
      if (data.status === 'success' && data.suggestions.length > 0) {
        setBranchSuggestions(data.suggestions);
        setShowBranchSuggestions(true);
      } else {
        setBranchSuggestions([]);
        setShowBranchSuggestions(false);
      }
    } catch (error) {
      // Silenciar errores para no afectar la UX
      console.error('Error al obtener sugerencias de sucursal:', error);
      setBranchSuggestions([]);
      setShowBranchSuggestions(false);
    }
  };

  // Función para escanear patrones usuario-sucursal
  const scanUserPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/scan_user_patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        alert(`Escaneo completado: ${data.message}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error al escanear patrones:', error);
      alert('Error al escanear patrones de usuario-sucursal');
    }
  };

  const fetchData = async () => {
    try {
      console.log(`🔄 [DEBUG] fetchData iniciando...`);
      const responses = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/stats`),
        fetch(`${API_BASE}/api/tickets`)
      ]);
      const statsData = await responses[0].json();
      const ticketsData = await responses[1].json();
      
      console.log(`🎫 [DEBUG] fetchData obtuvo ${ticketsData.length} tickets`);
      console.log(`🎫 [DEBUG] fetchData: lastTicketCount=${lastTicketCount}, ticketsData.length=${ticketsData.length}`);
      
      // Siempre detectar nuevos tickets (incluso en la primera carga)
      checkForNewTickets(ticketsData);
      
      setStats(statsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.log(`❌ [ERROR] fetchData falló: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchServersData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/servers`);
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchServersStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/servers/status`);
      const data = await response.json();
      
      // Detectar cambios en servidores ANTES de actualizar el estado
      checkServerChanges(data);
      
      setServerMonitoring(data);
    } catch (error) {
      console.error('Error fetching server status:', error);
    }
  };

  const startAllMonitors = async () => {
    try {
      await fetch(`${API_BASE}/api/servers/monitor/start-all`, { method: 'POST' });
    } catch (error) {
      console.error('Error starting all monitors:', error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus({ loading: true, message: 'Procesando Excel...', type: 'info' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/tickets/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'success') {
        setUploadStatus({ loading: false, message: data.message, type: 'success' });
        fetchData(); // Recargar datos
      } else {
        setUploadStatus({ loading: false, message: data.message, type: 'error' });
      }
    } catch (error) {
      setUploadStatus({ loading: false, message: 'Error de conexión con el servidor', type: 'error' });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveTicket = async (updatedTicket) => {
    try {
      const response = await fetch(`${API_BASE}/api/tickets/${updatedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setViewMode('list');
        fetchData();
        fetchGroups();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleUpdateServer = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/api/servers/${editingServer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServer)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setShowEditServerModal(false);
        setEditingServer(null);
        fetchServersData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleDeleteServer = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) return;
    try {
      const resp = await fetch(`${API_BASE}/api/servers/${id}`, {
        method: 'DELETE'
      });
      const data = await resp.json();
      if (data.status === 'success') {
        fetchServersData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    try {
      // Agregar la categoría actual a los datos del servidor
      const serverDataWithCategory = {
        ...newServerData,
        category: activeServerCategory // Agregar la categoría activa
      };
      
      const resp = await fetch(`${API_BASE}/api/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverDataWithCategory)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        alert('Servidor agregado correctamente en ' + (activeServerCategory === 'main' ? 'Servidores Principales' : 'TRs y RDs'));
        setShowAddServerModal(false);
        setNewServerData({
          branch: '', branch_code: '', primary_service_provider: '',
          primary_service_ip: '', primary_service_speed: '',
          secondary_service_provider: '', secondary_service_ip: '', secondary_service_speed: ''
        });
        fetchServersData();
        fetchGroups();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleStartMonitor = async (ip) => {
    try {
      await fetch(`${API_BASE}/start_monitor/${ip}`);
      fetchServersStatus();
    } catch (error) {
      console.error('Error starting monitor:', error);
    }
  };

  const handleStopMonitor = async (ip) => {
    try {
      await fetch(`${API_BASE}/stop_monitor/${ip}`, { method: 'POST' });
      fetchServersStatus();
    } catch (error) {
      console.error('Error stopping monitor:', error);
    }
  };

  const handlePingOnce = async (ip) => {
    try {
      const formData = new FormData();
      formData.append('ip', ip);
      const resp = await fetch(`${API_BASE}/ping_server`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      const resultMsg = data.status === 'success' ? `${data.latency}ms` : data.message;

      setPingResults(prev => ({
        ...prev,
        [ip]: { msg: resultMsg, isError: data.status !== 'success', timestamp: Date.now() }
      }));

      // Limpiar el mensaje después de 10 segundos para volver al gráfico
      setTimeout(() => {
        setPingResults(prev => {
          const next = { ...prev };
          delete next[ip];
          return next;
        });
      }, 10000);

      fetchServersStatus();
    } catch (error) {
      console.error('Error in manual ping:', error);
    }
  };

  // Lógica de Paginación
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  const Pagination = () => (
    totalPages > 1 ? (
      <div className="pagination" style={{ margin: '1rem 0' }}>
        <button
          className="pagination-btn"
          onClick={() => {
            setCurrentPage(prev => Math.max(prev - 1, 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === 1}
        >
          <i className="fas fa-chevron-left"></i> Anterior
        </button>
        <span className="page-info">Página <strong>{currentPage}</strong> de {totalPages}</span>
        <button
          className="pagination-btn"
          onClick={() => {
            setCurrentPage(prev => Math.min(prev + 1, totalPages));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === totalPages}
        >
          Siguiente <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    ) : null
  );

  const TicketDetailView = ({ ticket, onEdit, onBack }) => (
    <div className="panel animate-fade-in" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <button className="nav-item" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem 1.2rem' }}>
          <i className="fas fa-arrow-left"></i> Volver al listado
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="nav-item" onClick={onEdit} style={{ background: 'var(--primary)', color: 'white' }}>
            <i className="fas fa-edit"></i> Editar Ticket
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card main-info">
          <div className="detail-header">
            <span className="ticket-number">
              <a
                href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ticket-header-link"
                style={{ fontSize: 'inherit' }}
              >
                Ticket #{ticket.ticket_number}
              </a>
            </span>
            <span className={`badge status-${(ticket.status || '').trim().toLowerCase().replace(/\s+/g, '-')}`}>{ticket.status}</span>
          </div>

          <div className="info-section">
            <div className="info-item">
              <label>Usuario</label>
              <span>{ticket.user || 'S/U'}</span>
            </div>
            <div className="info-item">
              <label>Sucursal</label>
              <span>{ticket.branch || 'S/D'}</span>
            </div>
          </div>

          <div className="info-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <div className="info-item">
              <label>Creado</label>
              <span>{ticket.creation_date}</span>
            </div>
            <div className="info-item">
              <label>Cierre</label>
              <span>{ticket.close_date || 'En proceso'}</span>
            </div>
            <div className="info-item">
              <label>Demora</label>
              <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{ticket.delay}</span>
            </div>
          </div>
        </div>

        <div className="detail-card side-info">
          <h3><i className="fas fa-user-shield"></i> Asignación</h3>
          <div className="info-item">
            <label>Agente Principal</label>
            <span>{ticket.agent || 'Sin asignar'}</span>
          </div>
          <div className="info-item">
            <label>Colaboradores</label>
            <span>{ticket.collaborators || 'Ninguno'}</span>
          </div>

          <h3 style={{ marginTop: '2rem' }}><i className="fas fa-tachometer-alt"></i> Rendimiento SLA</h3>
          <div className="info-item">
            <label>Estado SLA</label>
            <span className={`sla-badge ${ticket.sla_resolution?.toLowerCase() === 'correcto' ? 'sla-ok' : 'sla-warn'}`}>
              {ticket.sla_resolution || 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <label>Primera Respuesta</label>
            <span>{ticket.first_response || '--'}</span>
          </div>
        </div>

        <div className="detail-card full-width">
          <h3><i className="fas fa-align-left"></i> Detalles / Notas</h3>
          <p style={{ 
            lineHeight: '1.6', 
            color: ticket.details ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', 
            fontStyle: ticket.details ? 'normal' : 'italic',
            background: 'rgba(0,0,0,0.2)', 
            padding: '1.5rem', 
            borderRadius: '12px' 
          }}>
            {ticket.details || 'Sin detalle...'}
          </p>
        </div>
      </div>
    </div>
  );

  const TicketEditView = ({ ticket, onSave, onBack }) => {
    const [formData, setFormData] = useState({ 
      ...ticket,
      details: ticket.details && ticket.details !== 'Sin detalle...' ? ticket.details : ''
    });
    const [localBranchSuggestions, setLocalBranchSuggestions] = useState([]);
    const [showLocalSuggestions, setShowLocalSuggestions] = useState(false);

    // Función local para obtener sugerencias
    const fetchLocalBranchSuggestions = async (userName) => {
      if (!userName || userName.trim() === '') {
        setLocalBranchSuggestions([]);
        setShowLocalSuggestions(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/suggest_branch/${encodeURIComponent(userName.trim())}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.suggestions.length > 0) {
          setLocalBranchSuggestions(data.suggestions);
          setShowLocalSuggestions(true);
        } else {
          setLocalBranchSuggestions([]);
          setShowLocalSuggestions(false);
        }
      } catch (error) {
        console.error('Error al obtener sugerencias de sucursal:', error);
        setLocalBranchSuggestions([]);
        setShowLocalSuggestions(false);
      }
    };

    // Efecto para obtener sugerencias cuando cambia el usuario
    useEffect(() => {
      if (formData.user && formData.user.trim() !== '') {
        fetchLocalBranchSuggestions(formData.user);
      } else {
        setLocalBranchSuggestions([]);
        setShowLocalSuggestions(false);
      }
    }, [formData.user]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      if (value === 'new') {
        const labels = { 'agent': 'Agente', 'branch': 'Sucursal', 'user': 'Usuario', 'collaborators_select': 'Colaborador' };
        const label = labels[name] || name;
        const newValue = prompt(`Ingrese el nombre del nuevo ${label}:`);
        if (newValue) {
          if (name === 'collaborators' || name === 'collaborators_select') {
            const current = formData.collaborators && formData.collaborators !== 'None' ? formData.collaborators : '';
            const updated = current ? `${current}, ${newValue}` : newValue;
            setFormData(prev => ({ ...prev, collaborators: updated }));
          } else {
            setFormData(prev => ({ ...prev, [name]: newValue }));
          }
        }
        return;
      }

      if (name === 'collaborators_select') {
        if (!value) return;
        const current = formData.collaborators && formData.collaborators !== 'None' ? formData.collaborators : '';
        const list = current ? current.split(',').map(s => s.trim()) : [];
        if (!list.includes(value)) {
          const updated = current ? `${current}, ${value}` : value;
          setFormData(prev => ({ ...prev, collaborators: updated }));
        }
        return;
      }

      setFormData(prev => ({ ...prev, [name]: value }));
    };

    const removeCollaborator = (collab) => {
      const current = formData.collaborators || '';
      const updated = current.split(',')
        .map(s => s.trim())
        .filter(s => s !== collab)
        .join(', ');
      setFormData(prev => ({ ...prev, collaborators: updated }));
    };

    return (
    <div className="app">
      {/* Sistema de Notificaciones - Global */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification notification-${notification.type}`}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: notification.type === 'success' ? '#10b981' :
                           notification.type === 'error' ? '#ef4444' :
                           notification.type === 'warning' ? '#f59e0b' : '#3b82f6',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
              minWidth: '300px',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideInRight 0.3s ease-out',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                {notification.title}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {notification.message}
              </div>
            </div>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Header Principal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="brand-icon" style={{ width: '45px', height: '45px', fontSize: '1.2rem', margin: 0 }}>
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
                <a
                  href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ticket-header-link"
                >
                  Ticket #{ticket.ticket_number}
                </a>
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Gestión y actualización de datos</p>
            </div>
          </div>
          <button className="nav-item" onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)' }}>
            <i className="fas fa-times"></i> Cancelar
          </button>
        </div>

        <form className="edit-form" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Agente Principal</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  name="agent"
                  value={formData.agent || ''}
                  onChange={handleChange}
                  className="custom-input"
                  style={{ borderLeft: `4px solid ${getAgentColor(formData.agent)}` }}
                >
                  <option value="">-- Seleccionar Agente --</option>
                  {agents.map(a => <option key={a} value={a}>{a}</option>)}
                  {formData.agent && !agents.includes(formData.agent) && <option value={formData.agent}>{formData.agent}</option>}
                  <option value="new">+ Agregar Nuevo...</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select name="status" value={formData.status || ''} onChange={handleChange} className="custom-input">
                <option value="Abierto">Abierto</option>
                <option value="Cerrado">Cerrado</option>
                <option value="En espera">En espera</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Derivado">Derivado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Usuario</label>
              <select 
                name="user" 
                value={formData.user || ''} 
                onChange={handleChange}
                className="custom-input"
              >
                <option value="">-- Seleccionar Usuario --</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
                {formData.user && !users.includes(formData.user) && <option value={formData.user}>{formData.user}</option>}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sucursal</label>
              <select name="branch" value={formData.branch || ''} onChange={handleChange} className="custom-input">
                <option value="">-- Seleccionar Sucursal --</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                {formData.branch && !branches.includes(formData.branch) && <option value={formData.branch}>{formData.branch}</option>}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
              
              {/* Sugerencias inteligentes de sucursal */}
              {showLocalSuggestions && localBranchSuggestions.length > 0 && (
                <div className="branch-suggestions" style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'rgba(74, 144, 226, 0.1)',
                  border: '1px solid var(--primary)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--primary)' }}>
                    <i className="fas fa-lightbulb"></i> Sugerencias basadas en el historial:
                  </div>
                  {localBranchSuggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '6px 10px',
                        margin: '4px 0',
                        background: index === 0 ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: index === 0 ? '1px solid var(--primary)' : '1px solid transparent'
                      }}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, branch: suggestion.branch }));
                        setShowLocalSuggestions(false);
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = index === 0 ? 'rgba(74, 144, 226, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = index === 0 ? 'rgba(74, 144, 226, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{ fontWeight: 500, color: 'white' }}>
                        {suggestion.branch} {index === 0 && <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}> (Más probable)</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                        {suggestion.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>SLA de Resolución</label>
              <select name="sla_resolution" value={formData.sla_resolution || ''} onChange={handleChange} className="custom-input">
                <option value="Correcto">Correcto</option>
                <option value="Excedido">Excedido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de Cierre</label>
              <DatePicker
                value={formData.close_date === 'None' ? '' : (formData.close_date || '')}
                onChange={(value) => setFormData(prev => ({ ...prev, close_date: value }))}
                placeholder="Seleccionar fecha de cierre"
              />
            </div>
            <div className="form-group full-width">
              <label>Colaboradores</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    name="collaborators_select"
                    onChange={handleChange}
                    className="custom-input"
                    value=""
                  >
                    <option value="">-- Agregar Colaborador --</option>
                    {agents.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="new">+ Agregar Nuevo...</option>
                  </select>
                  <button
                    type="button"
                    className="nav-item"
                    style={{ background: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}
                    onClick={() => setFormData(prev => ({ ...prev, collaborators: '' }))}
                  >
                    Limpiar Todo
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  {formData.collaborators && formData.collaborators !== 'None' && formData.collaborators.split(',').map(c => c.trim()).filter(c => c).map((c, idx) => (
                    <span key={idx} className="badge" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px' }}>
                      {c}
                      <i className="fas fa-times" style={{ cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => removeCollaborator(c)}></i>
                    </span>
                  ))}
                  {(!formData.collaborators || formData.collaborators === 'None' || formData.collaborators.trim() === '') && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay colaboradores seleccionados</span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group full-width">
              <label>Detalles / Notas</label>
              <textarea 
                name="details" 
                value={formData.details || ''} 
                onChange={handleChange} 
                className="custom-input" 
                style={{ height: '120px' }}
                placeholder="Sin detalle..."
              ></textarea>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="nav-item" style={{ background: 'var(--success)', color: 'white', padding: '1rem 3rem' }}>
              <i className="fas fa-save"></i> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    );
  };

  const ServerMonitoringView = () => {
    const renderService = (ip, provider, speed, type) => {
      if (!ip) return null;
      const statusData = serverMonitoring[ip] || {};
      const isMonitoring = !!serverMonitoring[ip];
      const isOnline = statusData.status === 'success';
      const latency = statusData.latency || 0;
      const loss = statusData.packet_loss || 0;
      const latencies = statusData.latencies || [];
      const manualPing = pingResults[ip];

      return (
        <div className={`service-section ${isMonitoring ? 'scanning' : ''}`}>
          <div className="service-header">
            <div className={`service-title ${type}`}>
              <i className={type === 'primary' ? 'fas fa-rocket' : 'fas fa-shield-alt'}></i>
              {type === 'primary' ? 'Principal' : 'Respaldo'}
            </div>
            <div className={`status-indicator ${isOnline ? 'status-active' : (isMonitoring ? 'status-monitoring' : 'status-inactive')}`}>
              {isOnline ? 'Online' : (isMonitoring ? 'Monitoreando' : 'Offline')}
            </div>
          </div>

          <div className="service-details-mini">
            <span className="ip-text">{ip}</span>
            <span className="provider-text">{provider} {speed && `(${speed})`}</span>
          </div>

          <div className="monitoring-display" style={{ minHeight: '60px', display: 'flex', alignItems: 'center' }}>
            {manualPing ? (
              <div className={`ping-result-msg animate-fade-in ${manualPing.isError ? 'text-danger' : 'text-success'}`} style={{ fontSize: '0.85rem', fontWeight: '700', width: '100%', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: '8px' }}></i>
                {manualPing.msg}
              </div>
            ) : (
              <LatencyChart data={latencies} colorClass={type === 'primary' ? 'path-primary' : 'path-secondary'} />
            )}
          </div>

          <div className="service-stats">
            <div className="stat-group">
              <label>Latencia</label>
              <span className={`service-stat-value ${latency > 150 ? 'text-warn' : 'text-success'}`}>
                {latency > 0 ? `${latency.toFixed(1)}ms` : '--'}
              </span>
            </div>
            <div className="stat-group">
              <label>Pérdida</label>
              <span className={`service-stat-value ${loss > 5 ? 'text-warn' : ''}`}>
                {loss.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="service-controls">
            <button className="btn-ctrl btn-ping" onClick={() => handlePingOnce(ip)} title="Ping Único">
              <i className="fas fa-satellite-dish"></i>
            </button>
            {!isMonitoring ? (
              <button className="btn-ctrl btn-start" onClick={() => handleStartMonitor(ip)} title="Iniciar Monitoreo">
                <i className="fas fa-play"></i>
              </button>
            ) : (
              <button className="btn-ctrl btn-stop active" onClick={() => handleStopMonitor(ip)} title="Detener Monitoreo">
                <i className="fas fa-stop"></i>
              </button>
            )}
          </div>
        </div>
      );
    };

    // Estado para categorías (movido al nivel principal)
    // const [activeCategory, setActiveCategory] = useState('main');

    // Datos de categorías
    const categories = {
      main: {
        title: "Servidores Principales",
        icon: "fas fa-server",
        color: "#3b82f6",
        description: "Infraestructura principal de producción"
      },
      trs: {
        title: "TRs y RDs",
        icon: "fas fa-network-wired", 
        color: "#8b5cf6",
        description: "Terminales de red y routers de distribución"
      }
    };

    return (
      <div className="servers-view">
        <div className="panel-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Monitoreo de Servidores</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estado en tiempo real de infraestructura por categorías</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="nav-item" onClick={startAllMonitors} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <i className="fas fa-sync-alt"></i> Re-scan General
            </button>
            <button className="nav-item" style={{ background: 'var(--primary)', color: 'white' }} onClick={() => setShowAddServerModal(true)}>
              <i className="fas fa-plus"></i> Nueva {activeServerCategory === 'trs' ? 'TR/RD' : 'Sede'}
            </button>
          </div>
        </div>

        {/* Selector de Categorías */}
        <div className="categories-selector" style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)'
        }}>
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveServerCategory(key)}
              className="category-tab"
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                background: activeServerCategory === key 
                  ? `linear-gradient(135deg, ${category.color}20, ${category.color}05)`
                  : 'rgba(255,255,255,0.02)',
                border: activeServerCategory === key 
                  ? `2px solid ${category.color}40`
                  : '1px solid var(--glass-border)',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem'
              }}
              onMouseEnter={(e) => {
                if (activeServerCategory !== key) {
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeServerCategory !== key) {
                  e.target.style.background = 'rgba(255,255,255,0.02)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <i className={category.icon} style={{ color: category.color, fontSize: '1.2rem' }}></i>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1rem', fontWeight: '700' }}>{category.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {category.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Contenido de la categoría activa */}
        {activeServerCategory === 'main' && (
          <div className="category-content">
            <div className="category-info" style={{ 
              marginBottom: '1.5rem',
              padding: '1rem',
              background: `linear-gradient(135deg, ${categories.main.color}10, transparent)`,
              borderRadius: '12px',
              border: `1px solid ${categories.main.color}20`
            }}>
              <h3 style={{ 
                color: categories.main.color, 
                fontSize: '1.2rem', 
                fontWeight: '700',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className={categories.main.icon}></i>
                {categories.main.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {categories.main.description} • {servers.filter(server => server.category === 'main' || !server.category).length} servidores activos
              </p>
            </div>

            <div className="server-cards-grid">
              {servers.filter(server => server.category === 'main' || !server.category).map(server => (
                <div key={server.id} className="server-card">
                  <div className="server-card-header">
                    <div>
                      <h3>{server.branch}</h3>
                      <span className="branch-code">{server.branch_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-ctrl" onClick={() => { setEditingServer(server); setShowEditServerModal(true); }} title="Editar Sucursal">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn-ctrl" onClick={() => handleDeleteServer(server.id)} title="Eliminar Sucursal" style={{ color: 'var(--danger)' }}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  <div className="services-container">
                    {renderService(server.primary_service_ip, server.primary_service_provider, server.primary_service_speed, 'primary')}
                    {renderService(server.secondary_service_ip, server.secondary_service_provider, server.secondary_service_speed, 'secondary')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeServerCategory === 'trs' && (
          <div className="category-content">
            <div className="category-info" style={{ 
              marginBottom: '1.5rem',
              padding: '1rem',
              background: `linear-gradient(135deg, ${categories.trs.color}10, transparent)`,
              borderRadius: '12px',
              border: `1px solid ${categories.trs.color}20`
            }}>
              <h3 style={{ 
                color: categories.trs.color, 
                fontSize: '1.2rem', 
                fontWeight: '700',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className={categories.trs.icon}></i>
                {categories.trs.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {categories.trs.description} • {servers.filter(server => server.category === 'trs').length} servidores configurados
              </p>
            </div>

            {/* Mostrar servidores TRs/RDs si existen */}
            {servers.filter(server => server.category === 'trs').length > 0 ? (
              <div className="server-cards-grid">
                {servers.filter(server => server.category === 'trs').map(server => (
                  <div key={server.id} className="server-card">
                    <div className="server-card-header">
                      <div>
                        <h3>{server.branch}</h3>
                        <span className="branch-code">{server.branch_code}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-ctrl" onClick={() => { setEditingServer(server); setShowEditServerModal(true); }} title="Editar Sucursal">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn-ctrl" onClick={() => handleDeleteServer(server.id)} title="Eliminar Sucursal" style={{ color: 'var(--danger)' }}>
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                    <div className="services-container">
                      {renderService(server.primary_service_ip, server.primary_service_provider, server.primary_service_speed, 'primary')}
                      {renderService(server.secondary_service_ip, server.secondary_service_provider, server.secondary_service_speed, 'secondary')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-category-state" style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                border: '1px solid var(--glass-border)'
              }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `${categories.trs.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2rem'
              }}>
                <i className={categories.trs.icon} style={{ color: categories.trs.color }}></i>
              </div>
              <h3 style={{ 
                color: '#ffffff', 
                fontSize: '1.3rem', 
                fontWeight: '600', 
                marginBottom: '1rem' 
              }}>
                No hay TRs o RDs configurados
              </h3>
              <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: '1rem', 
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                Agrega tus primeras terminales de red y routers de distribución para comenzar a monitorearlos
              </p>
              <button 
                onClick={() => setShowAddServerModal(true)}
                style={{
                  background: categories.trs.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 8px 20px ${categories.trs.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-plus"></i>
                Agregar Primer TR/RD
              </button>
            </div>
            )}
          </div>
        )}

        <>
        {showAddServerModal && (
          <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
          }}>
            <div className="panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '95vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Agregar Nueva {activeServerCategory === 'trs' ? 'TR/RD' : 'Sucursal'}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure los detalles de conexión del nuevo {activeServerCategory === 'trs' ? 'dispositivo de red' : 'sitio'}</p>
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.3rem 0.8rem', 
                    background: `${activeServerCategory === 'trs' ? '#8b5cf6' : '#3b82f6'}20`, 
                    borderRadius: '20px', 
                    display: 'inline-block',
                    fontSize: '0.8rem',
                    color: activeServerCategory === 'trs' ? '#8b5cf6' : '#3b82f6',
                    fontWeight: '600'
                  }}>
                    <i className={`fas ${activeServerCategory === 'trs' ? 'fa-network-wired' : 'fa-server'}`}></i> 
                    Se guardará en: {activeServerCategory === 'trs' ? 'TRs y RDs' : 'Servidores Principales'}
                  </div>
                </div>
                <button className="nav-item" onClick={() => setShowAddServerModal(false)} style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleAddServer}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Nombre de {activeServerCategory === 'trs' ? 'Dispositivo' : 'Sucursal'}</label>
                    <input
                      type="text" required className="custom-input" placeholder={activeServerCategory === 'trs' ? 'Ej: TR Central' : 'Ej: Sucursal Pilar'}
                      value={newServerData.branch}
                      onChange={(e) => setNewServerData({ ...newServerData, branch: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de {activeServerCategory === 'trs' ? 'Dispositivo' : 'Sucursal'}</label>
                    <input
                      type="text" required className="custom-input" placeholder={activeServerCategory === 'trs' ? 'Ej: TR001' : 'Ej: PIL'}
                      value={newServerData.branch_code}
                      onChange={(e) => setNewServerData({ ...newServerData, branch_code: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}><i className="fas fa-network-wired"></i> Conexión Primaria</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: Fibertel"
                      value={newServerData.primary_service_provider}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Primaria</label>
                    <input
                      type="text" required className="custom-input" placeholder="Ej: 192.168.1.1"
                      value={newServerData.primary_service_ip}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_ip: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Velocidad Contratada</label>
                    <input
                      type="text" className="custom-input" placeholder="Ej: 100 Mbps"
                      value={newServerData.primary_service_speed}
                      onChange={(e) => setNewServerData({ ...newServerData, primary_service_speed: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent)' }}><i className="fas fa-link"></i> Conexión Secundaria (Opcional)</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" className="custom-input"
                      value={newServerData.secondary_service_provider}
                      onChange={(e) => setNewServerData({ ...newServerData, secondary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Secundaria</label>
                    <input
                      type="text" className="custom-input"
                      value={newServerData.secondary_service_ip}
                      onChange={(e) => setNewServerData({ ...newServerData, secondary_service_ip: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button type="button" className="nav-item" onClick={() => setShowAddServerModal(false)} style={{ background: 'rgba(255,255,255,0.05)' }}>Cancelar</button>
                  <button type="submit" className="nav-item" style={{ background: 'var(--success)', color: 'white', padding: '0.8rem 2.5rem' }}>Guardar {activeServerCategory === 'trs' ? 'TR/RD' : 'Sucursal'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditServerModal && editingServer && (
          <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
          }}>
            <div className="panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '95vh', overflowY: 'auto', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Editar Sucursal</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Modifique los detalles de conexión de la sucursal</p>
                </div>
                <button className="nav-item" onClick={() => { setShowEditServerModal(false); setEditingServer(null); }} style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleUpdateServer}>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Nombre de Sucursal</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.branch}
                      onChange={(e) => setEditingServer({ ...editingServer, branch: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de Sucursal</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.branch_code}
                      onChange={(e) => setEditingServer({ ...editingServer, branch_code: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}><i className="fas fa-network-wired"></i> Conexión Primaria</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.primary_service_provider}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Primaria</label>
                    <input
                      type="text" required className="custom-input"
                      value={editingServer.primary_service_ip}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_ip: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Velocidad Contratada</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.primary_service_speed}
                      onChange={(e) => setEditingServer({ ...editingServer, primary_service_speed: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent)' }}><i className="fas fa-link"></i> Conexión Secundaria (Opcional)</h3>
                  </div>

                  <div className="form-group">
                    <label>Proveedor</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.secondary_service_provider || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, secondary_service_provider: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>IP Secundaria</label>
                    <input
                      type="text" className="custom-input"
                      value={editingServer.secondary_service_ip || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, secondary_service_ip: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button type="button" className="nav-item" onClick={() => { setShowEditServerModal(false); setEditingServer(null); }} style={{ background: 'rgba(255,255,255,0.05)' }}>Cancelar</button>
                  <button type="submit" className="nav-item" style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem 2.5rem' }}>Actualizar Sucursal</button>
                </div>
              </form>
            </div>
          </div>
        )}
        </>
      </div>
    );
  };

  // Home View Component - Super Complete Version
  const HomeView = () => {
    const [recentTickets, setRecentTickets] = useState([]);
    const [quickStats, setQuickStats] = useState(null);
    const [dashboardData, setDashboardData] = useState({
      stats: null,
      trends: null,
      sla: null,
      heatmap: null
    });
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Fetch all data
    const fetchHomeData = async () => {
      try {
        console.log('Fetching home data...');
        
        // Fetch recent tickets
        const ticketsRes = await fetch(`${API_BASE}/api/tickets`);
        const ticketsData = await ticketsRes.json();
        console.log('Tickets data:', ticketsData);
        
        // Fetch dashboard data
        const [statsRes, trendsRes, slaRes, heatmapRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/stats`),
          fetch(`${API_BASE}/api/dashboard/trends`),
          fetch(`${API_BASE}/api/dashboard/sla`),
          fetch(`${API_BASE}/api/dashboard/heatmap`)
        ]);

        const [stats, trends, sla, heatmap] = await Promise.all([
          statsRes.json(),
          trendsRes.json(),
          slaRes.json(),
          heatmapRes.json()
        ]);
        
        console.log('Dashboard stats:', stats);
        console.log('Dashboard trends:', trends);
        
        // Get recent tickets (last 5) - La estructura es un array directo
        const tickets = Array.isArray(ticketsData) ? ticketsData : ticketsData.tickets || [];
        console.log('Tickets array:', tickets);
        
        const recent = tickets
          .sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date))
          .slice(0, 5);

        // Calculate quick stats from tickets data
        const quickStatsData = {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'Abierto').length,
          inProgress: tickets.filter(t => t.status === 'En Progreso').length,
          closed: tickets.filter(t => t.status === 'Cerrado').length
        };

        console.log('Quick stats calculated:', quickStatsData);

        setRecentTickets(recent);
        setQuickStats(quickStatsData);
        setDashboardData({
          stats: stats.status === 'success' ? stats.stats : null,
          trends: trends.status === 'success' ? trends.trends : null,
          sla: sla.status === 'success' ? sla.sla : null,
          heatmap: heatmap.status === 'success' ? heatmap.heatmap : null
        });
      } catch (error) {
        console.error('Error fetching home data:', error);
        // Set default values to prevent zero display
        setQuickStats({
          total: 0,
          open: 0,
          inProgress: 0,
          closed: 0
        });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchHomeData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchHomeData, 30000);
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      // Initialize compact charts when data is loaded
      if (dashboardData.stats && dashboardData.trends) {
        initializeCompactCharts();
      }
    }, [dashboardData]);

    const initializeCompactCharts = () => {
      // Compact Trends Chart
      if (dashboardData.trends && dashboardData.trends.daily) {
        const ctx = document.getElementById('compactTrendsChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: dashboardData.trends.daily.slice(-7).map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
              }),
              datasets: [{
                label: 'Tickets',
                data: dashboardData.trends.daily.slice(-7).map(d => d.tickets),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: false }
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                  grid: { color: 'rgba(148, 163, 184, 0.1)' },
                  ticks: { color: '#94a3b8', font: { size: 11 } }
                }
              }
            }
          });
        }
      }

      // Compact SLA Chart
      if (dashboardData.sla && dashboardData.sla.ranges) {
        const ctx = document.getElementById('compactSlaChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: dashboardData.sla.ranges.map(r => r.range),
              datasets: [{
                data: dashboardData.sla.ranges.map(r => r.count),
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(251, 191, 36, 0.8)',
                  'rgba(251, 146, 60, 0.8)',
                  'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#1e293b'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: false }
              }
            }
          });
        }
      }
    };

    if (loading) {
      return (
        <div className="section-placeholder">
          <i className="fas fa-home fa-spin"></i>
          <p>Cargando inicio completo...</p>
        </div>
      );
    }

    return (
      <div className="home-container">
        {/* Welcome Banner - Solo Mini Cards */}
        <div className="welcome-banner">
          <div className="welcome-stats">
            <div className="stat-card total">
              <div className="stat-content">
                <div className="stat-number">{quickStats?.total || 0}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="stat-card open">
              <div className="stat-content">
                <div className="stat-number">{quickStats?.open || 0}</div>
                <div className="stat-label">Abiertos</div>
              </div>
            </div>
            <div className="stat-card sla">
              <div className="stat-content">
                <div className="stat-number">
                  {(() => {
                    const tickets = currentTickets || [];
                    const slaResults = tickets.map(ticket => {
                      const ticketType = determineTicketType(ticket.details, ticket.type);
                      return calculateSLA(ticket.creation_date, ticket.close_date, ticketType);
                    });
                    
                    const goodSLA = slaResults.filter(sla => sla.percentage <= 90).length;
                    const totalSLA = slaResults.filter(sla => sla.status !== 'unknown').length;
                    const percentage = totalSLA > 0 ? Math.round((goodSLA / totalSLA) * 100) : 0;
                    
                    return `${percentage}%`;
                  })()}
                </div>
                <div className="stat-label">SLA Cumplido</div>
              </div>
            </div>
            <div className="stat-card closed">
              <div className="stat-content">
                <div className="stat-number">{quickStats?.closed || 0}</div>
                <div className="stat-label">Cerrados</div>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Analysis Section - Compact */}
        <div className="sla-analysis-section" style={{ 
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--glass-border)'
        }}>
          <h3 style={{ 
            marginBottom: '0.8rem', 
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-chart-line" style={{ color: '#8b5cf6' }}></i>
            Análisis SLA
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '0.8rem'
          }}>
            {Object.entries(slaCategories).map(([key, category]) => {
              const tickets = currentTickets || [];
              const categoryTickets = tickets.filter(ticket => {
                const ticketType = determineTicketType(ticket.details, ticket.type);
                return ticketType === key;
              });
              
              const slaResults = categoryTickets.map(ticket => {
                return calculateSLA(ticket.creation_date, ticket.close_date, key);
              });
              
              const goodSLA = slaResults.filter(sla => sla.percentage <= 90).length;
              const warningSLA = slaResults.filter(sla => sla.percentage > 90 && sla.percentage <= 100).length;
              const exceededSLA = slaResults.filter(sla => sla.percentage > 100).length;
              const total = slaResults.length;
              
              // Calcular porcentaje promedio de cumplimiento
              const avgCompliance = total > 0 ? 
                Math.round(slaResults.reduce((sum, sla) => sum + (100 - Math.min(sla.percentage, 100)), 0) / total) : 0;
              
              return (
                <div key={key} style={{
                  background: `${category.color}08`,
                  border: `1px solid ${category.color}20`,
                  borderRadius: '8px',
                  padding: '0.8rem'
                }}>
                  <div style={{ 
                    color: category.color, 
                    fontWeight: '600',
                    marginBottom: '0.3rem',
                    fontSize: '0.85rem'
                  }}>
                    {category.description.split(' - ')[0]}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.75rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: '#10b981' }}>✅ {goodSLA}</span>
                    <span style={{ color: '#f59e0b' }}>⚠️ {warningSLA}</span>
                    <span style={{ color: '#ef4444' }}>❌ {exceededSLA}</span>
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    Total: {total} • Cumplimiento: {avgCompliance}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Compact and Visible */}
        <div className="recent-activity-section">
          <h2>
            <i className="fas fa-clock"></i>
            Actividad Reciente
          </h2>
          <div className="recent-tickets-compact">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="recent-ticket-compact">
                <div className="ticket-info-compact">
                  <div className="ticket-header-compact">
                    <span className="ticket-id">#{ticket.id}</span>
                    <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="ticket-details-compact">
                    <div className="ticket-user">
                      <i className="fas fa-user"></i>
                      {ticket.user || 'Usuario Desconocido'}
                    </div>
                    <div className="ticket-branch">
                      <i className="fas fa-store"></i>
                      {ticket.branch || 'Sin sucursal'}
                    </div>
                    <div className="ticket-date">
                      <i className="fas fa-calendar"></i>
                      {new Date(ticket.creation_date).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </div>
                <div className="ticket-actions-compact">
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setActiveTab('tickets');
                      setViewMode('edit');
                      setSelectedTicket(ticket);
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <i className="fas fa-plus-circle"></i>
                  Crear Nuevo Ticket
                </h3>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const ticketData = {
                    user: formData.get('user'),
                    branch: formData.get('branch'),
                    agent: formData.get('agent'),
                    status: 'Abierto',
                    details: formData.get('details'),
                    creation_date: new Date().toISOString().split('T')[0]
                  };

                  try {
                    const response = await fetch(`${API_BASE}/api/tickets`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(ticketData)
                    });

                    if (response.ok) {
                      setShowCreateModal(false);
                      fetchHomeData();
                    } else {
                      alert('Error al crear ticket');
                    }
                  } catch (error) {
                    alert('Error al crear ticket');
                  }
                }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Usuario
                      </label>
                      <input
                        type="text"
                        name="user"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Sucursal
                      </label>
                      <input
                        type="text"
                        name="branch"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Agente
                      </label>
                      <input
                        type="text"
                        name="agent"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Detalles
                      </label>
                      <textarea
                        name="details"
                        required
                        rows={4}
                        placeholder="Sin detalle..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '1rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        <i className="fas fa-plus-circle"></i>
                        Crear Ticket
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowCreateModal(false)}
                        style={{ flex: 1 }}
                      >
                        <i className="fas fa-times"></i>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Dashboard Analytics Component
  const DashboardView = () => {
    const [dashboardData, setDashboardData] = useState({
      stats: null,
      trends: null,
      sla: null,
      heatmap: null
    });
    const [loading, setLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(null);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        const [statsRes, trendsRes, slaRes, heatmapRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/stats`),
          fetch(`${API_BASE}/api/dashboard/trends`),
          fetch(`${API_BASE}/api/dashboard/sla`),
          fetch(`${API_BASE}/api/dashboard/heatmap`)
        ]);

        const [stats, trends, sla, heatmap] = await Promise.all([
          statsRes.json(),
          trendsRes.json(),
          slaRes.json(),
          heatmapRes.json()
        ]);

        setDashboardData({
          stats: stats.status === 'success' ? stats.stats : null,
          trends: trends.status === 'success' ? trends.trends : null,
          sla: sla.status === 'success' ? sla.sla : null,
          heatmap: heatmap.status === 'success' ? heatmap.heatmap : null
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchDashboardData();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      // Initialize charts when data is loaded
      if (dashboardData.stats && dashboardData.trends) {
        initializeCharts();
      }
    }, [dashboardData]);

    const initializeCharts = () => {
      // Trends Chart
      if (dashboardData.trends && dashboardData.trends.daily) {
        const ctx = document.getElementById('trendsChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: dashboardData.trends.daily.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
              }),
              datasets: [{
                label: 'Tickets Creados',
                data: dashboardData.trends.daily.map(d => d.tickets),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
              }, {
                label: 'Tickets Cerrados',
                data: dashboardData.trends.daily.map(d => d.closed),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Tendencias de Tickets (Últimos 30 días)'
                }
              }
            }
          });
        }
      }

      // SLA Chart
      if (dashboardData.sla && dashboardData.sla.ranges) {
        const ctx = document.getElementById('slaChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: dashboardData.sla.ranges.map(r => r.range),
              datasets: [{
                data: dashboardData.sla.ranges.map(r => r.count),
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(251, 191, 36, 0.8)',
                  'rgba(251, 146, 60, 0.8)',
                  'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
                title: {
                  display: true,
                  text: 'Distribución de SLA'
                }
              }
            }
          });
        }
      }

      // Heatmap Chart
      if (dashboardData.heatmap && dashboardData.heatmap.hourly) {
        const ctx = document.getElementById('heatmapChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: dashboardData.heatmap.hourly.map(h => `${h.hour}:00`),
              datasets: [{
                label: 'Tickets por Hora',
                data: dashboardData.heatmap.hourly.map(h => h.count),
                backgroundColor: dashboardData.heatmap.hourly.map(h => {
                  const intensity = h.count / Math.max(...dashboardData.heatmap.hourly.map(hh => hh.count));
                  return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
                }),
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  display: false
                },
                title: {
                  display: true,
                  text: 'Actividad por Hora del Día'
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });
        }
      }
    };

    if (loading) {
      return (
        <div className="section-placeholder">
          <i className="fas fa-chart-line fa-spin"></i>
          <p>Cargando dashboard analytics...</p>
        </div>
      );
    }

    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>
            <i className="fas fa-chart-line"></i>
            Dashboard Analytics
          </h2>
          <div className="dashboard-controls">
            <button 
              className="btn btn-secondary"
              onClick={() => fetchDashboardData()}
            >
              <i className="fas fa-sync-alt"></i>
              Actualizar
            </button>
            <span className="last-update">
              <i className="fas fa-clock"></i>
              Auto-refresh cada 30s
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        {dashboardData.stats && (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon">
                <i className="fas fa-ticket-alt"></i>
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.stats.total_tickets.toLocaleString()}</h3>
                <p>Total Tickets</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i>
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.stats.closed_tickets.toLocaleString()}</h3>
                <p>Cerrados</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <i className="fas fa-clock" style={{ color: '#f59e0b' }}></i>
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.stats.open_tickets.toLocaleString()}</h3>
                <p>Abiertos</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">
                <i className="fas fa-percentage" style={{ color: dashboardData.stats.sla_compliance_rate >= 80 ? '#22c55e' : '#ef4444' }}></i>
              </div>
              <div className="kpi-content">
                <h3>{dashboardData.stats.sla_compliance_rate}%</h3>
                <p>SLA Compliance</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Trends Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <i className="fas fa-chart-line"></i>
                Tendencias de Tickets
              </h3>
            </div>
            <div className="chart-container">
              <canvas id="trendsChart"></canvas>
            </div>
          </div>

          {/* SLA Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <i className="fas fa-clock"></i>
                Distribución SLA
              </h3>
            </div>
            <div className="chart-container">
              <canvas id="slaChart"></canvas>
            </div>
          </div>

          {/* Heatmap Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <i className="fas fa-fire"></i>
                Actividad por Hora
              </h3>
            </div>
            <div className="chart-container">
              <canvas id="heatmapChart"></canvas>
            </div>
          </div>

          {/* Top Branches */}
          {dashboardData.heatmap && dashboardData.heatmap.top_branches && (
            <div className="chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-store"></i>
                  Top Sucursales (30 días)
                </h3>
              </div>
              <div className="top-list">
                {dashboardData.heatmap.top_branches.map((branch, index) => (
                  <div key={index} className="top-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{branch.branch}</span>
                    <span className="count">{branch.count} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          {dashboardData.heatmap && dashboardData.heatmap.top_users && (
            <div className="chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-users"></i>
                  Top Usuarios (30 días)
                </h3>
              </div>
              <div className="top-list">
                {dashboardData.heatmap.top_users.map((user, index) => (
                  <div key={index} className="top-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{user.user}</span>
                    <span className="count">{user.count} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const tabs = [
      { key: 'users', label: 'Usuarios' },
      { key: 'branches', label: 'Sucursales' },
      { key: 'agents', label: 'Agentes' },
    ];

    const getList = () => {
      if (settingsTab === 'users') return settingsUsers;
      if (settingsTab === 'branches') return settingsBranches;
      return settingsAgents;
    };

    const setList = (next) => {
      if (settingsTab === 'users') setSettingsUsers(next);
      else if (settingsTab === 'branches') setSettingsBranches(next);
      else setSettingsAgents(next);
    };

    const addItem = async () => {
      const name = (settingsNewName || '').trim();
      if (!name) return;
      setSettingsLoading(true);
      setSettingsError('');
      try {
        const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await resp.json();
        if (!resp.ok || data.status === 'error') {
          setSettingsError(data.message || 'Error al crear');
          return;
        }
        setSettingsNewName('');
        await fetchSettingsAll();
        await fetchGroups();
      } catch (e) {
        setSettingsError('Error de conexión');
      } finally {
        setSettingsLoading(false);
      }
    };

    const renameItem = async (item) => {
      const newName = window.prompt('Nuevo nombre:', item.name);
      if (newName === null) return;
      const name = String(newName).trim();
      if (!name) return;
      setSettingsLoading(true);
      setSettingsError('');
      try {
        const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await resp.json();
        if (!resp.ok || data.status === 'error') {
          setSettingsError(data.message || 'Error al renombrar');
          return;
        }
        await fetchSettingsAll();
        await fetchGroups();
      } catch (e) {
        setSettingsError('Error de conexión');
      } finally {
        setSettingsLoading(false);
      }
    };

    const toggleActive = async (item) => {
      const nextActive = !item.active;
      setSettingsLoading(true);
      setSettingsError('');
      try {
        const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: nextActive })
        });
        const data = await resp.json();
        if (!resp.ok || data.status === 'error') {
          setSettingsError(data.message || 'Error al actualizar');
          return;
        }
        setList(getList().map(x => x.id === item.id ? { ...x, active: nextActive } : x));
        await fetchGroups();
      } catch (e) {
        setSettingsError('Error de conexión');
      } finally {
        setSettingsLoading(false);
      }
    };

    const list = getList();

    return (
      <div className="panel" style={{ padding: '2rem' }}>
        <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Configuración</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Administrar usuarios, sucursales y agentes (alta/baja/renombrar).</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="nav-item" onClick={scanUserPatterns} style={{ background: 'var(--accent)', color: 'white' }} title="Escanea el historial de tickets para generar patrones usuario-sucursal">
              <i className="fas fa-brain"></i> Escanear Patrones
            </button>
            <button className="nav-item" onClick={() => { fetchSettingsAll(); fetchGroups(); }} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <i className="fas fa-rotate"></i> Refrescar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className="nav-item"
              onClick={() => setSettingsTab(t.key)}
              style={{
                background: settingsTab === t.key ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: settingsTab === t.key ? 'white' : 'inherit',
                border: 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {settingsError && (
          <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: 600 }}>
            {settingsError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            className="custom-input"
            value={settingsNewName}
            onChange={(e) => setSettingsNewName(e.target.value)}
            placeholder="Nombre nuevo..."
            style={{ maxWidth: '320px' }}
          />
          <button
            className="nav-item"
            onClick={addItem}
            disabled={settingsLoading}
            style={{ background: 'var(--primary)', color: 'white', border: 'none' }}
          >
            <i className="fas fa-plus"></i> Agregar
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {settingsLoading && list.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '1.5rem' }}>Cargando...</td></tr>
              ) : (
                list.map(item => (
                  <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 700 }}>{item.name}</td>
                    <td>
                      <span className={`badge ${item.active ? 'status-abierto' : 'status-cerrado'}`}>{item.active ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="action-btn edit" title="Renombrar" onClick={() => renameItem(item)}><i className="fas fa-i-cursor"></i></button>
                        <button
                          className={`action-btn ${item.active ? 'delete' : 'view'}`}
                          title={item.active ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleActive(item)}
                        >
                          <i className={`fas ${item.active ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!settingsLoading && list.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '1.5rem' }}>Sin registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <section className="stats-grid-compact">
              <div className="stat-card-mini total">
                <div className="stat-content">
                  <span className="stat-label">Total Tickets</span>
                  <span className="stat-value">{stats?.total_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-ticket-alt"></i></div>
              </div>
              <div className="stat-card-mini open">
                <div className="stat-content">
                  <span className="stat-label">Abiertos</span>
                  <span className="stat-value">{stats?.open_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-door-open"></i></div>
              </div>
              <div className="stat-card-mini closed">
                <div className="stat-content">
                  <span className="stat-label">Cerrados</span>
                  <span className="stat-value">{stats?.closed_tickets || 0}</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-check-circle"></i></div>
              </div>
              <div className="stat-card-mini sla">
                <div className="stat-content">
                  <span className="stat-label">% SLA Excedido</span>
                  <span className="stat-value">{stats?.sla_exceeded_percent || 0}%</span>
                </div>
                <div className="stat-icon-bg"><i className="fas fa-clock"></i></div>
              </div>
            </section>

            <div className="dashboard-main-grid">
              <div className="panel activity-panel">
                <div className="panel-header-mini">
                  <h3><i className="fas fa-bolt"></i> Actividad Reciente</h3>
                  <button className="view-all-btn" onClick={() => { setActiveTab('tickets'); setViewMode('list'); }}>Ver todo</button>
                </div>
                <div className="activity-list">
                  {stats?.recent_activity?.map((act, i) => (
                    <div key={i} className="activity-item">
                      <div className={`activity-icon-sm ${act.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        <i className={act.type === 'new' ? 'fas fa-plus' : 'fas fa-check'}></i>
                      </div>
                      <div className="activity-info">
                        <p>Nuevo ticket <strong>#{act.ticket}</strong> creado por <strong>{act.user}</strong></p>
                        <span className="activity-time">{formatActivityDate(act.date)}</span>
                      </div>
                      <span className={`badge-sm status-${(act.status || '').trim().toLowerCase().replace(/\s+/g, '-')}`}>{act.status}</span>
                    </div>
                  ))}
                  {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                    <div className="empty-state">No hay actividad reciente registrada.</div>
                  )}
                </div>
              </div>

              <div className="panel branch-panel">
                <div className="panel-header-mini">
                  <h3><i className="fas fa-map-marker-alt"></i> Tickets por Sucursal</h3>
                </div>
                <div className="branch-stats-list">
                  {stats?.branch_stats?.map((branch, i) => (
                    <div key={i} className="branch-stat-item">
                      <div className="branch-name-info">
                        <span className="branch-rank">{i + 1}</span>
                        <span>{branch.name}</span>
                      </div>
                      <div className="branch-progress-container">
                        <div className="branch-progress-bar" style={{ width: `${(branch.count / stats.total_tickets) * 100}%` }}></div>
                        <span className="branch-count-val">{branch.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'tickets':
        if (viewMode === 'view' && selectedTicket) {
          return <TicketDetailView ticket={selectedTicket} onEdit={() => setViewMode('edit')} onBack={() => { setViewMode('list'); setSelectedTicket(null); }} />;
        }
        if (viewMode === 'edit' && selectedTicket) {
          return <TicketEditView ticket={selectedTicket} onSave={handleSaveTicket} onBack={() => setViewMode('view')} />;
        }
        if (viewMode === 'create') {
          return <TicketCreateView onSuccess={() => {
            setViewMode('list');
            fetchTickets();
          }} />;
        }
        return (
          <div className="panel" style={{ padding: '2rem' }}>
            <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Gestión de Tickets</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Mostrando {tickets.length > 0 ? indexOfFirstTicket + 1 : 0} - {Math.min(indexOfLastTicket, tickets.length)} de {tickets.length} tickets
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setViewMode('create');
                    setSelectedTicket(null);
                  }}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '10px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <i className="fas fa-plus-circle"></i>
                  Crear Ticket
                </button>
                
                <div className="user-profile">
                  <span style={{ fontWeight: 600 }}>Juan Billiot</span>
                  <div className="avatar">JB</div>
                </div>
              </div>
            </div>

            <Pagination />

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Registro / Cierre</th>
                    <th>Usuario / Sucursal</th>
                    <th>Estado</th>
                    <th>Agente / Colaboradores</th>
                    <th>SLA</th>
                    <th>Demora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td style={{ fontWeight: '800', color: 'var(--primary)' }}>#{ticket.ticket_number}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{ticket.creation_date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ticket.close_date ? `Cierre: ${ticket.close_date}` : 'En curso'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{ticket.user || 'Sin usuario'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {ticket.branch || 'Sin sucursal'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}
                              style={{ 
                                background: `${getStatusColor(ticket.status)}20`,
                                color: getStatusColor(ticket.status),
                                border: `1px solid ${getStatusColor(ticket.status)}40`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                          <i className={getStatusIcon(ticket.status)} style={{ fontSize: '0.6rem' }}></i>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontWeight: 600, 
                            color: getAgentColor(ticket.agent),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {ticket.agent || 'Sin agente'}
                            {ticket.agent && <i className="fas fa-user-circle" style={{ fontSize: '0.8rem', opacity: 0.7 }}></i>}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {ticket.collaborators || 'Sin colaboradores'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <SLAIndicator 
                          creationDate={ticket.creation_date}
                          closeDate={ticket.close_date}
                          details={ticket.details}
                          type={ticket.type}
                        />
                      </td>
                      <td>
                        <span className={`delay-badge delay-${getDelayClass(ticket.delay)}`}
                              style={{
                                background: ticket.delay ? 
                                  (getDelayClass(ticket.delay) === 'good' ? '#10b98120' : 
                                   getDelayClass(ticket.delay) === 'warning' ? '#f59e0b20' : 
                                   getDelayClass(ticket.delay) === 'danger' ? '#ef444420' : '#6b728020') : '#6b728020',
                                color: ticket.delay ? 
                                  (getDelayClass(ticket.delay) === 'good' ? '#10b981' : 
                                   getDelayClass(ticket.delay) === 'warning' ? '#f59e0b' : 
                                   getDelayClass(ticket.delay) === 'danger' ? '#ef4444' : '#6b7280') : '#6b7280',
                                border: ticket.delay ? 
                                  (getDelayClass(ticket.delay) === 'good' ? '#10b98140' : 
                                   getDelayClass(ticket.delay) === 'warning' ? '#f59e0b40' : 
                                   getDelayClass(ticket.delay) === 'danger' ? '#ef444440' : '#6b728040') : '#6b728040',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}>
                          <i className="fas fa-hourglass-half" style={{ fontSize: '0.7rem' }}></i>
                          {formatDelay(ticket.delay)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="action-btn view" title="Ver Detalles" onClick={() => { setSelectedTicket(ticket); setViewMode('view'); }}><i className="fas fa-eye"></i></button>
                          <button className="action-btn edit" title="Editar" onClick={() => { setSelectedTicket(ticket); setViewMode('edit'); }}><i className="fas fa-edit"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'database':
        return (
          <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="brand-icon" style={{ margin: '0 auto 2rem', width: '80px', height: '80px', fontSize: '2.5rem' }}>
              <i className="fas fa-file-excel"></i>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Sincronizar Base de Datos</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
              Selecciona el archivo Excel con los nuevos tickets. El sistema detectará automáticamente cuáles son nuevos para no duplicar información.
            </p>

            <div className="upload-box" style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--glass-border)', borderRadius: '1.5rem', padding: '3rem', position: 'relative' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept=".xlsx,.xls"
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, opacity: 0, cursor: 'pointer' }}
              />
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}></i>
              <span style={{ fontWeight: 600 }}>{uploadStatus.loading ? 'Cargando...' : 'Haz clic o arrastra el archivo aquí'}</span>
            </div>

            {uploadStatus.message && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                background: uploadStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: uploadStatus.type === 'error' ? 'var(--danger)' : 'var(--success)',
                fontWeight: 600,
                border: `1px solid ${uploadStatus.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
              }}>
                <i className={`fas ${uploadStatus.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
                {uploadStatus.message}
              </div>
            )}
          </div>
        );
      case 'servers':
        return ServerMonitoringView();
      case 'home':
        return <HomeView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: "flex", alignItems: "center" }}>
            <img 
              src="/ticketpulse-muted.svg" 
              alt="TicketPulse" 
              style={{ 
                marginLeft: "-10px",
                marginTop: "-20px",
                width: "250px", 
                height: "120px"
              }} 
            />
          </div>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-home"></i><span>Inicio</span>
          </div>
          <div className={`nav-item ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => { setActiveTab('tickets'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-ticket-alt"></i><span>Tickets</span>
          </div>
          <div className={`nav-item ${activeTab === 'database' ? 'active' : ''}`} onClick={() => { setActiveTab('database'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-database"></i><span>Base de Datos</span>
          </div>
          <div className={`nav-item ${activeTab === 'servers' ? 'active' : ''}`} onClick={() => { setActiveTab('servers'); setCurrentPage(1); setViewMode('list'); }}>
            <i className="fas fa-server"></i><span>Servidores</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setCurrentPage(1); setViewMode('list'); }}>
              <i className="fas fa-cog"></i><span>Configuración</span>
            </div>
          </div>
        </nav>
      </aside>
      <main className="main-layout">
        <header className="header-top">
          <div className="welcome-section">
            <h1>Bienvenido, Juan</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Icono de notificaciones circular */}
            <div 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: notifications.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                border: notifications.length > 0 ? '1px solid #ef4444' : '1px solid #3b82f6',
                color: notifications.length > 0 ? '#ef4444' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              title={notifications.length > 0 ? `${notifications.length} notificaciones pendientes` : 'Sin notificaciones'}
            >
              <i className="fas fa-bell"></i>
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {notifications.length}
                </span>
              )}
            </div>
            
            <div className="user-profile">
              <span style={{ fontWeight: 600 }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </header>
        
        {/* Panel de notificaciones - Solo se muestra si hay notificaciones y se hace clic */}
        {showNotifications && notifications.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '20px',
            minWidth: '350px',
            maxWidth: '450px',
            maxHeight: '400px',
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '10px'
            }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
                Notificaciones ({notifications.length})
              </h3>
              <button
                onClick={() => {
                  setNotifications([]);
                  setShowNotifications(false);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Vaciar todo
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                 notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                                 notification.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    border: `1px solid ${
                      notification.type === 'success' ? '#10b981' :
                      notification.type === 'error' ? '#ef4444' :
                      notification.type === 'warning' ? '#f59e0b' : '#3b82f6'
                    }`,
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'white'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.9rem' }}>
                    {notification.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    {notification.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '8px' }}>
                    {new Date(notification.timestamp).toLocaleTimeString('es-AR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="content-container">
          {loading ? (
            <div className="section-placeholder">
              <i className="fas fa-circle-notch fa-spin"></i>
              <p>Sincronizando sistema...</p>
            </div>
          ) : renderContent()}
        </div>
      </main>
    </>
  )
}

export default App
