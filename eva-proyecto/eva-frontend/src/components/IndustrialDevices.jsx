import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEquipment } from "../hooks/useEquipment";
import { useAuth } from "../hooks/useAuth.jsx";
import PermissionWrapper from "./PermissionWrapper";
import { MainActionButtons } from "./equipment/MainActionButtons";
import { StatsActionButtons } from "./equipment/StatsActionButtons";
import Pagination from "@/components/common/Pagination";
import { RowActionButtons } from "./equipment/RowActionButtons";
import { useEquipmentSearch } from "@/contexts/EquipmentSearchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import httpService from "@/services/httpService";
import { EquipmentFiltersSection } from "./shared/EquipmentFiltersSection";
import { EquipmentResultsInfo } from "./shared/EquipmentResultsInfo";
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
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileStack,
} from "lucide-react";
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
import { DeleteConfirmModal } from "@/components/modals/delete-confirm-modal";
import { MigrateTypeConfirmModal } from "@/components/modals/migrate-type-confirm-modal";
import { LifeModal } from "@/components/modals/life-modal";

// Parsear fecha como local (evita desfase de timezone con fechas ISO date-only)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr);
  // Si es solo fecha (YYYY-MM-DD), agregar T00:00:00 para interpretar como local
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return new Date(s);
};
import CopyEquipmentModal from "@/components/modals/copy-equipment-modal";
import DarBajaEquipoModal from "@/components/modals/dar-baja-equipo-modal";
import AddObservacionModal from "@/components/modals/add-observacion-modal";
import { ContingenciasModal } from "@/components/modals/contingencias-modal";
import { CapacitacionesModal } from "@/components/modals/capacitaciones-modal";
import { MovimientosModal } from "@/components/modals/movimientos-modal";
import notFoundImg from "../assets/Img/imagenes/not-found.jpg";
import { EquipmentImageHover } from "./ui/equipment-image-hover";
import { EquipmentIdBadge } from "./ui/equipment-id-badge";
import { API_CONFIG } from "@/config/api";

