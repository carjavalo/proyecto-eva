import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../config/apiClient';
import { toast } from "sonner";
import {
  FaHome,
  FaTools,
  FaUsers,
  FaBuilding,
  FaClipboardList,
  FaChartBar,
  FaCog,
  FaFileAlt,
  FaCalendarAlt,
  FaWarehouse,
  FaChevronDown,
  FaChevronRight,
  FaDesktop,
  FaIndustry,
  FaUserMd,
  FaShieldAlt,
  FaExclamationTriangle,
  FaSearch,
  FaPhone,
  FaMapMarkerAlt,
  FaBoxes,
  FaWrench,
  FaBook,
  FaTicketAlt,
  FaWrenchIcon,
  FaCalendar,
  FaTimes,
  FaLock
} from "react-icons/fa";

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, hasModuleAccess, permissions, loading: authLoading } = useAuth();

  // Cargar módulos desde la BD
  useEffect(() => {
    const loadModules = async () => {
      try {
        console.log('🔍 SIDEBAR: Cargando módulos desde BD...');
        console.log('🔍 SIDEBAR: User state:', !!user);
        console.log('🔍 SIDEBAR: Loading state:', loading);
        
        const response = await apiClient.get('/v1/modulos');
        console.log('📂 SIDEBAR: Módulos recibidos:', response.data);
        
        if (response.data.success && response.data.data) {
          setModules(response.data.data);
          console.log('✅ SIDEBAR: Módulos cargados:', response.data.data.length);
          console.log('📋 SIDEBAR: Módulos array:', response.data.data);
        } else {
          console.warn('⚠️ SIDEBAR: Respuesta de módulos no exitosa:', response.data);
        }
      } catch (error) {
        console.error('❌ SIDEBAR: Error cargando módulos:', error);
      } finally {
        console.log('🏁 SIDEBAR: Cambiando loading a false');
        setLoading(false);
      }
    };

    console.log('🚀 SIDEBAR: useEffect ejecutado');
    loadModules();
  }, []);

  // Efecto para mostrar toast de cargando permisos
  useEffect(() => {
    if (authLoading) {
      toast.loading("Cargando permisos del sistema...", {
        id: "loading-permissions",
        description: "Esto tomará solo un momento",
      });
    } else {
      toast.dismiss("loading-permissions");
      // Opcional: Mostrar éxito brevemente si se desea
    }
  }, [authLoading]);

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // Mapear íconos para los módulos
  const getModuleIcon = (moduleName) => {
    const iconMap = {
      'equipos': <FaDesktop />,
      'equipos industriales': <FaIndustry />,
      'usuarios': <FaUsers />,
      'servicios': <FaBuilding />,
      'areas': <FaMapMarkerAlt />,
      'tickets propios': <FaTicketAlt />,
      'tickets activos': <FaClipboardList />,
      'tickets cerrados': <FaTimes />,
      'correctivos': <FaWrench />,
      'preventivos': <FaTools />,
      'calibraciones': <FaShieldAlt />,
      'repuestos': <FaBoxes />,
      'manuales': <FaBook />,
      'contactos': <FaPhone />,
      'reportes': <FaChartBar />,
      'observaciones': <FaFileAlt />,
      'planes mantenimiento': <FaCalendar />,
      'guias rapidas': <FaFileAlt />,
      'propietarios': <FaUserMd />,
      'contingencias': <FaExclamationTriangle />,
    };
    
    return iconMap[moduleName?.toLowerCase()] || <FaCog />;
  };

  /**
   * Ruta real de cada modulo de la tabla `modulos`, tomada de las rutas declaradas en App.jsx.
   * Un modulo que devuelve null es un permiso sin pagina propia (gobierna datos que se ven
   * dentro de otra pantalla, como "equipo archivos" o "invimas"): no se pinta en el menu,
   * porque antes se generaba un enlace inventado que llevaba a una pantalla en blanco.
   */
  const RUTAS_POR_MODULO = {
    'equipos': '/equipos/biomedicos',
    'equipos industriales': '/equipos/industriales',
    'bajas biomedicos': '/equipos/bajas',
    'manuales': '/equipos/manuales',
    'guias rapidas': '/equipos/guias-rapidas',
    'contingencias': '/equipos/contingencias',
    'soportes compra': '/equipos/ordenes-compra',
    'repuestos': '/repuestos',
    'usuarios': '/admin/usuarios',
    'propietarios': '/admin/propietarios',
    'servicios': '/config/servicios',
    'areas': '/config/areas',
    'contactos': '/config/contactos',
    'reportes': '/dashboard/reportes',
    'planes mantenimiento': '/planes/preventivo',
    'preventivos': '/planes/preventivo',
    'tickets propios': '/ordenes/mis-tickets',
    'tickets activos': '/ordenes/gestion-tickets',
    'tickets cerrados': '/ordenes/tickets-cerrados',
    'capacitaciones': '/capacitaciones',
    'invimas': null,
    'estado equipos': null,
    'equipo archivos': null,
    'observaciones': null,
    'calibraciones': null,
    'correctivos': null,
    'repuestos instalados': null,
    'equipos contactos': null,
    'equipos especificaciones': null,
    'equiposn': null,
  };

  const getModulePath = (moduleName) => RUTAS_POR_MODULO[moduleName?.toLowerCase()] ?? null;

  // Verificar si el usuario tiene acceso al módulo
  const checkModuleAccess = (moduleName) => {
    if (!user) {
      console.log(`❌ Sin usuario para verificar acceso a "${moduleName}"`);
      return false;
    }
    
    // CORREGIR: Parsear rol_id a número para comparación
    const userRoleId = parseInt(user.rol_id);
    console.log(`🔍 Verificando acceso a módulo "${moduleName}" para usuario rol ${user.rol_id} (parsed: ${userRoleId})`);
    
    // Super admin y admin tienen acceso a todo
    if (userRoleId === 1 || userRoleId === 2) {
      console.log(`✅ Admin/SuperAdmin - acceso completo a "${moduleName}"`);
      return true;
    }
    
    // Verificar permisos específicos usando los permisos de la BD
    const result = hasModuleAccess(moduleName);
    console.log(`🎯 Acceso a "${moduleName}": ${result ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    
    return result;
  };

  if (loading || authLoading) {
    return (
      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <nav className="sidebar-nav">
          <div className="loading-modules">
            <FaCog className="spin" />
            {isOpen && <span>Cargando módulos...</span>}
          </div>
        </nav>
      </aside>
    );
  }

  // Siempre mostrar Dashboard
  console.log('🎯 SIDEBAR: Generando menuItems...');
  console.log('🎯 SIDEBAR: modules.length:', modules.length);
  console.log('🎯 SIDEBAR: loading:', loading);
  console.log('🎯 SIDEBAR: user:', !!user);
  
  const menuItems = [
    {
      key: "dashboard",
      title: "Dashboard",
      icon: <FaHome />,
      path: "/dashboard",
      enabled: true,
      hasAccess: true
    },
    // Nueva sección de Categorías de Mantenimiento (Roles 1, 2, 3)
    {
      key: "config_tipos_mantenimiento",
      title: "Categorías Mantenimiento",
      icon: <FaWrench />,
      path: "/config/tipos-mantenimiento",
      enabled: user && [1, 2, 3].includes(parseInt(user.rol_id)),
      hasAccess: user && [1, 2, 3].includes(parseInt(user.rol_id)),
      moduleName: "Categorías Mantenimiento"
    },
    // Nueva sección de Materiales (Roles 1, 2, 3)
    {
      key: "config_materiales",
      title: "Materiales",
      icon: <FaBoxes />,
      path: "/config/materiales",
      enabled: user && [1, 2, 3].includes(parseInt(user.rol_id)),
      hasAccess: user && [1, 2, 3].includes(parseInt(user.rol_id)),
      moduleName: "Materiales"
    },
    // Agregar módulos dinámicos de la BD
    ...modules.filter(module => getModulePath(module.name)).map(module => {
      console.log(`🔍 SIDEBAR: Procesando módulo "${module.name}"`);
      const hasAccess = checkModuleAccess(module.name);
      console.log(`🎯 SIDEBAR: Módulo "${module.name}" - acceso: ${hasAccess}`);
      
      return {
        key: module.name.toLowerCase().replace(/\s+/g, '_'),
        title: module.name.charAt(0).toUpperCase() + module.name.slice(1),
        icon: getModuleIcon(module.name),
        path: getModulePath(module.name),
        enabled: hasAccess,
        hasAccess: hasAccess,
        moduleName: module.name
      };
    })
  ];
  
  console.log('📊 SIDEBAR: Total menuItems generados:', menuItems.length);
  console.log('📊 SIDEBAR: MenuItems con acceso:', menuItems.filter(m => m.hasAccess).length);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li 
              key={item.key} 
              className={`nav-item ${item.hasAccess ? 'enabled' : 'disabled'}`}
              title={!item.hasAccess ? `Sin acceso a ${item.title}` : ''}
            >
              {item.hasAccess ? (
                // MÓDULO HABILITADO - Con navegación
                <Link
                  to={item.path}
                  className={`nav-link ${
                    location.pathname === item.path ? "active" : ""
                  }`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {isOpen && <span className="nav-text">{item.title}</span>}
                </Link>
              ) : (
                // MÓDULO DESHABILITADO - Solo visual
                <div
                  className="nav-link disabled-module"
                  style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    color: '#999',
                    pointerEvents: 'none'
                  }}
                >
                  <span className="nav-icon" style={{ opacity: 0.6 }}>
                    {item.icon}
                  </span>
                  {isOpen && (
                    <>
                      <span className="nav-text" style={{ opacity: 0.6 }}>
                        {item.title}
                      </span>
                      <FaLock 
                        style={{ 
                          marginLeft: 'auto', 
                          fontSize: '12px',
                          opacity: 0.7,
                          color: '#dc3545'
                        }} 
                      />
                    </>
                  )}
                </div>
              )}
              
              {/* Mostrar información de debug en desarrollo */}
              {process.env.NODE_ENV === 'development' && isOpen && (
                <small 
                  style={{ 
                    fontSize: '10px', 
                    opacity: 0.6, 
                    marginLeft: '40px',
                    display: 'block'
                  }}
                >
                  {item.moduleName && (
                    <>
                      Módulo: {item.moduleName} | 
                      Acceso: {item.hasAccess ? '✅' : '❌'} |
                      Rol: {user?.rol_id}
                    </>
                  )}
                </small>
              )}
            </li>
          ))}
        </ul>
        
        {/* Información de debug del usuario actual */}
        {process.env.NODE_ENV === 'development' && isOpen && user && (
          <div className="debug-info" style={{ 
            margin: '20px 10px', 
            padding: '10px', 
            backgroundColor: 'rgba(0,0,0,0.1)', 
            borderRadius: '5px',
            fontSize: '12px'
          }}>
            <div><strong>Debug Info:</strong></div>
            <div>Usuario: {user.nombre} {user.apellido}</div>
            <div>Rol: {user.rol_id}</div>
            <div>Permisos: {permissions?.length || 0} módulos</div>
            <div>Módulos cargados: {modules.length}</div>
            <div>Habilitados: {menuItems.filter(m => m.hasAccess).length}</div>
            <div>Deshabilitados: {menuItems.filter(m => !m.hasAccess).length}</div>
          </div>
        )}
      </nav>
      
      {/* Estilos CSS en línea para los módulos deshabilitados */}
      <style jsx>{`
        .nav-item.disabled {
          position: relative;
        }
        
        .nav-item.disabled::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.1);
          pointer-events: none;
          z-index: 1;
        }
        
        .disabled-module {
          background: none !important;
          transform: none !important;
          transition: none !important;
        }
        
        .disabled-module:hover {
          background: none !important;
          transform: none !important;
        }
        
        .loading-modules {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #666;
        }
        
        .loading-modules .spin {
          animation: spin 2s linear infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
