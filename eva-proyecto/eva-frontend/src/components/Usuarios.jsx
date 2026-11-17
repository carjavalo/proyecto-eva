"use client";

import { useState, useEffect } from "react";
import { useFormSubmit } from "../hooks/useFormSubmit";
import { Plus, Pencil, Trash2, X, Eye, Search, RotateCcw, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, User, Lock, CheckCircle, XCircle, Power, LayoutDashboard, Settings, ShieldCheck, Activity, FileText, Database, Users, HardDrive, Ticket, ClipboardList, Layers, UserMinus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { useUsuarios } from "../hooks/useUsuarios";
import { useRoles, useEmpresas, useSedes } from "../hooks/useRoles";
import { useCentrosCosto } from "../hooks/useCentrosCosto";
import { usePermissions } from "../hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export default function Usuarios() {
  // Helper to get initials
  const getInitials = (nombre, apellido) => {
    const n = nombre ? nombre.charAt(0) : "";
    const a = apellido ? apellido.charAt(0) : "";
    return (n + a).toUpperCase();
  };

  // Helper for initials background colors
  const getInitialsColor = (id) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-purple-100 text-purple-600",
      "bg-orange-100 text-orange-600",
      "bg-green-100 text-green-600",
      "bg-pink-100 text-pink-600",
      "bg-indigo-100 text-indigo-600",
    ];
    return colors[id % colors.length];
  };

  // Hooks para datos reales
  const {
    usuarios,
    loading: usuariosLoading,
    error: usuariosError,
    pagination,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    darDeBajaUsuario,
    getUsuario,
    changePage,
    changePageSize,
    searchUsuarios,
    refresh: refreshUsuarios,
  } = useUsuarios();

  const { roles, loading: rolesLoading } = useRoles();
  const { empresas, loading: empresasLoading } = useEmpresas();
  const { sedes, loading: sedesLoading } = useSedes();
  const { centros, loading: centrosLoading } = useCentrosCosto();
  const {
    loading: permissionsLoading,
    error: permissionsError,
    fetchUserPermissions,
    updateUserPermissions,
    assignDefaultPermissions,
    fetchModules,
  } = usePermissions();

  // Estados para modales y UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToDarDeBaja, setUserToDarDeBaja] = useState(null);
  const [relationToDelete, setRelationToDelete] = useState(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false);
  const [isAddRelationModalOpen, setIsAddRelationModalOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [moduleStats, setModuleStats] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [goToPage, setGoToPage] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBulkOperationModalOpen, setIsBulkOperationModalOpen] = useState(false);
  const [usersSortField, setUsersSortField] = useState('id');
  const [usersSortDirection, setUsersSortDirection] = useState('desc');
  const [addUserForm, setAddUserForm] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    email: "",
    username: "",
    password: "",
    rol: "",
    centroCosto: "",
    empresa: "",
  });
  const [addRelationForm, setAddRelationForm] = useState({
    nombreZona: "",
    zona: "",
  });
  const [permissions, setPermissions] = useState({
    usuarios: { leer: false, escribir: false, crear: false, actualizar: false },
    equipos: { leer: false, escribir: false, crear: false, actualizar: false },
    planes: { leer: false, escribir: false, crear: false, actualizar: false },
    ordenes: { leer: false, escribir: false, crear: false, actualizar: false },
    solicitudes: {
      leer: false,
      escribir: false,
      crear: false,
      actualizar: false,
    },
    capacitaciones: {
      leer: false,
      escribir: false,
      crear: false,
      actualizar: false,
    },
    dashboards: {
      leer: false,
      escribir: false,
      crear: false,
      actualizar: false,
    },
    configuracion: {
      leer: false,
      escribir: false,
      crear: false,
      actualizar: false,
    },
    administracion: {
      leer: false,
      escribir: false,
      crear: false,
      actualizar: false,
    },
  });

  // Transformar datos reales de los hooks para SearchableSelect (igual que LoginForm)
  const centrosCostoOptions = centros
    .filter((centro) => centro && centro.id && centro.nombre)
    .map((centro) => ({
      id: centro.id.toString(),
      nombre: centro.nombre,
      codigo: centro.codigo || centro.id
    }));

  const empresasOptions = empresas
    .filter((empresa) => empresa && empresa.id && empresa.name)
    .map((empresa) => ({
      id: empresa.id.toString(),
      nombre: empresa.name
    }));

  // Cargar módulos al montar el componente
  useEffect(() => {
    const loadModules = async () => {
      try {
        const modules = await fetchModules();
        // Ensure modules is always an array
        if (Array.isArray(modules)) {
          setModulos(modules);
          setModuleStats(modules);
        } else {
          console.warn("Modules is not an array, using empty array:", modules);
          setModulos([]);
          setModuleStats([]);
        }
      } catch (error) {
        console.error("Error loading modules:", error);
        setModulos([]); // Set empty array on error
        setModuleStats([]); // Set empty array on error
      }
    };

    loadModules();
  }, [fetchModules]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Funciones para manejar usuarios
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      // Solo disparar si el término cambió realmente o si está vacío (reset)
      fetchUsuarios(1, pagination.per_page, searchTerm.trim(), usersSortField, usersSortDirection);
    }, 500);

    setSearchTimeout(timeout);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const triggerSearch = () => {
    fetchUsuarios(1, pagination.per_page, searchTerm.trim(), usersSortField, usersSortDirection);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    fetchUsuarios(1, pagination.per_page, '', usersSortField, usersSortDirection);
  };

  const handlePageChange = (page) => {
    fetchUsuarios(page, pagination.per_page, searchTerm, usersSortField, usersSortDirection);
  };

  const handlePageSizeChange = (size) => {
    fetchUsuarios(1, parseInt(size), searchTerm, usersSortField, usersSortDirection);
  };

  const handleGoToPage = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(goToPage);
    if (pageNumber >= 1 && pageNumber <= pagination.last_page) {
      handlePageChange(pageNumber);
      setGoToPage("");
    }
  };

  // Estados para relaciones zonas-usuarios - DATOS REALES
  const [zoneRelationsData, setZoneRelationsData] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableZones, setAvailableZones] = useState([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [relationsSortField, setRelationsSortField] = useState('id');
  const [relationsSortDirection, setRelationsSortDirection] = useState('desc');

  // Datos del modal de agregar relación
  const [newRelation, setNewRelation] = useState({
    usuario_id: '',
    zona_id: ''
  });

  // Estados para editar relación
  const [isEditRelationModalOpen, setIsEditRelationModalOpen] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [editRelation, setEditRelation] = useState({
    usuario_id: '',
    zona_id: ''
  });

  // Estados para gestión de zonas
  const [zonasData, setZonasData] = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [isEditZonaModalOpen, setIsEditZonaModalOpen] = useState(false);
  const [selectedZona, setSelectedZona] = useState(null);
  const [editZonaName, setEditZonaName] = useState('');
  const [zonasSortField, setZonasSortField] = useState('id');
  const [zonasSortDirection, setZonasSortDirection] = useState('asc');

  // Categorización de módulos para la UI de permisos
  const moduleCategories = [
    {
      id: "equipos",
      name: "Gestión de Equipos",
      icon: <HardDrive className="h-4 w-4 text-blue-500" />,
      // Nombres exactos de la BD
      modules: ["equipos", "equipos industriales", "contingencias", "manuales", "bajas biomedicos", "bajas equipos biomedicos", "guias rapidas", "consultas", "soportes compra", "equipo archivos", "equipos contactos", "equipos especificaciones", "estado equipos", "invimas", "propietarios"]
    },
    {
      id: "tickets",
      name: "Órdenes y Tickets",
      icon: <Ticket className="h-4 w-4 text-orange-500" />,
      modules: ["tickets propios", "tickets activos", "tickets cerrados", "ordenes"]
    },
    {
      id: "mantenimiento",
      name: "Mantenimiento",
      icon: <Activity className="h-4 w-4 text-green-500" />,
      modules: ["planes mantenimiento", "repuestos", "repuestos instalados", "capacitaciones", "tipos mantenimiento", "preventivos", "calibraciones", "correctivos", "observaciones"]
    },
    {
      id: "dashboard",
      name: "Dashboard y Reportes",
      icon: <LayoutDashboard className="h-4 w-4 text-purple-500" />,
      modules: ["dashboard", "reportes"]
    },
    {
      id: "configuracion",
      name: "Configuración y Catálogos",
      icon: <Settings className="h-4 w-4 text-slate-500" />,
      modules: ["areas", "contactos", "servicios", "materiales", "sedes"]
    },
    {
      id: "administracion",
      name: "Administración de Usuarios",
      icon: <ShieldCheck className="h-4 w-4 text-red-500" />,
      modules: ["usuarios"]
    }
  ];

  const getGroupedPermissions = () => {
    if (!userPermissions) return {};

    // Filtrar primero por el término de búsqueda si existe
    const filteredPermissions = permissionSearch
      ? userPermissions.filter(p => p.modulo_name.toLowerCase().includes(permissionSearch.toLowerCase()))
      : userPermissions;

    const grouped = {};
    const categorizedModuleIds = [];

    moduleCategories.forEach(cat => {
      grouped[cat.id] = filteredPermissions.filter(p => {
        const matches = cat.modules.some(m => p.modulo_name.toLowerCase().includes(m.toLowerCase()));
        if (matches) categorizedModuleIds.push(p.modulo_id);
        return matches;
      });
    });

    // Catch-all for modules not in any category
    grouped['otros'] = filteredPermissions.filter(p => !categorizedModuleIds.includes(p.modulo_id));

    return grouped;
  };
  // Los hooks de accesibilidad se definirán después de las funciones

  // Funciones para cargar datos reales de usuarios-zonas
  const fetchZoneRelations = async () => {
    try {
      setLoadingRelations(true);
      const params = new URLSearchParams({
        sort_by: relationsSortField,
        sort_direction: relationsSortDirection
      });
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas?${params}`);
      const data = await response.json();
      if (data.success) {
        setZoneRelationsData(data.data);
      }
    } catch (error) {
      console.error('Error loading zone relations:', error);
    } finally {
      setLoadingRelations(false);
    }
  };

  const handleRelationsSort = (field) => {
    if (relationsSortField === field) {
      setRelationsSortDirection(relationsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRelationsSortField(field);
      setRelationsSortDirection('asc');
    }
  };

  const getRelationsSortIcon = (field) => {
    if (relationsSortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />;
    }
    return relationsSortDirection === 'asc' ?
      <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> :
      <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas/usuarios-disponibles`);
      const data = await response.json();
      if (data.success) {
        setAvailableUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const fetchAvailableZones = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas/zonas-disponibles`);
      const data = await response.json();
      if (data.success) {
        setAvailableZones(data.data);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  };

  const handleAddRelation = async () => {
    if (!newRelation.usuario_id || !newRelation.zona_id) {
      toast.error('Selecciona usuario y zona');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newRelation)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Relación creada exitosamente');
        setNewRelation({ usuario_id: '', zona_id: '' });
        setIsAddRelationModalOpen(false);
        fetchZoneRelations(); // Actualizar lista
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating relation:', error);
      toast.error('Error creando relación');
    }
  };

  const deleteRelationDirect = async (relationId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta relación?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas/${relationId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Relación eliminada exitosamente');
        fetchZoneRelations(); // Actualizar lista
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting relation:', error);
      toast.error('Error eliminando relación');
    }
  };

  const handleEditRelationClick = (relation) => {
    setSelectedRelation(relation);
    setEditRelation({
      usuario_id: relation.usuario_id,
      zona_id: relation.zona_id
    });
    setIsEditRelationModalOpen(true);
  };

  const handleUpdateRelation = async () => {
    if (!editRelation.usuario_id || !editRelation.zona_id) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios-zonas/${selectedRelation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(editRelation)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Relación actualizada exitosamente');
        setEditRelation({ usuario_id: '', zona_id: '' });
        setSelectedRelation(null);
        setIsEditRelationModalOpen(false);
        fetchZoneRelations(); // Actualizar lista
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating relation:', error);
      toast.error('Error actualizando relación');
    }
  };

  // Funciones para gestión de zonas
  const fetchZonas = async () => {
    try {
      setLoadingZonas(true);
      const params = new URLSearchParams({
        sort_by: zonasSortField,
        sort_direction: zonasSortDirection
      });
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/zonas/list?${params}`);
      const data = await response.json();
      if (data.success) {
        setZonasData(data.data);
      }
    } catch (error) {
      console.error('Error loading zonas:', error);
    } finally {
      setLoadingZonas(false);
    }
  };

  const handleZonasSort = (field) => {
    if (zonasSortField === field) {
      setZonasSortDirection(zonasSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setZonasSortField(field);
      setZonasSortDirection('asc');
    }
  };

  const getZonasSortIcon = (field) => {
    if (zonasSortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return zonasSortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4" /> :
      <ArrowDown className="h-4 w-4" />;
  };

  // Funciones de ordenamiento para tabla de usuarios
  const handleUsersSort = (field) => {
    if (usersSortField === field) {
      setUsersSortDirection(usersSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUsersSortField(field);
      setUsersSortDirection('asc');
    }
  };

  const getUsersSortIcon = (field) => {
    if (usersSortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return usersSortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4" /> :
      <ArrowDown className="h-4 w-4" />;
  };

  const handleEditZonaClick = (zona) => {
    setSelectedZona(zona);
    setEditZonaName(zona.name);
    setIsEditZonaModalOpen(true);
  };

  const handleUpdateZona = async () => {
    if (!editZonaName || editZonaName.trim() === '') {
      toast.error('Por favor ingrese un nombre para la zona');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/zonas/${selectedZona.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name: editZonaName })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Zona actualizada exitosamente');
        setEditZonaName('');
        setSelectedZona(null);
        setIsEditZonaModalOpen(false);
        fetchZonas(); // Actualizar lista de zonas
        fetchAvailableZones(); // Actualizar lista en los selects
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating zona:', error);
      toast.error('Error actualizando zona');
    }
  };

  // useEffect hooks - Cargar datos iniciales y actualizar cuando cambie ordenamiento
  useEffect(() => {
    fetchZoneRelations();
    fetchAvailableUsers();
    fetchAvailableZones();
    fetchZonas();
  }, []);

  useEffect(() => {
    fetchZonas();
  }, [zonasSortField, zonasSortDirection]);

  useEffect(() => {
    fetchZoneRelations();
  }, [relationsSortField, relationsSortDirection]);

  // Actualizar usuarios cuando cambie el ordenamiento
  useEffect(() => {
    if (pagination.current_page) {
      fetchUsuarios(pagination.current_page, pagination.per_page, searchTerm, usersSortField, usersSortDirection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersSortField, usersSortDirection]);

  // Datos de empresas y usuarios pertenecientes
  const companyUsersData = [
    {
      empresa: "HUV",
      usuarios: "Eva123 (eva123), Jhon Henry (jsaa)",
    },
    {
      empresa: "SYSMED",
      usuarios: "Sysmed (sysmedhuv)",
    },
    {
      empresa: "HUV MANTENIMIENTO BIOMEDICO ADMINISTRATIVO",
      usuarios:
        "Administrador (admin), Juan Sebastian (juangonza123), Aura María (Biomedica4), Angelica Maria (bioingeniera), Natalia (natalia.pedrerosa), Dayana Raigosa (daya), JULIO CESAR (julio0126), ingeniero mantenimiento (biomedicahuvnorte), Alejandro (alejandro.soporte), CESAR AUGUSTO (electromedicinahuv5), Karen Sofia (electromedicina2), Central de Gases (centralgases)",
    },
    {
      empresa: "HUV MANTENIMIENTO INDUSTRIAL ADMINISTRATIVO",
      usuarios: "JesicA (jesica), Lenker (jefemantenimiento)",
    },
    {
      empresa: "JOMEDICAL",
      usuarios: "Servicio tecnico (jomedical)",
    },
    {
      empresa: "TÉCNICOS MANTENIMIENTO BIOMEDICO",
      usuarios: "",
    },
    {
      empresa: "TÉCNICOS MANTENIMIENTO INDUSTRIAL",
      usuarios: "",
    },
    {
      empresa: "MAQUET",
      usuarios: "",
    },
    {
      empresa: "KAIKA",
      usuarios: "",
    },
    {
      empresa: "GENERAL ELECTRIC",
      usuarios: "",
    },
    {
      empresa: "TERUMO BCT",
      usuarios: "",
    },
    {
      empresa: "BIOTRONITECH",
      usuarios: "",
    },
    {
      empresa: "OLYMPUS",
      usuarios: "",
    },
    {
      empresa: "SIEMENS",
      usuarios: "",
    },
    {
      empresa: "ARROW",
      usuarios: "",
    },
    {
      empresa: "GILMEDICA",
      usuarios: "Empresa Gilmedica (gilmedica), gilmedica (gilmedica 2)",
    },
    {
      empresa: "JAPG",
      usuarios: "",
    },
    {
      empresa: "PHILIPS",
      usuarios: "",
    },
    {
      empresa: "STRYKER",
      usuarios: "",
    },
    {
      empresa: "BAXTER",
      usuarios: "baxter1 (baxter_tickets), baxter2 (baxter2)",
    },
    {
      empresa: "G&C",
      usuarios: "",
    },
    {
      empresa: "QUIRURGIL",
      usuarios: "",
    },
    {
      empresa: "G&C medical",
      usuarios: "",
    },
    {
      empresa: "MEDTRONIC",
      usuarios: "",
    },
    {
      empresa: "ALCON",
      usuarios: "",
    },
    {
      empresa: "ARBOLEDA EQUIPOS",
      usuarios: "",
    },
    {
      empresa: "MANTENIMIENTO BIOMEDICO E INDUSTRIAL",
      usuarios: "LAURA (LauGomez), LAURA (Biomedicanorte)",
    },
    {
      empresa: "MEDITEC S.A.",
      usuarios: "",
    },
    {
      empresa: "INVERMEDICA",
      usuarios: "",
    },
    {
      empresa: "ARBOLEDA",
      usuarios: "Arboleda (Arboleda equipos)",
    },
    {
      empresa: "SANITAS",
      usuarios: "",
    },
    {
      empresa: "JRESPTREPO",
      usuarios: "",
    },
    {
      empresa: "LAB BRAND",
      usuarios: "",
    },
    {
      empresa: "GBARCO",
      usuarios: "",
    },
    {
      empresa: "AGFA",
      usuarios: "",
    },
    {
      empresa: "EQUITRONIC",
      usuarios: "",
    },
    {
      empresa: "OTIS",
      usuarios: "",
    },
    {
      empresa: "SCHINDLER",
      usuarios: "",
    },
    {
      empresa: "C4PASCAL",
      usuarios: "",
    },
    {
      empresa: "GENECOL S.A.S",
      usuarios: "",
    },
    {
      empresa: "GENERAL ELECTROMEDICAL S.A.S",
      usuarios: "",
    },
    {
      empresa: "KAESER COMPRESORES DE COLOMBIA",
      usuarios: "",
    },
    {
      empresa: "GECOLSA",
      usuarios: "",
    },
    {
      empresa: "EQUIPOS Y LABORATORIOS S.A.S",
      usuarios: "",
    },
    {
      empresa: "MEQ",
      usuarios: "",
    },
    {
      empresa: "Jhonson & Jhonson",
      usuarios: "",
    },
    {
      empresa: "SH",
      usuarios: "",
    },
    {
      empresa: "BIMEDCO",
      usuarios: "",
    },
    {
      empresa: "INTERNATIONAL NUCLEAR INDUSTRY",
      usuarios: "",
    },
    {
      empresa: "EQUIPADORA MEDICA",
      usuarios: "",
    },
    {
      empresa: "QUIMBERLAB",
      usuarios: "",
    },
    {
      empresa: "Bioin",
      usuarios: "",
    },
    {
      empresa: "MEDICAH",
      usuarios: "",
    },
    {
      empresa: "GASES MEDICINALES (MESSER)",
      usuarios: "",
    },
    {
      empresa: "DILASER",
      usuarios: "",
    },
    {
      empresa: "J&C MEDICAL SAS",
      usuarios: "",
    },
    {
      empresa: "Becton Dickinson",
      usuarios: "",
    },
    {
      empresa: "PROGYNE S.A.S",
      usuarios: "",
    },
    {
      empresa: "RP MEDICAS",
      usuarios: "",
    },
    {
      empresa: "GS MED IMAGING",
      usuarios: "",
    },
  ];

  const getRoleColor = (rol) => {
    const roleName = typeof rol === "object" ? rol.nombre : rol;
    switch (roleName?.toLowerCase()) {
      case "administrador":
      case "admin":
        return "bg-red-100 text-red-800";
      case "técnico":
      case "tecnico":
        return "bg-green-100 text-green-800";
      case "supervisor":
        return "bg-yellow-100 text-yellow-800";
      case "usuario normal":
      case "usuario":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
  };

  const handleDeleteRelation = (relation) => {
    setRelationToDelete(relation);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteUsuario(userToDelete.id);
        setUserToDelete(null);
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        toast.error("Error al eliminar usuario: " + error.message);
      }
    }
  };

  const handleDarDeBaja = (user) => {
    setUserToDarDeBaja(user);
  };

  const confirmDarDeBaja = async () => {
    if (userToDarDeBaja) {
      try {
        const result = await darDeBajaUsuario(userToDarDeBaja.id);
        setUserToDarDeBaja(null);
        toast.success(result.message || "Usuario dado de baja exitosamente");
      } catch (error) {
        console.error("Error dando de baja usuario:", error);
        toast.error("Error al dar de baja: " + error.message);
      }
    }
  };

  const confirmDeleteRelation = () => {
    console.log("Eliminando relación:", relationToDelete);
    setRelationToDelete(null);
  };

  const handleAddUserInputChange = (field, value) => {
    setAddUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddRelationInputChange = (field, value) => {
    setAddRelationForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = async (
    accionId,
    permissionType,
    currentValue
  ) => {
    try {
      const newValue = currentValue === 1 ? 0 : 1;
      await updatePermission(accionId, permissionType, newValue);

      // Actualizar permisos locales
      setUserPermissions((prev) =>
        prev.map((perm) =>
          perm.id === accionId ? { ...perm, [permissionType]: newValue } : perm
        )
      );
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Error al actualizar permiso: " + error.message);
    }
  };

  const handleViewUser = async (user) => {
    try {
      const fullUser = await getUsuario(user.id);
      setSelectedUser(fullUser);
      setIsViewUserModalOpen(true);
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      toast.error("Error al obtener detalles del usuario");
    }
  };

  const handleEditUser = async (user) => {
    try {
      const fullUser = await getUsuario(user.id);
      console.log("📝 Usuario obtenido del backend:", fullUser);
      console.log("📝 Campos específicos - apellido:", fullUser.apellido, "telefono:", fullUser.telefono, "rol_id:", fullUser.rol_id);

      setSelectedUser(fullUser);

      // Cargar permisos del usuario desde la base de datos
      const permissions = await fetchUserPermissions(user.id);

      // SINCRONIZACIÓN: Combinar todos los módulos del sistema con los permisos existentes.
      // Esto asegura que el administrador pueda ver y asignar permisos para CUALQUIER módulo,
      // incluso si el usuario aún no tiene un registro de permisos para él.
      const allPermissions = modulos.map(modulo => {
        const existingPermission = (permissions || []).find(p => p.modulo_id === modulo.id);

        if (existingPermission) {
          return {
            ...existingPermission,
            // Asegurar que sean booleanos para los checkboxes
            leer: !!existingPermission.leer,
            insertar: !!existingPermission.insertar,
            editar: !!existingPermission.editar,
            eliminar: !!existingPermission.eliminar
          };
        }

        // Si no existe el permiso, crear uno por defecto (todo desactivado)
        return {
          modulo_id: modulo.id,
          modulo_name: modulo.name,
          leer: false,
          insertar: false,
          editar: false,
          eliminar: false
        };
      });

      setUserPermissions(allPermissions);

      const formData = {
        nombre: fullUser.nombre || "",
        apellidos: fullUser.apellido || "",  // Backend usa 'apellido' (singular)
        telefono: fullUser.telefono || "",
        email: fullUser.email || "",
        username: fullUser.username || "",
        password: "",
        rol: fullUser.rol_id ? fullUser.rol_id.toString() : "",  // Convertir a string para el Select
        centroCosto: fullUser.centro_id || "",
        empresa: fullUser.id_empresa ? fullUser.id_empresa.toString() : "",  // Convertir a string para SearchableSelect
      };

      console.log("📝 Empresa del usuario:", fullUser.id_empresa, "-> FormData empresa:", formData.empresa);

      console.log("📝 FormData a establecer:", formData);
      setAddUserForm(formData);
      setIsEditUserModalOpen(true);
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      toast.error("Error al obtener detalles del usuario");
    }
  };

  const handleSubmitAddUser = async (e) => {
    // Prevenir submit si es evento de form
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    // Validar campos requeridos
    if (!addUserForm.nombre || !addUserForm.email || !addUserForm.username || !addUserForm.password) {
      toast.error('Por favor complete los campos obligatorios: Nombre, Email, Username y Password');
      return;
    }

    try {
      const userData = {
        nombre: addUserForm.nombre,
        apellido: addUserForm.apellidos,
        telefono: addUserForm.telefono,
        email: addUserForm.email,
        username: addUserForm.username,
        password: addUserForm.password,
        rol_id: parseInt(addUserForm.rol) || 4, // Default Usuario Básico (rol 4)
        centro_id: addUserForm.centroCosto || null,
        id_empresa: addUserForm.empresa || null,
        estado: 0,
        active: 'false'
      };

      await createUsuario(userData);

      toast.success('Usuario creado exitosamente');
      setIsAddUserModalOpen(false);
      setAddUserForm({
        nombre: "",
        apellidos: "",
        telefono: "",
        email: "",
        username: "",
        password: "",
        rol: "",
        centroCosto: "",
        empresa: "",
      });

      // La lista se refresca automáticamente por el hook createUsuario
    } catch (error) {
      console.error("Error creando usuario:", error);
      toast.error("Error al crear usuario: " + (error.message || "Error desconocido"));
    }
  };

  // Hooks para accesibilidad de formularios (Enter para submit)
  const { formProps } = useFormSubmit(handleSubmitAddUser);
  const relationFormProps = useFormSubmit(handleAddRelation);

  const handleSubmitEditUser = async () => {
    try {
      const userData = {
        nombre: addUserForm.nombre,
        apellido: addUserForm.apellidos,
        telefono: addUserForm.telefono,
        email: addUserForm.email,
        username: addUserForm.username,
        rol_id: parseInt(addUserForm.rol),
        centro_id: addUserForm.centroCosto,
        id_empresa: addUserForm.empresa ? parseInt(addUserForm.empresa) : null,
      };

      console.log("📤 Enviando empresa al backend:", userData.id_empresa);

      if (addUserForm.password) {
        userData.password = addUserForm.password;
      }

      await updateUsuario(selectedUser.id, userData);

      // Los permisos marcados en el panel se guardaban solo con "Guardar Permisos
      // Individuales"; si se pulsaba "Actualizar" se perdían sin avisar. Ahora el botón
      // de guardar el usuario arrastra también los permisos.
      if (userPermissions.length > 0) {
        try {
          await updateUserPermissions(
            selectedUser.id,
            userPermissions.map((permiso) => ({
              modulo_id: permiso.modulo_id,
              leer: permiso.leer ? 1 : 0,
              insertar: permiso.insertar ? 1 : 0,
              editar: permiso.editar ? 1 : 0,
              eliminar: permiso.eliminar ? 1 : 0,
            }))
          );
        } catch (errorPermisos) {
          // El usuario sí se guardó; solo fallaron los permisos (p. ej. 403 si quien
          // edita no es superadministrador). Se avisa sin tumbar el guardado.
          console.error("Error guardando permisos:", errorPermisos);
          toast.warning(
            "El usuario se actualizó, pero los permisos no se guardaron: " +
              (errorPermisos.response?.data?.message || errorPermisos.message)
          );
        }
      }

      setIsEditUserModalOpen(false);
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      toast.error("Error al actualizar usuario: " + error.message);
    }
  };

  const handleSubmitAddRelation = () => {
    console.log("Agregando relación:", addRelationForm);
    setIsAddRelationModalOpen(false);
    setAddRelationForm({ nombreZona: "", zona: "" });
  };

  // NUEVA FUNCIÓN: Activar/Desactivar usuario
  const handleToggleUserActivation = async (user) => {
    try {
      const action = user.active === 'true' || user.active === true ? 'desactivar' : 'activar';

      if (!window.confirm(`¿Estás seguro de que quieres ${action} al usuario ${user.nombre} ${user.apellido}?`)) {
        return;
      }

      // Determinar endpoint correcto según el estado actual
      const endpoint = user.active === 'true' || user.active === true ? 'deactivate' : 'activate';

      // Llamar al endpoint de activación correcto
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios/${user.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('eva_auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Usuario ${action}do exitosamente`);
        // Refrescar la lista de usuarios
        fetchUsuarios(pagination.current_page, pagination.per_page, searchTerm, usersSortField, usersSortDirection);
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error toggling user activation:", error);
      toast.error("Error al cambiar el estado de activación del usuario");
    }
  };

  // BULK OPERATIONS
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAllUsers = (checked) => {
    if (checked) {
      setSelectedUsers(usuarios.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkActivate = async () => {
    try {
      if (selectedUsers.length === 0) {
        toast.warning("Selecciona al menos un usuario");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios/bulk-activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('eva_auth_token')}`
        },
        body: JSON.stringify({
          user_ids: selectedUsers
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setSelectedUsers([]);
        fetchUsuarios(pagination.current_page, pagination.per_page, searchTerm, usersSortField, usersSortDirection);
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error in bulk activate:", error);
      toast.error("Error en operación masiva de activación");
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      if (selectedUsers.length === 0) {
        toast.warning("Selecciona al menos un usuario");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/usuarios/bulk-deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('eva_auth_token')}`
        },
        body: JSON.stringify({
          user_ids: selectedUsers
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setSelectedUsers([]);
        fetchUsuarios(pagination.current_page, pagination.per_page, searchTerm, usersSortField, usersSortDirection);
      } else {
        toast.error(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error in bulk deactivate:", error);
      toast.error("Error en operación masiva de desactivación");
    }
  };

  // NUEVAS FUNCIONES: Gestión de permisos de usuario
  const handleUserPermissionChange = (moduloId, permissionType, checked) => {
    setUserPermissions(prev =>
      prev.map(permission =>
        permission.modulo_id === moduloId
          ? { ...permission, [permissionType]: checked }
          : permission
      )
    );
  };

  const handleGrantAllPermissions = (moduloId) => {
    setUserPermissions(prev =>
      prev.map(permission =>
        permission.modulo_id === moduloId
          ? { ...permission, leer: true, insertar: true, editar: true, eliminar: true }
          : permission
      )
    );
  };

  const handleRevokeAllPermissions = (moduloId) => {
    setUserPermissions(prev =>
      prev.map(permission =>
        permission.modulo_id === moduloId
          ? { ...permission, leer: false, insertar: false, editar: false, eliminar: false }
          : permission
      )
    );
  };

  const handleResetToDefaultPermissions = async () => {
    if (!selectedUser) return;

    if (!window.confirm("¿Seguro que quieres restablecer los permisos por defecto para este rol? Se perderán los cambios manuales.")) {
      return;
    }

    try {
      await assignDefaultPermissions(selectedUser.id);
      toast.success("Permisos restablecidos exitosamente");

      // Recargar permisos
      const updatedPermissions = await fetchUserPermissions(selectedUser.id);

      // Sincronizar con todos los módulos para el estado local
      const syncedPermissions = modulos.map(modulo => {
        const existing = (updatedPermissions || []).find(p => p.modulo_id === modulo.id);
        return existing ? {
          ...existing,
          leer: !!existing.leer,
          insertar: !!existing.insertar,
          editar: !!existing.editar,
          eliminar: !!existing.eliminar
        } : {
          modulo_id: modulo.id,
          modulo_name: modulo.name,
          leer: false,
          insertar: false,
          editar: false,
          eliminar: false
        };
      });

      setUserPermissions(syncedPermissions);
    } catch (error) {
      console.error("Error resetting permissions:", error);
      toast.error("Error al restablecer permisos: " + error.message);
    }
  };

  const handleSaveUserPermissions = async () => {
    try {
      if (!selectedUser) return;

      const permissionsToSave = userPermissions.map(permission => ({
        modulo_id: permission.modulo_id,
        leer: permission.leer ? 1 : 0,
        insertar: permission.insertar ? 1 : 0,
        editar: permission.editar ? 1 : 0,
        eliminar: permission.eliminar ? 1 : 0
      }));

      await updateUserPermissions(selectedUser.id, permissionsToSave);

      toast.success("Permisos actualizados exitosamente");

      // Refrescar permisos
      const updatedPermissions = await fetchUserPermissions(selectedUser.id);
      setUserPermissions(updatedPermissions);

    } catch (error) {
      console.error("Error saving user permissions:", error);
      toast.error("Error al guardar los permisos del usuario");
    }
  };

  if (usuariosLoading && usuarios.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-96" />
        <Card className="mt-8">
          <div className="p-6">
            <Skeleton className="h-8 w-64" />
          </div>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-10 w-96" />
              <Skeleton className="h-10 w-24" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-[#F1F4F6] min-h-screen antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header Section - New Design */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">

            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Directorio de Usuarios</h2>
            <p className="text-slate-500 text-base max-w-xl leading-relaxed">
              Gestione el acceso, los roles y los permisos de identidad de la empresa desde un panel de control centralizado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Animated Search Bar - Premium Design */}
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                className="pl-11 pr-10 h-12 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all shadow-sm group-hover:shadow-md"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full p-1"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 px-6 h-12 bg-[#1D293D] text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all active:scale-95 border-none">
                  <Plus className="w-5 h-5 font-black" />
                  <span className="hidden sm:inline">Nuevo Usuario</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </DialogTrigger>
              {/* Modal content remains the same to keep logic */}

              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                    Agregar Nuevo Usuario
                  </DialogTitle>
                  <DialogDescription className="text-lg font-medium text-gray-700 mt-4">
                    Completa la información del nuevo usuario
                  </DialogDescription>
                </DialogHeader>

                <form {...formProps} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Nombre Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Nombre
                      </Label>
                      <Input
                        placeholder="Ingrese el nombre"
                        value={addUserForm.nombre}
                        onChange={(e) =>
                          handleAddUserInputChange("nombre", e.target.value)
                        }
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>

                    {/* Apellidos Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Apellidos
                      </Label>
                      <Input
                        placeholder="Ingrese los apellidos"
                        value={addUserForm.apellidos}
                        onChange={(e) =>
                          handleAddUserInputChange(
                            "apellidos",
                            e.target.value
                          )
                        }
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>

                    {/* Teléfono Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Teléfono
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">📞</span>
                        </div>
                        <Input
                          placeholder="Número de teléfono"
                          value={addUserForm.telefono}
                          onChange={(e) =>
                            handleAddUserInputChange(
                              "telefono",
                              e.target.value
                            )
                          }
                          className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">@</span>
                        </div>
                        <Input
                          placeholder="correo@ejemplo.com"
                          type="email"
                          value={addUserForm.email}
                          onChange={(e) =>
                            handleAddUserInputChange("email", e.target.value)
                          }
                          className="h-11 pl-8 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Usaremos este email para notificaciones
                      </p>
                    </div>

                    {/* Username Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Username <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <Input
                          placeholder="nombre_usuario"
                          value={addUserForm.username}
                          onChange={(e) =>
                            handleAddUserInputChange(
                              "username",
                              e.target.value
                            )
                          }
                          className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-gray-500" />
                        </div>
                        <Input
                          placeholder="Contraseña segura"
                          type="password"
                          value={addUserForm.password}
                          onChange={(e) =>
                            handleAddUserInputChange(
                              "password",
                              e.target.value
                            )
                          }
                          className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Rol Select */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Rol <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={addUserForm.rol}
                        onValueChange={(value) =>
                          handleAddUserInputChange("rol", value)
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesLoading ? (
                            <SelectItem value="" disabled>
                              Cargando roles...
                            </SelectItem>
                          ) : (
                            roles.map((rol) => (
                              <SelectItem
                                key={rol.id}
                                value={rol.id.toString()}
                              >
                                {rol.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Centro de Costo SearchableSelect */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Centro de Costo{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <SearchableSelect
                        placeholder="Buscar o seleccionar centro de costo..."
                        options={centrosCostoOptions}
                        value={addUserForm.centroCosto}
                        onChange={(value) => handleAddUserInputChange("centroCosto", value)}
                        disabled={centrosLoading}
                        loading={centrosLoading}
                      />
                    </div>

                    {/* Empresa SearchableSelect */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Empresa
                      </Label>
                      <SearchableSelect
                        placeholder="Buscar o seleccionar empresa..."
                        options={empresasOptions}
                        value={addUserForm.empresa}
                        onChange={(value) => handleAddUserInputChange("empresa", value)}
                        disabled={empresasLoading}
                        loading={empresasLoading}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
                    >
                      Ingresar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddUserModalOpen(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Stats Card - Following Image 2 Design */}
            <div className="hidden sm:flex bg-[#1D293D] rounded-3xl p-6 text-white min-w-[280px] relative overflow-hidden">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500/50 p-2 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="bg-blue-400/30 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-blue-400/20">
                    En Vivo
                  </span>
                </div>
                <div>
                  <p className="text-blue-100 text-xs font-semibold mb-1">Usuarios Activos</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black">{usuariosLoading && !usuarios.length ? '...' : (pagination.total?.toLocaleString() || '0')}</h3>
                    <span className="text-blue-200 text-xs font-bold">{pagination.total > 0 ? '+Real' : ''}</span>
                  </div>
                </div>
              </div>
              {/* Decorative background circle */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-2xl rounded-2xl p-4 border border-slate-200 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                <span className="text-sm font-bold text-slate-700 px-2">{selectedUsers.length} seleccionados</span>
                <div className="h-6 w-px bg-slate-200"></div>
                <Button
                  onClick={handleBulkActivate}
                  variant="outline"
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-xl"
                >
                  Activar
                </Button>
                <Button
                  onClick={handleBulkDeactivate}
                  variant="outline"
                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 rounded-xl"
                >
                  Desactivar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search bar removed from this area as requested "sin el input de filtro obviamente" */}

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {/* Table State Handling */}
            {usuariosError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <XCircle className="text-red-500 w-5 h-5" />
                <p className="text-red-800 text-sm font-medium">Error: {usuariosError}</p>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl bg-white  overflow-x-auto relative">
              {/* Skeleton Overlay while refreshing */}
              {usuariosLoading && usuarios.length > 0 && (
                <div className="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden z-10">
                  <div className="h-full bg-blue-600 animate-progress origin-left"></div>
                </div>
              )}

              <Table className={`${usuariosLoading && usuarios.length > 0 ? "opacity-40 transition-opacity duration-300" : "transition-opacity duration-300"}`}>
                <TableHeader className="bg-white border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 py-5 px-6">
                      <Checkbox
                        checked={selectedUsers.length === usuarios.length && usuarios.length > 0}
                        onCheckedChange={handleSelectAllUsers}
                        className="rounded-md border-slate-300 data-[state=checked]:bg-blue-600"
                      />
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleUsersSort('id')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        ID
                        <span className={usersSortField === 'id' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getUsersSortIcon('id')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleUsersSort('nombre')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        NOMBRE Y APELLIDOS
                        <span className={usersSortField === 'nombre' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getUsersSortIcon('nombre')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleUsersSort('centro_id')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        CENTRO DE COSTO
                        <span className={usersSortField === 'centro_id' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getUsersSortIcon('centro_id')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleUsersSort('username')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        LOGIN
                        <span className={usersSortField === 'username' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getUsersSortIcon('username')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleUsersSort('rol_id')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        ROL
                        <span className={usersSortField === 'rol_id' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getUsersSortIcon('rol_id')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-400 py-5 text-center">
                      ESTADO
                    </TableHead>
                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-400 py-5 text-center">
                      ACCIONES
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosLoading && usuarios.length === 0 ? (
                    // Skeleton rows while initial loading
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="px-6 py-5">
                          <Skeleton className="h-4 w-4 rounded" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1.5">
                            <Skeleton className="h-6 w-10 rounded-full" />
                            <Skeleton className="h-3 w-10" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Skeleton className="w-9 h-9 rounded-xl" />
                            <Skeleton className="w-9 h-9 rounded-xl" />
                            <Skeleton className="w-9 h-9 rounded-xl" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-20 text-slate-400 bg-slate-50/30"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-10 h-10 opacity-20" />
                          <p className="font-medium">No se encontraron usuarios</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((user) => (
                      <TableRow key={user.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <TableCell className="px-6 py-5">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                            className="rounded-md border-slate-300 data-[state=checked]:bg-blue-600"
                          />
                        </TableCell>
                        <TableCell className="font-bold text-slate-700 text-xs px-6">
                          {user.id}
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-3">
                            {/* Circle with initials like in image 1 */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getInitialsColor(user.id)}`}>
                              {getInitials(user.nombre, user.apellido)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm">{user.nombre} {user.apellido}</span>
                              <span className="text-[11px] text-slate-400 font-medium">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 font-semibold text-xs">
                          {user.centro?.name || user.centro || "Sin asignar"}
                        </TableCell>
                        <TableCell>
                          <span className="bg-slate-100 text-slate-500 font-bold text-[10px] px-2.5 py-1 rounded-md tracking-tight">
                            {user.username}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="bg-blue-50 text-blue-600 font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {typeof user.rol === "object" ? user.rol.nombre : user.rol || "Sin rol"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Switch
                              checked={user.active === 'true' || user.active === true}
                              onCheckedChange={() => handleToggleUserActivation(user)}
                              className="data-[state=checked]:bg-[#1D293D] data-[state=unchecked]:bg-slate-200"
                            />
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${user.active === 'true' || user.active === true ? "text-green-600" : "text-slate-400"
                              }`}>
                              {user.active === 'true' || user.active === true ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {/* Soft action buttons like in Image 1 */}
                            <Button
                              size="sm"
                              onClick={() => handleViewUser(user)}
                              className="w-9 h-9 p-0 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-none border-none"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="w-9 h-9 p-0 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-all shadow-none border-none"
                              title="Editar usuario"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDarDeBaja(user)}
                              className="w-9 h-9 p-0 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-all shadow-none border-none"
                              title="Dar de baja (libera correo para nuevo funcionario)"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="w-9 h-9 p-0 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-none border-none"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Pagination */}
            {!usuariosLoading && !usuariosError && usuarios.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                <div className="text-sm text-gray-500">
                  Mostrando{" "}
                  <span className="font-medium text-gray-900">
                    {(pagination.current_page - 1) * pagination.per_page + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(
                      pagination.current_page * pagination.per_page,
                      pagination.total
                    )}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-gray-900">
                    {pagination.total}
                  </span>{" "}
                  usuarios
                </div>

                <div className="flex items-center gap-1">
                  {/* First Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.current_page <= 1}
                    className="h-8 w-8 p-0"
                    title="Primera página"
                  >
                    <ChevronFirst className="h-4 w-4" />
                  </Button>

                  {/* Previous Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                    className="h-8 px-3"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const currentPage = pagination.current_page;
                      const lastPage = pagination.last_page;
                      const pages = [];

                      // Always show first page
                      if (currentPage > 3) {
                        pages.push(
                          <Button
                            key={1}
                            variant={1 === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            className="h-8 w-8 p-0"
                          >
                            1
                          </Button>
                        );
                        if (currentPage > 4) {
                          pages.push(<span key="ellipsis1" className="px-2 text-gray-400">...</span>);
                        }
                      }

                      // Show pages around current page
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(lastPage, currentPage + 2);

                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={i === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            className="h-8 w-8 p-0"
                          >
                            {i}
                          </Button>
                        );
                      }

                      // Always show last page
                      if (currentPage < lastPage - 2) {
                        if (currentPage < lastPage - 3) {
                          pages.push(<span key="ellipsis2" className="px-2 text-gray-400">...</span>);
                        }
                        pages.push(
                          <Button
                            key={lastPage}
                            variant={lastPage === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(lastPage)}
                            className="h-8 w-8 p-0"
                          >
                            {lastPage}
                          </Button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  {/* Next Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.last_page}
                    className="h-8 px-3"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>

                  {/* Last Page Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.last_page)}
                    disabled={pagination.current_page >= pagination.last_page}
                    className="h-8 w-8 p-0"
                    title="Última página"
                  >
                    <ChevronLast className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modules Management Section */}
      {/*   <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Gestión de Módulos
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Administra permisos por módulo del sistema
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
             Modules Table 
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      ID
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Módulo
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Usuarios con Acceso
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modulos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-slate-500 font-medium text-sm"
                      >
                        No se encontraron módulos
                      </TableCell>
                    </TableRow>
                  ) : (
                    modulos.map((modulo) => {
                      // Safe access to moduleStats with proper type checking
                      const stats = Array.isArray(moduleStats)
                        ? moduleStats.find((s) => s && s.id === modulo.id) || {}
                        : {};
                      return (
                        <TableRow key={modulo.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                          <TableCell className="font-bold text-slate-700 text-xs px-6 py-4">
                            {modulo.id}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-xs px-6 py-4">
                            {modulo.name}
                          </TableCell>
                          <TableCell className="text-slate-500 font-medium text-xs px-6 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider">
                              {(stats && typeof stats.usuarios_con_acceso === 'number') ? stats.usuarios_con_acceso : 0} USUARIOS
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  resetModulePermissions(modulo.id)
                                }
                                className="w-auto h-8 px-3 bg-amber-500 hover:bg-amber-600 rounded-lg transition-all duration-200 shadow hover:shadow-md text-white border-none"
                                title="Restablecer permisos del módulo"
                              >
                                <RotateCcw className="h-4 w-4 mr-1.5" />
                                Restablecer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card> */}

        {/* Zone Relations Section */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Relación zonas - usuarios
              </CardTitle>
              <Dialog
                open={isAddRelationModalOpen}
                onOpenChange={setIsAddRelationModalOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Nueva relación
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                      Agregar
                    </DialogTitle>
                  </DialogHeader>

                  <form {...relationFormProps.formProps} className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Zona <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newRelation.zona_id}
                        onValueChange={(value) =>
                          setNewRelation(prev => ({ ...prev, zona_id: value }))
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                          <SelectValue placeholder="----Seleccione----" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableZones.map(zone => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Usuario <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={newRelation.usuario_id}
                        onValueChange={(value) =>
                          setNewRelation(prev => ({ ...prev, usuario_id: value }))
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 w-full">
                          <SelectValue placeholder="----Seleccione----" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.nombre} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Seleccione la zona donde trabajará el usuario
                      </p>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
                      >
                        Agregar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddRelationModalOpen(false)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Modal de Editar Relación */}
              <Dialog
                open={isEditRelationModalOpen}
                onOpenChange={setIsEditRelationModalOpen}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                      Editar Relación
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Zona <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={editRelation.zona_id?.toString()}
                        onValueChange={(value) =>
                          setEditRelation(prev => ({ ...prev, zona_id: value }))
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                          <SelectValue placeholder="----Seleccione----" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableZones.map(zone => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Usuario <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={editRelation.usuario_id?.toString()}
                        onValueChange={(value) =>
                          setEditRelation(prev => ({ ...prev, usuario_id: value }))
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 w-full">
                          <SelectValue placeholder="----Seleccione----" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.nombre} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Seleccione la zona donde trabajará el usuario
                      </p>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <Button
                        type="button"
                        onClick={handleUpdateRelation}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
                      >
                        Actualizar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditRelationModalOpen(false);
                          setSelectedRelation(null);
                          setEditRelation({ usuario_id: '', zona_id: '' });
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleRelationsSort('zona')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        NOMBRE DE LA ZONA
                        <span className={relationsSortField === 'zona' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getRelationsSortIcon('zona')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleRelationsSort('usuario')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        NOMBRE DEL USUARIO
                        <span className={relationsSortField === 'usuario' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getRelationsSortIcon('usuario')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleRelationsSort('email')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        CORREO ELECTRÓNICO
                        <span className={relationsSortField === 'email' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getRelationsSortIcon('email')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRelations ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="space-y-2 px-6">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse"></div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : zoneRelationsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="text-slate-500">
                          <p className="text-lg font-medium">No hay relaciones configuradas</p>
                          <p className="text-sm">Agregue una nueva relación usando el botón "Agregar Nueva relación"</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    zoneRelationsData.map((relation) => (
                      <TableRow key={relation.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="font-bold text-slate-900 text-xs px-6 py-4">
                          {relation.nombre_zona || 'N/A'}
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium text-xs px-6 py-4">
                          {relation.nombre_usuario || 'N/A'}
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium text-xs px-6 py-4">
                          {relation.correo_electronico || 'N/A'}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditRelationClick(relation)}
                              className="w-8 h-8 p-0 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors border-none shadow-none"
                              title="Editar relación"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => deleteRelationDirect(relation.id)}
                              className="w-8 h-8 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border-none shadow-none"
                              title="Eliminar relación"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Zonas Management Section */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Gestión de Zonas
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleZonasSort('id')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        ID
                        <span className={zonasSortField === 'id' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getZonasSortIcon('id')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <button
                        onClick={() => handleZonasSort('name')}
                        className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors group outline-none w-full"
                      >
                        NOMBRE DE LA ZONA
                        <span className={zonasSortField === 'name' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                          {getZonasSortIcon('name')}
                        </span>
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingZonas ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="space-y-2 px-6">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse"></div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : zonasData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="text-slate-500">
                          <p className="text-lg font-medium">No hay zonas configuradas</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    zonasData.map((zona) => (
                      <TableRow key={zona.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="font-bold text-slate-700 text-xs px-6 py-4">
                          {zona.id}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 text-xs px-6 py-4">
                          {zona.name}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditZonaClick(zona)}
                              className="w-8 h-8 p-0 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors border-none shadow-none"
                              title="Editar zona"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Editar Zona */}
        <Dialog
          open={isEditZonaModalOpen}
          onOpenChange={setIsEditZonaModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                Editar Zona
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Nombre de la Zona <span className="text-red-500">*</span>
                </Label>
                <input
                  type="text"
                  value={editZonaName}
                  onChange={(e) => setEditZonaName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Ejemplo: ZONA1(NATALIA)"
                />
                <p className="text-xs text-gray-500">
                  Puede incluir el nombre del usuario entre paréntesis
                </p>
              </div>

              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  onClick={handleUpdateZona}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
                >
                  Actualizar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditZonaModalOpen(false);
                    setSelectedZona(null);
                    setEditZonaName('');
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Company Users Section */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Empresas y Usuarios Pertenecientes
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Relación de empresas con sus usuarios asignados
            </p>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-white border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400 w-1/3 border-r border-slate-100">
                      Empresa
                    </TableHead>
                    <TableHead className="py-3 px-6 font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Usuarios pertenecientes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyUsersData.map((company, index) => (
                    <TableRow key={index} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <TableCell className="font-bold text-slate-900 text-xs px-6 py-4 border-r border-slate-100">
                        {company.empresa}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium text-xs px-6 py-4">
                        {company.usuarios || (
                          <span className="text-slate-400 italic">
                            Sin usuarios asignados
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                Actualizar
              </DialogTitle>
              <DialogDescription className="text-lg font-medium text-gray-700 mt-4">
                usuario
              </DialogDescription>
            </DialogHeader>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={addUserForm.nombre}
                  onChange={(e) =>
                    handleAddUserInputChange("nombre", e.target.value)
                  }
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Apellidos <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={addUserForm.apellidos}
                  onChange={(e) =>
                    handleAddUserInputChange("apellidos", e.target.value)
                  }
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Apellidos del usuario"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Teléfono
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">📞</span>
                  </div>
                  <Input
                    value={addUserForm.telefono}
                    onChange={(e) =>
                      handleAddUserInputChange("telefono", e.target.value)
                    }
                    className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">@</span>
                  </div>
                  <Input
                    type="email"
                    value={addUserForm.email}
                    onChange={(e) =>
                      handleAddUserInputChange("email", e.target.value)
                    }
                    className="h-11 pl-8 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Username <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">👤</span>
                  </div>
                  <Input
                    value={addUserForm.username}
                    onChange={(e) =>
                      handleAddUserInputChange("username", e.target.value)
                    }
                    className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="nombre_usuario"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">🔒</span>
                  </div>
                  <Input
                    type="password"
                    value={addUserForm.password}
                    onChange={(e) =>
                      handleAddUserInputChange("password", e.target.value)
                    }
                    className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    placeholder="Nueva contraseña (opcional)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={addUserForm.rol}
                  onValueChange={(value) =>
                    handleAddUserInputChange("rol", value)
                  }
                >
                  <SelectTrigger className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesLoading ? (
                      <SelectItem value="" disabled>
                        Cargando roles...
                      </SelectItem>
                    ) : (
                      roles.map((rol) => (
                        <SelectItem
                          key={rol.id}
                          value={rol.id.toString()}
                        >
                          {rol.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Centro de Costo{" "}
                  <span className="text-gray-400">(Opcional)</span>
                </Label>
                <SearchableSelect
                  placeholder="Buscar o seleccionar centro de costo..."
                  options={centrosCostoOptions}
                  value={addUserForm.centroCosto}
                  onChange={(value) => handleAddUserInputChange("centroCosto", value)}
                  disabled={centrosLoading}
                  loading={centrosLoading}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-gray-700">
                  Empresa
                </Label>
                <SearchableSelect
                  placeholder="Buscar o seleccionar empresa..."
                  options={empresasOptions}
                  value={addUserForm.empresa}
                  onChange={(value) => handleAddUserInputChange("empresa", value)}
                  disabled={empresasLoading}
                  loading={empresasLoading}
                />
              </div>
            </div>

            {/* Permissions Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Gestión de Permisos</h3>
                <div className="flex gap-2">
                  {selectedUser && selectedUser.rol_id !== 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetToDefaultPermissions}
                      className="text-xs h-8 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                      type="button"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Valores por Defecto (Raíz)
                    </Button>
                  )}
                  {selectedUser && selectedUser.rol_id === 1 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Super Administrador - Acceso Completo
                    </Badge>
                  )}
                </div>
              </div>

              {selectedUser && selectedUser.rol_id === 1 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-yellow-600" />
                  <p className="text-yellow-800">
                    Los super administradores tienen acceso completo a todos los módulos del sistema.
                    No es necesario configurar permisos individuales.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-gray-100 p-3 rounded-lg border border-gray-200">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar módulo o página..."
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        className="pl-9 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {permissionSearch && (
                      <Button
                        variant="ghost"
                        onClick={() => setPermissionSearch("")}
                        className="text-xs text-gray-500 hover:text-blue-600"
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>

                  <Accordion type="multiple" defaultValue={["equipos"]} className="w-full">
                    {(() => {
                      const grouped = getGroupedPermissions();

                      return moduleCategories.map((category) => {
                        const permissions = grouped[category.id] || [];
                        if (permissions.length === 0) return null;

                        return (
                          <AccordionItem value={category.id} key={category.id} className="border rounded-lg mb-2 overflow-hidden">
                            <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 bg-gray-50/50">
                              <div className="flex items-center gap-3">
                                {category.icon}
                                <span className="font-semibold text-gray-900">{category.name}</span>
                                <Badge variant="outline" className="ml-2 font-normal">
                                  {permissions.length} módulos
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                              <div className="overflow-x-auto">
                                <Table className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow>
                                      <TableHead className="w-[200px] text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Página / Módulo</TableHead>
                                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Leer</TableHead>
                                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Crear</TableHead>
                                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Editar</TableHead>
                                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Eliminar</TableHead>
                                      <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {permissions.map((permission) => (
                                      <TableRow key={permission.modulo_id} className="hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="font-medium">
                                          <div className="flex flex-col">
                                            <span className="capitalize">{permission.modulo_name}</span>
                                            <span className="text-[10px] text-gray-400">ID: {permission.modulo_id}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Checkbox
                                            checked={permission.leer}
                                            onCheckedChange={(checked) =>
                                              handleUserPermissionChange(permission.modulo_id, "leer", checked)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Checkbox
                                            checked={permission.insertar}
                                            onCheckedChange={(checked) =>
                                              handleUserPermissionChange(permission.modulo_id, "insertar", checked)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Checkbox
                                            checked={permission.editar}
                                            onCheckedChange={(checked) =>
                                              handleUserPermissionChange(permission.modulo_id, "editar", checked)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Checkbox
                                            checked={permission.eliminar}
                                            onCheckedChange={(checked) =>
                                              handleUserPermissionChange(permission.modulo_id, "eliminar", checked)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <div className="flex gap-1 justify-center">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleGrantAllPermissions(permission.modulo_id)}
                                              className="w-8 h-8 p-0 text-green-600 hover:bg-green-50"
                                              title="Conceder todo"
                                            >
                                              <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleRevokeAllPermissions(permission.modulo_id)}
                                              className="w-8 h-8 p-0 text-red-600 hover:bg-red-50"
                                              title="Revocar todo"
                                            >
                                              <XCircle className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      });
                    })()}

                    {/* Otros módulos (Catch-all) */}
                    {(() => {
                      const grouped = getGroupedPermissions();
                      const others = grouped['otros'] || [];
                      if (others.length === 0) return null;

                      return (
                        <AccordionItem value="otros" className="border rounded-lg mb-2 overflow-hidden">
                          <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                              <Layers className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-900">Otros Módulos</span>
                              <Badge variant="outline" className="ml-2 font-normal">
                                {others.length} módulos
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <Table className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <TableHeader className="bg-slate-50 border-b border-slate-200">
                                <TableRow>
                                  <TableHead className="text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Módulo</TableHead>
                                  <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Leer</TableHead>
                                  <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Crear</TableHead>
                                  <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Editar</TableHead>
                                  <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Eliminar</TableHead>
                                  <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-500 py-3">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {others.map((permission) => (
                                  <TableRow key={permission.modulo_id} className="hover:bg-gray-50">
                                    <TableCell className="font-medium capitalize">{permission.modulo_name}</TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={permission.leer}
                                        onCheckedChange={(checked) =>
                                          handleUserPermissionChange(permission.modulo_id, "leer", checked)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={permission.insertar}
                                        onCheckedChange={(checked) =>
                                          handleUserPermissionChange(permission.modulo_id, "insertar", checked)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={permission.editar}
                                        onCheckedChange={(checked) =>
                                          handleUserPermissionChange(permission.modulo_id, "editar", checked)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={permission.eliminar}
                                        onCheckedChange={(checked) =>
                                          handleUserPermissionChange(permission.modulo_id, "eliminar", checked)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="flex gap-1 justify-center">
                                        <Button size="sm" variant="ghost" onClick={() => handleGrantAllPermissions(permission.modulo_id)} className="text-green-600"><CheckCircle className="h-4 w-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleRevokeAllPermissions(permission.modulo_id)} className="text-red-600"><XCircle className="h-4 w-4" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })()}
                  </Accordion>

                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center rounded-b-lg shadow-inner">
                    <div className="text-sm text-gray-600">
                      <span className="font-bold text-blue-600">{userPermissions ? userPermissions.length : 0}</span> módulos configurados para este usuario
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditUserModalOpen(false)}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveUserPermissions}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        Guardar Permisos Individuales
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                onClick={handleSubmitEditUser}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Actualizar
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditUserModalOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View User Modal */}
        <Dialog open={isViewUserModalOpen} onOpenChange={setIsViewUserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-700">
                Información detallada del usuario
              </DialogTitle>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-3 py-4">
                <div>
                  <span className="font-semibold text-gray-700">Nombre: </span>
                  <span className="text-gray-600">
                    {selectedUser.nombre?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Apellido: </span>
                  <span className="text-gray-600">
                    {selectedUser.apellido?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Teléfono: </span>
                  <span className="text-gray-600">
                    {selectedUser.telefono || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Email: </span>
                  <span className="text-gray-600">
                    {selectedUser.email || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Username: </span>
                  <span className="text-gray-600">
                    {selectedUser.username || selectedUser.login || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Rol: </span>
                  <span className="text-gray-600">
                    {typeof selectedUser.rol === 'object' ? selectedUser.rol.nombre : selectedUser.rol || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-start pt-6">
              <Button
                onClick={() => setIsViewUserModalOpen(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog
          open={!!userToDelete}
          onOpenChange={() => setUserToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el
                usuario{" "}
                <span className="font-semibold">{userToDelete?.nombre}</span> del
                sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setUserToDelete(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dar de Baja Confirmation Dialog */}
        <AlertDialog
          open={!!userToDarDeBaja}
          onOpenChange={() => setUserToDarDeBaja(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dar de baja a funcionario</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    El funcionario{" "}
                    <span className="font-semibold text-gray-900">
                      {userToDarDeBaja?.nombre} {userToDarDeBaja?.apellido}
                    </span>{" "}
                    será desactivado definitivamente.
                  </p>
                  <p>
                    Su correo{" "}
                    <span className="font-semibold text-orange-700">{userToDarDeBaja?.email}</span>{" "}
                    quedará <span className="font-semibold">libre</span> para ser
                    usado por el nuevo funcionario que ocupe el cargo.
                  </p>
                  <p className="text-gray-500">
                    El historial de actividades se conservará de forma
                    auditable.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setUserToDarDeBaja(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDarDeBaja}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Dar de baja y liberar correo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Relation Confirmation Dialog */}
        <AlertDialog
          open={!!relationToDelete}
          onOpenChange={() => setRelationToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la
                relación entre la zona{" "}
                <span className="font-semibold">
                  {relationToDelete?.nombre_zona}
                </span>{" "}
                y el usuario{" "}
                <span className="font-semibold">
                  {relationToDelete?.nombre_usuario}
                </span>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setRelationToDelete(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-all duration-200"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteRelation}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
