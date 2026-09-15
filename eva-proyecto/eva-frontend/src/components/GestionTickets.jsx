"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import Pagination from "@/components/common/Pagination";
import ItemsPerPage from "@/components/common/ItemsPerPage";
import TicketDetailsModal from "@/components/modals/ticket-details-complete";
import TicketEditModal from "@/components/modals/ticket-edit-full";
import {
  Search,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building,
  Edit,
  Cog,
  Truck,
  X,
  Wrench,
  User,
  Users,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Trash2,
  Download,
} from "lucide-react";
import HospitalTicketModal from "@/components/modals/hospital-ticket-modal";
import { useLocation } from "react-router-dom";
import { TicketsTableSkeleton } from "@/components/skeletons/TicketsTableSkeleton";
import httpService from "@/services/httpService";
import { useSedes } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeRichHtml } from "@/utils/sanitizeRichText";
// import EquiposModal from "@/components/modals/EquiposModal";
// import PersonalModal from "@/components/modals/PersonalModal";
// import ParticipantesModal from "@/components/modals/ParticipantesModal";
// import CierreModal from "@/components/modals/CierreModal";

export default function GestionTickets() {
  // Hook para obtener sedes de la BD
  const { sedes, loading: sedesLoading } = useSedes();
  const { user } = useAuth();

  // Determinar qué subprocesos puede ver el usuario según su empresa
  // (misma lógica que el backend en gestion-tickets)
  const userEmpresaId = user?.id_empresa ? parseInt(user.id_empresa) : null;
  const canSeeIndustrial = ![3, 6].includes(userEmpresaId);
  const canSeeInfraestructura = ![3, 6].includes(userEmpresaId);

  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTiposEquipo, setSelectedTiposEquipo] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isHospitalTicketModalOpen, setIsHospitalTicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");

  // Estados para datos reales
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filtros adicionales para gestión
  // El inicio puede llegar con un estado preseleccionado (p. ej. «Esperando cierre»).
  const location = useLocation();
  const [estadoFilter, setEstadoFilter] = useState(() => location.state?.estado ?? "all");
  const [sedeFilter, setSedeFilter] = useState("all");
  const [reportanteFilter, setReportanteFilter] = useState("all");

  // Estados para ordenamiento
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  const getStatusBadge = (status, color) => {
    const colorClasses = {
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge className={`${colorClasses[color] || colorClasses.gray} border text-xs`}>
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority, color) => {
    const colorClasses = {
      red: "bg-red-500 text-white border-red-600",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      green: "bg-green-100 text-green-800 border-green-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge className={`${colorClasses[color] || colorClasses.gray} border text-xs`}>
        {priority}
      </Badge>
    );
  };

  // Función para recargar detalles de un ticket específico
  const refreshTicketDetails = async (ticketId) => {
    try {
      console.log('🔄 Recargando detalles del ticket:', ticketId);
      const response = await httpService.get(`/v1/gestion-tickets/${ticketId}`);

      if (response.data.success) {
        const updatedTicket = response.data.data;
        console.log('📊 Datos del ticket recibidos:', {
          id: updatedTicket.id,
          total_avances: updatedTicket.total_avances,
          avances_count: updatedTicket.avances?.length || 0,
          avances: updatedTicket.avances
        });
        // Actualizar el ticket seleccionado
        setSelectedTicket(updatedTicket);
        // También actualizar en la lista de tickets
        setTickets(prevTickets =>
          prevTickets.map(t => t.id === ticketId ? updatedTicket : t)
        );
        console.log('✅ Ticket actualizado exitosamente');
      }
    } catch (error) {
      console.error('❌ Error recargando ticket:', error);
    }
  };

  // Función para obtener tickets reales del API
  const fetchTickets = async () => {
    try {
      setLoading(true);

      // Preparar parámetros para el endpoint
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        sort_by: sortField,
        sort_order: sortOrder
      };

      if (searchTerm) {
        const term = searchTerm.trim();
        // Si el término de búsqueda es un número puro, hacer búsqueda exacta por ID
        if (/^\d+$/.test(term)) {
          params.id = term; // Búsqueda exacta por ID
        } else {
          params.search = term; // Búsqueda en todos los campos
        }
      }

      if (selectedTiposEquipo && selectedTiposEquipo.length > 0) {
        // Enviar tipos de equipo como string separado por comas
        params.tipo_equipo = selectedTiposEquipo.join(',');
      }

      if (estadoFilter && estadoFilter !== 'all') {
        params.estado = estadoFilter;
      }

      if (sedeFilter && sedeFilter !== 'all') {
        params.sede_id = sedeFilter; // Filtrar por sede del equipo (equipos.servicio.sede_id)
      }

      if (reportanteFilter && reportanteFilter !== 'all' && reportanteFilter.trim() !== '') {
        params.reportante_nombre = reportanteFilter;
      }

      console.log('🔍 Obteniendo tickets con parámetros:', params);

      // Usar httpService que maneja autenticación automáticamente
      const response = await httpService.get('/v1/gestion-tickets', { params });

      if (response.data.success) {
        const ticketsData = response.data.data.data || [];
        console.log('✅ Tickets obtenidos:', ticketsData.length);

        setTickets(ticketsData);
        setTotalPages(response.data.data.total_pages || 1);
        setTotalItems(response.data.data.total || 0);
      } else {
        console.error('❌ Error en respuesta:', response.data.message);
        setTickets([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('❌ Error obteniendo tickets:', error);
      const errorMsg = error.response?.data?.message || error.message;
      console.error('Detalles del error:', errorMsg);

      setTickets([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Cargar tickets al montar el componente y cuando cambien los filtros (excepto búsqueda de texto)
  useEffect(() => {
    fetchTickets();
  }, [currentPage, itemsPerPage, selectedTiposEquipo, estadoFilter, sedeFilter, reportanteFilter, sortField, sortOrder, refreshTrigger]);

  // Función para disparar la búsqueda manualmente (botón o 'Enter')
  const triggerSearch = () => {
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
  };

  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedTiposEquipo([]);
    setEstadoFilter("all");
    setSedeFilter("all");
    setReportanteFilter("all");
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
  };

  // Helper para obtener el label de un tipo de equipo
  const getTipoEquipoLabel = (id) => {
    const tipos = {
      "1": "Biomédico",
      "2": "Industrial",
      "3": "Infraestructura",
    };
    return tipos[id] || id;
  };

  const handleExportIndustrialStats = async () => {
    try {
      const response = await httpService.get('/v1/export-industrial-tickets', {
        responseType: 'blob' // Important for downloading files
      });
      // Crear URL para el blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const year = new Date().getFullYear();
      link.setAttribute('download', `Consolidado_Tickets_Industriales_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error al descargar el consolidado:', error);
    }
  };

  const handleExportInfraestructuraStats = async () => {
    try {
      const response = await httpService.get('/v1/export-infraestructura-tickets', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const year = new Date().getFullYear();
      link.setAttribute('download', `Consolidado_Tickets_Infraestructura_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error al descargar el consolidado de infraestructura:', error);
    }
  };

  // Función para ordenar columnas (ahora ordena en el backend)
  const handleSort = (field) => {
    if (sortField === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo nuevo, ordenar ascendente
      setSortField(field);
      setSortOrder("asc");
    }
    // Volver a la primera página al ordenar
    setCurrentPage(1);
  };

  // Los tickets ya vienen ordenados y paginados del backend
  const currentTickets = tickets;

  const openDocumentModal = (ticket) => {
    setSelectedTicket(ticket);
    setIsDocumentModalOpen(true);
  };

  const closeDocumentModal = () => {
    setIsDocumentModalOpen(false);
    setSelectedTicket(null);
  };

  const handleEditTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsEditModalOpen(true);
  };

  const handleUpdateTicket = (updatedTicket) => {
    // Actualizar ticket y recargar datos
    fetchTickets();
    setIsEditModalOpen(false);
  };

  // Mobile Card Component
  const TicketCard = ({ ticket }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900">#{ticket.id}</h3>
              {getStatusBadge(ticket.estado, ticket.estado_color)}
            </div>
            <p className="text-xs sm:text-sm text-blue-600 font-medium">{ticket.origen}</p>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => openDocumentModal(ticket)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Ver detalles del ticket"
              >
                <FolderOpen className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{ fontSize: '9px' }}>VER</span>
            </div>
            {/* <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => handleEditTicket(ticket)}
                className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Editar ticket"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>EDIT</span>
            </div> */}




          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-sm text-gray-600">
            <p className="text-xs sm:text-sm font-medium text-gray-800" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(ticket.descripcion) }} />
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
            <div><span className="font-medium">Reportante:</span> {ticket.reportante_nombre}</div>
            <div><span className="font-medium">Área:</span> {ticket.area_nombre || 'N/A'}</div>
            <div><span className="font-medium">Sede:</span> {ticket.sede_nombre || 'N/A'}</div>
            <div><span className="font-medium">Servicio:</span> {ticket.servicio_nombre || 'N/A'}</div>
            <div><span className="font-medium">Equipo:</span> {ticket.equipo_final}</div>
            <div><span className="font-medium">Código:</span> {ticket.codigo_final}</div>
            <div><span className="font-medium">Marca:</span> {ticket.marca_final}</div>
            <div><span className="font-medium">Modelo:</span> {ticket.modelo_final}</div>
            <div><span className="font-medium">Serie:</span> {ticket.serie_final}</div>
            {ticket.equipo_id && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-blue-600">🔗 ID Equipo:</span> {ticket.equipo_id}
                {ticket.repuesto_pendiente && (
                  <Wrench className="h-3 w-3 text-red-600" />
                )}
              </div>
            )}
            {ticket.repuesto_pendiente && (
              <div><span className="font-medium text-orange-600">⚠️ RP</span> Repuesto pendiente</div>
            )}
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
              <span className="font-medium mr-1">Fecha:</span>
              {new Date(ticket.fecha_inicio).toLocaleDateString('es-CO')}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="text-xs  text-blue-600 font-bold">
            <Calendar className="h-3 w-3 inline mr-1" />
            {new Date(ticket.created_at || ticket.fecha_inicio).toLocaleDateString('es-CO')}
            <span className="block ml-4 font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-1 sm:p-2 md:p-3 lg:p-4 space-y-2 sm:space-y-3 bg-gray-50 min-h-screen overflow-x-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
              Gestión de Tickets
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
              Administre y supervise todos los tickets del sistema
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {canSeeIndustrial && (
            <Button
              onClick={handleExportIndustrialStats}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center justify-center gap-2 px-4 py-2 text-sm w-full sm:w-auto transition-colors rounded-xl"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Industriales</span>
            </Button>
            )}
            {canSeeInfraestructura && (
            <Button
              onClick={handleExportInfraestructuraStats}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 px-4 py-2 text-sm w-full sm:w-auto transition-colors rounded-xl"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Infraestructura</span>
            </Button>
            )}
          </div>
        </div>

        {/* Search and Filter - Refactorizado */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Estado */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Estado</Label>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="1">Abierto</option>
                <option value="2">Asignado</option>
                <option value="3">Diagnosticado</option>
                <option value="4">Cerrado</option>
                <option value="5">Esperando cierre</option>
              </select>
            </div>

            {/* Sede */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Sede</Label>
              <select
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={sedesLoading}
              >
                <option value="all">Todas las sedes</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id.toString()}>
                    {sede.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reportante */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Reportante</Label>
              <Input
                placeholder="Nombre del reportante"
                value={reportanteFilter === 'all' ? '' : reportanteFilter}
                onChange={(e) => setReportanteFilter(e.target.value || 'all')}
                className="text-sm h-10"
                type="text"
              />
            </div>

            {/* Buscar */}
            <div>
              <Label htmlFor="search-input" className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="search-input"
                  placeholder="Buscar por ID, descripción, equipo, área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') triggerSearch(); }}
                  className="pr-12 h-10"
                />
                <Button 
                  onClick={triggerSearch} 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  title="Buscar"
                >
                  <Search className="text-gray-500 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tipo de Equipo - Multi-select con checkboxes */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Equipo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-auto py-2.5 px-3 text-sm"
                  >
                    <span className="truncate">
                      {selectedTiposEquipo.length === 0
                        ? "Todos los tipos"
                        : selectedTiposEquipo.length === 1
                        ? getTipoEquipoLabel(selectedTiposEquipo[0])
                        : `${selectedTiposEquipo.length} tipos seleccionados`}
                    </span>
                    <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Seleccionar Tipos
                    </div>
                    {[
                      { id: "1", label: "Biomédico" },
                      { id: "2", label: "Industrial" },
                      { id: "3", label: "Infraestructura" },
                    ].map((tipo) => (
                      <div key={tipo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tipo-${tipo.id}`}
                          checked={selectedTiposEquipo.includes(tipo.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTiposEquipo([...selectedTiposEquipo, tipo.id]);
                            } else {
                              setSelectedTiposEquipo(
                                selectedTiposEquipo.filter((t) => t !== tipo.id)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`tipo-${tipo.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {tipo.label}
                        </label>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSelectedTiposEquipo([])}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpiar selección
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="bg-red-50 border-red-200 hover:bg-red-100 text-red-700 px-4"
              title="Limpiar todos los filtros"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </div>

        {/* Items per Page Select */}
        <div className="flex justify-start mt-4 px-1">
          <ItemsPerPage
            value={itemsPerPage}
            onChange={setItemsPerPage}
            disabled={loading}
          />
        </div>

        {/* Records Count */}
        <div className="text-xs sm:text-sm text-gray-600">
          {loading ? (
            "Cargando tickets..."
          ) : (
            `Mostrando ${totalItems} tickets del sistema (todos los usuarios)`
          )}
        </div>

        {/* Loading State con Skeleton */}
        {loading && (
          <TicketsTableSkeleton rows={itemsPerPage} />
        )}

        {/* Empty State */}
        {!loading && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FolderOpen className="w-12 h-12 mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No hay tickets</h3>
            <p className="text-sm">No se encontraron tickets con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Mobile/Tablet View - Cards */}
      {!loading && tickets.length > 0 && (
        <div className="block lg:hidden">
          <div className="space-y-4">
            {currentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      {/* Desktop View - Table */}
      {!loading && tickets.length > 0 && (
        <div className="hidden lg:block border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="w-24 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      Ticket
                      {sortField === 'id' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="w-64 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('descripcion')}
                  >
                    <div className="flex items-center gap-1">
                      Descripción
                      {sortField === 'descripcion' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignación</th>
                  <th
                    className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('estado_id')}
                  >
                    <div className="flex items-center gap-1">
                      Estado
                      {sortField === 'estado_id' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="w-28 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Fecha Creación
                      {sortField === 'created_at' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="w-24 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3 align-top">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-900 truncate">#{ticket.id}</div>
                        <div className="text-xs text-blue-600 font-medium truncate">{ticket.origen}</div>
                        <div className="text-xs text-blue-600 font-bold">{new Date(ticket.fecha_inicio).toLocaleDateString('es-CO')}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-900 font-medium leading-tight" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(ticket.descripcion) }} />
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="truncate"><span className="font-medium">Área:</span> {ticket.area_nombre || 'N/A'}</div>
                          <div className="truncate"><span className="font-medium">Servicio:</span> {ticket.servicio_nombre || 'N/A'}</div>
                          <div className="truncate"><span className="font-medium">Equipo:</span> {ticket.equipo_final}</div>
                          <div className="truncate"><span className="font-medium">Código:</span> {ticket.codigo_final}</div>
                          <div className="truncate"><span className="font-medium">Marca:</span> {ticket.marca_final} | <span className="font-medium">Modelo:</span> {ticket.modelo_final}</div>
                          <div className="truncate"><span className="font-medium">Serie:</span> {ticket.serie_final}</div>
                          <div className="truncate"><span className="font-medium">Última Localización:</span> {ticket.localizacion_actual || 'N/A'}</div>
                          <div className="truncate"><span className="font-medium">Responsable Mant.:</span> {ticket.responsable_mantenimiento || 'N/A'}</div>
                          <div className="truncate"><span className="font-medium">Estado Equipo:</span> {ticket.estado_equipo_nombre || 'N/A'}</div>
                          <div className="flex flex-wrap gap-1 text-xs items-center">
                            {ticket.equipo_id && (
                              <span className="text-blue-600 font-medium bg-blue-100 px-1 rounded">🔗ID:{ticket.equipo_id}</span>
                            )}
                            {ticket.repuesto_pendiente && (
                              <span className="text-red-600 bg-red-50 px-1 rounded flex items-center gap-0.5" title="Repuesto pendiente">
                                <Wrench className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-gray-700">Reportante:</div>
                          <div className="text-gray-900 truncate">{ticket.reportante_nombre}</div>
                        </div>
                        {ticket.asignado_nombre && (
                          <div className="text-xs text-gray-600 mt-2">
                            <div className="font-medium text-gray-700">Asignado:</div>
                            <div className="text-blue-600 truncate">{ticket.asignado_nombre}</div>
                          </div>
                        )}
                        {ticket.usuario_asigno_nombre ? (
                          <div className="text-xs text-gray-600 mt-2">
                            <div className="font-medium text-gray-700">Asignado por:</div>
                            <div className="text-gray-900 truncate">
                              {`${ticket.usuario_asigno_nombre} ${ticket.usuario_asigno_apellido || ''}`.trim()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-2 italic">
                            Aún no ha sido asignado
                          </div>
                        )}
                        {ticket.empresa_nombre && (
                          <div className="text-xs text-gray-600 mt-2">
                            <div className="font-medium text-gray-700">Asignado a:</div>
                            <div className="text-purple-600 truncate">{ticket.empresa_nombre}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      {getStatusBadge(ticket.estado, ticket.estado_color)}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="text-xs text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleDateString('es-CO')}</span>
                        </div>
                        <div className="ml-4 font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-center">
                        <Button
                          onClick={() => openDocumentModal(ticket)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                          size="sm"
                          title="Ver detalles del ticket"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        loading={loading}
      />

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        isOpen={isDocumentModalOpen}
        onClose={closeDocumentModal}
        ticket={selectedTicket}
        onRefresh={() => selectedTicket && refreshTicketDetails(selectedTicket.id)}
      />

      {/* Hospital Ticket Modal */}
      <HospitalTicketModal
        isOpen={isHospitalTicketModalOpen}
        onClose={() => setIsHospitalTicketModalOpen(false)}
        ticketType={ticketType}
      />

      {/* Ticket Edit Modal */}
      <TicketEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />

      {/* Equipos Modal - Próximamente */}
      {/* <EquiposModal
        isOpen={isEquiposModalOpen}
        onClose={() => setIsEquiposModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      /> */}

      {/* Personal Modal - Próximamente */}
      {/* <PersonalModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      /> */}

      {/* Participantes Modal - Próximamente */}
      {/* <ParticipantesModal
        isOpen={isParticipantesModalOpen}
        onClose={() => setIsParticipantesModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      /> */}

      {/* Cierre Modal - Próximamente */}
      {/* <CierreModal
        isOpen={isCierreModalOpen}
        onClose={() => setIsCierreModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      /> */}
    </div>
  );
}