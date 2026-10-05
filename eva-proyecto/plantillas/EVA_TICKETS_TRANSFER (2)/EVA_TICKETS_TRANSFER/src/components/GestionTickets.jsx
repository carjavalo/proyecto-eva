"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTickets } from "../context/TicketsContext";
import TicketDetailsModal from "./modals/tickets/ticket-details-complete";
import TicketEditModal from "./modals/tickets/ticket-edit-full";
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
} from "lucide-react";
import HospitalTicketModal from "./modals/tickets/hospital-ticket-modal";
import EquiposModal from "./modals/tickets/EquiposModal";
import PersonalModal from "./modals/tickets/PersonalModal";
import ParticipantesModal from "./modals/tickets/ParticipantesModal";
import CierreModal from "./modals/tickets/CierreModal";

export default function GestionTickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isHospitalTicketModalOpen, setIsHospitalTicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEquiposModalOpen, setIsEquiposModalOpen] = useState(false);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isParticipantesModalOpen, setIsParticipantesModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");

  const { filterTickets, updateTicket } = useTickets();

  // Usuario actual simulado - en producción vendría de autenticación
  const currentUser = "Administrador"; // Usuario con permisos de gestión
  const userRole = "admin"; // admin, biomedico, industrial, infraestructura
  const [roleFilter, setRoleFilter] = useState("all");

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "cerrado":
      case "completado":
        return "bg-green-100 text-green-800 border-green-200";
      case "en proceso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pendiente":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case "crítica":
        return "bg-red-500 text-white border-red-600";
      case "alta":
        return "bg-red-100 text-red-800 border-red-200";
      case "media":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "baja":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  let filteredTickets = filterTickets(searchTerm, selectedOrigin, filterField);
  
  // Filtro adicional por rol de usuario
  if (roleFilter !== "all") {
    filteredTickets = filteredTickets.filter(ticket => ticket.tipo === roleFilter);
  }
  
  filteredTickets = filteredTickets.map(ticket => ({
    ...ticket,
    origen: ticket.origin,
    descripcion: ticket.description,
    fechaCreacion: `${ticket.date} ${ticket.time}`,
    estado: ticket.status
  }));

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = filteredTickets.slice(startIndex, endIndex);

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
    updateTicket(updatedTicket);
    setIsEditModalOpen(false);
    setIsEquiposModalOpen(false);
    setIsPersonalModalOpen(false);
    setIsParticipantesModalOpen(false);
    setIsCierreModalOpen(false);
    // Forzar re-render de la tabla
    setCurrentPage(currentPage);
  };

  // Mobile Card Component
  const TicketCard = ({ ticket }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900">#{ticket.id}</h3>
              <Badge className={`${getStatusColor(ticket.estado)} border text-xs`}>
                {ticket.estado}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-blue-600 font-medium">{ticket.origen}</p>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2">
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => openDocumentModal(ticket)}
                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Ver detalles del ticket"
              >
                <FolderOpen className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>VER</span>
            </div>
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => handleEditTicket(ticket)}
                className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Editar ticket"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>EDIT</span>
            </div>
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => { setSelectedTicket(ticket); setIsEquiposModalOpen(true); }}
                className="bg-green-500 hover:bg-green-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Asociar equipos"
              >
                <Wrench className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>EQU</span>
              {ticket.equiposAsociados?.length > 0 && (
                <span className="text-xs text-green-600 font-bold mt-1">{ticket.equiposAsociados.length}</span>
              )}
            </div>
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => { setSelectedTicket(ticket); setIsPersonalModalOpen(true); }}
                className="bg-purple-500 hover:bg-purple-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Asociar personal"
              >
                <User className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>PER</span>
              {ticket.personalAsociado?.length > 0 && (
                <span className="text-xs text-purple-600 font-bold mt-1">{ticket.personalAsociado.length}</span>
              )}
            </div>
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => { setSelectedTicket(ticket); setIsParticipantesModalOpen(true); }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Agregar participantes"
              >
                <Users className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>PAR</span>
              {ticket.participantes?.length > 0 && (
                <span className="text-xs text-indigo-600 font-bold mt-1">{ticket.participantes.length}</span>
              )}
            </div>
            <div className="flex flex-col items-center min-h-[4rem] justify-start">
              <Button
                onClick={() => { setSelectedTicket(ticket); setIsCierreModalOpen(true); }}
                className="bg-red-500 hover:bg-red-600 text-white p-1 rounded w-full h-7"
                size="sm"
                title="Estados y cierre"
              >
                <CheckCircle className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 font-medium text-center leading-none mt-1" style={{fontSize: '9px'}}>CER</span>
              {ticket.cierreData?.firma && (
                <span className="text-xs text-red-600 font-bold mt-1">✓</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-sm text-gray-600">
            <p className="text-xs sm:text-sm font-medium text-gray-800">{ticket.descripcion}</p>
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
            <div><span className="font-medium">Creado por:</span> {ticket.creadoPor}</div>
            <div><span className="font-medium">Asignado a:</span> {ticket.asignadoA}</div>
            <div><span className="font-medium">Área:</span> {ticket.area}</div>
            <div><span className="font-medium">Equipo:</span> {ticket.equipo}</div>
            {ticket.equiposAsociados?.length > 0 && (
              <div><span className="font-medium text-green-600">✓ Equipos:</span> {ticket.equiposAsociados.length} asociados</div>
            )}
            {ticket.personalAsociado?.length > 0 && (
              <div><span className="font-medium text-purple-600">✓ Personal:</span> {ticket.personalAsociado.length} asociados</div>
            )}
            {ticket.participantes?.length > 0 && (
              <div><span className="font-medium text-indigo-600">✓ Participantes:</span> {ticket.participantes.length} agregados</div>
            )}
            {ticket.cierreData?.firma && (
              <div><span className="font-medium text-red-600">✓ Firmado</span></div>
            )}
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-gray-400" />
              <span className="font-medium mr-1">Fecha:</span>
              {ticket.fechaCreacion}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge className={`${getPriorityColor(ticket.prioridad)} border text-xs`}>
            {ticket.prioridad}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-1 sm:p-2 md:p-3 lg:p-4 space-y-2 sm:space-y-3 bg-gray-50 min-h-screen overflow-x-auto">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
            Gestión de Tickets
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
            Administre y supervise todos los tickets del sistema
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {/* Equipos Biomédicos Modal */}
          <Button
            onClick={() => { setTicketType('biomedico'); setIsHospitalTicketModalOpen(true); }}
            className="bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 py-3 sm:py-4 lg:py-6 px-3 sm:px-6 lg:px-8 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg w-full xl:w-auto"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
              <Building className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="text-left min-w-0">
              <div className="font-semibold text-sm sm:text-base truncate">Equipos Biomédicos</div>
              <div className="text-xs sm:text-sm text-blue-600 truncate">Médicos y Licenciados</div>
            </div>
          </Button>

          {/* Equipos Industriales Modal */}
          <Button
            onClick={() => { setTicketType('industrial'); setIsHospitalTicketModalOpen(true); }}
            className="bg-white border-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 py-3 sm:py-4 lg:py-6 px-3 sm:px-6 lg:px-8 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg w-full xl:w-auto"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
              <Cog className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div className="text-left min-w-0">
              <div className="font-semibold text-sm sm:text-base truncate">Equipos Industriales</div>
              <div className="text-xs sm:text-sm text-orange-600 truncate">De uso hospitalario</div>
            </div>
          </Button>

          {/* Infraestructura y Movilidad Modal */}
          <Button
            onClick={() => { setTicketType('infraestructura'); setIsHospitalTicketModalOpen(true); }}
            className="bg-white border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 py-3 sm:py-4 lg:py-6 px-3 sm:px-6 lg:px-8 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg w-full xl:w-auto"
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

        {/* Search and Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <Label className="text-sm font-medium text-gray-700">Tipo de Vista</Label>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">Todos los Tipos</option>
              <option value="biomedico">Solo Biomédicos</option>
              <option value="industrial">Solo Industriales</option>
              <option value="infraestructura">Solo Infraestructura</option>
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Filtrar por</Label>
            <select 
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="mt-1 appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">Todos los campos</option>
              <option value="id">ID del Ticket</option>
              <option value="description">Descripción</option>
              <option value="creadoPor">Creado por</option>
              <option value="asignadoA">Asignado a</option>
              <option value="area">Área</option>
              <option value="equipo">Equipo</option>
              <option value="status">Estado</option>
              <option value="prioridad">Prioridad</option>
            </select>
          </div>
          <div>
            <Label htmlFor="search-input" className="text-sm font-medium text-gray-700">
              Buscar
            </Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  id="search-input"
                  placeholder={`Buscar ${filterField === 'all' ? 'en todos los campos' : 'por ' + filterField}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedOrigin("all");
                  setFilterField("all");
                  setRoleFilter("all");
                }}
                title="Borrar filtros"
                className="px-3"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Origen</Label>
            <select 
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="mt-1 appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="all">Todos los orígenes</option>
              <option value="biomedico">HUV Biomédico</option>
              <option value="industrial">HUV Industrial</option>
              <option value="infraestructura">Infraestructura</option>
            </select>
          </div>
        </div>

        {/* Records Count */}
        <div className="text-xs sm:text-sm text-gray-600">
          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredTickets.length)} de {filteredTickets.length}
        </div>
      </div>

      {/* Mobile/Tablet View - Cards */}
      <div className="block lg:hidden">
        <div className="space-y-4">
          {currentTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>

      {/* Desktop View - Table */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse border border-gray-300">
              <thead className="bg-gray-100 border-b-2 border-gray-400">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-blue-50">
                    TICKET
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-green-50">
                    DESCRIPCIÓN & DETALLES
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-purple-50">
                    ASIGNACIÓN
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-yellow-50">
                    ESTADO
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-red-50">
                    PRIORIDAD
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider bg-orange-50">
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 transition-colors border-b border-gray-200"
                  >
                    <td className="px-3 py-4 border-r border-gray-300 bg-blue-25">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-gray-900">#{ticket.id}</div>
                        <div className="text-xs text-blue-600 font-medium truncate">{ticket.origen}</div>
                        <div className="text-xs text-gray-500">{ticket.fechaCreacion}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-300 bg-green-25 max-w-md">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 font-medium line-clamp-2">
                          {ticket.descripcion}
                        </div>
                        <div className="text-xs text-gray-600">
                          <div><span className="font-medium">Área:</span> {ticket.area}</div>
                          <div><span className="font-medium">Equipo:</span> {ticket.equipo}</div>
                          <div className="flex flex-wrap gap-1 text-xs mt-1">
                            {ticket.equiposAsociados?.length > 0 && (
                              <span className="text-green-600 font-medium bg-green-100 px-1 rounded">✓E:{ticket.equiposAsociados.length}</span>
                            )}
                            {ticket.personalAsociado?.length > 0 && (
                              <span className="text-purple-600 font-medium bg-purple-100 px-1 rounded">✓P:{ticket.personalAsociado.length}</span>
                            )}
                            {ticket.participantes?.length > 0 && (
                              <span className="text-indigo-600 font-medium bg-indigo-100 px-1 rounded">✓Pt:{ticket.participantes.length}</span>
                            )}
                            {ticket.cierreData?.firma && (
                              <span className="text-red-600 font-medium bg-red-100 px-1 rounded">✓F</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-300 bg-purple-25">
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-gray-700">Creado por:</div>
                          <div className="text-gray-900 truncate">{ticket.creadoPor}</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-gray-700">Asignado a:</div>
                          <div className="text-gray-900 truncate">{ticket.asignadoA}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-300 bg-yellow-25 text-center">
                      <Badge className={`${getStatusColor(ticket.estado)} border text-xs`}>
                        {ticket.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 border-r border-gray-300 bg-red-25 text-center">
                      <Badge className={`${getPriorityColor(ticket.prioridad)} border text-xs`}>
                        {ticket.prioridad}
                      </Badge>
                    </td>
                    <td className="px-2 py-4 bg-orange-25">
                      <div className="grid grid-cols-3 gap-1 w-full max-w-[180px]">
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => openDocumentModal(ticket)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Ver detalles del ticket"
                          >
                            <FolderOpen className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">VER</span>
                        </div>
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => handleEditTicket(ticket)}
                            className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Editar ticket"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">EDIT</span>
                        </div>
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => { setSelectedTicket(ticket); setIsEquiposModalOpen(true); }}
                            className="bg-green-500 hover:bg-green-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Asociar equipos"
                          >
                            <Wrench className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">EQU</span>
                          {ticket.equiposAsociados?.length > 0 && (
                            <span className="text-xs text-green-600 font-bold mt-1">{ticket.equiposAsociados.length}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => { setSelectedTicket(ticket); setIsPersonalModalOpen(true); }}
                            className="bg-purple-500 hover:bg-purple-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Asociar personal"
                          >
                            <User className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">PER</span>
                          {ticket.personalAsociado?.length > 0 && (
                            <span className="text-xs text-purple-600 font-bold mt-1">{ticket.personalAsociado.length}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => { setSelectedTicket(ticket); setIsParticipantesModalOpen(true); }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Agregar participantes"
                          >
                            <Users className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">PAR</span>
                          {ticket.participantes?.length > 0 && (
                            <span className="text-xs text-indigo-600 font-bold mt-1">{ticket.participantes.length}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-center min-h-[4rem] justify-start">
                          <Button
                            onClick={() => { setSelectedTicket(ticket); setIsCierreModalOpen(true); }}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded w-full h-7"
                            size="sm"
                            title="Estados y cierre"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-gray-700 font-medium text-center leading-tight mt-2">CER</span>
                          {ticket.cierreData?.firma && (
                            <span className="text-xs text-red-600 font-bold mt-1">✓</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
            <span>
              Mostrando {startIndex + 1} a{" "}
              {Math.min(endIndex, filteredTickets.length)} de{" "}
              {filteredTickets.length} registros
            </span>
          </div>
          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border-gray-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>

            <div className="flex items-center space-x-1">
              {/* Mobile: Show only current page and total */}
              <div className="block sm:hidden">
                <span className="text-xs text-gray-600">
                  {currentPage} / {totalPages}
                </span>
              </div>

              {/* Desktop: Show page numbers */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`text-xs px-2 ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="border-gray-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Siguiente</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        isOpen={isDocumentModalOpen}
        onClose={closeDocumentModal}
        ticket={selectedTicket}
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

      {/* Equipos Modal */}
      <EquiposModal
        isOpen={isEquiposModalOpen}
        onClose={() => setIsEquiposModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />

      {/* Personal Modal */}
      <PersonalModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />

      {/* Participantes Modal */}
      <ParticipantesModal
        isOpen={isParticipantesModalOpen}
        onClose={() => setIsParticipantesModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />

      {/* Cierre Modal */}
      <CierreModal
        isOpen={isCierreModalOpen}
        onClose={() => setIsCierreModalOpen(false)}
        ticket={selectedTicket}
        onSave={handleUpdateTicket}
      />
    </div>
  );
}