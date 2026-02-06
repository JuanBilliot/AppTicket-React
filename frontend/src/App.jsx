import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import CustomAddModal from './CustomAddModal'

const API_BASE = 'http://127.0.0.1:5002';

// Función para obtener departamento asignado a un ticket (definida antes de uso)
const getTicketDepartment = (ticketId) => {
  try {
    const ticketDepartments = JSON.parse(localStorage.getItem('ticket_departments') || '{}');
    const dept = ticketDepartments[ticketId] || '';
    console.log('🎫 [DEBUG] Departamento para ticket', ticketId, ':', `"${dept}"`);
    return dept;
  } catch (error) {
    console.error('Error obteniendo departamento de ticket:', error);
    return '';
  }
};

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
  
  // Colores dinámicos según porcentaje de SLA (rangos específicos con descripciones)
  const getDynamicColor = () => {
    const percentage = sla.percentage;
    
    // Colores graduales por rango de porcentaje (coincidentes con descripciones)
    if (percentage > 95) return '#dc2626';      // Rojo intenso - Vencido (>95%)
    if (percentage > 90) return '#f97316';      // Naranja rojizo - Justo a Tiempo (91-95%)
    if (percentage > 75) return '#fbbf24';      // Naranja claro - Preocupante (76-90%)
    if (percentage > 50) return '#fde047';      // Amarillo - Advertencia (51-75%)
    if (percentage > 25) return '#fde68a';      // Amarillo verdoso - Regular (26-50%)
    if (percentage > 15) return '#fde047';      // Amarillo - Moderado (16-25%)
    if (percentage > 5) return '#fde047';        // Amarillo - Buen cumplimiento (6-15%)
    
    // Colores según tipo de ticket cuando está bien (≤5%)
    if (ticketType === 'urgente') return '#059669';     // Verde intenso
    if (ticketType === 'normal') return '#10b981';     // Verde estándar
    if (ticketType === 'complejo') return '#7c3aed';   // Púrpura
    if (ticketType === 'bajo') return '#0891b2';       // Azul
    
    return '#10b981'; // Verde por defecto
  };
  
  const dynamicColor = getDynamicColor();
  
  // Determinar texto del estado según rango específico
  const getStatusText = () => {
    const percentage = sla.percentage;
    
    if (percentage > 95) return 'VEN';     // Vencido
    if (percentage > 90) return 'JAT';     // Justo a Tiempo
    if (percentage > 75) return 'PRE';     // Preocupante
    if (percentage > 50) return 'ADV';     // Advertencia
    if (percentage > 25) return 'REG';     // Regular
    if (percentage > 15) return 'MOD';     // Moderado
    if (percentage > 5) return 'BIEN';     // Buen cumplimiento
    
    return 'OK';                           // Excelente (0-5%)
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
const DatePicker = ({ value, onChange, placeholder = "Seleccionar fecha", style = {} }) => {
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

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        readOnly
        style={style}
      />
      
      {isOpen && (
        <div className="date-picker-calendar custom-datepicker-small" onClick={(e) => e.stopPropagation()}>
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dayInfo.isCurrentMonth) {
                    handleDateClick(dayInfo.day);
                  }
                }}
              >
                {dayInfo.day}
              </div>
            ))}
          </div>

          <div className="calendar-footer">
            <button className="calendar-today" onClick={handleToday}>
              Hoy
            </button>
            <button className="calendar-close" onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LatencyChart = ({ data, colorClass }) => {
  if (!data || data.length === 0) return (
    <div style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: '0.8rem',
      fontWeight: '500'
    }}>
      <i className="fas fa-chart-line" style={{ marginRight: '0.5rem' }}></i>
      Esperando datos...
    </div>
  );

  const maxLat = Math.max(...data, 100);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / maxLat) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{
      height: '60px',
      width: '100%',
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
      borderRadius: '8px',
      padding: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
      overflow: 'hidden'
    }}>
      <svg 
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }} 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        
        {/* Animated main line */}
        <polyline
          points={points}
          fill="none"
          stroke={colorClass === 'path-primary' ? '#3b82f6' : '#8b5cf6'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 3px ${colorClass === 'path-primary' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(139, 92, 246, 0.5)'})`,
            animation: 'drawLine 1s ease-in-out',
            strokeDasharray: '1000',
            strokeDashoffset: '0'
          }}
        />
        
        {/* Animated area fill */}
        <polyline
          points={points + ' 100,100 0,100'}
          fill={colorClass === 'path-primary' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'}
          stroke="none"
          style={{
            animation: 'fillArea 1.5s ease-in-out'
          }}
        />
        
        {/* Animated dots at data points */}
        {data.map((val, i) => {
          if (i % Math.ceil(data.length / 10) !== 0) return null; // Show every 10th point
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - (val / maxLat) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              fill={colorClass === 'path-primary' ? '#3b82f6' : '#8b5cf6'}
              style={{
                animation: `pulse 2s ease-in-out ${i * 0.1}s infinite`,
                opacity: 0.8
              }}
            />
          );
        })}
      </svg>
      
      {/* Smooth current value indicator */}
      {data.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '8px',
          background: colorClass === 'path-primary' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)',
          color: colorClass === 'path-primary' ? '#3b82f6' : '#8b5cf6',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: '600',
          transition: 'all 0.3s ease',
          animation: 'fadeIn 0.5s ease-in-out'
        }}>
          {data[data.length - 1].toFixed(1)}ms
        </div>
      )}
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes drawLine {
          from {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        
        @keyframes fillArea {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState('');
  const [addModalData, setAddModalData] = useState({ name: '', type: '' });
  const [selectedTicketForModal, setSelectedTicketForModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');

  // Debounce para optimizar búsqueda (300ms de retraso)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTermDebounced(searchTerm.trim().toLowerCase());
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoización de tickets filtrados para mejor rendimiento
  const filteredTickets = useMemo(() => {
    if (!searchTermDebounced) return tickets;
    
    return tickets.filter(ticket => {
      // Buscar en número de ticket (con seguridad para null/undefined)
      if (ticket.ticket_number != null && ticket.ticket_number.toString().includes(searchTermDebounced)) return true;
      
      // Buscar en usuario (con seguridad para null/undefined)
      if (ticket.user && ticket.user.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en sucursal (con seguridad para null/undefined)
      if (ticket.branch && ticket.branch.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en agente (con seguridad para null/undefined)
      if (ticket.agent && ticket.agent.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en colaboradores (con seguridad para null/undefined)
      if (ticket.collaborators && ticket.collaborators.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en departamento (con seguridad para null/undefined) - incluyendo guardados localmente
      const ticketDept = ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '');
      if (ticketDept && ticketDept.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en detalles (con seguridad para null/undefined)
      if (ticket.details && ticket.details.toLowerCase().includes(searchTermDebounced)) return true;
      
      // Buscar en estado (con seguridad para null/undefined)
      if (ticket.status && ticket.status.toLowerCase().includes(searchTermDebounced)) return true;
      
      return false;
    });
  }, [tickets, searchTermDebounced]);

  // Resetear página cuando cambia el término de búsqueda debounced
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTermDebounced]);
  const [editingServer, setEditingServer] = useState(null);
  const [newServerData, setNewServerData] = useState({
    branch: '', branch_code: '', primary_service_provider: '',
    primary_service_ip: '', primary_service_speed: '',
    secondary_service_provider: '', secondary_service_ip: '', secondary_service_speed: ''
  });
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [settingsTab, setSettingsTab] = useState('users');
  const [settingsUsers, setSettingsUsers] = useState([]);
  const [settingsBranches, setSettingsBranches] = useState([]);
  const [settingsAgents, setSettingsAgents] = useState([]);
  const [settingsDepartments, setSettingsDepartments] = useState([]);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
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
    fetchBranches();
    fetchDepartments();
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    fetchServersStatus();
    // Reducir a 3 segundos para mejor fluidez sin sobrecargar
    const interval = setInterval(() => {
      if (viewMode !== 'edit') {
        fetchServersStatus();
      }
    }, 3000); // 3 segundos = balance perfecto entre fluidez y rendimiento
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
        setViewMode('list');
        setSelectedTicket(null);
        window.history.pushState(null, null, window.location.pathname);
      }
    };

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
      
      // Cargar departamentos desde localStorage
      const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
      setSettingsDepartments(savedDepartments);
      
      // Cargar departamentos ocultos
      const hidden = JSON.parse(localStorage.getItem('hidden_departments') || '[]');
      setHiddenDepartments(hidden);
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
    
    // COLORES ESPECÍFICOS PARA AGENTES - Formato: Apellido, Nombre: Color
    const specificAgentColors = {
      'Billiot, Juan M': '#f4e04d', // Amarillo pastel suave (color original del usuario)
      'Macia, Nicolas': '#f18056ff', // Naranja vibrante
      'Arbello, Mauro': '#bfa9d4ff', // Púrpura real
      'Rodriguez, Guillermo': '#71c7e9ff', // Azul brillante
      'Gonzalez, David': '#10b981', // Verde esmeralda
      'Rognoni, Leandro': '#ec4899', // Rosa fucsia
      'Ulariaga, Braian': '#05869dff', // Cian brillante
      'Marini, Claudio': '#9ecba1ff', // Ámbar dorado
      'Machado, Gabriel': '#e73535ff', // Rojo vibrante
      'Karpilovsky, Ivan': '#8b5cf6', // Púrpura medio
      'Placona, Leandro': '#14b8a6', // Verde azulado
    };
    
    // Si el agente tiene un color específico asignado, usarlo
    if (specificAgentColors[agentName]) {
      return specificAgentColors[agentName];
    }
    
    // Lista expandida de colores para mayor variedad - COLORES BIEN DIFERENCIADOS
    const colors = [
      '#1e40af', // Azul eléctrico brillante
      '#f59e0b', // Ámbar dorado
      '#10b981', // Verde esmeralda
      '#ef4444', // Rojo vibrante
      '#8b5cf6', // Púrpura real
      '#ec4899', // Rosa fucsia
      '#06b6d4', // Verde oliva
      '#84cc16', // Lima verde
      '#f97316', // Naranja brillante
      '#6366f1', // Índigo
      '#14b8a6', // Verde azulado
      '#a855f7', // Violeta
      '#eab308', // Amarillo mostaza
      '#f43f5e', // Rosa rojo
      '#0ea5e9', // Azul cielo
      '#d946ef', // Magenta
      '#0891b2', // Azul turquesa
      '#65a30d', // Verde oliva oscuro
      '#dc2626', // Rojo tomate
      '#7c3aed', // Púrpura oscuro
      '#db2777', // Rosa intenso
      '#0284c7', // Azul océano
      '#16a34a', // Verde bosque
      '#ea580c', // Naranja quemado
      '#4f46e5', // Azul medianoche
      '#059669', // Verde mar
      '#9333ea', // Violeta profundo
      '#ca8a04', // Amarillo dorado
      '#e11d48', // Rosa coral
      '#0284c7'  // Azul profundo
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

  // Función para extraer hora del asunto del correo
  const extractEmailTime = (details) => {
    if (!details) return null;
    
    // Patrones para extraer hora del asunto del correo
    const patterns = [
      /(\d{1,2}):(\d{2})\s*(a\.m\.|a\.m\.|pm|am)\s*(\d{1,2}):(\d{2})/g, // 17:17, 09:30, etc.
      /(\d{1,2})\s*(a\.m\.|a\.m\.|pm|am)\s*(\d{1,2}):(\d{2})/g,
      /(\d{1,2}):(\d{2})\s*(a\.m\.|a\.m\.|pm|am)\s*(\d{1,2}):(\d{2})/g,
      /las?\s*(\d{1,2}):(\d{2})/g,
      /(\d{1,2})\s*hs?\s*(\d{1,2})/g
    ];
    
    for (const pattern of patterns) {
      const match = details.match(pattern);
      if (match) {
        const hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const date = new Date();
        date.setHours(hour, minute);
        return date.toISOString();
      }
    }
    
    return null;
  };

  // Función para formatear fecha de actividad reciente
  const formatActivityDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    
    console.log(`🔍 [DEBUG] Fecha recibida: "${dateString}"`);
    
    try {
      let date;
      
      // Si es un timestamp de Unix, convertirlo
      if (typeof dateString === 'number' || /^\d+$/.test(dateString)) {
        console.log(`🔍 [DEBUG] Detectado timestamp Unix: ${dateString}`);
        date = new Date(parseInt(dateString) * 1000); // Convertir segundos a milisegundos
      } else if (dateString.includes('/') && dateString.split('/').length === 3) {
        // Siempre usar formato DD/MM/YYYY (formato argentino)
        const parts = dateString.split('/');
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          // Convertir DD/MM/YYYY a YYYY-MM-DD (formato argentino)
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          const isoDate = `${year}-${month}-${day}`;
          console.log(`🔍 [DEBUG] Parseo DD/MM/YYYY (argentino): "${dateString}" -> "${isoDate}"`);
          
          // Forzar hora 00:00:00 para fechas sin hora específica
          date = new Date(`${isoDate}T00:00:00`);
          console.log(`🔍 [DEBUG] Date parseado DD/MM/YYYY: ${date}, isValid: ${!isNaN(date.getTime())}`);
        } else {
          date = new Date(dateString);
        }
      } else {
        // Intentar parseo directo para otros formatos
        date = new Date(dateString);
      }
      
      console.log(`🔍 [DEBUG] Date final: ${date}, isValid: ${!isNaN(date.getTime())}`);
      
      // Si sigue siendo inválido, intentar usar la fecha actual como fallback
      if (isNaN(date.getTime())) {
        console.log(`🔍 [DEBUG] Todos los intentos fallaron, usando fecha actual`);
        date = new Date();
      }
      
      return formatValidDate(date);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
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
    
    console.log(`🔍 [DEBUG] formatValidDate:`);
    console.log(`🔍 [DEBUG]   date original: ${date}`);
    console.log(`🔍 [DEBUG]   now: ${now}`);
    console.log(`🔍 [DEBUG]   today: ${today}`);
    console.log(`🔍 [DEBUG]   yesterday: ${yesterday}`);
    console.log(`🔍 [DEBUG]   activityDate: ${activityDate}`);
    console.log(`🔍 [DEBUG]   activityDate.getTime(): ${activityDate.getTime()}`);
    console.log(`🔍 [DEBUG]   today.getTime(): ${today.getTime()}`);
    console.log(`🔍 [DEBUG]   yesterday.getTime(): ${yesterday.getTime()}`);
    console.log(`🔍 [DEBUG]   ¿Es hoy?: ${activityDate.getTime() === today.getTime()}`);
    console.log(`🔍 [DEBUG]   ¿Es ayer?: ${activityDate.getTime() === yesterday.getTime()}`);
    
    // Formato de hora - si no hay hora real, mostrar indicador
    let time;
    if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      // Si la hora es 00:00:00, probablemente no se guardó la hora real
      time = 'sin hora';
    } else {
      time = date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    console.log(`🔍 [DEBUG]   time formateado: ${time}`);
    
    if (activityDate.getTime() === today.getTime()) {
      const result = time === 'sin hora' ? 'Hoy' : `Hoy, ${time}`;
      console.log(`🔍 [DEBUG] Resultado: ${result}`);
      return result;
    } else if (activityDate.getTime() === yesterday.getTime()) {
      const result = time === 'sin hora' ? 'Ayer' : `Ayer, ${time}`;
      console.log(`🔍 [DEBUG] Resultado: ${result}`);
      return result;
    } else {
      // Si es de esta semana, mostrar día de la semana
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      if (activityDate >= weekAgo) {
        const dayName = date.toLocaleDateString('es-AR', { weekday: 'long' });
        const result = time === 'sin hora' ? dayName : `${dayName}, ${time}`;
        console.log(`🔍 [DEBUG] Resultado: ${result}`);
        return result;
      } else {
        // Formato completo para fechas más antiguas
        const dateStr = date.toLocaleDateString('es-AR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit' 
        });
        const result = time === 'sin hora' ? dateStr : `${dateStr}, ${time}`;
        console.log(`🔍 [DEBUG] Resultado: ${result}`);
        return result;
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
      return '#f97316'; // Naranja (como status-pendiente existente)
    } else if (statusLower.includes('rechazado') || statusLower.includes('rejected')) {
      return '#dc2626'; // Rojo oscuro (para rechazado)
    } else {
      return '#6b7280'; // Gris por defecto
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
    } else if (statusLower.includes('rechazado') || statusLower.includes('rejected')) {
      return 'fas fa-times-circle'; // X en círculo (para rechazado)
    } else {
      return 'fas fa-circle'; // Círculo genérico
    }
  };

  // Efectos para SLA y notificaciones
  
  // Función para agregar notificaciones
  const addNotification = (id, type, title, message, emailTime = null) => {
    const notification = {
      id,
      type, // 'success', 'warning', 'error', 'info'
      title,
      message,
      timestamp: new Date(),
      emailTime: emailTime // Guardar hora del correo para nuevos tickets
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
        `${newCount} ticket${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`,
        null // No hay emailTime para tickets detectados por conteo
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
    
    console.log(`🖥️ [DEBUG] checkServerChanges INICIADO`);
    console.log(`🖥️ [DEBUG] newStatus keys: ${Object.keys(newStatus)}`);
    console.log(`🖥️ [DEBUG] lastStatus keys: ${Object.keys(lastStatus)}`);
    console.log(`🖥️ [DEBUG] newStatus=${JSON.stringify(newStatus)}`);
    console.log(`🖥️ [DEBUG] lastStatus=${JSON.stringify(lastStatus)}`);
    
    Object.keys(newStatus).forEach(ip => {
      const oldStatus = lastStatus[ip];
      const newServerStatus = newStatus[ip];
      
      console.log(`🖥️ [DEBUG] Procesando servidor ${ip}:`);
      console.log(`🖥️ [DEBUG]   oldStatus: ${JSON.stringify(oldStatus)}`);
      console.log(`🖥️ [DEBUG]   newServerStatus: ${JSON.stringify(newServerStatus)}`);
      
      // Si es la primera vez que vemos este servidor, notificar su estado inicial
      if (!oldStatus) {
        console.log(`🖥️ [DEBUG] ${ip}: Primera vez que se ve este servidor`);
        if (newServerStatus.status === 'error' || newServerStatus.status === 'offline') {
          console.log(`🔴 [SERVIDOR CAÍDO - INICIAL] ${ip}`);
          
          addNotification(
            'error',
            '🔴 Servidor Caído',
            `Servidor ${ip} fuera de línea`
          );
          playNotificationSound();
        } else {
          console.log(`🟢 [SERVIDOR ONLINE - INICIAL] ${ip}: no se notifica para evitar spam`);
        }
      } else if (oldStatus.status !== newServerStatus.status) {
        console.log(`🖥️ [DEBUG] ${ip}: Estado CAMBIÓ de ${oldStatus.status} a ${newServerStatus.status}`);
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
    
    console.log(`🖥️ [DEBUG] Actualizando persistentServerStatus.current`);
    // Actualizar estados persistentes
    persistentServerStatus.current = newStatus;
    setLastServerStatus(newStatus);
    
    console.log(`🖥️ [DEBUG] checkServerChanges FINALIZADO`);
    console.log(`🖥️ [DEBUG] Total notificaciones: ${notifications.length}`);
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
      console.log(`🔄 [DEBUG] fetchData - lastTicketCount antes: ${lastTicketCount}`);
      const responses = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/stats`),
        fetch(`${API_BASE}/api/tickets`)
      ]);
      
      const statsData = await responses[0].json();
      const ticketsData = await responses[1].json();
      
      console.log(`🎫 [DEBUG] fetchData obtuvo ${ticketsData.length} tickets`);
      console.log(`🎫 [DEBUG] fetchData: lastTicketCount=${lastTicketCount}, ticketsData.length=${ticketsData.length}`);
      console.log(`🎫 [DEBUG] fetchData - ticketsInitialized: ${ticketsInitialized.current}`);
      
      // Siempre detectar nuevos tickets (incluso en la primera carga)
      checkForNewTickets(ticketsData);
      
      setStats(statsData);
      setTickets(ticketsData);
      console.log(`🔄 [DEBUG] fetchData - lastTicketCount después: ${lastTicketCount}`);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.log(`❌ [ERROR] fetchData falló: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/branches`);
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Función para asignar íconos únicos a departamentos
  const getDepartmentIcon = (departmentName) => {
    if (!departmentName || departmentName === 'Sin depto') return 'fas fa-building';
    
    // Mapeo de íconos por patrones de nombres de departamentos
    const iconPatterns = {
      // TI / Sistemas / Soporte Técnico
      'ti': 'fas fa-laptop-code',
      'soporte técnico': 'fas fa-headset',
      'soporte': 'fas fa-headset',
      'prov soporte externo': 'fas fa-headset-simple',
      'impresoras': 'fas fa-print',
      'informática': 'fas fa-desktop',
      'sistemas': 'fas fa-server',
      'sistema de gestión': 'fas fa-server',
      'sistema gestion': 'fas fa-server',
      'gestion': 'fas fa-server',
      'tecnología': 'fas fa-microchip',
      'it': 'fas fa-laptop',
      'help desk': 'fas fa-life-ring',
      'desarrollo': 'fas fa-code',
      'programación': 'fas fa-terminal',
      
      // Impresoras / Hardware
      'impresoras': 'fas fa-print',
      
      // RRHH / Personal
      'rrhh': 'fas fa-users',
      'recursos humanos': 'fas fa-users',
      'personal': 'fas fa-user-tie',
      'rh': 'fas fa-users',
      'talento humano': 'fas fa-user-friends',
      
      // Contabilidad / Finanzas
      'contabilidad': 'fas fa-calculator',
      'finanzas': 'fas fa-chart-line',
      'administración': 'fas fa-briefcase',
      'facturación': 'fas fa-file-invoice-dollar',
      'tesorería': 'fas fa-money-bill-wave',
      'contable': 'fas fa-receipt',
      
      // Ventas / Comercial
      'ventas': 'fas fa-shopping-cart',
      'comercial': 'fas fa-handshake',
      'sales': 'fas fa-chart-bar',
      'negocios': 'fas fa-bullhorn',
      
      // Logística / Almacén
      'logística': 'fas fa-truck',
      'almacén': 'fas fa-warehouse',
      'depósito': 'fas fa-boxes',
      'stock': 'fas fa-box',
      'distribución': 'fas fa-shipping-fast',
      
      // Marketing / Publicidad
      'marketing': 'fas fa-bullhorn',
      'publicidad': 'fas fa-ad',
      'comunicación': 'fas fa-comments',
      'social media': 'fas fa-share-alt',
      'diseño': 'fas fa-palette',
      
      // Operaciones / Producción
      'operaciones': 'fas fa-cogs',
      'producción': 'fas fa-industry',
      'calidad': 'fas fa-award',
      'manufactura': 'fas fa-tools',
      
      // Legal / Jurídico
      'legal': 'fas fa-balance-scale',
      'jurídico': 'fas fa-gavel',
      'abogados': 'fas fa-scale-balanced',
      
      // Médico / Salud
      'médico': 'fas fa-stethoscope',
      'salud': 'fas fa-heartbeat',
      'enfermería': 'fas fa-user-nurse',
      
      // Educación / Capacitación
      'educación': 'fas fa-graduation-cap',
      'capacitación': 'fas fa-chalkboard-teacher',
      'academia': 'fas fa-book',
      
      // Seguridad
      'seguridad': 'fas fa-shield-alt',
      'vigilancia': 'fas fa-user-shield',
      
      // Investigación / I+D
      'investigación': 'fas fa-microscope',
      'i+d': 'fas fa-flask',
      'desarrollo': 'fas fa-lightbulb',
      
      // Cliente / Atención
      'cliente': 'fas fa-user-check',
      'atención': 'fas fa-concierge-bell',
      'servicio': 'fas fa-concierge-bell'
    };
    
    // Buscar coincidencia exacta primero
    const deptLower = departmentName.toLowerCase();
    if (iconPatterns[deptLower]) {
      return iconPatterns[deptLower];
    }
    
    // Buscar coincidencias parciales
    for (const [pattern, icon] of Object.entries(iconPatterns)) {
      if (deptLower.includes(pattern)) {
        return icon;
      }
    }
    
    // Ícono por defecto basado en la primera letra
    const firstLetter = departmentName.charAt(0).toUpperCase();
    const defaultIcons = {
      'A': 'fas fa-alpha',
      'B': 'fas fa-beta', 
      'C': 'fas fa-chart-pie',
      'D': 'fas fa-database',
      'E': 'fas fa-envelope',
      'F': 'fas fa-folder',
      'G': 'fas fa-gear',
      'H': 'fas fa-home',
      'I': 'fas fa-info-circle',
      'J': 'fas fa-journal-whills',
      'K': 'fas fa-key',
      'L': 'fas fa-list',
      'M': 'fas fa-map',
      'N': 'fas fa-network-wired',
      'O': 'fas fa-organization',
      'P': 'fas fa-project-diagram',
      'Q': 'fas fa-question-circle',
      'R': 'fas fa-robot',
      'S': 'fas fa-star',
      'T': 'fas fa-tag',
      'U': 'fas fa-user',
      'V': 'fas fa-video',
      'W': 'fas fa-wifi',
      'X': 'fas fa-xmark',
      'Y': 'fas fa-yin-yang',
      'Z': 'fas fa-zip'
    };
    
    return defaultIcons[firstLetter] || 'fas fa-building';
  };

  // Función para asignar colores únicos a departamentos
  const getDepartmentColor = (departmentName) => {
    if (!departmentName || departmentName === 'Sin depto') return '#6b7280';
    
    console.log('🎨 [DEBUG] Buscando color para departamento:', `"${departmentName}"`);
    
    const deptLower = departmentName.toLowerCase();
    
    // Colores específicos para departamentos conocidos - COLORES BIEN DIFERENCIADOS
    const specificColors = {
      'ti': '#1e40af', // Azul eléctrico brillante
      'soporte técnico': '#06b6d4', // Cian brillante
      'soporte': '#0ea5e9', // Azul cielo
      'prov soporte externo': '#dc2626', // Rojo tomate
      'impresoras': '#10b981', // Verde esmeralda
      'informática': '#3b82f6', // Azul brillante
      'rrhh': '#059669', // Verde mar
      'recursos humanos': '#059669', // Verde mar
      'personal': '#059669', // Verde mar
      'contabilidad': '#f59e0b', // Ámbar dorado
      'finanzas': '#f59e0b', // Ámbar dorado
      'administración': '#f59e0b', // Ámbar dorado
      'ventas': '#ef4444', // Rojo vibrante
      'comercial': '#f43f5e', // Rosa rojo
      'logística': '#f97316', // Naranja brillante
      'almacén': '#f97316', // Naranja brillante
      'marketing': '#ec4899', // Rosa fucsia
      'publicidad': '#ec4899', // Rosa fucsia
      'operaciones': '#8b5cf6', // Púrpura real
      'producción': '#8b5cf6', // Púrpura real
      'calidad': '#8b5cf6', // Púrpura real
      'legal': '#6366f1', // Índigo
      'jurídico': '#6366f1', // Índigo
      'médico': '#ef4444', // Rojo vibrante
      'salud': '#ef4444', // Rojo vibrante
      'educación': '#eab308', // Amarillo mostaza
      'capacitación': '#eab308', // Amarillo mostaza
      'seguridad': '#0aa014', // Verde oliva
      'investigación': '#14b8a6', // Verde azulado
      'cliente': '#f43f5e', // Rosa rojo
      'atención': '#f43f5e', // Rosa rojo
      'servicio': '#f43f5e' // Rosa rojo
    };
    
    // Primero buscar coincidencia exacta en specificColors
    if (specificColors[deptLower]) {
      console.log('🎨 [DEBUG] Color encontrado por coincidencia exacta:', deptLower, specificColors[deptLower]);
      return specificColors[deptLower];
    }
    
    // Sistema de gestión - Prioridad alta
    if (
      deptLower.includes('sistema') || 
      deptLower.includes('gestion') || 
      deptLower.includes('gestión') ||
      deptLower.includes('sistemas')
    ) {
      console.log('🎨 [DEBUG] DETECTADO SISTEMA/GESTIÓN - FORZANDO COLOR MOSTAZA #d97706');
      return '#d97706';
    }
    
    // Buscar coincidencias parciales
    for (const [pattern, color] of Object.entries(specificColors)) {
      if (deptLower.includes(pattern)) {
        console.log('🎨 [DEBUG] Color encontrado por coincidencia parcial:', pattern, color);
        return color;
      }
    }
    
    console.log('🎨 [DEBUG] No se encontró color específico, usando hash aleatorio');
    
    // Lista de colores vibrantes y distinguibles para departamentos - COLORES BIEN DIFERENCIADOS
    const departmentColors = [
      '#1e40af', // Azul eléctrico brillante
      '#f59e0b', // Ámbar dorado
      '#10b981', // Verde esmeralda
      '#ef4444', // Rojo vibrante
      '#8b5cf6', // Púrpura real
      '#ec4899', // Rosa fucsia
      '#0ea5e9', // Azul cielo
      '#84cc16', // Lima verde
      '#f97316', // Naranja brillante
      '#6366f1', // Índigo
      '#14b8a6', // Verde azulado
      '#a855f7', // Violeta
      '#eab308', // Amarillo mostaza
      '#f43f5e', // Rosa rojo
      '#d946ef', // Magenta
      '#0891b2', // Azul turquesa
      '#65a30d', // Verde oliva
      '#dc2626', // Rojo tomate
      '#7c3aed', // Púrpura oscuro
      '#db2777', // Rosa intenso
      '#0284c7', // Azul océano
      '#16a34a', // Verde bosque
      '#ea580c', // Naranja quemado
      '#4f46e5', // Azul medianoche
      '#059669', // Verde mar
      '#9333ea', // Violeta profundo
      '#ca8a04', // Amarillo dorado
      '#e11d48', // Rosa coral
      '#0284c7'  // Azul profundo
    ];
    
    // Crear un mapa de colores asignados para departamentos
    if (!window.departmentColorMap) {
      window.departmentColorMap = {};
    }
    
    // Si ya tenemos un color asignado para este departamento, retornarlo
    if (window.departmentColorMap[departmentName]) {
      console.log('🎨 [DEBUG] Color encontrado en mapa:', window.departmentColorMap[departmentName]);
      return window.departmentColorMap[departmentName];
    }
    
    // Generar hash consistente para el nombre del departamento
    let hash = 0;
    for (let i = 0; i < departmentName.length; i++) {
      hash = departmentName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Seleccionar color basado en hash para consistencia
    const colorIndex = Math.abs(hash) % departmentColors.length;
    const selectedColor = departmentColors[colorIndex];
    
    // Guardar en el mapa para reutilización
    window.departmentColorMap[departmentName] = selectedColor;
    
    console.log('🎨 [DEBUG] Color generado por hash:', selectedColor);
    return selectedColor;
  };

  // Prueba directa de la función
  console.log('🧪 [TEST] Probando getDepartmentColor con "SISTEMA DE GESTIÓN":', getDepartmentColor('SISTEMA DE GESTIÓN'));
  console.log('🧪 [TEST] Probando getDepartmentColor con "Sistema de Gestion":', getDepartmentColor('Sistema de Gestion'));
  console.log('🧪 [TEST] Probando getDepartmentColor con "sistema":', getDepartmentColor('sistema'));
  console.log('🧪 [TEST] Probando getDepartmentColor con "gestion":', getDepartmentColor('gestion'));

  // Función para sugerir departamento automáticamente basado en usuario/agente
  const suggestDepartment = (userName, agentName) => {
    if (!userName && !agentName) return '';
    
    // Lógica de sugerencia basada en patrones conocidos
    const userLower = (userName || '').toLowerCase();
    const agentLower = (agentName || '').toLowerCase();
    
    // Patrones de departamento basados en nombres
    const departmentPatterns = {
      // TI / Sistemas
      'soporte técnico': 'TI',
      'informática': 'TI',
      'sistemas': 'TI',
      'tecnología': 'TI',
      'it': 'TI',
      'help desk': 'TI',
      
      // RRHH
      'recursos humanos': 'RRHH',
      'personal': 'RRHH',
      'rrhh': 'RRHH',
      'rh': 'RRHH',
      
      // Contabilidad / Finanzas
      'contabilidad': 'Contabilidad',
      'finanzas': 'Contabilidad',
      'administración': 'Contabilidad',
      'facturación': 'Contabilidad',
      
      // Ventas
      'ventas': 'Ventas',
      'comercial': 'Ventas',
      'sales': 'Ventas',
      
      // Logística
      'logística': 'Logística',
      'almacén': 'Logística',
      'depósito': 'Logística',
      'stock': 'Logística',
      
      // Marketing
      'marketing': 'Marketing',
      'publicidad': 'Marketing',
      'comunicación': 'Marketing',
      
      // Operaciones
      'operaciones': 'Operaciones',
      'producción': 'Operaciones',
      'calidad': 'Operaciones'
    };
    
    // Buscar patrones en el nombre de usuario
    for (const [pattern, dept] of Object.entries(departmentPatterns)) {
      if (userLower.includes(pattern) || agentLower.includes(pattern)) {
        return dept;
      }
    }
    
    // Si no hay patrón conocido, devolver vacío
    return '';
  };

  const fetchDepartments = async () => {
    try {
      console.log('🏢 [INFO] Cargando departamentos desde localStorage');
      
      // Cargar departamentos guardados en localStorage
      const savedDepartments = localStorage.getItem('local_departments');
      if (savedDepartments) {
        const depts = JSON.parse(savedDepartments);
        console.log('🏢 [INFO] Departamentos cargados desde localStorage:', depts.length);
        setDepartments(depts);
      } else {
        console.log('🏢 [INFO] Sin departamentos guardados, iniciando vacío');
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
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
      console.log(`🖥️ [DEBUG] fetchServersStatus INICIADO`);
      const response = await fetch(`${API_BASE}/api/servers/status`);
      const data = await response.json();
      
      // Debug: Verificar qué datos llegan
      console.log(`🖥️ [DEBUG] fetchServersStatus: ${JSON.stringify(data)}`);
      console.log(`🖥️ [DEBUG] fetchServersStatus: Total servidores = ${Object.keys(data).length}`);
      
      // Detectar cambios en servidores ANTES de actualizar el estado
      console.log(`🖥️ [DEBUG] Llamando a checkServerChanges...`);
      checkServerChanges(data);
      
      setServerMonitoring(data);
      console.log(`🖥️ [DEBUG] fetchServersStatus FINALIZADO`);
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

  // Función para guardar departamento asignado a un ticket localmente
  const saveTicketDepartment = (ticketId, department) => {
    try {
      const ticketDepartments = JSON.parse(localStorage.getItem('ticket_departments') || '{}');
      if (department) {
        ticketDepartments[ticketId] = department;
      } else {
        delete ticketDepartments[ticketId];
      }
      localStorage.setItem('ticket_departments', JSON.stringify(ticketDepartments));
      console.log('🎫 [DEBUG] Departamento guardado para ticket', ticketId, ':', department);
    } catch (error) {
      console.error('Error guardando departamento de ticket:', error);
    }
  };

  
  const handleSaveTicket = async (updatedTicket) => {
    try {
      // Debug: Verificar qué datos se están guardando
      console.log('🎫 [DEBUG] Guardando ticket con datos:', updatedTicket);
      console.log('🎫 [DEBUG] Departamento:', updatedTicket.department);
      
      // Guardar departamento localmente (independientemente del backend)
      saveTicketDepartment(updatedTicket.id, updatedTicket.department);
      
      const response = await fetch(`${API_BASE}/api/tickets/${updatedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket)
      });
      const data = await response.json();
      if (data.status === 'success') {
        // No generar notificación al guardar manualmente (solo para tickets automáticos)
        console.log('🎫 [INFO] Ticket guardado exitosamente - Sin notificación manual');
        
        // Actualizar el estado local inmediatamente
        setTickets(prev => {
          const newTicket = {
            ...updatedTicket,
            id: data.ticket_id || data.id,
            creation_date: new Date().toISOString().split('T')[0] // Usar fecha actual
          };
          const newTickets = [newTicket, ...prev];
          console.log('🎫 [DEBUG] Ticket actualizado localmente:', newTicket);
          return newTickets;
        });
        setViewMode('list');
        setSelectedTicket(null);
        setActiveTab('tickets'); // Volver a la pestaña de tickets
        fetchData();
        fetchGroups();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error guardando ticket:', error);
      // No mostrar alerta de error si el ticket se guardó exitosamente
      // Solo mostrar para errores graves de red
      if (error.message && error.message.includes('Failed to fetch')) {
        alert('Error de conexión - Verifique que el servidor esté activo');
      }
      // Para otros errores, solo log en consola
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
      console.error('Error actualizando servidor:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        alert('Error de conexión - Verifique que el servidor esté activo');
      }
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
      console.error('Error actualizando servidor:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        alert('Error de conexión - Verifique que el servidor esté activo');
      }
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
      console.error('Error actualizando servidor:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        alert('Error de conexión - Verifique que el servidor esté activo');
      }
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
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

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

  // Modal de detalles básicos
  const TicketDetailModal = ({ ticket, onClose }) => {
    if (!ticket) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}
        onClick={onClose} // Cerrar al hacer clic en el backdrop
      >
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)'
          }}
          onClick={(e) => e.stopPropagation()} // Evitar que se cierre al hacer clic dentro del modal
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.8rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-ticket-alt" style={{ color: '#3b82f6' }}></i>
              Detalle del Ticket
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Contenido */}
          <div style={{ color: '#e2e8f0' }}>
            {/* Número de ticket */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Número de Ticket
              </label>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <a
                  href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#60a5fa';
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#3b82f6';
                    e.target.style.textDecoration = 'none';
                  }}
                >
                  #{ticket.ticket_number}
                </a>
                <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }}></i>
              </div>
            </div>

            {/* Estado */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Estado
              </label>
              <span className={`badge status-${(ticket.status || '').trim().toLowerCase().replace(/\s+/g, '-')}`}>
                {ticket.status}
              </span>
            </div>

            {/* Información básica en grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.3rem', 
                  fontSize: '0.85rem', 
                  color: '#94a3b8',
                  fontWeight: '600'
                }}>
                  Usuario
                </label>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>
                  {ticket.user || 'S/U'}
                </div>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.3rem', 
                  fontSize: '0.85rem', 
                  color: '#94a3b8',
                  fontWeight: '600'
                }}>
                  Sucursal
                </label>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>
                  {ticket.branch || 'S/D'}
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.3rem', 
                  fontSize: '0.85rem', 
                  color: '#94a3b8',
                  fontWeight: '600'
                }}>
                  Creado
                </label>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>
                  {ticket.creation_date}
                </div>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.3rem', 
                  fontSize: '0.85rem', 
                  color: '#94a3b8',
                  fontWeight: '600'
                }}>
                  Cierre
                </label>
                <div style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>
                  {ticket.close_date || 'En proceso'}
                </div>
              </div>
            </div>

            {/* Demora */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Demora
              </label>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#fbbf24', 
                fontWeight: '700' 
              }}>
                {ticket.delay}
              </div>
            </div>

            {/* Asignación */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Asignación
              </label>
              <div style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>
                <div style={{ marginBottom: '0.3rem' }}>
                  <strong>Agente:</strong> {ticket.agent || 'Sin asignar'}
                </div>
                <div>
                  <strong>Colaboradores:</strong> {ticket.collaborators || 'Ninguno'}
                </div>
              </div>
            </div>

            {/* Departamento */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Departamento
              </label>
              <span style={{
                background: (ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '')) ? 
                  `${getDepartmentColor(ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : ''))}20` : 'rgba(107, 114, 128, 0.2)',
                color: (ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '')) ? 
                  getDepartmentColor(ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '')) : '#6b7280',
                border: (ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '')) ? 
                  `2px solid ${getDepartmentColor(ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : ''))}` : '2px solid rgba(107, 114, 128, 0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: (ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '')) ? 
                  `0 2px 4px ${getDepartmentColor(ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : ''))}20` : 'none'
              }}>
                <i className={getDepartmentIcon(ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : ''))} style={{ fontSize: '0.6rem' }}></i>
                {ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '') || 'Sin depto'}
              </span>
            </div>

            {/* Detalles */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.3rem', 
                fontSize: '0.85rem', 
                color: '#94a3b8',
                fontWeight: '600'
              }}>
                Detalles / Notas
              </label>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                color: ticket.details ? '#e2e8f0' : '#94a3b8',
                fontStyle: ticket.details ? 'normal' : 'italic',
                maxHeight: '120px',
                overflow: 'auto'
              }}>
                {ticket.details || 'Sin detalle...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TicketEditView = ({ ticket, onSave, onBack }) => {
    const [formData, setFormData] = useState({ 
      ...ticket,
      details: ticket.details && ticket.details !== 'Sin detalle...' ? ticket.details : '',
      department: ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '') || ''
    });
    const [localBranchSuggestions, setLocalBranchSuggestions] = useState([]);
    const [showLocalSuggestions, setShowLocalSuggestions] = useState(false);

    // Función reutilizable para estilos Fortune 500
    const getFormGroupStyles = () => ({
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '1.5rem',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      position: 'relative',
      overflow: 'hidden',
      onMouseEnter: (e) => {
        e.target.style.transform = 'translateY(-4px) scale(1.02)';
        e.target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
      },
      onMouseLeave: (e) => {
        e.target.style.transform = 'translateY(0) scale(1)';
        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    });

    // Función reutilizable para labels Fortune 500
    const getLabelStyles = () => ({
      display: 'block',
      marginBottom: '0.8rem',
      fontSize: '0.9rem',
      fontWeight: '700',
      color: '#e2e8f0',
      letterSpacing: '0.025em',
      textTransform: 'uppercase'
    });

    // Función reutilizable para inputs Fortune 500
    const getInputStyles = () => ({
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '12px',
      padding: '0.75rem 1rem',
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#ffffff',
      transition: 'all 0.3s ease',
      outline: 'none',
      onFocus: (e) => {
        e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
        e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
      },
      onBlur: (e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.15)';
        e.target.style.boxShadow = 'none';
      }
    });

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

    // Efecto para sugerir departamento automáticamente cuando cambia usuario o agente
    useEffect(() => {
      if (formData.user || formData.agent) {
        const suggestedDept = suggestDepartment(formData.user, formData.agent);
        if (suggestedDept && !formData.department) {
          // Solo sugerir si no hay departamento ya seleccionado
          setFormData(prev => ({ ...prev, department: suggestedDept }));
        }
      }
    }, [formData.user, formData.agent]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      if (value === 'new') {
        const labels = { 'agent': 'Agente', 'branch': 'Sucursal', 'user': 'Usuario', 'collaborators_select': 'Colaborador', 'department': 'Departamento' };
        const label = labels[name] || name;
        setAddModalType(name);
        setAddModalData({ name: '', type: '' });
        setShowAddModal(true);
        return;
      }

      if (name === 'collaborators_select') {
        if (!value) return;
        const current = formData.collaborators && formData.collaborators !== 'None' ? formData.collaborators : '';
        const list = current ? current.split(',').map(s => s.trim()) : [];
        if (!list.includes(value)) {
          const newCollaborators = current ? `${current}, ${value}` : value;
          setFormData(prev => ({ ...prev, collaborators: newCollaborators }));
        }
        return;
      }

      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Si estamos agregando un nuevo elemento desde el formulario de edición
      if (name === 'user' || name === 'agent' || name === 'branch' || name === 'department') {
        if (value === 'new') {
          // El modal ya se abre desde el handleChange anterior
          return;
        }
      }
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', zIndex: 1 }}>
            <div className="brand-icon" style={{ 
              width: '48px', 
              height: '48px', 
              fontSize: '1.2rem', 
              margin: 0,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #8b5cf680)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 25px rgba(139, 92, 246, 0.2)'
            }}>
              <i className="fas fa-edit" style={{ color: '#ffffff' }}></i>
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '2rem', 
                fontWeight: '800',
                color: '#8b5cf6',
                textShadow: '0 2px 10px rgba(139, 92, 246, 0.3)'
              }}>
                <a
                  href={`https://mesadeayuda.sommiercenter.com/requests/show/index/id/${ticket.ticket_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ticket-header-link"
                  style={{
                    color: '#8b5cf6',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#7c3aed';
                    e.target.style.textShadow = '0 0 20px rgba(139, 92, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#8b5cf6';
                    e.target.style.textShadow = '0 2px 10px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  Ticket #{ticket.ticket_number}
                </a>
              </h2>
              <p style={{ 
                color: '#94a3b8', 
                margin: '0.5rem 0 0 0', 
                fontSize: '1rem',
                fontWeight: '500',
                opacity: 0.8
              }}>Gestión y actualización de datos</p>
            </div>
          </div>
          <button 
            className="nav-item" 
            onClick={onBack} 
            style={{ 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              borderRadius: '12px',
              padding: '0.8rem 1.5rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              fontWeight: '600',
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.1)';
            }}
          >
            <i className="fas fa-times"></i> Cancelar
          </button>
        </div>

        <form className="edit-form" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="form-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Agente Principal</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  name="agent"
                  value={formData.agent || ''}
                  onChange={handleChange}
                  className="custom-input"
                  style={{ 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    borderLeft: `4px solid ${getAgentColor(formData.agent)}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">-- Seleccionar Agente --</option>
                  {agents.map(a => <option key={a} value={a}>{a}</option>)}
                  {formData.agent && !agents.includes(formData.agent) && <option value={formData.agent}>{formData.agent}</option>}
                  <option value="new">+ Agregar Nuevo...</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Estado</label>
              <select name="status" value={formData.status || ''} onChange={handleChange} className="custom-input" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}>
                <option value="Abierto">Abierto</option>
                <option value="Cerrado">Cerrado</option>
                <option value="En espera">En espera</option>
                <option value="Resuelto">Resuelto</option>
                <option value="Derivado">Derivado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Usuario</label>
              <select 
                name="user" 
                value={formData.user || ''} 
                onChange={handleChange}
                className="custom-input"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">-- Seleccionar Usuario --</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
                {formData.user && !users.includes(formData.user) && <option value={formData.user}>{formData.user}</option>}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
            </div>
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Sucursal</label>
              <select name="branch" value={formData.branch || ''} onChange={handleChange} className="custom-input" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}>
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
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Departamento</label>
              <select name="department" value={formData.department || ''} onChange={handleChange} className="custom-input" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                e.target.style.boxShadow = 'none';
              }}>
                <option value="">Seleccionar departamento...</option>
                {departments.length === 0 ? (
                  <option value="" disabled>No hay departamentos configurados</option>
                ) : (
                  <>
                    {departments.map((dept, index) => {
                      // Manejar tanto strings como objetos
                      const deptValue = typeof dept === 'object' ? dept.name || dept.department || '' : dept;
                      const deptLabel = typeof dept === 'object' ? dept.name || dept.department || 'Sin nombre' : dept;
                      
                      // No mostrar departamentos ocultos en el desplegable
                      if (hiddenDepartments.includes(deptValue)) {
                        return null;
                      }
                      
                      return (
                        <option key={index} value={deptValue}>
                          {deptLabel}
                        </option>
                      );
                    })}
                    {formData.department && !departments.some(d => {
                      const deptValue = typeof d === 'object' ? d.name || d.department || '' : d;
                      return deptValue === formData.department;
                    }) && (
                      <option value={formData.department}>
                        {formData.department}
                      </option>
                    )}
                  </>
                )}
                <option value="new">+ Agregar Nuevo...</option>
              </select>
              
              {/* Mensaje cuando no hay departamentos */}
              {departments.length === 0 && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#60a5fa'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-info-circle"></i>
                    Sin departamentos configurados
                  </div>
                  <div>
                    Usa la opción "+ Agregar Nuevo..." para crear tu primer departamento
                  </div>
                </div>
              )}
              
              {/* Sugerencia automática de departamento */}
              {(formData.user || formData.agent) && suggestDepartment(formData.user, formData.agent) && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px',
                  background: `${getDepartmentColor(suggestDepartment(formData.user, formData.agent))}15`,
                  border: `1px solid ${getDepartmentColor(suggestDepartment(formData.user, formData.agent))}30`,
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: getDepartmentColor(suggestDepartment(formData.user, formData.agent))
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={getDepartmentIcon(suggestDepartment(formData.user, formData.agent))}></i>
                    Sugerencia automática
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>
                      Departamento sugerido: <strong>{suggestDepartment(formData.user, formData.agent)}</strong>
                    </span>
                    {formData.department !== suggestDepartment(formData.user, formData.agent) && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, department: suggestDepartment(formData.user, formData.agent) }))}
                        style={{
                          background: `${getDepartmentColor(suggestDepartment(formData.user, formData.agent))}25`,
                          border: `1px solid ${getDepartmentColor(suggestDepartment(formData.user, formData.agent))}50`,
                          color: getDepartmentColor(suggestDepartment(formData.user, formData.agent)),
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Usar sugerencia
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="form-group" style={getFormGroupStyles()}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Fecha de Cierre</label>
              <DatePicker
                value={formData.close_date === 'None' ? '' : (formData.close_date || '')}
                onChange={(value) => setFormData(prev => ({ ...prev, close_date: value }))}
                placeholder="Seleccionar fecha de cierre"
                style={{
                  ...getInputStyles(),
                  height: '48px',
                  resize: 'none'
                }}
              />
            </div>
            <div className="form-group" style={{
              ...getFormGroupStyles(),
              gridColumn: 'span 3'
            }}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Colaboradores</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    name="collaborators_select"
                    onChange={handleChange}
                    className="custom-input"
                    value=""
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#ffffff',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.target.style.boxShadow = 'none';
                    }}
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
            <div className="form-group" style={{
              ...getFormGroupStyles(),
              gridColumn: 'span 3'
            }}>
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)'
              }}></div>
              
              <label style={getLabelStyles()}>Detalles / Notas</label>
              <textarea 
                name="details" 
                value={formData.details || ''} 
                onChange={handleChange} 
                className="custom-input" 
                style={{ 
                  ...getInputStyles(),
                  height: '120px',
                  resize: 'vertical'
                }}
                placeholder="Sin detalle..."
              ></textarea>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="nav-item" 
              style={{ 
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                borderRadius: '12px',
                padding: '1rem 3rem',
                fontWeight: '700',
                fontSize: '1rem',
                letterSpacing: '0.025em',
                textTransform: 'uppercase',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.15))';
                e.target.style.transform = 'translateY(-4px) scale(1.02)';
                e.target.style.boxShadow = '0 20px 25px -5px rgba(34, 197, 94, 0.15), 0 10px 10px -5px rgba(34, 197, 94, 0.04)';
                e.target.style.borderColor = 'rgba(34, 197, 94, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))';
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.06)';
                e.target.style.borderColor = 'rgba(34, 197, 94, 0.2)';
              }}
              onFocus={(e) => {
                e.target.style.outline = '2px solid rgba(34, 197, 94, 0.5)';
                e.target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.target.style.outline = 'none';
              }}
            >
              {/* Subtle gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.3), transparent)'
              }}></div>
              
              <i className="fas fa-save" style={{ marginRight: '0.5rem' }}></i> Guardar Cambios
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

      // Debug: Verificar datos de latencia
      console.log(`🖥️ [DEBUG] renderService ${ip}: latencies=${JSON.stringify(latencies)}, latency=${latency}, monitoring=${isMonitoring}`);

      return (
        <div className={`service-section ${isMonitoring ? 'scanning' : ''}`} style={{
          width: '280px', // Ancho fijo para caber en ServerTR15 de 320px
          height: '300px', // Altura fija para que no se corte
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '1rem',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
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

          <div className="monitoring-display" style={{ 
          height: '100px', // Altura fija para el chart
          display: 'flex', 
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          flex: 1
        }}>
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
        {/* Header Spectacular */}
        <div className="panel-header" style={{ 
          marginBottom: '2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              Monitoreo de Servidores
            </h2>
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Estado en tiempo real de infraestructura por categorías
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            position: 'relative',
            zIndex: 1
          }}>
            <button 
              className="nav-item" 
              onClick={startAllMonitors} 
              style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '0.8rem 1.5rem',
                color: '#ffffff',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.15))';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i> 
              Re-scan General
            </button>
            
            <button 
              className="nav-item" 
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '0.8rem 1.5rem',
                color: 'white',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}
              onClick={() => setShowAddServerModal(true)}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i> 
              Nueva {activeServerCategory === 'trs' ? 'TR/RD' : 'Sede'}
            </button>
          </div>
        </div>

        {/* Category Selector Spectacular */}
        <div className="categories-selector" style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveServerCategory(key)}
              className="category-tab"
              style={{
                flex: 1,
                padding: '1.2rem 1.5rem',
                background: activeServerCategory === key 
                  ? `linear-gradient(135deg, ${category.color}25, ${category.color}10)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: activeServerCategory === key 
                  ? `2px solid ${category.color}50`
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                position: 'relative',
                zIndex: 1,
                transform: activeServerCategory === key ? 'scale(1.02)' : 'scale(1)',
                boxShadow: activeServerCategory === key 
                  ? `0 8px 25px ${category.color}20`
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeServerCategory !== key) {
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                  e.target.style.transform = 'translateY(-3px) scale(1.02)';
                  e.target.style.boxShadow = '0 8px 25px rgba(255,255,255,0.1)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeServerCategory !== key) {
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: activeServerCategory === key 
                  ? `linear-gradient(135deg, ${category.color}, ${category.color}80)`
                  : `linear-gradient(135deg, ${category.color}30, ${category.color}15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <i className={category.icon} style={{ 
                  color: activeServerCategory === key ? '#ffffff' : category.color, 
                  fontSize: '1.4rem',
                  transition: 'all 0.3s ease'
                }}></i>
              </div>
              
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '800',
                  marginBottom: '0.3rem',
                  color: activeServerCategory === key ? category.color : '#ffffff'
                }}>
                  {category.title}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#94a3b8',
                  fontWeight: '500',
                  lineHeight: '1.3'
                }}>
                  {category.description}
                </div>
              </div>
              
              {/* Active indicator */}
              {activeServerCategory === key && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: category.color,
                  boxShadow: `0 0 10px ${category.color}`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}></div>
              )}
            </button>
          ))}
        </div>

        {/* Contenido de la categoría activa */}
        {activeServerCategory === 'main' && (
          <div className="category-content">
            {/* Category Info Spectacular - IGUAL QUE TR/RD */}
            <div className="category-info" style={{ 
              marginBottom: '2rem',
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
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                {categories.main.description} • {servers.filter(server => server.category === 'main' || !server.category).length} servidores activos
              </p>
            </div>

            {/* Server Cards Grid Spectacular */}
            <div className="server-cards-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem'
            }}>
              {servers.filter(server => server.category === 'main' || !server.category).map(server => (
                <div key={server.id} className="server-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-5px) scale(1.02)';
                  e.target.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.15)';
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                  e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }}>
                  {/* Background decoration */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '60px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%'
                  }}></div>
                  
                  <div className="server-card-header" style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: '800',
                        color: '#ffffff',
                        marginBottom: '0.3rem'
                      }}>{server.branch}</h3>
                      <span className="branch-code" style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>{server.branch_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn-ctrl" 
                        onClick={() => { setEditingServer(server); setShowEditServerModal(true); }} 
                        title="Editar Sucursal"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '10px',
                          padding: '0.6rem',
                          color: '#3b82f6',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.15))';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-ctrl" 
                        onClick={() => handleDeleteServer(server.id)} 
                        title="Eliminar Sucursal" 
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '10px',
                          padding: '0.6rem',
                          color: '#ef4444',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))';
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="services-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    position: 'relative',
                    zIndex: 1
                  }}>
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

            {/* TR/RD Server Cards Grid - COMPACT AND MODERN */}
            {servers.filter(server => server.category === 'trs').length > 0 ? (
              <div className="server-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', // Vuelto a 320px para TR/RD
                gap: '1.5rem'
              }}>
                {servers.filter(server => server.category === 'trs').map(server => (
                  <div key={server.id} className="server-card" style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden' // Sin minHeight fijo, se adapta al contenido
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-5px) scale(1.02)';
                    e.target.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.15)';
                    e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}>
                    {/* Background decoration */}
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '60px',
                      height: '60px',
                      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}></div>
                    
                    <div className="server-card-header" style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.5rem',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '1.3rem',
                          fontWeight: '800',
                          color: '#ffffff',
                          marginBottom: '0.3rem'
                        }}>{server.branch}</h3>
                        <span className="branch-code" style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#8b5cf6',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>{server.branch_code}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-ctrl" 
                          onClick={() => { setEditingServer(server); setShowEditServerModal(true); }} 
                          title="Editar TR/RD"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '10px',
                            padding: '0.6rem',
                            color: '#8b5cf6',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.15))';
                            e.target.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn-ctrl" 
                          onClick={() => handleDeleteServer(server.id)} 
                          title="Eliminar TR/RD" 
                          style={{
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            padding: '0.6rem',
                            color: '#ef4444',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))';
                            e.target.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                    
                    {/* Single Service Container for TR/RD */}
                    <div className="services-container" style={{
                      position: 'relative',
                      zIndex: 1
                    }}>
                      {renderService(server.primary_service_ip, server.primary_service_provider, server.primary_service_speed, 'primary')}
                      
                      {/* Only show secondary if it exists */}
                      {server.secondary_service_ip && (
                        <div style={{
                          marginTop: '1rem'
                        }}>
                          {renderService(server.secondary_service_ip, server.secondary_service_provider, server.secondary_service_speed, 'secondary')}
                        </div>
                      )}
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
        <div className="welcome-banner" style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem'
            }}>
              Dashboard Principal
            </h1>
            <p style={{
              color: '#94a3b8',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Monitoreo en tiempo real del sistema de tickets
            </p>
          </div>
          <div className="welcome-stats" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div className="stat-card total" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px) scale(1.02)';
              e.target.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.3)';
              e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.15))';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.2)';
              e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))';
            }}>
              <div className="stat-content">
                <div className="stat-number" style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>{quickStats?.total || 0}</div>
                <div className="stat-label" style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Total</div>
              </div>
            </div>
            <div className="stat-card open" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(34, 197, 94, 0.05))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px) scale(1.02)';
              e.target.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.3)';
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(34, 197, 94, 0.15))';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.2)';
              e.target.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(34, 197, 94, 0.05))';
            }}>
              <div className="stat-content">
                <div className="stat-number" style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #10b981, #22c55e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>{quickStats?.open || 0}</div>
                <div className="stat-label" style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Abiertos</div>
              </div>
            </div>
            <div className="stat-card sla" style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.05))',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px) scale(1.02)';
              e.target.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.3)';
              e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(168, 85, 247, 0.15))';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.2)';
              e.target.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.05))';
            }}>
              <div className="stat-content">
                <div className="stat-number" style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>
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
                <div className="stat-label" style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>SLA Cumplido</div>
              </div>
            </div>
            <div className="stat-card closed" style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(248, 113, 113, 0.05))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '1.2rem',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px) scale(1.02)';
              e.target.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.3)';
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(248, 113, 113, 0.15))';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.2)';
              e.target.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(248, 113, 113, 0.05))';
            }}>
              <div className="stat-content">
                <div className="stat-number" style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #ef4444, #f87171)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem'
                }}>{quickStats?.closed || 0}</div>
                <div className="stat-label" style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Cerrados</div>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Analysis Section - Explosive Visual Enhancement */}
        <div className="sla-analysis-section" style={{ 
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02))',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 12px 40px rgba(139, 92, 246, 0.15)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div className="sla-particle" style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }}></div>
          
          {/* Debug: Verificar si las clases se aplican */}
          <div className="sla-bounce" style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            zIndex: 1000,
            animation: 'bounce 2s infinite'
          }}>
            DEBUG: Animaciones CSS activas
          </div>
          
          {/* Debug: Animación inline directa */}
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '10px',
            background: 'rgba(0, 255, 0, 0.8)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            zIndex: 1000,
            animation: 'pulse 1s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
              '50%': { opacity: 1, transform: 'scale(1.1)' }
            }
          }}>
            DEBUG: Animación INLINE
          </div>
          
          {/* Debug: Animación simple con transición */}
          <div style={{
            position: 'absolute',
            top: '110px',
            left: '10px',
            background: 'rgba(255, 0, 255, 0.8)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            zIndex: 1000,
            transition: 'all 0.5s ease',
            transform: 'scale(1.1)',
            boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)'
          }}>
            DEBUG: Animación REAL
          </div>
          
          <h3 style={{ 
            marginBottom: '1.5rem', 
            fontSize: '1.5rem',
            fontWeight: '800',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            zIndex: 1
          }}>
            <i className="fas fa-chart-line sla-float" style={{ 
              color: '#8b5cf6',
              fontSize: '1.4rem'
            }}></i>
            Análisis SLA
            <span className="sla-glow" style={{
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              color: 'white',
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              EN VIVO
            </span>
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1.5rem',
            position: 'relative',
            zIndex: 1
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
              
              // Calcular tendencia (simulada)
              const trend = Math.random() > 0.5 ? 'up' : 'down';
              const trendValue = Math.floor(Math.random() * 10) + 1;
              
              return (
                <div key={key} style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                  border: `1px solid ${category.color}40`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-8px) scale(1.03)';
                  e.target.style.boxShadow = `0 20px 40px ${category.color}30`;
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))';
                  e.target.style.borderColor = `${category.color}60`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))';
                  e.target.style.borderColor = `${category.color}40`;
                }}>
                  {/* Animated background particles */}
                  <div className="sla-particle" style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '30px',
                    height: '30px',
                    background: `radial-gradient(circle, ${category.color}20 0%, transparent 70%)`,
                    borderRadius: '50%'
                  }}></div>
                  
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ 
                      color: category.color, 
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      textShadow: `0 0 10px ${category.color}40`
                    }}>
                      {category.description.split(' - ')[0]}
                    </div>
                    <div className="sla-float" style={{
                      background: `linear-gradient(135deg, ${category.color}, ${category.color}80)`,
                      color: 'white',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '15px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      boxShadow: `0 4px 15px ${category.color}40`
                    }}>
                      {total} tickets
                    </div>
                  </div>
                  
                  {/* Circular Progress Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    position: 'relative'
                  }}>
                    <div className="sla-rotate" style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: `conic-gradient(${category.color} ${avgCompliance * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: `0 0 20px ${category.color}30`
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}>
                        <span style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: avgCompliance >= 80 ? '#10b981' : avgCompliance >= 60 ? '#f59e0b' : '#ef4444',
                          lineHeight: '1'
                        }}>{avgCompliance}%</span>
                        <span style={{
                          fontSize: '0.6rem',
                          color: '#94a3b8',
                          fontWeight: '600'
                        }}>SLA</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#10b981',
                      fontWeight: '700',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                      transform: 'scale(1)',
                      transition: 'transform 0.3s ease'
                    }}>
                      <span>✅</span> {goodSLA}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#f59e0b',
                      fontWeight: '700',
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)',
                      transform: 'scale(1)',
                      transition: 'transform 0.3s ease'
                    }}>
                      <span>⚠️</span> {warningSLA}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#ef4444',
                      fontWeight: '700',
                      background: 'rgba(239, 68, 68, 0.15)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                      transform: 'scale(1)',
                      transition: 'transform 0.3s ease'
                    }}>
                      <span>❌</span> {exceededSLA}
                    </div>
                  </div>
                  
                  {/* Trend Indicator */}
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    fontWeight: '600'
                  }}>
                    <span>Tendencia</span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: trend === 'up' ? '#10b981' : '#ef4444',
                      fontWeight: '700'
                    }}>
                      <i className={`fas fa-arrow-${trend}`}></i>
                      {trendValue}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Modern and Enhanced */}
        <div className="recent-activity-section" style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{
            marginBottom: '1.2rem',
            fontSize: '1.3rem',
            fontWeight: '700',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem'
          }}>
            <i className="fas fa-clock" style={{ 
              color: '#8b5cf6',
              fontSize: '1.2rem'
            }}></i>
            Actividad Reciente
          </h2>
          <div className="recent-tickets-compact" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}>
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="recent-ticket-compact" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.01)';
                e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.2)';
                e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              }}>
                <div className="ticket-info-compact" style={{ flex: 1 }}>
                  <div className="ticket-header-compact" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.8rem'
                  }}>
                    <span className="ticket-id" style={{
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#8b5cf6',
                      background: 'rgba(139, 92, 246, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}>#{ticket.id}</span>
                    <span className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`} style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="ticket-details-compact" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.8rem'
                  }}>
                    <div className="ticket-user" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      <i className="fas fa-user" style={{ 
                        color: '#3b82f6',
                        fontSize: '0.8rem'
                      }}></i>
                      {ticket.user || 'Usuario Desconocido'}
                    </div>
                    <div className="ticket-branch" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      <i className="fas fa-store" style={{ 
                        color: '#10b981',
                        fontSize: '0.8rem'
                      }}></i>
                      {ticket.branch || 'Sin sucursal'}
                    </div>
                    <div className="ticket-date" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      <i className="fas fa-calendar" style={{ 
                        color: '#f59e0b',
                        fontSize: '0.8rem'
                      }}></i>
                      {(() => {
                        try {
                          const date = parseArgentineDate(ticket.creation_date);
                          
                          if (!date) return 'Fecha inválida';
                          
                          // Mostrar solo fecha ya que no se guarda hora en la base de datos
                          return date.toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                        } catch (error) {
                          return 'Error de fecha';
                        }
                      })()}
                    </div>
                  </div>
                </div>
                <div className="ticket-actions-compact">
                  <button 
                    className="btn btn-sm btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
                      e.target.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'linear-gradient(135deg, #3b82f6, #6366f1)';
                    }}
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
                      // Mostrar confirmación moderna
                      const successDiv = document.createElement('div');
                      successDiv.className = 'modal-success';
                      successDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <i class="fas fa-check-circle" style="font-size: 1.2rem;"></i>
                          <div>
                            <div style="font-weight: 700; margin-bottom: 0.25rem;">¡Elemento agregado exitosamente!</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">El nuevo elemento ha sido guardado correctamente.</div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(successDiv);
                      
                      setTimeout(() => {
                        successDiv.remove();
                      }, 3000);
                      
                      setShowCreateModal(false);
                      fetchHomeData();
                    } else {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'modal-success';
                      errorDiv.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(239, 68, 68, 0.9))';
                      errorDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <i class="fas fa-exclamation-circle" style="font-size: 1.2rem;"></i>
                          <div>
                            <div style="font-weight: 700; margin-bottom: 0.25rem;">Error al agregar elemento</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">No se pudo guardar el elemento. Inténtalo nuevamente.</div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(errorDiv);
                      
                      setTimeout(() => {
                        errorDiv.remove();
                      }, 3000);
                    }
                  } catch (error) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'modal-success';
                    errorDiv.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(239, 68, 68, 0.9))';
                    errorDiv.innerHTML = `
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 1.2rem;"></i>
                        <div>
                          <div style="font-weight: 700; margin-bottom: 0.25rem;">Error de conexión</div>
                          <div style="font-size: 0.9rem; opacity: 0.9;">Error al conectar con el servidor. Verifique su conexión.</div>
                        </div>
                      </div>
                    `;
                    document.body.appendChild(errorDiv);
                    
                    setTimeout(() => {
                      errorDiv.remove();
                    }, 3000);
                  }
                }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Agente
                      </label>
                      <input
                        type="text"
                        name="agent"
                        required
                        className="modal-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
                        Usuario
                      </label>
                      <input
                        type="text"
                        name="user"
                        required
                        className="modal-input"
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
                        className="modal-input"
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
      { key: 'departments', label: 'Departamentos' },
    ];

    const getList = () => {
      if (settingsTab === 'users') return settingsUsers;
      if (settingsTab === 'branches') return settingsBranches;
      if (settingsTab === 'agents') return settingsAgents;
      return settingsDepartments;
    };

    const setList = (next) => {
      if (settingsTab === 'users') setSettingsUsers(next);
      else if (settingsTab === 'branches') setSettingsBranches(next);
      else if (settingsTab === 'agents') setSettingsAgents(next);
      else setSettingsDepartments(next);
    };

    const addItem = async () => {
      const name = (settingsNewName || '').trim();
      if (!name) return;
      setSettingsLoading(true);
      setSettingsError('');
      
      // Para departamentos, usar localStorage
      if (settingsTab === 'departments') {
        try {
          const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
          if (savedDepartments.includes(name)) {
            setSettingsError('El departamento ya existe');
            return;
          }
          savedDepartments.push(name);
          localStorage.setItem('local_departments', JSON.stringify(savedDepartments));
          setSettingsDepartments(savedDepartments);
          setSettingsNewName('');
          
          // También actualizar el estado global departments para que aparezca en el desplegable
          setDepartments(savedDepartments);
          
          console.log('➕ [DEBUG] Departamento agregado:', name);
          console.log('🔄 [DEBUG] Estado global departments actualizado:', savedDepartments);
        } catch (e) {
          setSettingsError('Error al guardar departamento');
          console.error('Error guardando departamento:', e);
        } finally {
          setSettingsLoading(false);
        }
        return;
      }
      
      // Para usuarios, sucursales y agentes (API)
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
        console.error('Error en settings:', e);
        setSettingsError('Error al cargar configuración');
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
        console.error('Error en settings:', e);
        setSettingsError('Error al cargar configuración');
      } finally {
        setSettingsLoading(false);
      }
    };

    const renameItem = async (item) => {
      const currentName = settingsTab === 'departments' ? item : item.name;
      // Para renombrar, usamos el mismo modal personalizado
      setAddModalType('rename');
      setAddModalData({ name: currentName, type: '', originalItem: item });
      setShowAddModal(true);
      return;
      
      setSettingsLoading(true);
      setSettingsError('');
      
      // Para departamentos, usar localStorage
      if (settingsTab === 'departments') {
        try {
          const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
          const updatedDepartments = savedDepartments.map(dept => dept === item ? newName.trim() : dept);
          localStorage.setItem('local_departments', JSON.stringify(updatedDepartments));
          setSettingsDepartments(updatedDepartments);
          
          // También actualizar el estado global departments
          setDepartments(updatedDepartments);
          
          console.log('✏️ [DEBUG] Departamento renombrado:', item, '→', newName.trim());
        } catch (e) {
          setSettingsError('Error al renombrar departamento');
        } finally {
          setSettingsLoading(false);
        }
        return;
      }
      
      // Para usuarios, sucursales y agentes (API)
      try {
        const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() })
        });
        const data = await resp.json();
        if (!resp.ok || data.status === 'error') {
          setSettingsError(data.message || 'Error al renombrar');
          return;
        }
        await fetchSettingsAll();
        await fetchGroups();
      } catch (e) {
        console.error('Error en settings:', e);
        setSettingsError('Error al cargar configuración');
      } finally {
        setSettingsLoading(false);
      }
    };

    const deleteItem = async (item) => {
      const itemName = settingsTab === 'departments' ? item : (item.name || item);
      const isHidden = settingsTab === 'departments' && hiddenDepartments.includes(item);
      
      if (!confirm(`¿Estás seguro de que quieres ${isHidden ? 'hacer VISIBLE' : isHidden ? 'eliminar permanentemente' : 'hacer NO VISIBLE'} "${itemName}"? ${isHidden ? 'Volverá a aparecer en la lista de selección.' : 'Ya no aparecerá en la lista de selección.'}`)) {
        return;
      }
      
      setSettingsLoading(true);
      setSettingsError('');
      
      // Para departamentos, manejar visibilidad o eliminación
      if (settingsTab === 'departments') {
        try {
          if (isHidden) {
            // Restaurar: quitar de la lista de ocultos
            let currentHidden = JSON.parse(localStorage.getItem('hidden_departments') || '[]');
            currentHidden = currentHidden.filter(dept => dept !== item);
            localStorage.setItem('hidden_departments', JSON.stringify(currentHidden));
            setHiddenDepartments(currentHidden);
            console.log('👁️ [DEBUG] Departamento hecho VISIBLE:', item);
          } else {
            // Ocultar: agregar a la lista de ocultos
            let currentHidden = JSON.parse(localStorage.getItem('hidden_departments') || '[]');
            if (!currentHidden.includes(item)) {
              currentHidden.push(item);
              localStorage.setItem('hidden_departments', JSON.stringify(currentHidden));
              setHiddenDepartments(currentHidden);
              console.log('👁️‍🗨️ [DEBUG] Departamento hecho NO VISIBLE:', item);
            }
          }
          
          // Actualizar el estado global departments para reflejar cambios de visibilidad
          const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
          setDepartments(savedDepartments);
          
        } catch (e) {
          setSettingsError('Error al cambiar visibilidad del departamento');
          console.error('Error cambiando visibilidad:', e);
        } finally {
          setSettingsLoading(false);
        }
        return;
      }
      
      // Para usuarios, sucursales y agentes (API)
      try {
        const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}/${item.id}`, {
          method: 'DELETE'
        });
        const data = await resp.json();
        if (!resp.ok || data.status === 'error') {
          setSettingsError(data.message || 'Error al eliminar');
          return;
        }
        await fetchSettingsAll();
        await fetchGroups();
      } catch (e) {
        console.error('Error en settings:', e);
        setSettingsError('Error al cargar configuración');
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
            className="modal-input"
            value={settingsNewName}
            onChange={(e) => setSettingsNewName(e.target.value)}
            placeholder="Nombre nuevo..."
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
                {settingsTab !== 'departments' && <th>Estado</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {settingsLoading && list.length === 0 ? (
                <tr><td colSpan={settingsTab === 'departments' ? 2 : 3} style={{ padding: '1.5rem' }}>Cargando...</td></tr>
              ) : (
                list.map((item, index) => {
                  // Para departamentos, item es un string, para otros es un objeto
                  const itemName = settingsTab === 'departments' ? item : item.name;
                  const itemId = settingsTab === 'departments' ? index : item.id;
                  const isActive = settingsTab === 'departments' ? true : item.active;
                  
                  // Verificar si el departamento está oculto (solo para departamentos)
                  const isHidden = settingsTab === 'departments' && hiddenDepartments.includes(item);
                  
                  return (
                    <tr key={itemId} style={{ 
                      opacity: isActive ? 1 : 0.55,
                      backgroundColor: isHidden ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                    }}>
                      <td style={{ 
                        fontWeight: 700,
                        textDecoration: isHidden ? 'line-through' : 'none',
                        color: isHidden ? '#ef4444' : 'inherit'
                      }}>
                        {String(itemName)}
                        {isHidden && <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#ef4444' }}>(NO VISIBLE)</span>}
                      </td>
                      {settingsTab !== 'departments' && (
                        <td>
                          <span className={`badge ${isActive ? 'status-abierto' : 'status-cerrado'}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {settingsTab === 'departments' && (
                            <button className="action-btn edit" title="Renombrar" onClick={() => renameItem(item)}><i className="fas fa-i-cursor"></i></button>
                          )}
                          {settingsTab !== 'departments' && (
                            <button className="action-btn edit" title="Renombrar" onClick={() => renameItem(item)}><i className="fas fa-i-cursor"></i></button>
                          )}
                          {settingsTab !== 'departments' && (
                            <button
                              className={`action-btn ${isActive ? 'delete' : 'view'}`}
                              title={isActive ? 'Desactivar' : 'Activar'}
                              onClick={() => toggleActive(item)}
                            >
                              <i className={`fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                            </button>
                          )}
                          <button
                            className={`action-btn ${isHidden ? 'view' : 'delete'}`}
                            title={isHidden ? 'Hacer Visible' : 'Hacer NO VISIBLE'}
                            onClick={() => deleteItem(item)}
                          >
                            <i className={`fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {!settingsLoading && list.length === 0 && (
                <tr><td colSpan={settingsTab === 'departments' ? 2 : 3} style={{ padding: '1.5rem' }}>Sin registros.</td></tr>
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

              <div className="panel branch-panel" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <div className="panel-header-mini" style={{
                  marginBottom: '1.2rem',
                  padding: '0.8rem 1rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem'
                  }}>
                    <i className="fas fa-map-marker-alt" style={{ 
                      color: '#8b5cf6',
                      fontSize: '1.1rem'
                    }}></i>
                    Tickets por Sucursal
                  </h3>
                </div>
                <div className="branch-stats-list" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}>
                  {stats?.branch_stats?.map((branch, i) => (
                    <div key={i} className="branch-stat-item" style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px) scale(1.01)';
                      e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.15)';
                      e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0) scale(1)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}>
                      <div className="branch-name-info" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.8rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem'
                        }}>
                          <span className="branch-rank" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '0.9rem'
                          }}>{i + 1}</span>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#ffffff'
                          }}>{branch.name}</span>
                        </div>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#8b5cf6',
                          background: 'rgba(139, 92, 246, 0.1)',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px'
                        }}>{branch.count} tickets</span>
                      </div>
                      <div className="branch-progress-container" style={{
                        position: 'relative',
                        height: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div className="branch-progress-bar" style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${(branch.count / stats.total_tickets) * 100}%`,
                          background: 'linear-gradient(90deg, #8b5cf6, #a855f7, #c084fc)',
                          borderRadius: '4px',
                          transition: 'width 0.6s ease',
                          boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                        }}></div>
                        <span style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '-1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#94a3b8'
                        }}>{Math.round((branch.count / stats.total_tickets) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'tickets':
        if (viewMode === 'edit' && selectedTicket) {
          return <TicketEditView ticket={selectedTicket} onSave={handleSaveTicket} onBack={() => { setViewMode('list'); setSelectedTicket(null); setActiveTab('tickets'); }} />;
        }
        if (viewMode === 'create') {
          return <TicketCreateView onSuccess={() => {
            setViewMode('list');
            fetchTickets();
          }} onBack={() => { setViewMode('list'); setActiveTab('tickets'); }} />;
        }
        return (
          <div>
            <TicketDetailModal 
              ticket={selectedTicketForModal} 
              onClose={() => { setShowDetailModal(false); setSelectedTicketForModal(null); }} 
            />
            <div className="panel" style={{ padding: '2rem' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Gestión de Tickets</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Mostrando {filteredTickets.length > 0 ? indexOfFirstTicket + 1 : 0} - {Math.min(indexOfLastTicket, filteredTickets.length)} de {filteredTickets.length} tickets
                    {searchTerm && ` (filtrando: "${searchTerm}")`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {/* Buscador */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="🔍 Buscar tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '25px',
                        padding: '10px 15px 10px 40px',
                        fontSize: '0.9rem',
                        color: '#ffffff',
                        width: '300px',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <i 
                      className="fas fa-search" 
                      style={{
                        position: 'absolute',
                        left: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '0.9rem'
                      }}
                    ></i>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
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
                    <th>Departamento</th>
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
                        {(() => {
                          const deptName = ticket.department || (ticket.id ? getTicketDepartment(ticket.id) : '');
                          const deptColor = getDepartmentColor(deptName);
                          console.log('🏷️ [TABLE DEBUG] Ticket:', ticket.ticket_number, 'Departamento:', `"${deptName}"`, 'Color:', deptColor);
                          return (
                            <span style={{
                              background: deptName ? 
                                `${deptColor}20` : 'rgba(107, 114, 128, 0.2)',
                              color: deptName ? 
                                deptColor : '#6b7280',
                              border: deptName ? 
                                `2px solid ${deptColor}` : '2px solid rgba(107, 114, 128, 0.5)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              boxShadow: deptName ? 
                                `0 2px 4px ${deptColor}20` : 'none'
                            }}>
                              <i className={getDepartmentIcon(deptName)} style={{ fontSize: '0.6rem' }}></i>
                              {deptName || 'Sin depto'}
                            </span>
                          );
                        })()}
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
                          <button className="action-btn view" title="Ver Detalles" onClick={() => { setSelectedTicketForModal(ticket); setShowDetailModal(true); }}><i className="fas fa-eye"></i></button>
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
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto', 
            textAlign: 'center', 
            padding: '2rem'
          }}>
            {/* Header Spectacular */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: '-30px',
                right: '-30px',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                borderRadius: '50%'
              }}></div>
              
              <div className="brand-icon" style={{ 
                margin: '0 auto 1.5rem', 
                width: '80px', 
                height: '80px', 
                fontSize: '2.5rem',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)',
                position: 'relative',
                zIndex: 1
              }}>
                <i className="fas fa-file-excel" style={{ 
                  color: '#3b82f6',
                  fontSize: '2.5rem'
                }}></i>
              </div>
              
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '800', 
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                position: 'relative',
                zIndex: 1
              }}>
                Sincronizar Base de Datos
              </h2>
              
              <p style={{ 
                color: '#94a3b8', 
                marginBottom: '0',
                fontSize: '1rem',
                fontWeight: '500',
                position: 'relative',
                zIndex: 1
              }}>
                Selecciona el archivo Excel con los nuevos tickets. El sistema detectará automáticamente cuáles son nuevos para no duplicar información.
              </p>
            </div>

            {/* Upload Box Modern */}
            <div className="upload-box" style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              border: '2px dashed rgba(59, 130, 246, 0.5)',
              borderRadius: '20px',
              padding: '3rem',
              position: 'relative',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.8)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept=".xlsx,.xls"
                style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, opacity: 0, cursor: 'pointer' }}
              />
              
              {/* Upload Icon with Effects */}
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.05))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)'
              }}>
                <i className="fas fa-cloud-upload-alt" style={{ 
                  fontSize: '2.5rem', 
                  color: '#3b82f6',
                  transition: 'transform 0.3s ease'
                }}></i>
              </div>
              
              <span style={{ 
                fontWeight: 700, 
                fontSize: '1.1rem',
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {uploadStatus.loading ? 'Cargando...' : 'Haz clic o arrastra el archivo aquí'}
              </span>
              
              {/* Additional Info */}
              <div style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: '#94a3b8',
                fontWeight: '500'
              }}>
                Formatos admitidos: .xlsx, .xls
              </div>
            </div>

            {/* Status Message Enhanced */}
            {uploadStatus.message && (
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                borderRadius: '16px',
                background: uploadStatus.type === 'error' 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' 
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                color: uploadStatus.type === 'error' ? '#ef4444' : '#10b981',
                fontWeight: '600',
                border: `1px solid ${uploadStatus.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                backdropFilter: 'blur(10px)',
                boxShadow: uploadStatus.type === 'error' 
                  ? '0 8px 25px rgba(239, 68, 68, 0.15)' 
                  : '0 8px 25px rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: uploadStatus.type === 'error' 
                    ? 'rgba(239, 68, 68, 0.2)' 
                    : 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${uploadStatus.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}>
                  <i className={`fas ${uploadStatus.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ 
                    fontSize: '1.2rem',
                    color: uploadStatus.type === 'error' ? '#ef4444' : '#10b981'
                  }}></i>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '1rem',
                    marginBottom: '0.3rem'
                  }}>
                    {uploadStatus.type === 'error' ? 'Error en la carga' : 'Carga exitosa'}
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem',
                    opacity: 0.8
                  }}>
                    {uploadStatus.message}
                  </div>
                </div>
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
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setCurrentPage(1); setViewMode('list'); }}>
              <i className="fas fa-cog"></i><span>Configuración</span>
            </div>
        </nav>
        {/* Espacio para fecha y hora - abajo de todo del sidebar */}
        <div style={{ 
          padding: '15px', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '5px',
            textAlign: 'center'
          }}>
            <i className="fas fa-clock" style={{ marginRight: '5px', color: 'rgba(255,255,255,0.5)' }}></i>
            {new Date().toLocaleDateString('es-AR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center'
          }}>
            {new Date().toLocaleTimeString('es-AR', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </div>
        </div>
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
              <span style={{ fontWeight: 600 }}>Juan Billiot</span>
              <div className="avatar">JB</div>
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
      
      {/* Custom Modal for Adding Items */}
      <CustomAddModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        addModalType={addModalType}
        addModalData={addModalData}
        setAddModalData={setAddModalData}
        onAddItem={async (type, name, deptType) => {
          console.log('Adding item:', type, name, deptType);
          
          if (type === 'department') {
            // Lógica para departamentos (localStorage)
            const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
            if (!savedDepartments.includes(name)) {
              const updated = [...savedDepartments, name];
              localStorage.setItem('local_departments', JSON.stringify(updated));
              setDepartments(updated);
              setSettingsDepartments(updated);
              
              // Actualizar el formulario si estamos en edición de ticket
              if (viewMode === 'edit' && selectedTicket) {
                setFormData(prev => ({ ...prev, department: name }));
              }
              
              // Mostrar confirmación
              const notification = document.createElement('div');
              notification.className = 'modal-success';
              notification.innerHTML = `<i class="fas fa-check-circle"></i> Departamento "${name}" agregado correctamente`;
              document.body.appendChild(notification);
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
            }
          } else if (type === 'user' || type === 'agent' || type === 'branch') {
            // Lógica para usuarios, agentes, sucursales (API)
            try {
              setSettingsLoading(true);
              setSettingsError('');
              
              const resp = await fetch(`${API_BASE}/api/settings/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });
              
              const data = await resp.json();
              
              if (!resp.ok || data.status === 'error') {
                setSettingsError(data.message || `Error al agregar ${type}`);
                return;
              }
              
              await fetchSettingsAll();
              await fetchGroups();
              
              // Actualizar el formulario si estamos en edición de ticket
              if (viewMode === 'edit' && selectedTicket) {
                setFormData(prev => ({ ...prev, [type]: name }));
              }
              
              // Mostrar confirmación
              const notification = document.createElement('div');
              notification.className = 'modal-success';
              notification.innerHTML = `<i class="fas fa-check-circle"></i> ${type === 'user' ? 'Usuario' : type === 'agent' ? 'Agente' : 'Sucursal'} "${name}" agregado correctamente`;
              document.body.appendChild(notification);
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
              
            } catch (e) {
              console.error('Error adding item:', e);
              setSettingsError(`Error al agregar ${type}`);
            } finally {
              setSettingsLoading(false);
            }
          }
        }}
        onRenameItem={async (item, newName) => {
          console.log('Renaming item:', item, newName);
          
          if (settingsTab === 'departments') {
            // Lógica para departamentos (localStorage)
            const savedDepartments = JSON.parse(localStorage.getItem('local_departments') || '[]');
            const updated = savedDepartments.map(dept => dept === item ? newName : dept);
            localStorage.setItem('local_departments', JSON.stringify(updated));
            setDepartments(updated);
            setSettingsDepartments(updated);
            
            // Mostrar confirmación
            const notification = document.createElement('div');
            notification.className = 'modal-success';
            notification.innerHTML = `<i class="fas fa-check-circle"></i> Departamento renombrado de "${item}" a "${newName}" correctamente`;
            document.body.appendChild(notification);
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 3000);
          } else if (settingsTab === 'users' || settingsTab === 'agents' || settingsTab === 'branches') {
            // Lógica para usuarios, agentes, sucursales (API)
            try {
              setSettingsLoading(true);
              setSettingsError('');
              
              const resp = await fetch(`${API_BASE}/api/settings/${settingsTab}/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
              });
              
              const data = await resp.json();
              
              if (!resp.ok || data.status === 'error') {
                setSettingsError(data.message || 'Error al renombrar');
                return;
              }
              
              await fetchSettingsAll();
              await fetchGroups();
              
              // Mostrar confirmación
              const notification = document.createElement('div');
              notification.className = 'modal-success';
              notification.innerHTML = `<i class="fas fa-check-circle"></i> ${settingsTab === 'users' ? 'Usuario' : settingsTab === 'agents' ? 'Agente' : 'Sucursal'} renombrado de "${item.name}" a "${newName}" correctamente`;
              document.body.appendChild(notification);
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 3000);
              
            } catch (e) {
              console.error('Error renaming item:', e);
              setSettingsError('Error al renombrar');
            } finally {
              setSettingsLoading(false);
            }
          }
        }}
      />
    </>
  )
}

export default App
