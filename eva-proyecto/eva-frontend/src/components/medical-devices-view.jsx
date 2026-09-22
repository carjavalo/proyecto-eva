import { useState, useRef, useMemo, useCallback } from "react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  Edit,
  Paperclip,
  FileText,
  Trash2,
  Filter,
  Plus,
  Merge,
  FileSpreadsheet,
  Files,
  Link,
  X,
  AlertTriangle,
  CheckCircle2,
  FileStack,
  Clock,
} from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { useAuth } from "@/hooks/useAuth.jsx";
import PermissionWrapper from "./PermissionWrapper";
import { MainActionButtons } from "./equipment/MainActionButtons";
import { StatsActionButtons } from "./equipment/StatsActionButtons";
import Pagination from "@/components/common/Pagination";
import { RowActionButtons } from "./equipment/RowActionButtons";
import { useEquipmentSearch } from "@/contexts/EquipmentSearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import httpService from "@/services/httpService";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Variantes de animación para las cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut"
    }
  }),
  hover: {
    y: -4,
    boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.2)",
    transition: { duration: 0.2 }
  }
};
import { Badge } from "@/components/ui/badge";
import { FilterModal } from "@/components/modals/filter-modal";
import { AddEquipmentModal } from "@/components/modals/add-equipment-modal";
import { CleanNamesModal } from "@/components/modals/clean-names-modal";
import { MergeModal } from "@/components/modals/merge-modal";
import PreventiveModal from "@/components/modals/preventive-modal";
import { CalibrationModal } from "@/components/modals/calibration-modal";
import { CorrectiveModal } from "@/components/modals/corrective-modal";
import { MonthModal } from "@/components/modals/month-modal";
import { DocumentListModal } from "@/components/modals/document-list-modal";
import { DocumentUploadModal } from "@/components/modals/document-upload-modal";
import { EditEquipmentModal } from "@/components/modals/edit-equipment-modal";
import { ViewEquipmentModal } from "@/components/modals/view-equipment-modal";
import { prefetchEquipment } from "@/services/equipmentPrefetchCache";
import CopyEquipmentModal from "@/components/modals/copy-equipment-modal";
import { DeleteConfirmModal } from "@/components/modals/delete-confirm-modal";
import { MigrateTypeConfirmModal } from "@/components/modals/migrate-type-confirm-modal";
import AddObservacionModal from "@/components/modals/add-observacion-modal";
import DarBajaEquipoModal from "@/components/modals/dar-baja-equipo-modal";

// Parsear fecha como local (evita desfase de timezone con fechas ISO date-only)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return new Date(s);
};
import { ContingenciasModal } from "@/components/modals/contingencias-modal";
import { CapacitacionesModal } from "@/components/modals/capacitaciones-modal";
import { MovimientosModal } from "@/components/modals/movimientos-modal";
import notFoundImg from "../assets/Img/imagenes/not-found.jpg";
import EquipmentImage from "./ui/equipment-image";
import { EquipmentImageHover } from "./ui/equipment-image-hover";
import { EquipmentIdBadge } from "./ui/equipment-id-badge";

// Helper function to safely render nested object properties
const safeRenderText = (value, fallback = "Sin información") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    // If it's an object with a nombre property, use that
    if (value.nombre) return value.nombre;
    // Otherwise return fallback to avoid rendering object
    return fallback;
  }
  return String(value);
};

