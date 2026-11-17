import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuth as usePermissions } from "../hooks/useAuth.jsx";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "./ui/sidebar";
import {
  Menu,
  Home,
  Monitor,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Wrench,
  GraduationCap,
  User,
  ChevronRight,
  ChevronDown,
  LogOut,
  Search,
  AlignJustify,
  Package,
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import GlobalEquipmentSearch from "./GlobalEquipmentSearch";

const Header = () => {
  const { toast } = useToast();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
      toast.info("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Forzar navegación incluso si falla el logout
      navigate("/", { replace: true });
    }
  };

  return (
    <>
      {/* ── Controles flotantes: izquierda (toggle + marca + búsqueda) ── */}
      <div className="fixed top-4 left-3 sm:left-4 z-50 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-900/[0.06] border border-slate-100 pl-1.5 pr-1 py-1.5">
          <SidebarTrigger className="h-9 w-9 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
          <span className="hidden sm:block pr-2 text-sm font-extrabold tracking-tight text-slate-800 select-none">
            EVA <span className="text-blue-600">APLICATIVO</span>
          </span>
        </div>
      </div>

      {/* ── Búsqueda global centrada (se auto-oculta fuera de páginas de equipos) ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 hidden lg:block">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-900/[0.06] border border-slate-100 px-2 py-1 [&:empty]:hidden">
          <GlobalEquipmentSearch />
        </div>
      </div>

      {/* ── Control flotante: derecha (usuario) ── */}
      <div className="fixed top-4 right-3 sm:right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-900/[0.06] border border-slate-100 pl-1.5 pr-3 py-1.5 hover:bg-white transition-colors">
              <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </span>
              <span className="hidden sm:block text-sm font-semibold text-slate-700 max-w-[10rem] truncate">
                {user?.nombre || "Usuario"}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-60 rounded-2xl border-slate-100 shadow-xl p-1.5 origin-top-right"
          >
            {/* Cabecera: el menú se siente una extensión del bloque de usuario */}
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.nombre || "Usuario"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || "Sesión activa"}
                </p>
              </div>
            </div>
            <div className="h-px bg-slate-100 my-1" />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer py-2">
              <Link to="/perfil" className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" /> Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Salir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

const AppSidebar = () => {
  const [openSubmenus, setOpenSubmenus] = useState([]);
  const { permissionService, user } = useAuth();
  const { permissions, loading: permissionsLoading, isAdmin: isPermissionAdmin } = usePermissions();

  // Ya no necesitamos el setTimeout ni el estado local permissionsLoaded
  // Usaremos permissionsLoading directamente


  // Initialize permissions when user changes
  useEffect(() => {
    if (user) {
      // Permissions are already initialized in AuthContext, no need for debug logging
    }
  }, [user]);

  const navigationItems = [
    // ✅ PÁGINA DE INICIO - SIEMPRE VISIBLE PARA TODOS LOS USUARIOS
    {
      icon: Home,
      label: "INICIO",
      active: true,
      submenu: [],
      href: "/home",
      alwaysVisible: true // Marcador especial para asegurar visibilidad
    },
    {
      icon: Monitor,
      label: "EQUIPOS",
      submenu: [
        { label: "BIOMEDICOS", href: "/equipos/biomedicos" },
        { label: "INDUSTRIALES", href: "/equipos/industriales" },
        { label: "O.C", href: "/equipos/ordenes-compra" },
        { label: "BAJAS", href: "/equipos/bajas" },
        { label: "CONTINGENCIAS", href: "/equipos/contingencias" },
        { label: "GUIAS RAPIDAS", href: "/equipos/guias-rapidas" },
        { label: "MANUALES", href: "/equipos/manuales" },
        { label: "CONSULTAS", href: "/equipos/consultas" },
      ],
    },
    {
      icon: Calendar,
      label: "PLANES",
      submenu: [{ label: "MTTO. PREVENTIVO", href: "/planes/preventivo" }],
    },
    {
      icon: FileText,
      label: "ORDENES",
      submenu: [
        { label: "MIS TICKETS", href: "/ordenes/mis-tickets" },
        { label: "GESTION DE TICKETS", href: "/ordenes/gestion-tickets" },
        { label: "TICKETS CERRADOS", href: "/ordenes/tickets-cerrados" },
      ],
    },
    {
      icon: Wrench,
      label: "REPUESTOS",
      submenu: [{ label: "REPUESTOS", href: "/repuestos" }],
    },
    {
      icon: GraduationCap,
      label: "CAPACITACIONES",
      submenu: [{ label: "CAPACITACIONES", href: "/capacitaciones" }],
    },
    // Only show DASHBOARD for admins (rol_id <= 2)
    ...(user?.rol_id <= 2 ? [{
      icon: BarChart3,
      label: "DASHBOARD",
      submenu: [
        { label: "DASHBOARD", href: "/dashboard/reportes" },
      ],
    }] : []),
    // Only show CONFIGURACIÓN for admin and advanced users (rol_id 1, 2, 3) 
    ...([1, 2, 3].includes(parseInt(user?.rol_id)) ? [{
      icon: Settings,
      label: "CONFIGURACIÓN",
      submenu: [
        { label: "SERVICIOS", href: "/config/servicios" },
        { label: "CONTACTOS", href: "/config/contactos" },
        { label: "AREAS", href: "/config/areas" },
        { label: "T. MANTENIMIENTOS", href: "/config/tipos-mantenimiento" },
        { label: "MATERIALES", href: "/config/materiales" },
        { label: "SEDES", href: "/config/sedes" },
        { label: "EMPRESAS MTO.", href: "/config/empresas-mantenimiento" },
      ],
    }] : []),
    // Only show admin module for users with admin permissions (superadmin + admin)
    ...(isPermissionAdmin() ? [{
      icon: User,
      label: "ADMINISTRADOR",
      submenu: [
        { label: "USUARIOS", href: "/admin/usuarios" },
        { label: "PROPIETARIOS", href: "/admin/propietarios" },
      ],
    }] : []),
  ];

  const toggleSubmenu = (label) => {
    setOpenSubmenus((prev) => {
      if (prev.includes(label)) {
        return [];
      } else {
        return [label];
      }
    });
  };

  return (
    <Sidebar
      variant="floating"
      side="left"
      className="text-white border-none [&_[data-slot=sidebar-inner]]:bg-[#2a377e] [&_[data-slot=sidebar-inner]]:rounded-2xl [&_[data-slot=sidebar-inner]]:border-white/10 [&_[data-slot=sidebar-inner]]:shadow-xl"
    >
      <SidebarHeader className="bg-[#2a377e] border-none pt-14 rounded-t-2xl">
        <SidebarGroupLabel className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
          NAVEGACIÓN PRINCIPAL
        </SidebarGroupLabel>
      </SidebarHeader>

      <SidebarContent className="bg-[#2a377e] rounded-b-2xl">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {(() => {
                // Si los permisos están cargando o no hay usuario todavía
                if (permissionsLoading || !user) {
                  // Mientras carga, mostrar un fallback optimista basado en el rol para evitar parpadeos
                  if (user && user.rol_id <= 2) {
                    return navigationItems;
                  }
                  
                  if (user) {
                    // Fallback para usuarios normales
                    return navigationItems.filter(item => {
                      if (item.alwaysVisible) return true;
                      if (item.label === 'ORDENES') return true;
                      return false;
                    });
                  }
                  
                  return []; // Si no hay usuario, nada
                }

                // Una vez cargados (permissionsLoading === false), usar el filtro real
                const filteredItems = permissionService.filterMenuItems(navigationItems);

                // Si no hay items filtrados, mostrar solo INICIO
                if (filteredItems.length === 0) {
                  const inicioItem = navigationItems.find(item => item.alwaysVisible);
                  return inicioItem ? [inicioItem] : [];
                }

                return filteredItems;
              })().map((item, index) => (
                <SidebarMenuItem key={index}>
                  {item.href ? (
                    // Item with direct link
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{
                        scale: 1.03,
                        x: 6,
                        transition: { duration: 0.2, ease: "easeOut" }
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            `w-full justify-start text-left h-auto py-3 px-3 hover:bg-white/10 hover:backdrop-blur-sm hover:!text-white transition-all duration-200 text-white rounded-lg group shadow-sm hover:shadow-lg ${isActive ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg" : ""
                            }`
                          }
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-all duration-300" />
                          <span className="flex-1 font-semibold">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </motion.div>
                  ) : (
                    // Item with submenu
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{
                          scale: 1.03,
                          x: 6,
                          transition: { duration: 0.2, ease: "easeOut" }
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <SidebarMenuButton
                          onClick={() => toggleSubmenu(item.label)}
                          className="w-full justify-start text-left h-auto py-3 px-3 hover:bg-white/10 hover:backdrop-blur-sm hover:!text-white text-white transition-all duration-200 rounded-lg group shadow-sm hover:shadow-lg"
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0 group-hover:scale-110 transition-all duration-300" />
                          <span className="flex-1 font-semibold">{item.label}</span>
                          {item.submenu.length > 0 && (
                            <ChevronRight
                              className={`h-4 w-4 ml-auto transition-transform duration-300 group-hover:translate-x-1 ${openSubmenus.includes(item.label)
                                ? "rotate-90"
                                : ""
                                }`}
                            />
                          )}
                        </SidebarMenuButton>
                      </motion.div>

                      {/* Submenu */}
                      <AnimatePresence>
                        {openSubmenus.includes(item.label) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l-2 border-blue-500/30 pl-4">
                              {item.submenu.map((subItem, subIndex) => (
                                <motion.div
                                  key={subIndex}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: subIndex * 0.05 }}
                                  whileHover={{
                                    scale: 1.05,
                                    x: 8,
                                    transition: { duration: 0.2, ease: "easeOut" }
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <NavLink
                                        to={subItem.href}
                                        className={({ isActive }) =>
                                          `w-full justify-start text-left h-auto py-2 px-3 hover:bg-white/10 hover:backdrop-blur-sm hover:!text-white text-sm transition-all duration-200 text-white rounded-md group shadow-sm hover:shadow-md ${isActive ? "bg-gradient-to-r from-blue-600/80 to-blue-700/80 font-semibold" : ""
                                          }`
                                        }
                                      >
                                        <span className="group-hover:translate-x-2 transition-transform duration-200 font-medium">{subItem.label}</span>
                                      </NavLink>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </motion.div>
                              ))}
                            </SidebarMenuSub>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const Navbar = () => {
  return (
    <>
      <Header />
      <AppSidebar />
    </>
  );
};

export default Navbar;
