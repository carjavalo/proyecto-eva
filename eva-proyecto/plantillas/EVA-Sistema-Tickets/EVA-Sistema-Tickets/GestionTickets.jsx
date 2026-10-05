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
} from "lucide-react";
import HospitalTicketModal from "./modals/tickets/hospital-ticket-modal";

export default function GestionTickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isHospitalTicketModalOpen, setIsHospitalTicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");

  const { filterTickets, updateTicket } = useTickets();


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

  const filteredTickets = filterTickets(searchTerm, selectedOrigin, filterField).map(ticket => ({
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
  };

  // Mobile Card Component
  const TicketCard = ({ ticket }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900">#{ticket.id}</h3>
              <Badge className={`${getStatusColor(ticket.estado)} border text-xs`}>
                {ticket.estado}
              </Badge>
            </div>
            <p className="text-sm text-blue-600 font-medium">{ticket.origen}</p>
          </div>
          <div className="flex gap-1">
            <Button
              onClick={() => openDocumentModal(ticket)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              size="sm"
              title="Ver detalles del ticket"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => handleEditTicket(ticket)}
              variant="outline"
              size="sm"
              className="p-2 border-orange-300 text-orange-600 hover:bg-orange-50"
              title="Editar ticket (incluye asociar, seguimiento y asignación)"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800">{ticket.descripcion}</p>
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
            <div><span className="font-medium">Creado por:</span> {ticket.creadoPor}</div>
            <div><span className="font-medium">Asignado a:</span> {ticket.asignadoA}</div>
            <div><span className="font-medium">Área:</span> {ticket.area}</div>
            <div><span className="font-medium">Equipo:</span> {ticket.equipo}</div>
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
    <div className="p-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Gestión de Tickets
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Administre y supervise todos los tickets del sistema
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap gap-2 sm:gap-3 lg:gap-4 mb-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
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
          Mostrando registros de {startIndex + 1} a{" "}
          {Math.min(endIndex, filteredTickets.length)} de un total de{" "}
          {filteredTickets.length} registros
        </div>
      </div>

      {/* Mobile View - Cards */}
      <div className="block md:hidden">
        <div className="space-y-4">
          {currentTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>

      {/* Desktop/Tablet View - Table */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] sm:min-w-[800px] lg:min-w-[1000px] xl:min-w-[1200px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción & Detalles
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignación
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-gray-900">#{ticket.id}</div>
                        <div className="text-xs text-blue-600 font-medium">{ticket.origen}</div>
                        <div className="text-xs text-gray-500">{ticket.fechaCreacion}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 max-w-md">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 font-medium line-clamp-2">
                          {ticket.descripcion}
                        </div>
                        <div className="text-xs text-gray-600">
                          <div><span className="font-medium">Área:</span> {ticket.area}</div>
                          <div><span className="font-medium">Equipo:</span> {ticket.equipo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600">
                          <div><span className="font-medium">Creado por:</span></div>
                          <div className="text-gray-900">{ticket.creadoPor}</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div><span className="font-medium">Asignado a:</span></div>
                          <div className="text-gray-900">{ticket.asignadoA}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <Badge className={`${getStatusColor(ticket.estado)} border text-xs`}>
                        {ticket.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <Badge className={`${getPriorityColor(ticket.prioridad)} border text-xs`}>
                        {ticket.prioridad}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openDocumentModal(ticket)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          size="sm"
                          title="Ver detalles del ticket"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditTicket(ticket)}
                          variant="outline"
                          size="sm"
                          className="p-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                          title="Editar ticket (incluye asociar, seguimiento y asignación)"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}