export function MedicalDevicesView() {
  const { user } = useAuth();
  const isBasicUser = user && parseInt(user.rol_id) === 4;
  // Hook para manejar los datos de equipos médicos
  const {
    devices,
    loading,
    error,
    hasError,
    isEmpty,
    pagination,
    currentPage,
    totalPages,
    totalItems,
    showingFrom,
    showingTo,
    stats,
    filters,
    updateFilters,
    changePage,
    changePageSize,
    search,
    clearFilters,
    refresh,
  } = useEquipment("biomedical");

  // Global search context
  const { registerSearchCallback, unregisterSearchCallback, setResultCount } = useEquipmentSearch();

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [cleanNamesModalOpen, setCleanNamesModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [preventiveModalOpen, setPreventiveModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [correctiveModalOpen, setCorrectiveModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [documentListModalOpen, setDocumentListModalOpen] = useState(false);
  const [documentUploadModalOpen, setDocumentUploadModalOpen] = useState(false);
  const [editEquipmentModalOpen, setEditEquipmentModalOpen] = useState(false);
  const [viewEquipmentModalOpen, setViewEquipmentModalOpen] = useState(false);
  const [copyEquipmentModalOpen, setCopyEquipmentModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [migrateTypeModalOpen, setMigrateTypeModalOpen] = useState(false);
  const [addObservacionModalOpen, setAddObservacionModalOpen] = useState(false);
  const [darBajaEquipoModalOpen, setDarBajaEquipoModalOpen] = useState(false);
  const [contingenciasModalOpen, setContingenciasModalOpen] = useState(false);
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [capacitacionesModalOpen, setCapacitacionesModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentId, setEquipmentId] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sedes, setSedes] = useState([]);
  const [selectedSede, setSelectedSede] = useState("TODOS");

  // Fetch sedes from database
  useEffect(() => {
    const fetchSedes = async () => {
      try {
        // Request a large number of sedes to ensure they all appear in the filter
        const response = await httpService.get('/v1/sedes?per_page=100');
        if (response.data.success) {
          // Handle both paginated and non-paginated responses for robustness
          const sedesData = response.data.data;
          if (sedesData && Array.isArray(sedesData.data)) {
            setSedes(sedesData.data);
          } else if (Array.isArray(sedesData)) {
            setSedes(sedesData);
          } else {
            console.warn('Unexpected sedes data format:', sedesData);
            setSedes([]);
          }
        }
      } catch (error) {
        console.error('Error fetching sedes:', error);
      }
    };
    fetchSedes();
  }, []);

  // Apply sede filter
  useEffect(() => {
    if (selectedSede === "TODOS") {
      updateFilters({ sede_id: "" });
    } else {
      updateFilters({ sede_id: selectedSede });
    }
  }, [selectedSede]);

  // Handlers
  const handlePageSizeChange = (newSize) => {
    changePageSize(parseInt(newSize));
  };

  // Handle export equipment list (listado completo de equipos)
  const handleExportEquipmentCounts = async () => {
    const toastId = 'export-equipment-list';
    try {
      toast.loading('Exportando listado de equipos biomédicos...', { id: toastId });

      const response = await httpService.get('/v1/export/equipment-list', {
        responseType: 'blob',
        params: { type: 'biomedical' }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'EquiposBiomedicosHUV.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Listado de equipos exportado exitosamente', { id: toastId });
    } catch (err) {
      console.error('❌ Error exportando listado de equipos:', err);
      toast.error('Error al exportar listado de equipos', { id: toastId });
    }
  };

  // Handle opening maintenance documents - PREVENTIVO
  const handleOpenMaintenanceDocument = async (equipmentId) => {
    try {

      // Casos específicos conocidos con archivos preventivos
      const equiposConocidos = {
        5119: 'SK00602904-PM.pdf', // BOMBA DE INFUSION
        // Agregar más equipos según se encuentren
      };

      if (equiposConocidos[equipmentId]) {
        const knownFile = equiposConocidos[equipmentId];
        const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"}/storage/mantenimientos/${knownFile}`;
        window.open(fileUrl, "_blank");
        return;
      }

      // Usar endpoint de mantenimientos ejecutados (no planes)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8001/api"}/v1/mantenimientos-ejecutados?equipo_id=${equipmentId}&per_page=100`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Buscar mantenimientos ejecutados con archivos
      let maintenanceRecords = [];

      if (data.success && data.data) {
        if (Array.isArray(data.data.data)) {
          maintenanceRecords = data.data.data;
        } else if (Array.isArray(data.data)) {
          maintenanceRecords = data.data;
        }
      } else if (Array.isArray(data)) {
        maintenanceRecords = data;
      }

      if (maintenanceRecords && maintenanceRecords.length > 0) {
        // Filtrar solo los que tienen archivo y ordenar por fecha más reciente
        const recordsWithFiles = maintenanceRecords
          .filter(record => record.file && record.file.trim() !== '')
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.fecha_mantenimiento || 0);
            const dateB = new Date(b.created_at || b.fecha_mantenimiento || 0);
            return dateB.getTime() - dateA.getTime();
          });

        if (recordsWithFiles.length > 0) {
          const latestMaintenance = recordsWithFiles[0];
          
          // Limpiar nombre del archivo de prefijos redundantes
          const fileName = latestMaintenance.file.replace(/^mantenimientos\//, "");

          // Abrir el documento directamente
          const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"}/storage/mantenimientos/${fileName}`;

          window.open(fileUrl, "_blank");
          return;
        }
      }

      // Si no se encontró ningún archivo
      toast.warning("No se encontraron documentos de mantenimiento preventivo para este equipo");

    } catch (error) {
      console.error("❌ Error al abrir documento de mantenimiento preventivo:", error);
      toast.error(`Error al acceder al documento de mantenimiento preventivo: ${error.message}`);
    }
  };

  // Function to export Parada de Equipo Biomédico
  const handleExportParadaEquipo = async () => {
    const toastId = 'export-parada-biomedico';
    try {
      toast.loading('Exportando Parada de Equipo Biomédico...', { id: toastId });

      const response = await httpService.get(
        `/v1/correctivos-generales/export-excel?formato=parada&tipo=biomedico`,
        {
          responseType: "blob",
          timeout: 120000, // 2 minutos para exportaciones grandes
          headers: {
            Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }
      );

      // Crear blob y descargar
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Parada_Equipo_Biomedico_${new Date().toISOString().split("T")[0]
        }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Parada de Equipo Biomédico exportada exitosamente', { id: toastId });
    } catch (error) {
      console.error("❌ [EXPORT] Error exportando parada de equipo:", error);

      if (error.code === 'ECONNABORTED') {
        toast.error('La exportación está tardando demasiado. Intenta más tarde.', { id: toastId });
      } else {
        toast.error('Error al exportar Parada de Equipo Biomédico', { id: toastId });
      }
    }
  };

  // Function to handle calibration document opening
  const handleOpenCalibrationDocument = async (equipmentId) => {
    try {
      // Usar el mismo endpoint que el modal de calibraciones (v1/calibracion) pero filtrando por el último
      const response = await httpService.get(`/v1/calibracion`, {
        params: {
          equipo_id: equipmentId,
          per_page: 1,
          order_by: "fecha_calibracion",
          order_direction: "desc"
        }
      });

      const data = response.data?.data?.data || response.data?.data || response.data;
      const calibration = Array.isArray(data) ? data[0] : (data.data ? data.data[0] : null);

      if (calibration && calibration.file) {
        // Limpiar nombre del archivo de prefijos redundantes
        const fileName = calibration.file.replace(/^calibraciones\//, "");
        const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"}/storage/calibraciones/${fileName}`;
        window.open(fileUrl, "_blank");
      } else {
        toast.warning("No se encontraron registros de calibración con archivo para este equipo");
      }
    } catch (error) {
      console.error("❌ Error al abrir documento de calibración:", error);
      toast.error(`Error al acceder al documento de calibración: ${error.response?.data?.message || error.message}`);
    }
  };

  // Function to handle corrective document opening
  const handleOpenCorrectiveDocument = async (equipmentId) => {
    try {

      // Try to get corrective data for this equipment
      let response;
      const authToken = localStorage.getItem("eva_auth_token") || localStorage.getItem("auth_token");

      if (authToken) {
        response = await httpService.get(`/v1/equipos/${equipmentId}/correctivos`);
      } else {
        // Fallback to public endpoint
        response = await fetch(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/equipos/${equipmentId}/correctivos`, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const publicData = await response.json();
        if (publicData && publicData.length > 0) {
          const corrective = publicData[0];
          if (corrective.file) {
            // corrective.file ya incluye la carpeta, no duplicar
            const fileUrl = `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/storage/${corrective.file}`;
            window.open(fileUrl, "_blank");
            return;
          }
        }
        throw new Error('No se encontraron registros de correctivo');
      }

      const data = response.data;
      if (data && data.length > 0) {
        const corrective = data[0];
        if (corrective.file) {
          // corrective.file ya incluye la carpeta, no duplicar
          const fileUrl = `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/storage/${corrective.file}`;
          window.open(fileUrl, "_blank");
        } else {
          toast.warning("No hay documento de correctivo disponible para este equipo");
        }
      } else {
        toast.warning("No se encontraron registros de correctivo para este equipo");
      }
    } catch (error) {
      console.error("❌ Error al abrir documento de correctivo:", error);
      toast.error(`Error al acceder al documento de correctivo: ${error.message}`);
    }
  };

  // Keep search function in a ref so the registered callback is always up-to-date
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  // Register search callback once on mount, cleanup on unmount
  useEffect(() => {
    registerSearchCallback((searchTerm) => {
      searchRef.current(searchTerm);
    });
    return () => unregisterSearchCallback();
  }, [registerSearchCallback, unregisterSearchCallback]);

  // Update result count when devices change
  useEffect(() => {
    setResultCount(devices.length);
  }, [devices, setResultCount]);

  // Sync local states with filters from hook
  useEffect(() => {
    setEquipmentId(filters.consulta_id || "");
    setDateFilter(filters.anio_plan || "");
  }, [filters]);

  // Debug filters changes
  useEffect(() => {
    // Filters changed
  }, [filters, devices]);

  // Estados para filtros avanzados
  const [appliedFilters, setAppliedFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Función para aplicar filtros desde el modal
  const handleFiltersApply = (newFilters) => {
    setAppliedFilters(newFilters);
    setActiveFiltersCount(Object.keys(newFilters).length);

    // Actualizar filtros en el hook
    updateFilters({
      ...filters,
      ...newFilters,
      page: 1, // Resetear a primera página
    });
  };

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setAppliedFilters({});
    setActiveFiltersCount(0);
    clearFilters();
  };

  // Función para manejar la eliminación exitosa de un equipo
  const handleEquipmentDeleted = (equipmentId) => {
    // Refrescar la lista de equipos después de eliminar
    refresh();
    // Limpiar el equipo seleccionado
    setSelectedEquipment(null);
  };

  // Use backend search instead of local filtering
  const filteredDevices = useMemo(() => devices && devices.length > 0 ? devices : [], [devices]);

  // Handle search with backend (removed duplicate)

  // Handle Equipment ID search
  const handleEquipmentIdSearch = () => {
    const trimmedId = equipmentId.trim();

    // Validación mejorada
    if (trimmedId) {
      // Verificar que sea solo números
      if (!/^\d+$/.test(trimmedId)) {
        toast.error("Por favor ingrese un ID válido (solo números enteros)");
        return;
      }

      // Verificar que sea un número positivo
      const numericId = parseInt(trimmedId, 10);
      if (numericId <= 0) {
        toast.error("Por favor ingrese un ID válido (número mayor a 0)");
        return;
      }
    }

    if (trimmedId) {
      // Limpiar otros filtros cuando se busca por ID específico
      updateFilters({
        consulta_id: trimmedId,
        search: "", // Limpiar búsqueda general
        page: 1, // Resetear a primera página
      });
    } else {
      updateFilters({ consulta_id: "" });
    }
  };

  const handleDateChange = (value) => {
    setDateFilter(value);
    updateFilters({ anio_plan: value });
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setEquipmentId("");
    setDateFilter("");
    setAppliedFilters({});
    setActiveFiltersCount(0);
    clearFilters();
  };

  if (isBasicUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ACCESO BLOQUEADO</h2>
          <Badge className="bg-red-100 text-red-800 mb-4 hover:bg-red-200">USUARIO BÁSICO</Badge>
          <p className="text-slate-600 mb-6">
            Su perfil no tiene permisos para visualizar o interactuar con el panel principal de equipos médicos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] from-[#F1F4F6] to-[#1d293d]/5 p-1 xs:p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
      {/* Medical Equipment Management Header */}
      <div className="mb-3 sm:mb-4 md:mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">
          Sistema de Gestión de Equipos Médicos
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm md:text-base">
          Control y seguimiento integral de equipamiento biomédico hospitalario
        </p>
      </div>

      {/* Action Buttons - Ultra Compact Side by Side */}
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-6">
        {/* Main Action Buttons */}
        <PermissionWrapper module="equipos" action="leer">
          <MainActionButtons
            onFilterClick={() => setFilterModalOpen(true)}
            onAddClick={() => setAddModalOpen(true)}
            onCleanNamesClick={() => setCleanNamesModalOpen(true)}
            onExportClick={handleExportEquipmentCounts}
            onClearFiltersClick={handleClearAllFilters}
            activeFiltersCount={activeFiltersCount}
            showClearFilters={true}
            equipmentType="biomedical"
          />
        </PermissionWrapper>

        {/* Stats Buttons */}
        <PermissionWrapper module="equipos" action="leer">
          <StatsActionButtons
            onPreventiveClick={() => setPreventiveModalOpen(true)}
            onCalibrationClick={() => setCalibrationModalOpen(true)}
            onCorrectiveClick={() => setCorrectiveModalOpen(true)}
            onParadaEquipoClick={handleExportParadaEquipo}
            equipmentType="biomedical"
          />
        </PermissionWrapper>
      </div>
      {/* Main Content Card */}
      <Card className="shadow-none border border-slate-200 bg-white">
        {/* Enhanced Filters Section */}
        <div className="bg-gradient-to-r from-teal-50 to-[#1d293d]/5 border-b border-teal-100 p-2 sm:p-3 md:p-4 lg:p-6">
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">
                Panel de Control y Filtros
              </h2>
              <Badge
                variant="outline"
                className="bg-white/80 text-slate-700 border-slate-300 text-xs sm:text-sm w-fit"
              >
                Sistema Activo
              </Badge>
            </div>

            {/* Top Filter Row - Full Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">
                  Sede Hospitalaria
                </span>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-full h-8 text-sm bg-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas las Sedes</SelectItem>
                    {sedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>
                        {sede.name || sede.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">
                  Consultar Equipo por ID
                </span>
                <div className="flex gap-2">
                  <Input
                    placeholder="ID del equipo"
                    value={equipmentId}
                    onChange={(e) => setEquipmentId(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleEquipmentIdSearch()
                    }
                    className="flex-1 h-8 text-sm bg-white/80 border-slate-200"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEquipmentIdSearch}
                    className="h-8 px-3 bg-white/80 hover:bg-white"
                    title="Buscar por ID"
                  >
                    <Search className="w-4 h-4 text-teal-600" />
                  </Button>
                  {equipmentId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEquipmentId("");
                        updateFilters({ consulta_id: "" });
                      }}
                      className="h-8 px-2 text-slate-400 hover:text-slate-600"
                      title="Limpiar búsqueda por ID"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-700">
                  Período
                </span>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="flex-1 h-8 text-sm bg-white/80 border-slate-200"
                    placeholder="Fecha inicio"
                  />
                  {dateFilter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDateFilter("");
                        updateFilters({ anio_plan: "" });
                      }}
                      className="h-8 px-2 text-slate-400 hover:text-slate-600"
                      title="Limpiar filtro de fecha"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="p-2 sm:p-3 md:p-4 text-xs sm:text-sm text-slate-600 bg-slate-50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>
              {loading
                ? "Cargando equipos médicos..."
                : filters.consulta_id
                  ? devices.length > 0
                    ? `✅ Equipo encontrado con ID: ${filters.consulta_id}`
                    : `❌ No se encontró equipo con ID: ${filters.consulta_id}`
                  : `Mostrando ${devices.length} de ${pagination.total || 0
                  } equipos médicos`}
              {activeFiltersCount > 0 && !filters.consulta_id && (
                <span className="ml-2 text-teal-600 font-medium">
                  ({activeFiltersCount} filtro
                  {activeFiltersCount !== 1 ? "s" : ""} activo
                  {activeFiltersCount !== 1 ? "s" : ""})
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  onClick={handleClearAllFilters}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar filtros
                </Button>
              )}
              <Badge
                variant="secondary"
                className="bg-teal-100 text-teal-800 text-xs w-fit"
              >
                Base de Datos Actualizada
              </Badge>
            </div>
          </div>
        </div>

        {/* Items per page selector */}
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-2 border-b bg-slate-50">
          <span className="text-xs sm:text-sm text-slate-700">Mostrar</span>
          <Select
            value={pagination.per_page.toString()}
            onValueChange={(value) => changePageSize(parseInt(value))}
          >
            <SelectTrigger className="w-16 h-7 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs sm:text-sm text-slate-700">equipos por página</span>
        </div>

        {/* Enhanced Medical Equipment Table - Desktop Only */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <th className="text-left p-1 xs:p-2 sm:p-3 md:p-4 text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-slate-800 border-r border-slate-200">
                  Equipo Médico
                </th>

                <th className="text-left p-1 xs:p-2 sm:p-3 md:p-4 text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-slate-800 border-r border-slate-200">
                  Datos Técnicos
                </th>
                <th className="text-left p-1 xs:p-2 sm:p-3 md:p-4 text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-slate-800 border-r border-slate-200">
                  Ubicación Hospitalaria
                </th>
                <th className="text-left p-1 xs:p-2 sm:p-3 md:p-4 text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-slate-800 border-r border-slate-200">
                  Plan de ejecución
                </th>
                <th className="text-left p-1 xs:p-2 sm:p-3 md:p-4 text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-slate-800">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton rows while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200">
                      <div className="space-y-2 sm:space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="w-full h-24 xs:h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44 rounded-lg" />
                      </div>
                    </td>
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </td>
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </td>
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </td>
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4">
                      <div className="flex flex-col gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton
                            key={i}
                            className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9"
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <tr
                    key={device.id}
                    className="border-b"
                    onMouseEnter={() => prefetchEquipment(device.id)}
                  >
                    {/* Equipment Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200 align-top">
                      <div className="space-y-2 sm:space-y-3">
                        {/* ID del equipo prominente */}
                        <div className="flex items-center justify-between mb-2">
                          <EquipmentIdBadge
                            equipmentId={device.id}
                            variant="primary"
                            size="sm"
                            showCopyButton={true}
                          />
                        </div>

                        {/* Título del equipo */}
                        <div className="font-semibold text-slate-900 text-[10px] xs:text-xs sm:text-sm md:text-base">
                          {safeRenderText(device.equipo?.name, "Sin nombre")}
                        </div>

                        {/* Año de Adquisición */}
                        <div className="text-[9px] xs:text-[10px] sm:text-xs text-slate-600 mt-1">
                          <span className="font-bold text-slate-700">Año Adquisición: </span>
                          <span className="text-slate-900">
                            {device.fecha_ad && !isNaN(new Date(device.fecha_ad).getFullYear())
                              ? new Date(device.fecha_ad).getFullYear()
                              : "N/A"}
                          </span>
                        </div>

                        {/* Imagen del equipo con efecto hover mejorado */}
                        <EquipmentImageHover
                          equipmentId={device.id}
                          equipmentData={device.equipo}
                          equipmentName={device.equipo?.name || "Equipo médico"}
                          className="w-full h-24 xs:h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44"
                          fallbackImage={notFoundImg}
                          showLoader={true}
                        />

                        {/* Documentos Asociados */}
                        <div className="mt-3 space-y-2">
                          {/* Registro Sanitario */}
                          {!!device.equipo?.invima_id && device.registros_invima?.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-[#1d293d] uppercase tracking-wide">
                                Registro INVIMA
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#1d293d] flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    const registro = device.registros_invima[0];
                                    if (registro.archivo_registro_sanitario) {
                                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/registros_sanitarios/${registro.archivo_registro_sanitario}`;
                                      window.open(fileUrl, "_blank");
                                    }
                                  }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-[#1d293d] hover:text-[#2a3b52] hover:underline truncate"
                                  title={`Ver registro sanitario: ${device.registros_invima[0]?.numero_registro || 'N/A'}`}
                                >
                                  {device.registros_invima[0]?.numero_registro || "Ver Registro"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Manual Asociado */}
                          {!!device.equipo?.manual_id && device.manual && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-green-700 uppercase tracking-wide">
                                Manual
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    if (device.manual.url) {
                                      window.open(device.manual.url, "_blank");
                                    }
                                  }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-green-600 hover:text-green-800 hover:underline truncate"
                                  title={`Ver manual: ${device.manual.descripcion || 'N/A'}`}
                                >
                                  {device.manual.descripcion || "Ver Manual"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Guía Rápida Asociada */}
                          {!!device.equipo?.guia_id && device.guia_rapida && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-purple-700 uppercase tracking-wide">
                                Guía Rápida
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    if (device.guia_rapida.file) {
                                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/guias/${device.guia_rapida.file}`;
                                      window.open(fileUrl, "_blank");
                                    }
                                  }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-purple-600 hover:text-purple-800 hover:underline truncate"
                                  title={`Ver guía rápida: ${device.guia_rapida.name || 'N/A'}`}
                                >
                                  {device.guia_rapida.name || "Ver Guía"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Botones de Acciones Rápidas */}
                          <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEquipment(device);
                                setContingenciasModalOpen(true);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-[9px] xs:text-[10px] h-7 px-2 flex items-center gap-1"
                              title="Contingencias"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span className="hidden sm:inline">Contingencias</span>
                              {(device.cuenta_contingencias > 0 || device.contingencias_abiertas > 0) && (
                                <span className="ml-1 bg-white text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                  {device.contingencias_abiertas > 0 ? device.contingencias_abiertas : device.cuenta_contingencias}
                                </span>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEquipment(device);
                                setCapacitacionesModalOpen(true);
                              }}
                              className="bg-teal-500 hover:bg-teal-600 text-white text-[9px] xs:text-[10px] h-7 px-2 flex items-center gap-1"
                              title="Capacitaciones"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="hidden sm:inline">Capacitaciones</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ID Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200 align-top">
                      <div className="text-[10px] xs:text-xs sm:text-sm">
                        <div className="flex items-center gap-1 mb-1 sm:mb-2">
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200 text-[8px] xs:text-[9px] sm:text-xs"
                          >
                            {safeRenderText(device.equipo?.code, "Sin código")}
                          </Badge>
                          <Files
                            onClick={() => {
                              setSelectedEquipment(device);
                              setCopyEquipmentModalOpen(true);
                            }}
                            size={20}
                            color="#CD410E"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Copiar equipo"
                          />
                        </div>
                        <div className="text-[9px] xs:text-[10px] sm:text-xs text-slate-600">
                          <span className="font-medium">
                            Registro Sanitario:
                          </span>
                          <div className="text-[8px] xs:text-[9px] sm:text-xs bg-slate-100 px-1 xs:px-2 py-0.5 xs:py-1 rounded mt-0.5 xs:mt-1 border">
                            {safeRenderText(
                              device.data?.registroSanitario,
                              "Sin registro"
                            )}
                          </div>
                          <div className="mt-4 xs:mt-2">
                            <div>
                              <span className="font-medium text-slate-700">
                                Código:
                              </span>
                              <span className="font-medium text-slate-700">
                                {safeRenderText(
                                  device.equipo?.code,
                                  "SIN CÓDIGO"
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700">
                                Marca:
                              </span>
                              <span className="ml-1 text-slate-900">
                                {safeRenderText(
                                  device.equipo?.brand,
                                  "SIN MARCA"
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700">
                                Modelo:
                              </span>
                              <span className="ml-1 text-slate-900">
                                {safeRenderText(
                                  device.equipo?.model,
                                  "SIN MODELO"
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-700">
                                Serie:
                              </span>
                              <span className="ml-1 text-slate-900">
                                {safeRenderText(
                                  device.equipo?.series,
                                  "SIN SERIE"
                                )}
                              </span>
                            </div>
                            {device.cuenta_calibraciones > 0 && (
                            <div className="flex items-center gap-1 xs:gap-2">
                              <span className="font-bold text-slate-700">
                                Calibraciones:
                              </span>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[8px] xs:text-[9px] sm:text-xs border border-green-200">
                                {device.cuenta_calibraciones}
                              </Badge>
                            </div>
                            )}
                            {device.cuenta_preventivos > 0 && (
                            <div className="flex items-center gap-1 xs:gap-2">
                              <span className="font-bold text-slate-700">
                                Preventivos:
                              </span>
                              <Badge className="bg-[#1d293d]/10 text-[#1d293d] hover:bg-[#1d293d]/15 text-[8px] xs:text-[9px] sm:text-xs border border-[#1d293d]/30">
                                {device.cuenta_preventivos}
                              </Badge>
                            </div>
                            )}

                            {/* Purchase Order Section - Ocultar para equipos en comodato (tadquisicion_id=3) */}
                            {String(device.tadquisicion_id) !== "3" && (
                            <>
                            <div className="flex items-center gap-1 xs:gap-2">
                              <span className="font-medium text-slate-700">
                                Orden Compra:
                              </span>
                              {device.orden_compra ? (
                                <a
                                  href={`${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/ordenes_compra/${device.orden_compra_file}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#1d293d] hover:text-[#2a3b52] underline text-[8px] xs:text-[9px] sm:text-xs"
                                >
                                  {device.orden_compra}
                                </a>
                              ) : (
                                <span className="text-[8px] xs:text-[9px] sm:text-xs text-slate-500">
                                  Sin orden
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 xs:gap-2">
                              <span className="font-medium text-slate-700">
                                Tipo Compra:
                              </span>
                              <span className="text-[8px] xs:text-[9px] sm:text-xs text-slate-600">
                                {safeRenderText(device.tipo_compra, "Sin tipo")}
                              </span>
                            </div>
                            </>
                            )}

                            {/* Observation Section */}
                            <div className="mt-3 xs:mt-4 pt-2 xs:pt-3 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className="bg-[#1d293d]/5 text-[#1d293d] border-[#1d293d]/30 text-[8px] xs:text-[9px] sm:text-xs cursor-pointer hover:bg-[#1d293d]/10"
                                  onClick={() => {
                                    setSelectedEquipment(device);
                                    setAddObservacionModalOpen(true);
                                  }}
                                >
                                  Agregar Observación
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 xs:h-6 xs:w-6 p-0 text-[#1d293d] hover:text-[#2a3b52] hover:bg-[#1d293d]/5"
                                  onClick={() => {
                                    setSelectedEquipment(device);
                                    setAddObservacionModalOpen(true);
                                  }}
                                  title={`Agregar observación${device.observaciones?.ultima
                                    ? `\n\nÚltima observación: ${device.observaciones.ultima}`
                                    : '\n\nSin observaciones previas'
                                    }`}
                                >
                                  <Plus className="w-3 h-3 xs:w-4 xs:h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200 align-top">
                      <div className="text-[9px] xs:text-[10px] sm:text-xs space-y-1 xs:space-y-2 max-w-xs">
                        <div>
                          <span className="font-medium text-slate-700">
                            Servicio:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(
                              device.ubicacion?.servicio,
                              "Sin servicio"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Área:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(device.ubicacion?.area, "Sin área")}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Sede:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(device.ubicacion?.sede, "Sin sede")}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Zona:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(device.zona_hospitalaria, "Sin zona")}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Piso:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(device.piso_servicio, "Sin piso")}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Localización:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(device.localizacion_actual, "Sin localización")}
                          </span>
                        </div>

                        {/* Botón de Movimientos */}
                        <div className="mt-2 flex justify-center">
                          <Button
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full"
                            onClick={() => {
                              setSelectedEquipment(device);
                              setMovimientosModalOpen(true);
                            }}
                          >
                            <FileStack className="w-3 h-3 mr-1" />
                            Movimientos
                          </Button>
                        </div>

                        <div>
                          <span className="font-medium text-slate-700">
                            Estado:
                          </span>
                          <span className="ml-1 text-slate-900">
                            <Badge
                              className={`text-xs sm:text-sm font-medium ${device.data?.status === "Operativo"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : device.data?.status === "Fuera de Servicio"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : device.data?.status === "Equipo dado de baja"
                                    ? "bg-red-100 text-red-800 border-red-200"
                                    : device.data?.status === "Activo"
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : "bg-yellow-100 text-yellow-800 border-yellow-200"
                                }`}
                            >
                              {safeRenderText(
                                device.data?.status,
                                "Sin estado"
                              )}
                            </Badge>
                            {/* Botón para ver documento de baja cuando el equipo está dado de baja */}
                            {device.data?.status === "Equipo dado de baja" && device.archivo_baja && (
                              <button
                                type="button"
                                title="Ver documento de baja"
                                onClick={() => {
                                  const pureFileName = String(device.archivo_baja).split('/').pop();
                                  const url = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.56.1:8001"}/storage/equipos/bajas/${pureFileName}`;
                                  window.open(url, "_blank");
                                }}
                                className="ml-1 inline-flex items-center gap-1 text-xs bg-red-700 hover:bg-red-800 text-white px-2 py-0.5 rounded font-medium transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                Ver doc. baja
                              </button>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Clasificación Biomédica:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {safeRenderText(
                              device.data?.clasificacion,
                              "Sin clasificación"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Riesgo:
                          </span>
                          <span className="ml-1 text-slate-900">
                            <Badge
                              className={`text-xs sm:text-sm font-medium px-2 py-0.5 ${device.data?.riesgo &&
                                typeof device.data.riesgo === "string" &&
                                (device.data.riesgo.includes("Alto") ||
                                  device.data.riesgo.includes("III"))
                                ? "bg-red-100 text-red-800 border-red-200"
                                : device.data?.riesgo &&
                                  typeof device.data.riesgo === "string" &&
                                  (device.data.riesgo.includes("Medio") ||
                                    device.data.riesgo.includes("II"))
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-green-100 text-green-800 border-green-200"
                                }`}
                            >
                              {safeRenderText(
                                device.data?.riesgo,
                                "Sin clasificar"
                              )}
                            </Badge>
                          </span>
                        </div>
                        <div className="mt-2 xs:mt-3 pt-1 xs:pt-2 border-t border-slate-100">
                          <span className="font-medium text-slate-700">
                            Propietario:
                          </span>
                          <div className="text-[8px] xs:text-[9px] sm:text-xs text-slate-600 leading-tight bg-slate-50 p-1 xs:p-2 rounded border">
                            {safeRenderText(
                              typeof device.propietario === 'object' ? device.propietario?.nombre : device.propietario,
                              "Sin propietario"
                            )}
                          </div>

                          {/* Logo del propietario */}
                          {device.propietario?.logo_url && (
                            <div className="mt-2 flex justify-center">
                              {/* Caja de dimensiones FIJAS: un logo ancho no debe
                                  ensanchar la celda ni arrastrar toda la tabla. */}
                              <div className="h-12 w-24 sm:h-14 sm:w-28 flex items-center justify-center overflow-hidden">
                                <img
                                  src={device.propietario.logo_url}
                                  alt={device.propietario?.nombre || device.propietario}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Execution Plan Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 border-r border-slate-200 align-top">
                      <div className="text-[9px] xs:text-[10px] sm:text-xs space-y-1 xs:space-y-2 max-w-xs">
                        <div>
                          <span className="font-medium text-slate-700">
                            Último Mantenimiento:
                          </span>
                        </div>
                        <div className="text-slate-600 bg-green-50 p-1 xs:p-2 rounded text-[8px] xs:text-[9px] sm:text-xs border border-green-200 flex justify-between items-center">
                          {device.mantenimiento?.ultimoMantenimiento
                            ? parseLocalDate(
                              device.mantenimiento.ultimoMantenimiento
                            )?.toLocaleDateString()
                            : "Sin registros"}
                          <Link
                            size={15}
                            className="cursor-pointer hover:text-teal-600 transition-colors"
                            onClick={() =>
                              handleOpenMaintenanceDocument(device.id)
                            }
                            title="Abrir documento de mantenimiento"
                          />
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Última Calibración:
                          </span>
                        </div>
                        <div className="text-slate-600 bg-[#1d293d]/5 p-1 xs:p-2 rounded text-[8px] xs:text-[9px] sm:text-xs border border-[#1d293d]/30 flex justify-between items-center">
                          {device.mantenimiento?.ultimaCalibración
                            ? parseLocalDate(
                              device.mantenimiento.ultimaCalibración
                            )?.toLocaleDateString()
                            : "Sin registros"}
                          <Link
                            size={15}
                            className="cursor-pointer hover:text-[#1d293d] transition-colors"
                            onClick={() =>
                              handleOpenCalibrationDocument(device.id)
                            }
                            title="Abrir documento de calibración"
                          />
                        </div>
                        <div className="mt-2 xs:mt-3 pt-1 xs:pt-2 border-t border-slate-100 space-y-1 xs:space-y-2">
                          <div>
                            <span className="font-medium text-teal-700">
                              Información de plan de ejecución
                            </span>
                          </div>
                          {/* Información del Plan de Mantenimiento Vigente */}
                          {device.incluido_en_plan > 0 && (
                            <div className="space-y-0.5 xs:space-y-1 text-slate-700 bg-emerald-50 p-1 xs:p-2 rounded border border-emerald-300 mb-2">
                              <div className="font-semibold text-emerald-800 text-[9px] xs:text-[10px] sm:text-xs flex items-center gap-1">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Incluido en Plan {device.anio_vigente || 'Vigente'}
                              </div>
                              {device.responsable_plan && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                  <span className="font-medium">Responsable:</span>{' '}
                                  <span className="text-emerald-900">{device.responsable_plan}</span>
                                </div>
                              )}
                              {device.frecuencia_plan && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                  <span className="font-medium">Frecuencia:</span>{' '}
                                  <span className="text-emerald-900">{device.frecuencia_plan}</span>
                                </div>
                              )}
                              {(device.mes_programado1 || device.mes_programado2 || device.mes_programado3) && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs space-y-0.5">
                                  {device.mes_programado1 && (
                                    <div>
                                      <span className="font-medium">Fecha 1:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][device.mes_programado1 - 1]}
                                      </span>
                                    </div>
                                  )}
                                  {device.mes_programado2 && (
                                    <div>
                                      <span className="font-medium">Fecha 2:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][device.mes_programado2 - 1]}
                                      </span>
                                    </div>
                                  )}
                                  {device.mes_programado3 && (
                                    <div>
                                      <span className="font-medium">Fecha 3:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][device.mes_programado3 - 1]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="space-y-0.5 xs:space-y-1 text-slate-600 bg-teal-50 p-1 xs:p-2 rounded border border-teal-200">
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Último correctivo general generado:
                                {/* CORRECTIVOS GENERALES: Mostrar ícono basado en si existe correctivo */}
                                {device.mantenimiento?.ultimoCorrectivoGeneral && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-[#72a836]"
                                    title="Correctivo general completado"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {device.mantenimiento?.ultimoCorrectivoGeneral || "Sin registros"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Último procedimiento correctivo realizado:
                                {/* ✓ Verde: Tiene fecha de cierre (correctivo general cerrado exitosamente) */}
                                {device.mantenimiento?.ultimoProcedimientoCorrectivo && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-green-600"
                                    title="Correctivo general cerrado exitosamente"
                                  />
                                )}
                                {/* ⏰ Rojo: Tiene fecha de inicio pero NO fecha de cierre (correctivo abierto) */}
                                {device.mantenimiento?.ultimoCorrectivoGeneral && !device.mantenimiento?.ultimoProcedimientoCorrectivo && (
                                  <Clock
                                    size={14}
                                    className="text-red-600"
                                    title="Hay un correctivo general abierto sin resolver"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {device.mantenimiento?.ultimoProcedimientoCorrectivo || "Sin registros"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Fecha de creación del último ticket:
                                {/* TICKETS: Mostrar reloj si no está cerrado, chulo si está cerrado */}
                                {device.tickets?.fechaCreacionUltimoTicket && !device.tickets?.ultimoTicketCerrado && (
                                  <Clock
                                    size={14}
                                    className="text-[#c33a31]"
                                    title="Ticket creado pero no cerrado"
                                  />
                                )}
                                {device.tickets?.ultimoTicketCerrado && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-[#72a836]"
                                    title="Ticket cerrado/completado"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {device.tickets?.fechaCreacionUltimoTicket
                                  ? new Date(device.tickets.fechaCreacionUltimoTicket).toLocaleString()
                                  : "Sin registros"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Fecha de último cierre de tickets:
                                {/* ✓ Verde: Tiene fecha de cierre (ticket cerrado exitosamente) */}
                                {device.tickets?.fechaUltimoCierre && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-green-600"
                                    title="Último ticket cerrado exitosamente"
                                  />
                                )}
                                {/* ⏰ Rojo: Tiene fecha de inicio pero NO fecha de cierre (ticket abierto) */}
                                {device.tickets?.fechaCreacionUltimoTicket && !device.tickets?.fechaUltimoCierre && (
                                  <Clock
                                    size={14}
                                    className="text-red-600"
                                    title="Hay un ticket abierto sin resolver"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {device.tickets?.fechaUltimoCierre
                                  ? new Date(device.tickets.fechaUltimoCierre).toLocaleString()
                                  : "Sin registros"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Última calibración:
                                <Link
                                  size={12}
                                  className="cursor-pointer hover:text-[#1d293d] transition-colors"
                                  onClick={() => handleOpenCalibrationDocument(device.id)}
                                  title="Abrir documento de calibración"
                                />
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {device.mantenimiento?.ultimaCalibración
                                  ? parseLocalDate(device.mantenimiento.ultimaCalibración)?.toLocaleDateString()
                                  : "Sin registros"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 align-top">
                      <RowActionButtons
                        equipment={device}
                        onViewClick={(eq) => {
                          setSelectedEquipment(eq);
                          setViewEquipmentModalOpen(true);
                        }}
                        onEditClick={(eq) => {
                          setSelectedEquipment(eq);
                          setEditEquipmentModalOpen(true);
                        }}
                        onDocumentsClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDocumentListModalOpen(true);
                        }}
                        onUploadClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDocumentUploadModalOpen(true);
                        }}
                        onDeleteClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDeleteConfirmModalOpen(true);
                        }}
                        onCopyClick={(eq) => {
                          setSelectedEquipment(eq);
                          setCopyEquipmentModalOpen(true);
                        }}
                        onDecommissionClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDarBajaEquipoModalOpen(true);
                        }}
                        onMigrateTypeClick={(eq) => {
                          setSelectedEquipment(eq);
                          setMigrateTypeModalOpen(true);
                        }}
                        equipmentType="biomedical"
                        showCopyButton={false}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                // No data message
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">
                    {error ? (
                      <div className="text-red-500">
                        <p>Error al cargar los equipos</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    ) : (
                      <div>
                        {filters.search && filters.search.trim() ? (
                          <>
                            <p>No se encontraron equipos</p>
                            <p className="text-sm">
                              No hay equipos que coincidan con "{filters.search}
                              "
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => search("")}
                              className="mt-2"
                            >
                              Limpiar búsqueda
                            </Button>
                          </>
                        ) : (
                          <>
                            <p>No hay equipos disponibles</p>
                            <p className="text-sm">
                              No se encontraron equipos médicos registrados
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-2 sm:p-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-4 shadow-none">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </Card>
            ))
          ) : filteredDevices.length > 0 ? (
            filteredDevices.map((device) => (
              <motion.div
                key={device.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                onMouseEnter={() => prefetchEquipment(device.id)}
              >
                <Card className="overflow-hidden border-l-4 border-l-teal-500 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    {/* ID y Nombre */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <EquipmentIdBadge
                          equipmentId={device.id}
                          variant="primary"
                          size="sm"
                          showCopyButton={true}
                        />
                        <Files
                          onClick={() => {
                            setSelectedEquipment(device);
                            setCopyEquipmentModalOpen(true);
                          }}
                          size={18}
                          color="#CD410E"
                          className="cursor-pointer"
                        />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {safeRenderText(device.equipo?.name, "Sin nombre")}
                      </h3>
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Año: </span>
                        {device.fecha_ad && !isNaN(new Date(device.fecha_ad).getFullYear())
                          ? new Date(device.fecha_ad).getFullYear()
                          : "N/A"}
                      </p>
                    </div>

                    {/* Imagen */}
                    <EquipmentImageHover
                      equipmentId={device.id}
                      equipmentData={device.equipo}
                      equipmentName={device.equipo?.name || "Equipo médico"}
                      className="w-full h-48 rounded-lg"
                      fallbackImage={notFoundImg}
                      showLoader={true}
                    />

                    {/* Datos Técnicos */}
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm">Datos Técnicos</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-slate-600">Código:</span>
                          <p className="text-slate-900">{device.equipo?.codigo || "N/A"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Marca:</span>
                          <p className="text-slate-900">{safeRenderText(device.equipo?.marca, "Sin información")}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Modelo:</span>
                          <p className="text-slate-900">{safeRenderText(device.equipo?.modelo, "Sin información")}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Serie:</span>
                          <p className="text-slate-900">{safeRenderText(device.equipo?.serie, "Sin información")}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="bg-[#1d293d]/5 p-3 rounded-lg space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm">Ubicación</h4>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-medium">Sede:</span> {safeRenderText(device.ubicacion?.sede, "Sin información")}</p>
                        <p><span className="font-medium">Servicio:</span> {safeRenderText(device.ubicacion?.servicio, "Sin información")}</p>
                        <p><span className="font-medium">Área:</span> {safeRenderText(device.ubicacion?.area, "Sin información")}</p>
                      </div>
                    </div>

                    {/* Plan de Ejecución */}
                    {device.incluido_en_plan > 0 && (
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-300">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <h4 className="font-semibold text-emerald-800 text-sm">Plan {device.anio_vigente || 'Vigente'}</h4>
                        </div>
                        <div className="space-y-1 text-xs text-slate-700">
                          {device.responsable_plan && (
                            <p><span className="font-medium">Responsable:</span> {device.responsable_plan}</p>
                          )}
                          {device.frecuencia_plan && (
                            <p><span className="font-medium">Frecuencia:</span> {device.frecuencia_plan}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="pt-3 border-t border-slate-200">
                      <RowActionButtons
                        equipment={device}
                        onViewClick={(eq) => {
                          setSelectedEquipment(eq);
                          setViewEquipmentModalOpen(true);
                        }}
                        onEditClick={(eq) => {
                          setSelectedEquipment(eq);
                          setEditEquipmentModalOpen(true);
                        }}
                        onDocumentsClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDocumentListModalOpen(true);
                        }}
                        onUploadClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDocumentUploadModalOpen(true);
                        }}
                        onObservationClick={(eq) => {
                          setSelectedEquipment(eq);
                          setAddObservacionModalOpen(true);
                        }}
                        onDeleteClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDeleteConfirmModalOpen(true);
                        }}
                        onDecommissionClick={(eq) => {
                          setSelectedEquipment(eq);
                          setDarBajaEquipoModalOpen(true);
                        }}
                        onCopyClick={(eq) => {
                          setSelectedEquipment(eq);
                          setCopyEquipmentModalOpen(true);
                        }}
                        onContingenciasClick={(eq) => {
                          setSelectedEquipment(eq);
                          setContingenciasModalOpen(true);
                        }}
                        onCapacitacionesClick={(eq) => {
                          setSelectedEquipment(eq);
                          setCapacitacionesModalOpen(true);
                        }}
                        onMigrateTypeClick={(eq) => {
                          setSelectedEquipment(eq);
                          setMigrateTypeModalOpen(true);
                        }}
                        equipmentType="biomedical"
                        showCopyButton={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="p-8 shadow-none">
              <div className="text-center text-slate-500">
                {error ? (
                  <div className="text-red-500">
                    <p className="font-semibold">Error al cargar los equipos</p>
                    <p className="text-sm mt-2">{error}</p>
                  </div>
                ) : (
                  <div>
                    {filters.search && filters.search.trim() ? (
                      <>
                        <p className="font-semibold">No se encontraron equipos</p>
                        <p className="text-sm mt-2">No hay equipos que coincidan con "{filters.search}"</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => search("")}
                          className="mt-4"
                        >
                          Limpiar búsqueda
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">No hay equipos disponibles</p>
                        <p className="text-sm mt-2">No se encontraron equipos médicos registrados</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Results Info Bottom */}
        <div className="p-2 sm:p-3 md:p-4 text-xs sm:text-sm text-slate-600 border-t bg-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : filters.search && filters.search.trim() ? (
                `Mostrando ${devices.length} de ${pagination.total || 0
                } equipos`
              ) : (
                `Total de equipos médicos registrados: ${pagination.total || 0
                } equipos`
              )}
            </span>
            <span className="text-[10px] xs:text-xs sm:text-sm text-slate-500">
              Última actualización: {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Global Pagination Component */}
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.last_page}
          totalItems={pagination.total}
          itemsPerPage={pagination.per_page}
          onPageChange={changePage}
          loading={loading}
          showInfo={true}
        />
      </Card>

      {/* Modals - lazy mounted for performance */}
      {filterModalOpen && <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        onFiltersApply={handleFiltersApply}
        onFiltersClear={handleClearFilters}
        currentFilters={appliedFilters}
      />}
      {addModalOpen && <AddEquipmentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onEquipmentAdded={refresh}
      />}
      {cleanNamesModalOpen && <CleanNamesModal
        open={cleanNamesModalOpen}
        onOpenChange={setCleanNamesModalOpen}
      />}
      {mergeModalOpen && <MergeModal open={mergeModalOpen} onOpenChange={setMergeModalOpen} />}
      {preventiveModalOpen && <PreventiveModal
        isOpen={preventiveModalOpen}
        onOpenChange={setPreventiveModalOpen}
        onSuccess={refresh}
      />}
      {copyEquipmentModalOpen && <CopyEquipmentModal
        open={copyEquipmentModalOpen}
        onOpenChange={setCopyEquipmentModalOpen}
        equipment={selectedEquipment}
        onEquipmentAdded={refresh}
      />}
      {calibrationModalOpen && <CalibrationModal
        open={calibrationModalOpen}
        onOpenChange={setCalibrationModalOpen}
        equipoTipoId={1}
        equipoStatus="activo"
        onSuccess={refresh}
      />}
      {correctiveModalOpen && <CorrectiveModal
        open={correctiveModalOpen}
        onOpenChange={setCorrectiveModalOpen}
        equipmentType="biomedico"
      />}
      {monthModalOpen && <MonthModal open={monthModalOpen} onOpenChange={setMonthModalOpen} />}
      {documentListModalOpen && <DocumentListModal
        open={documentListModalOpen}
        onOpenChange={setDocumentListModalOpen}
        equipment={selectedEquipment}
        onUploadClick={() => {
          setDocumentListModalOpen(false);
          setDocumentUploadModalOpen(true);
        }}
      />}
      {documentUploadModalOpen && <DocumentUploadModal
        open={documentUploadModalOpen}
        onOpenChange={setDocumentUploadModalOpen}
        equipment={selectedEquipment}
        onDocumentUploaded={() => {
          refresh();
        }}
      />}
      {editEquipmentModalOpen && <EditEquipmentModal
        open={editEquipmentModalOpen}
        onOpenChange={setEditEquipmentModalOpen}
        equipment={selectedEquipment}
        onEquipmentUpdated={() => {
          refresh();
        }}
      />}
      {viewEquipmentModalOpen && <ViewEquipmentModal
        open={viewEquipmentModalOpen}
        onOpenChange={setViewEquipmentModalOpen}
        equipment={selectedEquipment}
      />}
      {deleteConfirmModalOpen && <DeleteConfirmModal
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        equipment={selectedEquipment}
        onEquipmentDeleted={handleEquipmentDeleted}
      />}
      {migrateTypeModalOpen && <MigrateTypeConfirmModal
        open={migrateTypeModalOpen}
        onOpenChange={setMigrateTypeModalOpen}
        equipment={selectedEquipment}
        equipmentType="biomedical"
        onMigrated={() => {
          refresh();
        }}
      />}
      {addObservacionModalOpen && <AddObservacionModal
        isOpen={addObservacionModalOpen}
        onClose={() => setAddObservacionModalOpen(false)}
        equipmentId={selectedEquipment?.id}
        equipmentName={selectedEquipment?.equipo?.name || "Equipo sin nombre"}
        onObservationAdded={() => {
          refresh();
        }}
      />}
      {darBajaEquipoModalOpen && <DarBajaEquipoModal
        open={darBajaEquipoModalOpen}
        onOpenChange={setDarBajaEquipoModalOpen}
        equipo={selectedEquipment}
        onSuccess={() => {
          refresh();
        }}
      />}
      {contingenciasModalOpen && <ContingenciasModal
        open={contingenciasModalOpen}
        onOpenChange={setContingenciasModalOpen}
        equipmentId={selectedEquipment?.id}
        equipmentName={selectedEquipment?.name || "Equipo sin nombre"}
      />}
      {capacitacionesModalOpen && <CapacitacionesModal
        open={capacitacionesModalOpen}
        onOpenChange={setCapacitacionesModalOpen}
        equipmentId={selectedEquipment?.id}
        equipmentName={selectedEquipment?.name || "Equipo sin nombre"}
      />}
      {movimientosModalOpen && <MovimientosModal
        open={movimientosModalOpen}
        onOpenChange={setMovimientosModalOpen}
        equipmentId={selectedEquipment?.id}
        equipmentName={selectedEquipment?.name || "Equipo sin nombre"}
      />}
    </div>
  );
}

export default MedicalDevicesView;
