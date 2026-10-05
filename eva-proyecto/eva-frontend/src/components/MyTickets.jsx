"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Pagination from "@/components/common/Pagination";
import ItemsPerPage from "@/components/common/ItemsPerPage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Filter,
  Plus,
  FileText,
  Users,
  Wrench,
  Eye,
  Calendar,
  Settings,
  Trash2,
  Edit,
  Search,
  Building,
  Cog,
  Truck,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import TicketDetailsModal from "@/components/modals/ticket-details-complete";
import TicketEditModal from "@/components/modals/ticket-edit-full";
import HospitalTicketModal from "@/components/modals/hospital-ticket-modal";
import { TicketsTableSkeleton } from "@/components/skeletons/TicketsTableSkeleton";
import authService from "@/services/authService";
import httpService from "@/services/httpService";


import { sanitizeRichHtml } from "@/utils/sanitizeRichText";
export default function MyTickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isTicketDetailsModalOpen, setIsTicketDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHospitalTicketModalOpen, setIsHospitalTicketModalOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");

  // Estados para datos reales
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  // Estados para ordenamiento
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  // Función para obtener usuario actual del localStorage usando authService
  const getCurrentUser = () => {
    try {
      // Usar authService primero
      const user = authService.getStoredUser();
      if (user) {
        console.log('👤 Usuario encontrado via authService:', user);
        // Intentar diferentes propiedades donde puede estar el ID
        const userId = user.id || user.user_id || user.usuario_id;
        if (userId) {
          console.log('✅ ID de usuario obtenido:', userId);
          return userId;
        }
      }

      // Fallback al método anterior como respaldo
      const userData = localStorage.getItem('eva_user');
      if (userData) {
        const userParsed = JSON.parse(userData);
        console.log('👤 Usuario encontrado via localStorage:', userParsed);
        const userId = userParsed.id || userParsed.user_id || userParsed.usuario_id;
        if (userId) {
          console.log('✅ ID de usuario obtenido (fallback):', userId);
          return userId;
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo usuario actual:', error);
    }
    console.log('❌ No se encontró usuario válido en localStorage');
    return null;
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

      // Obtener usuario actual dinámicamente
      const currentUserId = getCurrentUser();

      // Si no hay usuario actual, mostrar estado vacío
      if (!currentUserId) {
        console.log('❌ No hay usuario actual - mostrando estado sin sesión');
        setTickets([]);
        setTotalPages(1);
        setTotalItems(0);
        setLoading(false);
        return;
      }

      console.log('✅ Usuario actual encontrado:', currentUserId);

      // Preparar parámetros para el endpoint
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        reportante_id: currentUserId, // Filtrar por usuario que reportó el ticket
        sort_by: sortField,
        sort_order: sortOrder
      };

      if (searchTerm) {
        const term = searchTerm.trim();
        // Si el campo de filtro es 'id' o 'all' y el término de búsqueda es un número puro, buscar por ID
        if ((filterField === 'id' || filterField === 'all') && /^\d+$/.test(term)) {
          params.id = term; // Búsqueda exacta por ID
        } else {
          params.search = term;
          if (filterField !== 'all') {
            params.search_field = filterField;
          }
        }
      }

      if (selectedOrigin && selectedOrigin !== 'all') {
        // Filtrar por tipo de equipo (no por origen)
        params.tipo_equipo = selectedOrigin;
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

  // useEffect para cargar datos cuando cambien los filtros (excepto búsqueda de texto)
  useEffect(() => {
    fetchTickets();
  }, [currentPage, itemsPerPage, selectedOrigin, sortField, sortOrder, refreshTrigger]);

  // Función para disparar la búsqueda manualmente (botón o 'Enter')
  const triggerSearch = () => {
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
  };

  const filteredTickets = tickets; // Ya vienen filtrados del backend

  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedOrigin("all");
    setFilterField("all");
    setCurrentPage(1);
    setRefreshTrigger(prev => prev + 1);
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

  // Los tickets ya vienen ordenados y paginados del backend
  const currentTickets = filteredTickets;

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setIsTicketDetailsModalOpen(true);
  };

  const handleEditTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsEditModalOpen(true);
  };

  const handleUpdateTicket = (updatedTicket) => {
    // TODO: Implementar actualización real en el backend
    setIsEditModalOpen(false);
    fetchTickets(); // Recargar datos
  };

  const handleDeleteTicket = (ticketId, ticketDescription) => {
    setTicketToDelete({ id: ticketId, description: ticketDescription });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (ticketToDelete) {
      // TODO: Implementar eliminación real en el backend
      toast.success(`Ticket #${ticketToDelete.id} eliminado correctamente`, {
        duration: 3000
      });
      setShowDeleteDialog(false);
      setTicketToDelete(null);
      fetchTickets(); // Recargar datos
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-auto">
      {/* Main Content */}
      <div className="p-1 sm:p-2 lg:p-4">
        <Card>
          <CardHeader className="p-2 sm:p-3">
            <div>
              <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl">Mis Tickets</CardTitle>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Vea y gestione sus tickets personales
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-2 sm:p-3">
            {/* Action Buttons - Crear Tickets */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
              {/* Equipos Biomédicos Modal */}
              <div className="flex-1 min-w-[220px]">
                <Button
                  onClick={() => { setTicketType('biomedico'); setIsHospitalTicketModalOpen(true); }}
                  className="bg-white/90 border-2 border-blue-200 text-blue-700 hover:bg-blue-500/10 hover:border-blue-400 py-2 sm:py-2.5 px-3 sm:px-4 transition-all duration-200 rounded-2xl w-full h-full"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                    <Building className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">Equipos Biomédicos</div>
                    <div className="text-xs sm:text-sm text-blue-600 truncate">Crea un ticket para equipos médicos y Licenciados</div>
                  </div>
                </Button>
              </div>

              {/* Equipos Industriales Modal */}
              <div className="flex-1 min-w-[220px]">
                <Button
                  onClick={() => { setTicketType('industrial'); setIsHospitalTicketModalOpen(true); }}
                  className="bg-white/90 border-2 border-orange-200 text-orange-700 hover:bg-orange-500/10 hover:border-orange-400 py-2 sm:py-2.5 px-3 sm:px-4 transition-all duration-200 rounded-2xl w-full h-full"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                    <Cog className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">Equipos Industriales</div>
                    <div className="text-xs sm:text-sm text-orange-600 truncate">De uso hospitalario</div>
                  </div>
                </Button>
              </div>

              {/* Infraestructura y Movilidad Modal */}
              <div className="flex-1 min-w-[220px]">
                <Button
                  onClick={() => { setTicketType('infraestructura'); setIsHospitalTicketModalOpen(true); }}
                  className="bg-white/90 border-2 border-green-200 text-green-700 hover:bg-green-500/10 hover:border-green-400 py-2 sm:py-2.5 px-3 sm:px-4 transition-all duration-200 rounded-2xl w-full h-full"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">Infraestructura</div>
                    <div className="text-xs sm:text-sm text-green-600 truncate">Hospitalaria</div>
                  </div>
                </Button>
              </div>
            </div>


            {/* Filters */}
            <div className="mb-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <Label className="text-sm font-medium">Filtrar por</Label>
                  <Select value={filterField} onValueChange={setFilterField}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los campos</SelectItem>
                      <SelectItem value="id">ID del Ticket</SelectItem>
                      <SelectItem value="description">Descripción</SelectItem>
                      <SelectItem value="creadoPor">Creado por</SelectItem>
                      <SelectItem value="asignadoA">Asignado a</SelectItem>
                      <SelectItem value="area">Área</SelectItem>
                      <SelectItem value="equipo">Equipo</SelectItem>
                      <SelectItem value="status">Estado</SelectItem>
                      <SelectItem value="prioridad">Prioridad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="search-input" className="text-sm font-medium">
                    Buscar
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search-input"
                      placeholder={`Buscar ${filterField === 'all' ? 'en todos los campos' : 'por ' + filterField}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') triggerSearch(); }}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={triggerSearch} title="Buscar tickets">
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleClearFilters}
                      className="bg-red-50 border-red-200 hover:bg-red-100 text-red-700"
                      title="Limpiar todos los filtros"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo de Equipo</Label>
                  <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="1">Biomédico</SelectItem>
                      <SelectItem value="2">Industrial</SelectItem>
                      <SelectItem value="3">Infraestructura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {loading ? (
                  "Cargando mis tickets..."
                ) : (
                  `Mostrando ${totalItems} tickets personales`
                )}
              </div>
            </div>

            {/* Items per page selector ARRIBA */}
            <div className="flex justify-start py-2">
              <ItemsPerPage
                value={itemsPerPage}
                onChange={setItemsPerPage}
                disabled={loading}
              />
            </div>

            {/* Loading State con Skeleton */}
            {loading && (
              <TicketsTableSkeleton rows={itemsPerPage} />
            )}

            {/* Empty State - Sin usuario autenticado */}
            {!loading && !getCurrentUser() && (
              <div className="flex flex-col items-center justify-center py-12 text-red-500">
                <Users className="w-12 h-12 mb-4 text-red-300" />
                <h3 className="text-lg font-medium mb-2">Sesión no válida</h3>
                <p className="text-sm">Por favor, inicia sesión para ver tus tickets.</p>
              </div>
            )}

            {/* Empty State - Usuario sin tickets */}
            {!loading && getCurrentUser() && tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No tienes tickets creados</h3>
                <p className="text-sm">Aún no has creado ningún ticket.</p>
              </div>
            )}

            {/* Mobile/Tablet Cards */}
            {!loading && tickets.length > 0 && (
              <div className="block lg:hidden space-y-3 mb-4">
                {currentTickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-gray-900">#{ticket.id}</h3>
                            {getStatusBadge(ticket.estado, ticket.estado_color)}
                          </div>
                          <p className="text-sm text-blue-600 font-medium">{ticket.origen}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTicketClick(ticket)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 mb-3">
                        <p className="text-sm text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(ticket.descripcion) }} />
                        <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                          <div><span className="font-medium">Reportante:</span> {ticket.reportante_nombre}</div>
                          <div><span className="font-medium">Área:</span> {ticket.area_nombre || 'N/A'}</div>
                          <div><span className="font-medium">Servicio:</span> {ticket.servicio_nombre || 'N/A'}</div>
                          <div><span className="font-medium">Sede:</span> {ticket.sede_nombre || 'N/A'}</div>
                          <div><span className="font-medium">Equipo:</span> {ticket.equipo_final}</div>
                          <div><span className="font-medium">Código:</span> {ticket.codigo_final}</div>
                          <div><span className="font-medium">Marca:</span> {ticket.marca_final}</div>
                          <div><span className="font-medium">Modelo:</span> {ticket.modelo_final}</div>
                          <div><span className="font-medium">Serie:</span> {ticket.serie_final}</div>
                          {ticket.equipo_id && (
                            <div><span className="font-medium text-blue-600">🔗 ID Equipo:</span> {ticket.equipo_id}</div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <span className="font-medium mr-1">Fecha:</span>
                            {new Date(ticket.fecha_inicio).toLocaleDateString('es-CO')}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <div>
                            <span className="font-bold text-blue-600">Creado:</span>{' '}
                            <span className="font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleDateString('es-CO')}</span>
                            <div className="font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <div className="flex flex-col items-center min-h-[4rem] justify-start">
                            <Button
                              onClick={() => handleTicketClick(ticket)}
                              className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded w-full h-7"
                              size="sm"
                              title="Ver detalles del ticket"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{ fontSize: '9px' }}>VER</span>
                          </div>

                          {/* <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => handleDeleteTicket(ticket.id, ticket.description)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Eliminar ticket"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>DEL</span>
                        </div> */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Desktop Table */}
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
                              <div className="text-xs text-gray-500">{new Date(ticket.fecha_inicio).toLocaleDateString('es-CO')}</div>
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
                                <div className="flex flex-wrap gap-1 text-xs">
                                  {ticket.equipo_id && (
                                    <span className="text-blue-600 font-medium bg-blue-100 px-1 rounded">🔗ID:{ticket.equipo_id}</span>
                                  )}
                                  {ticket.personalAsociado?.length > 0 && (
                                    <span className="text-purple-600 font-medium">✓P:{ticket.personalAsociado.length}</span>
                                  )}
                                  {ticket.participantes?.length > 0 && (
                                    <span className="text-indigo-600 font-medium">✓Pt:{ticket.participantes.length}</span>
                                  )}
                                  {ticket.cierreData?.firma && (
                                    <span className="text-red-600 font-medium">✓F</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600">
                                <div className="font-medium text-gray-700 mb-1">Reportante:</div>
                                <div className="text-gray-900 truncate">{ticket.reportante_nombre}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="space-y-1">
                              <div className="flex justify-start">
                                {getStatusBadge(ticket.estado, ticket.estado_color)}
                              </div>
                              {ticket.asignado_nombre && (
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div className="font-medium text-gray-700">Asignado a:</div>
                                  <div className="text-blue-600 truncate">{ticket.asignado_nombre}</div>
                                  {ticket.reportante_nombre && (
                                    <div className="text-gray-500 text-[10px] truncate">Por: {ticket.reportante_nombre}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="text-xs text-gray-700">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleDateString('es-CO')}</span>
                              </div>
                              <div className="ml-4 font-bold text-blue-600">{new Date(ticket.created_at || ticket.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </td>
                          <td className="px-2 py-4 bg-orange-25">
                            <div className="flex items-center justify-center gap-1 w-full max-w-[180px]">
                              <div className="flex flex-col items-center min-h-[4rem] justify-start">
                                <Button
                                  onClick={() => handleTicketClick(ticket)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded w-full h-7"
                                  size="sm"
                                  title="Ver detalles del ticket"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">VER</span>
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
                              <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">EDIT</span>
                            </div> */}

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
          </CardContent>
        </Card>
      </div>

      {/* Ticket Details Modal - Read Only en Mis Tickets */}
      <TicketDetailsModal
        isOpen={isTicketDetailsModalOpen}
        onClose={() => setIsTicketDetailsModalOpen(false)}
        ticket={selectedTicket}
        onRefresh={() => selectedTicket && refreshTicketDetails(selectedTicket.id)}
        readOnly={true}
      />



      {/* Ticket Edit Modal */}
      <TicketEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Eliminar Ticket
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Está seguro de que desea eliminar el ticket #{ticketToDelete?.id}?
            </p>
            {ticketToDelete?.description && (
              <p className="text-xs text-gray-500 mb-4 italic">
                "{ticketToDelete.description.substring(0, 100)}..."
              </p>
            )}
            <p className="text-xs text-red-600 font-medium mb-6">
              ⚠️ Esta acción no se puede deshacer
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hospital Ticket Modal */}
      <HospitalTicketModal
        isOpen={isHospitalTicketModalOpen}
        onClose={() => setIsHospitalTicketModalOpen(false)}
        ticketType={ticketType}
        onSuccess={fetchTickets}
      />
    </div>
  );
}