function IndustrialDevices() {
  const { user } = useAuth();
  const isBasicUser = user && parseInt(user.rol_id) === 4;
  
  // Hook para gestión de equipos industriales
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
    filters,
    updateFilters,
    changePage,
    changePageSize,
    search,
    clearFilters,
    refresh,
  } = useEquipment("industrial");

  // Global search context
  const { registerSearchCallback, unregisterSearchCallback, setResultCount } = useEquipmentSearch();

  // Estados para modales
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [cleanNamesModalOpen, setCleanNamesModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [preventiveModalOpen, setPreventiveModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);
  const [correctiveModalOpen, setCorrectiveModalOpen] = useState(false);
  const [lifeModalOpen, setLifeModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [documentListModalOpen, setDocumentListModalOpen] = useState(false);
  const [documentUploadModalOpen, setDocumentUploadModalOpen] = useState(false);
  const [editEquipmentModalOpen, setEditEquipmentModalOpen] = useState(false);
  const [viewEquipmentModalOpen, setViewEquipmentModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [migrateTypeModalOpen, setMigrateTypeModalOpen] = useState(false);
  const [darBajaEquipoModalOpen, setDarBajaEquipoModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [copyEquipmentModalOpen, setCopyEquipmentModalOpen] = useState(false);
  const [addObservacionModalOpen, setAddObservacionModalOpen] = useState(false);
  const [contingenciasModalOpen, setContingenciasModalOpen] = useState(false);
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [capacitacionesModalOpen, setCapacitacionesModalOpen] = useState(false);

  // Estados para filtros avanzados
  const [appliedFilters, setAppliedFilters] = useState({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Function to export Parada de Equipo Industrial
  const handleExportParadaEquipo = async () => {
    const toastId = 'export-parada-industrial';
    try {
      toast.loading('Exportando Parada de Equipo Industrial...', { id: toastId });

      const response = await httpService.get(
        `/v1/correctivos-generales/export-excel?formato=parada&tipo=industrial`,
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
      a.download = `Parada_Equipo_Industrial_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Parada de Equipo Industrial exportada exitosamente', { id: toastId });
    } catch (error) {
      console.error("❌ [EXPORT] Error exportando parada de equipo industrial:", error);
      
      if (error.code === 'ECONNABORTED') {
        toast.error('La exportación está tardando demasiado. Intenta más tarde.', { id: toastId });
      } else {
        toast.error('Error al exportar Parada de Equipo Industrial', { id: toastId });
      }
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

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.search && filters.search.trim()) count++;
    if (filters.consulta_id && filters.consulta_id.trim()) count++;
    if (filters.anio_plan && filters.anio_plan.trim()) count++;
    
    // Contar filtros aplicados desde el modal
    count += Object.keys(appliedFilters).length;

    setActiveFiltersCount(count);
  }, [filters.search, filters.consulta_id, filters.anio_plan, appliedFilters]);

  // Debug filters changes
  useEffect(() => {
    // Filters changed
  }, [filters, devices]);

  // Función para limpiar todos los filtros
  const handleClearAllFilters = () => {
    setAppliedFilters({});
    setActiveFiltersCount(0);
    clearFilters();
  };

  // Función para aplicar filtros desde el modal
  const handleFiltersApply = (newFilters) => {
    setAppliedFilters(newFilters);
    
    // Actualizar filtros en el hook
    updateFilters({
      ...filters,
      ...newFilters,
      page: 1, // Resetear a primera página
    });
  };

  // Función para limpiar filtros del modal
  const handleFiltersClear = () => {
    setAppliedFilters({});
    clearFilters();
  };

  // Función para manejar la eliminación exitosa de un equipo
  const handleEquipmentDeleted = (equipmentId) => {
    // Refrescar la lista de equipos después de eliminar
    refresh();
    // Limpiar el equipo seleccionado
    setSelectedEquipment(null);
  };

  // Abrir documento de calibración más reciente del equipo
  const handleOpenCalibrationDocument = async (equipmentId) => {
    try {
      const response = await httpService.get(`/v1/calibracion`, {
        params: {
          equipo_id: equipmentId,
          per_page: 20,
          order_by: "fecha_calibracion",
          order_direction: "desc"
        }
      });
      const raw = response.data?.data?.data || response.data?.data || response.data;
      const records = Array.isArray(raw) ? raw : (raw?.data ? raw.data : []);
      // Buscar el registro más reciente que tenga archivo
      const calibration = records.find(r => r.file);
      if (calibration && calibration.file) {
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

  // Abrir documento de correctivo más reciente del equipo
  const handleOpenCorrectiveDocument = async (equipmentId) => {
    try {
      const authToken = localStorage.getItem("eva_auth_token") || localStorage.getItem("auth_token");
      let response;
      if (authToken) {
        response = await httpService.get(`/v1/equipos/${equipmentId}/correctivos`);
      } else {
        const fetchResponse = await fetch(
          `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/equipos/${equipmentId}/correctivos`,
          { headers: { Accept: "application/json", "Content-Type": "application/json" } }
        );
        if (!fetchResponse.ok) throw new Error(`Error ${fetchResponse.status}: ${fetchResponse.statusText}`);
        const publicData = await fetchResponse.json();
        if (publicData && publicData.length > 0 && publicData[0].file) {
          window.open(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/storage/${publicData[0].file}`, "_blank");
          return;
        }
        throw new Error('No se encontraron registros de correctivo');
      }
      const data = response.data;
      if (data && data.length > 0 && data[0].file) {
        window.open(`${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/storage/${data[0].file}`, "_blank");
      } else {
        toast.warning("No hay documento de correctivo disponible para este equipo");
      }
    } catch (error) {
      console.error("❌ Error al abrir documento de correctivo:", error);
      toast.error(`Error al acceder al documento de correctivo: ${error.message}`);
    }
  };

  // Handlers
  const handlePageSizeChange = (newSize) => {
    changePageSize(parseInt(newSize));
  };

  // Handle export equipment list (listado completo de equipos)
  const handleExportEquipmentCounts = async () => {
    const toastId = 'export-equipment-industrial';
    try {
      toast.loading('Exportando listado de equipos industriales...', { id: toastId });
      
      const response = await httpService.get('/v1/export/equipment-list', {
        responseType: 'blob',
        params: { type: 'industrial' }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'EquiposIndustrialesHUV.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Listado de equipos industriales exportado exitosamente', { id: toastId });
    } catch (err) {
      console.error('❌ Error exportando listado de equipos:', err);
      toast.error('Error al exportar listado de equipos industriales', { id: toastId });
    }
  };

  // Helper: nombre del equipo industrial con ubicación entre paréntesis
  // Ej: "ASCENSOR (Piso 1)", "CALDERA (Sala de Máquinas)"
  const getIndustrialDisplayName = (equipment) => {
    const name = equipment?.equipo?.name || equipment?.name || "Sin nombre";
    const servicio = equipment?.ubicacion?.servicio || null;
    const area = equipment?.ubicacion?.area || null;
    const localizacion = equipment?.localizacion_actual || null;

    const parts = [];
    if (servicio) parts.push(servicio);
    else if (area) parts.push(area);
    if (localizacion) parts.push(localizacion);

    return parts.length > 0 ? `${name} (${parts.join(' - ')})` : name;
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

  if (isBasicUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ACCESO BLOQUEADO</h2>
          <Badge className="bg-red-100 text-red-800 mb-4 hover:bg-red-200">USUARIO BÁSICO</Badge>
          <p className="text-slate-600 mb-6">
            Su perfil no tiene permisos para visualizar o interactuar con el panel principal de equipos industriales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] from-[#F1F4F6] to-[#1d293d]/5 p-2 sm:p-4 lg:p-6">
      {/* Medical Equipment Management Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
          Sistema de Gestión de Equipos Industriales
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Control y seguimiento integral de equipamiento industrial hospitalario
        </p>
      </div>

      {/* Action Buttons - Ultra Compact Side by Side */}
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-6">
        {/* Main Action Buttons */}
        <PermissionWrapper module="equipos industriales" action="leer">
          <MainActionButtons
            onFilterClick={() => setFilterModalOpen(true)}
            onAddClick={() => setAddModalOpen(true)}
            onCleanNamesClick={() => setCleanNamesModalOpen(true)}
            onExportClick={handleExportEquipmentCounts}
            onClearFiltersClick={handleClearAllFilters}
            activeFiltersCount={activeFiltersCount}
            showClearFilters={true}
            equipmentType="industrial"
          />
        </PermissionWrapper>
        {/* Stats Buttons */}
        <PermissionWrapper module="equipos industriales" action="leer">
          <StatsActionButtons
            onPreventiveClick={() => setPreventiveModalOpen(true)}
            onCalibrationClick={() => setCalibrationModalOpen(true)}
            onCorrectiveClick={() => setCorrectiveModalOpen(true)}
            onParadaEquipoClick={handleExportParadaEquipo}
            equipmentType="industrial"
          />
        </PermissionWrapper>
      </div>
      {/* Main Content Card */}
      <Card className="shadow-none border border-slate-200 bg-white">
        {/* Enhanced Filters Section */}
        <EquipmentFiltersSection
          filters={filters}
          updateFilters={updateFilters}
          activeFiltersCount={activeFiltersCount}
          equipmentType="industrial"
        />

        {/* Results Info */}
        <EquipmentResultsInfo
          loading={loading}
          devices={devices}
          pagination={pagination}
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          equipmentType="industrial"
          onClearAllFilters={handleClearAllFilters}
        />

        {/* Items per page selector */}
        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-2 border-b bg-slate-50">
          <span className="text-xs sm:text-sm text-slate-700">Mostrar</span>
          <Select 
            value={pagination.per_page?.toString() || "15"}
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
                <th className="text-left p-4 text-sm font-semibold text-slate-800 border-r border-slate-200">
                  Equipo Médico
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-800 border-r border-slate-200">
                  Identificación
                </th>

                <th className="text-left p-4 text-sm font-semibold text-slate-800 border-r border-slate-200">
                  Ubicación Hospitalaria
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-800 border-r border-slate-200">
                  Plan de Mantenimiento
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-800">
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
              ) : hasError ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="text-red-600">
                      <p>Error al cargar equipos: {error}</p>
                      <Button onClick={refresh} className="mt-2" size="sm">
                        Reintentar
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : isEmpty ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="text-slate-500">
                      <p>No se encontraron equipos industriales</p>
                      <Button
                        onClick={clearFilters}
                        className="mt-2"
                        size="sm"
                        variant="outline"
                      >
                        Limpiar filtros
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                devices.map((equipment) => (
                  <tr
                    key={equipment.id}
                    className="border-b"
                    onMouseEnter={() => prefetchEquipment(equipment.id)}
                  >
                    {/* Equipment Column */}
                    <td className="p-4 border-r border-slate-200 align-top">
                      <div className="space-y-2 sm:space-y-3">
                        {/* ID del equipo prominente */}
                        <div className="flex items-center justify-between mb-2">
                          <EquipmentIdBadge 
                            equipmentId={equipment.id}
                            variant="secondary"
                            size="sm"
                            showCopyButton={true}
                          />
                        </div>

                        {/* Título del equipo */}
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight mb-1 break-words">
                          {getIndustrialDisplayName(equipment)}
                        </div>

                        {/* Imagen del equipo con efecto hover mejorado */}
                        <EquipmentImageHover
                          equipmentId={equipment.id}
                          equipmentData={equipment.equipo}
                          equipmentName={getIndustrialDisplayName(equipment)}
                          className="w-full h-24 xs:h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44"
                          fallbackImage={notFoundImg}
                          showLoader={true}
                        />

                        {/* Documentos Asociados */}
                        <div className="mt-3 space-y-2">
                          {!!equipment.equipo?.invima_id && equipment.registros_invima?.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-[#1d293d] uppercase tracking-wide">
                                Registro INVIMA
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#1d293d] flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    const registro = equipment.registros_invima[0];
                                    if (registro.archivo_registro_sanitario) {
                                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/registros_sanitarios/${registro.archivo_registro_sanitario}`;
                                      window.open(fileUrl, "_blank");
                                    }
                                  }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-[#1d293d] hover:text-[#2a3b52] hover:underline truncate"
                                >
                                  {equipment.registros_invima[0]?.numero_registro || "Ver Registro"}
                                </button>
                              </div>
                            </div>
                          )}

                          {!!equipment.equipo?.manual_id && equipment.manual && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-green-700 uppercase tracking-wide">
                                Manual
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <button
                                  onClick={() => { if (equipment.manual.url) window.open(equipment.manual.url, "_blank"); }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-green-600 hover:text-green-800 hover:underline truncate"
                                >
                                  {equipment.manual.descripcion || "Ver Manual"}
                                </button>
                              </div>
                            </div>
                          )}

                          {!!equipment.equipo?.guia_id && equipment.guia_rapida && (
                            <div className="space-y-1">
                              <div className="text-[9px] xs:text-[10px] font-semibold text-purple-700 uppercase tracking-wide">
                                Guía Rápida
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <button
                                  onClick={() => {
                                    if (equipment.guia_rapida.file) {
                                      const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/guias/${equipment.guia_rapida.file}`;
                                      window.open(fileUrl, "_blank");
                                    }
                                  }}
                                  className="text-[10px] xs:text-[11px] sm:text-xs text-purple-600 hover:text-purple-800 hover:underline truncate"
                                >
                                  {equipment.guia_rapida.name || "Ver Guía"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Botones de Acciones Rápidas */}
                          <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEquipment(equipment);
                                setContingenciasModalOpen(true);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-[9px] xs:text-[10px] h-7 px-2 flex items-center gap-1"
                              title="Contingencias"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span className="hidden sm:inline">Contingencias</span>
                              {(equipment.cuenta_contingencias > 0 || equipment.contingencias_abiertas > 0) && (
                                <span className="ml-1 bg-white text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                  {equipment.contingencias_abiertas > 0 ? equipment.contingencias_abiertas : equipment.cuenta_contingencias}
                                </span>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEquipment(equipment);
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
                    <td className="p-4 border-r border-slate-200 align-top">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 mb-2">
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            {equipment.equipo?.code || "Sin código"}
                          </Badge>
                          <Files
                            onClick={() => {
                              setSelectedEquipment(equipment);
                              setCopyEquipmentModalOpen(true);
                            }}
                            size={20}
                            color="#CD410E"
                            className="cursor-pointer"
                          />
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-medium">
                            Registro Sanitario:
                          </span>
                          <div className="text-xs bg-slate-100 px-2 py-1 rounded mt-1 border">
                            {equipment.registro?.registro_sanitario_invima ||
                              "Sin registro"}
                          </div>
                        </div>
                        <div className="mt-4 xs:mt-2">
                          <div>
                            <span className="font-medium text-slate-700">
                              Código:
                            </span>
                            <span className="font-medium text-slate-700 ml-1">
                              {equipment.equipo?.code || "SIN CÓDIGO"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">
                              Marca:
                            </span>
                            <span className="font-medium text-slate-700 ml-1">
                              {equipment.equipo?.brand || "SIN MARCA"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">
                              Modelo:
                            </span>
                            <span className="font-medium text-slate-700 ml-1">
                              {equipment.equipo?.model || "SIN MODELO"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">
                              Serie:
                            </span>
                            <span className="font-medium text-slate-700 ml-1">
                              {equipment.equipo?.series || "SIN SERIE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 xs:gap-2">
                            <span className="font-medium text-slate-700">
                              Servicio:
                            </span>
                            <Badge className="bg-[#1d293d]/10 text-[#1d293d] hover:bg-[#1d293d]/15 text-[8px] xs:text-[9px] sm:text-xs border border-[#1d293d]/30">
                              {equipment.ubicacion?.servicio || "SIN SERVICIO"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 xs:gap-2">
                            <span className="font-medium text-slate-700">
                              Estado:
                            </span>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[8px] xs:text-[9px] sm:text-xs border border-green-200">
                              {equipment.data?.status || "SIN ESTADO"}
                            </Badge>
                          </div>
                          {/* Observaciones */}
                          <div className="mt-3 xs:mt-4 pt-2 xs:pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className="bg-[#1d293d]/5 text-[#1d293d] border-[#1d293d]/30 text-[8px] xs:text-[9px] sm:text-xs cursor-pointer hover:bg-[#1d293d]/10"
                                onClick={() => {
                                  setSelectedEquipment(equipment);
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
                                  setSelectedEquipment(equipment);
                                  setAddObservacionModalOpen(true);
                                }}
                              >
                                <Plus className="w-3 h-3 xs:w-4 xs:h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="p-4 border-r border-slate-200 align-top">
                      <div className="text-xs space-y-2 max-w-xs">
                        <div>
                          <span className="font-medium text-slate-700">
                            Servicio:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.ubicacion?.servicio || "Sin servicio"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Área:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.ubicacion?.area || "Sin área"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Sede:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.ubicacion?.sede || "Sin sede"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Clasificación:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.data?.clasificacion ||
                              "Sin clasificación"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Riesgo:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.data?.riesgo || "Sin clasificar"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Estado del equipo:
                          </span>
                          <span className="ml-1 text-slate-900">
                            {equipment.data?.status || "SIN ESTADO"}
                          </span>
                        </div>
                        {equipment.localizacion_actual && (
                          <div>
                            <span className="font-medium text-slate-700">
                              Localización:
                            </span>
                            <span className="ml-1 text-slate-900">
                              {equipment.localizacion_actual}
                            </span>
                          </div>
                        )}

                        {/* Botón de Movimientos */}
                        <div className="mt-2 flex justify-center">
                          <Button
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white w-full"
                            onClick={() => {
                              setSelectedEquipment(equipment);
                              setMovimientosModalOpen(true);
                            }}
                          >
                            <FileStack className="w-3 h-3 mr-1" />
                            Movimientos
                          </Button>
                        </div>

                        <div className="mt-2 xs:mt-3 pt-1 xs:pt-2 border-t border-slate-100">
                          <span className="font-medium text-slate-700">
                            Propietario:
                          </span>
                          <div className="text-[8px] xs:text-[9px] sm:text-xs text-slate-600 leading-tight bg-slate-50 p-1 xs:p-2 rounded border">
                            {typeof equipment.propietario === 'object' 
                              ? equipment.propietario?.nombre || "Sin propietario"
                              : equipment.propietario || equipment.compra?.propietario || "Sin propietario"}
                          </div>
                          
                          {/* Logo del propietario */}
                          {equipment.propietario?.logo_url && (
                            <div className="mt-2 flex justify-center">
                              {/* Caja de dimensiones FIJAS: un logo ancho no debe
                                  ensanchar la celda ni arrastrar toda la tabla. */}
                              <div className="h-12 w-24 sm:h-14 sm:w-28 flex items-center justify-center overflow-hidden">
                                <img
                                  src={equipment.propietario.logo_url}
                                  alt={equipment.propietario?.nombre || equipment.propietario}
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
                    <td className="p-4 border-r border-slate-200 align-top">
                      <div className="text-[9px] xs:text-[10px] sm:text-xs space-y-1 xs:space-y-2 max-w-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-900 font-medium">
                            Mantenimiento Industrial
                          </span>
                          <span className="text-teal-500">🔄</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Último Mantenimiento:
                          </span>
                        </div>
                        <div className="text-slate-600 bg-green-50 p-1 xs:p-2 rounded text-[8px] xs:text-[9px] sm:text-xs border border-green-200 flex justify-between items-center">
                          {equipment.informacion_adicional?.ultimo_mantenimiento
                            ? parseLocalDate(
                                equipment.informacion_adicional.ultimo_mantenimiento
                              )?.toLocaleDateString()
                            : "Sin registro"}
                          <Link
                            size={15}
                            className="cursor-pointer hover:text-teal-600 transition-colors"
                            onClick={() =>
                              handleOpenMaintenanceDocument(equipment.id)
                            }
                            title="Abrir documento de mantenimiento"
                          />
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Última Calibración:
                          </span>
                        </div>
                        <div className="text-slate-600 bg-amber-50 p-1 xs:p-2 rounded text-[8px] xs:text-[9px] sm:text-xs border border-amber-200 flex justify-between items-center">
                          {equipment.informacion_adicional?.ultima_calibracion
                            ? parseLocalDate(
                                equipment.informacion_adicional.ultima_calibracion
                              )?.toLocaleDateString()
                            : "Sin registro"}
                          <Link
                            size={15}
                            className="cursor-pointer hover:text-amber-600 transition-colors"
                            onClick={() => handleOpenCalibrationDocument(equipment.id)}
                            title="Abrir documento de calibración"
                          />
                        </div>
                        <div className="mt-2 xs:mt-3 pt-1 xs:pt-2 border-t border-slate-100 space-y-1 xs:space-y-2">
                          <div>
                            <span className="font-medium text-teal-700">
                              Información de plan de ejecución
                            </span>
                          </div>
                          {equipment.incluido_en_plan > 0 && (
                            <div className="space-y-0.5 xs:space-y-1 text-slate-700 bg-emerald-50 p-1 xs:p-2 rounded border border-emerald-300 mb-2">
                              <div className="font-semibold text-emerald-800 text-[9px] xs:text-[10px] sm:text-xs flex items-center gap-1">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Incluido en Plan {equipment.anio_vigente || 'Vigente'}
                              </div>
                              {equipment.responsable_plan && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                  <span className="font-medium">Responsable:</span>{' '}
                                  <span className="text-emerald-900">{equipment.responsable_plan}</span>
                                </div>
                              )}
                              {equipment.frecuencia_plan && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                  <span className="font-medium">Frecuencia:</span>{' '}
                                  <span className="text-emerald-900">{equipment.frecuencia_plan}</span>
                                </div>
                              )}
                              {(equipment.mes_programado1 || equipment.mes_programado2 || equipment.mes_programado3) && (
                                <div className="text-[8px] xs:text-[9px] sm:text-xs space-y-0.5">
                                  {equipment.mes_programado1 && (
                                    <div>
                                      <span className="font-medium">Fecha 1:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][equipment.mes_programado1 - 1]}
                                      </span>
                                    </div>
                                  )}
                                  {equipment.mes_programado2 && (
                                    <div>
                                      <span className="font-medium">Fecha 2:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][equipment.mes_programado2 - 1]}
                                      </span>
                                    </div>
                                  )}
                                  {equipment.mes_programado3 && (
                                    <div>
                                      <span className="font-medium">Fecha 3:</span>{' '}
                                      <span className="text-emerald-900">
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][equipment.mes_programado3 - 1]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="space-y-0.5 xs:space-y-1 text-slate-600 bg-teal-50 p-1 xs:p-2 rounded border border-teal-200">
                            <div>
                              <div className="font-medium text-slate-700">
                                Último Correctivo General Generado:
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.informacion_adicional
                                  ?.ultimo_correctivo_general
                                  ? parseLocalDate(
                                      equipment.informacion_adicional.ultimo_correctivo_general
                                    )?.toLocaleDateString()
                                  : "Sin registro"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Último Procedimiento Correctivo Realizado:
                                {/* ✓ Verde: Tiene fecha de cierre (correctivo general cerrado exitosamente) */}
                                {equipment.informacion_adicional?.ultimo_procedimiento_correctivo && (
                                  <CheckCircle2 
                                    size={14} 
                                    className="text-green-600" 
                                    title="Correctivo general cerrado exitosamente"
                                  />
                                )}
                                {/* ⏰ Rojo: Tiene fecha de inicio pero NO fecha de cierre (correctivo abierto) */}
                                {equipment.informacion_adicional?.ultimo_correctivo_general && !equipment.informacion_adicional?.ultimo_procedimiento_correctivo && (
                                  <Clock 
                                    size={14} 
                                    className="text-red-600" 
                                    title="Hay un correctivo general abierto sin resolver"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.informacion_adicional
                                  ?.ultimo_procedimiento_correctivo
                                  ? parseLocalDate(
                                      equipment.informacion_adicional.ultimo_procedimiento_correctivo
                                    )?.toLocaleDateString()
                                  : "Sin registro"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Último Ticket:
                                {/* TICKETS: Mostrar reloj si no está cerrado, chulo si está cerrado */}
                                {equipment.informacion_adicional?.fecha_inicio_ultimo_ticket && !equipment.informacion_adicional?.ultimo_ticket_cerrado && (
                                  <Clock 
                                    size={14} 
                                    className="text-[#c33a31]" 
                                    title="Ticket creado pero no cerrado"
                                  />
                                )}
                                {equipment.informacion_adicional?.ultimo_ticket_cerrado && (
                                  <CheckCircle2 
                                    size={14} 
                                    className="text-[#72a836]" 
                                    title="Ticket cerrado/completado"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.informacion_adicional
                                  ?.fecha_inicio_ultimo_ticket
                                  ? parseLocalDate(
                                      equipment.informacion_adicional.fecha_inicio_ultimo_ticket
                                    )?.toLocaleDateString()
                                  : "Sin registro"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 flex items-center gap-1">
                                Fecha de último cierre de tickets:
                                {/* ✓ Verde: Tiene fecha de cierre (ticket cerrado exitosamente) */}
                                {equipment.informacion_adicional?.fecha_ultimo_cierre_ticket && (
                                  <CheckCircle2 
                                    size={14} 
                                    className="text-green-600" 
                                    title="Último ticket cerrado exitosamente"
                                  />
                                )}
                                {/* ⏰ Rojo: Tiene fecha de inicio pero NO fecha de cierre (ticket abierto) */}
                                {equipment.informacion_adicional?.fecha_inicio_ultimo_ticket && !equipment.informacion_adicional?.fecha_ultimo_cierre_ticket && (
                                  <Clock 
                                    size={14} 
                                    className="text-red-600" 
                                    title="Hay un ticket abierto sin resolver"
                                  />
                                )}
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.informacion_adicional?.fecha_ultimo_cierre_ticket
                                  ? parseLocalDate(equipment.informacion_adicional.fecha_ultimo_cierre_ticket)?.toLocaleDateString()
                                  : "Sin registros"}
                              </div>
                            </div>
                            {equipment.cuenta_calibraciones > 0 && (
                            <div>
                              <div className="font-medium text-slate-700">
                                Calibraciones:
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.cuenta_calibraciones}{" "}
                                registros
                              </div>
                            </div>
                            )}
                            {equipment.cuenta_preventivos > 0 && (
                            <div>
                              <div className="font-medium text-slate-700">
                                Preventivos:
                              </div>
                              <div className="text-[8px] xs:text-[9px] sm:text-xs">
                                {equipment.cuenta_preventivos}{" "}
                                mantenimientos
                              </div>
                            </div>
                            )}

                            {/* Purchase Order Section - Ocultar para equipos en comodato (tadquisicion_id=3) */}
                            {String(equipment.tadquisicion_id) !== "3" && (
                            <>
                            <div className="flex items-center gap-1 xs:gap-2">
                              <span className="font-medium text-slate-700">
                                Orden Compra:
                              </span>
                              {equipment.orden_compra ? (
                                <a
                                  href={`${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/ordenes_compra/${equipment.orden_compra_file}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#1d293d] hover:text-[#2a3b52] underline text-[8px] xs:text-[9px] sm:text-xs"
                                >
                                  {equipment.orden_compra}
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
                                {equipment.tipo_compra || "Sin tipo"}
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
                                    setSelectedEquipment(equipment);
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
                                    setSelectedEquipment(equipment);
                                    setAddObservacionModalOpen(true);
                                  }}
                                  title={`Agregar observación${equipment.observaciones?.ultima
                                    ? `\n\nÚltima observación: ${equipment.observaciones.ultima}`
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

                    {/* Actions Column */}
                    <td className="p-1 xs:p-2 sm:p-3 md:p-4 align-top">
                      <RowActionButtons
                        equipment={equipment}
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
                        onObservationClick={(eq) => {
                          setSelectedEquipment(eq);
                          setAddObservacionModalOpen(true);
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
                        equipmentType="industrial"
                        showCopyButton={true}
                      />
                    </td>
                  </tr>
                ))
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
          ) : hasError ? (
            <Card className="p-8 shadow-none">
              <div className="text-center text-red-600">
                <p className="font-semibold">Error al cargar equipos</p>
                <p className="text-sm mt-2">{error}</p>
                <Button onClick={refresh} className="mt-4" size="sm">
                  Reintentar
                </Button>
              </div>
            </Card>
          ) : isEmpty ? (
            <Card className="p-8 shadow-none">
              <div className="text-center text-slate-500">
                <p className="font-semibold">No hay equipos disponibles</p>
                <p className="text-sm mt-2">No se encontraron equipos industriales registrados</p>
                <Button
                  onClick={clearFilters}
                  className="mt-4"
                  size="sm"
                  variant="outline"
                >
                  Limpiar filtros
                </Button>
              </div>
            </Card>
          ) : (
            devices.map((equipment) => (
              <motion.div
                key={equipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onMouseEnter={() => prefetchEquipment(equipment.id)}
              >
                <Card className="overflow-hidden border-l-4 border-l-orange-500 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    {/* ID y Nombre */}
                    <div className="space-y-2">
                      <EquipmentIdBadge 
                        equipmentId={equipment.id}
                        variant="secondary"
                        size="sm"
                        showCopyButton={true}
                      />
                      <h3 className="font-bold text-slate-900 text-base">
                        {getIndustrialDisplayName(equipment)}
                      </h3>
                    </div>

                    {/* Imagen */}
                    <EquipmentImageHover
                      equipmentId={equipment.id}
                      equipmentData={equipment.equipo}
                      equipmentName={getIndustrialDisplayName(equipment)}
                      className="w-full h-48 rounded-lg"
                      fallbackImage={notFoundImg}
                      showLoader={true}
                    />

                    {/* Identificación */}
                    <div className="bg-orange-50 p-3 rounded-lg space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm">Identificación</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-slate-600">Código:</span>
                          <p className="text-slate-900">{equipment.equipo?.code || "Sin código"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Marca:</span>
                          <p className="text-slate-900">{equipment.equipo?.brand || "Sin marca"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Modelo:</span>
                          <p className="text-slate-900">{equipment.equipo?.model || "Sin modelo"}</p>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">Serie:</span>
                          <p className="text-slate-900">{equipment.equipo?.series || "Sin serie"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="bg-[#1d293d]/5 p-3 rounded-lg space-y-2">
                      <h4 className="font-semibold text-slate-700 text-sm">Ubicación</h4>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-medium">Sede:</span> {equipment.ubicacion?.sede || "Sin sede"}</p>
                        <p><span className="font-medium">Servicio:</span> {equipment.ubicacion?.servicio || "Sin servicio"}</p>
                        <p><span className="font-medium">Área:</span> {equipment.ubicacion?.area || "Sin área"}</p>
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">Estado:</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {equipment.data?.status || "Sin estado"}
                        </Badge>
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setSelectedEquipment(equipment); setContingenciasModalOpen(true); }}
                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] h-7 px-2 flex items-center gap-1 flex-1"
                        title="Contingencias"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Contingencias</span>
                        {(equipment.cuenta_contingencias > 0 || equipment.contingencias_abiertas > 0) && (
                          <span className="ml-1 bg-white text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {equipment.contingencias_abiertas > 0 ? equipment.contingencias_abiertas : equipment.cuenta_contingencias}
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setSelectedEquipment(equipment); setCapacitacionesModalOpen(true); }}
                        className="bg-teal-500 hover:bg-teal-600 text-white text-[9px] h-7 px-2 flex items-center gap-1 flex-1"
                        title="Capacitaciones"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Capacitaciones</span>
                      </Button>
                    </div>

                    {/* Acciones */}
                    <div className="pt-3 border-t border-slate-200">
                      <RowActionButtons
                        equipment={equipment}
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
                        onObservationClick={(eq) => {
                          setSelectedEquipment(eq);
                          setAddObservacionModalOpen(true);
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
                        equipmentType="industrial"
                        showCopyButton={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
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
        onFiltersClear={handleFiltersClear}
        currentFilters={appliedFilters}
        equipmentType="industrial"
      />}
      {addModalOpen && <AddEquipmentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        equipmentType="industrial"
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
      {calibrationModalOpen && <CalibrationModal
        open={calibrationModalOpen}
        onOpenChange={setCalibrationModalOpen}
        equipoTipoId={2}
        equipoStatus="activo"
        onSuccess={refresh}
      />}
      {correctiveModalOpen && <CorrectiveModal
        open={correctiveModalOpen}
        onOpenChange={setCorrectiveModalOpen}
        equipmentType="industrial"
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
      {lifeModalOpen && <LifeModal open={lifeModalOpen} onOpenChange={setLifeModalOpen} />}
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
        equipmentType="industrial"
      />}
      {deleteConfirmModalOpen && <DeleteConfirmModal
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        equipment={selectedEquipment}
        onEquipmentDeleted={handleEquipmentDeleted}
        equipmentType="industrial"
      />}
      {migrateTypeModalOpen && <MigrateTypeConfirmModal
        open={migrateTypeModalOpen}
        onOpenChange={setMigrateTypeModalOpen}
        equipment={selectedEquipment}
        equipmentType="industrial"
        onMigrated={() => {
          refresh();
        }}
      />}
      {copyEquipmentModalOpen && <CopyEquipmentModal
        open={copyEquipmentModalOpen}
        onOpenChange={setCopyEquipmentModalOpen}
        equipment={selectedEquipment}
        equipmentType="industrial"
        onEquipmentAdded={refresh}
      />}
      {addObservacionModalOpen && <AddObservacionModal
        isOpen={addObservacionModalOpen}
        onClose={() => setAddObservacionModalOpen(false)}
        equipmentId={selectedEquipment?.id}
        equipmentName={selectedEquipment?.equipo?.name || selectedEquipment?.name || "Equipo sin nombre"}
        onObservationAdded={() => refresh()}
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
      {darBajaEquipoModalOpen && <DarBajaEquipoModal
        open={darBajaEquipoModalOpen}
        onOpenChange={setDarBajaEquipoModalOpen}
        equipo={selectedEquipment}
        onSuccess={() => {
          refresh();
        }}
      />}
    </div>
  );
}

export default IndustrialDevices;
