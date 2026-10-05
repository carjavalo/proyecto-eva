"use client";

import { useState, useEffect } from "react";
import httpService from "../services/httpService";
import { cachedGet, invalidateConfigCache } from "../services/configDataCache";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Wrench,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Settings2,
} from "lucide-react";
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

// Importar componentes comunes
import Pagination from "@/components/common/Pagination";
import ConfigPageSkeleton from "@/components/skeletons/ConfigPageSkeleton";
import UIModalMantenimiento from "@/components/modals/ui-modal-mantenimiento";
import { toast } from "sonner";


export default function VistaTiposMantenimiento() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de ordenamiento
  const [sortField, setSortField] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedItem, setSelectedItem] = useState(null);

  // Estado para confirmar eliminación
  const [itemToDelete, setItemToDelete] = useState(null);

  const [mantenimientosData, setMantenimientosData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await cachedGet("/v1/tipos-mantenimiento", { search: searchTerm });
      if (res.success) {
        setMantenimientosData(res.data);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar los tipos de mantenimiento");
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode("edit");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenView = (item) => {
    setModalMode("view");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (newData) => {
    try {
      const loadingToast = toast.loading(selectedItem ? "Actualizando..." : "Guardando...");

      let response;
      if (selectedItem) {
        response = await httpService.put(`/v1/tipos-mantenimiento/${selectedItem.id}`, {
          nombre: newData.nombre,
          aplica_industrial: newData.aplicaIndustrial,
          aplica_infraestructura: newData.aplicaInfraestructura,
          subcategories: newData.subcategories
        });
      } else {
        response = await httpService.post("/v1/tipos-mantenimiento", {
          codigo: newData.codigo,
          nombre: newData.nombre,
          aplica_industrial: newData.aplicaIndustrial,
          aplica_infraestructura: newData.aplicaInfraestructura,
          subcategories: newData.subcategories
        });
      }

      if (response.data.success) {
        toast.success(selectedItem ? "Actualizado correctamente" : "Creado correctamente", { id: loadingToast });
        invalidateConfigCache('/v1/tipos-mantenimiento');
        fetchData();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error(error.response?.data?.message || "Error al guardar el registro");
    }
  };

  const handleDeleteRequest = (item) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    try {
      const loadingToast = toast.loading("Eliminando...");
      const response = await httpService.delete(`/v1/tipos-mantenimiento/${itemToDelete.id}`);
      if (response.data.success) {
        toast.success("Registro eliminado correctamente", { id: loadingToast });
        setItemToDelete(null);
        invalidateConfigCache('/v1/tipos-mantenimiento');
        fetchData();
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar el registro");
      setItemToDelete(null);
    }
  };

  // Función para manejar ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener icono de ordenamiento
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-amber-500" />;
  };

  // Aplicar búsqueda funcional
  const filteredData = mantenimientosData.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(search) ||
      item.codigo?.toLowerCase().includes(search) ||
      item.descripcion?.toLowerCase().includes(search)
    );
  });

  // Ordenamiento
  const sortedData = [...filteredData].sort((a, b) => {
    let aValue = a[sortField] || "";
    let bValue = b[sortField] || "";
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentItems = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && mantenimientosData.length === 0) {
    return <ConfigPageSkeleton columns={4} rows={6} accentColor="amber" />;
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] p-4 md:p-8">

      {/* ── PAGE HEADER ── */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white border border-slate-100 rounded-2xl  text-amber-600">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1">
              Tipos de Mantenimiento
            </h1>
            <p className="text-slate-500 mt-2 max-w-lg text-sm">
              Administración de categorías y subcategorías de mantenimiento del sistema EVA.
            </p>
          </div>
        </div>

        {/* Summary Stat Card */}
        <div className="bg-white border border-gray-100 p-5 rounded-3xl  flex items-center gap-5 w-full md:w-64 transition-all hover:shadow-md">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Settings2 className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tipos</p>
            <p className="text-3xl font-bold text-slate-900">{totalItems}</p>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Barra de Controles y Búsqueda */}
        <div className="bg-white p-4 rounded-3xl  border border-gray-100 flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 h-12 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 text-sm shadow-inner"
            />
          </div>

          {/* Items por página */}
          <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
            <span className="hidden sm:inline">Mostrar</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20 h-12 bg-slate-50 border-none rounded-2xl shadow-inner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl flex items-center gap-2.5 px-6 h-12  transition-all font-bold w-full lg:w-auto shrink-0"
          >
            <Plus className="w-5 h-5 font-bold" />
            Agregar Tipo
          </Button>
        </div>

        {/* Tabla de Resultados */}
        <div className="overflow-hidden rounded-3xl bg-white  overflow-x-auto relative">
          {loading && currentItems.length > 0 && (
            <div className="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden z-10">
              <div className="h-full bg-blue-600 animate-progress origin-left"></div>
            </div>
          )}
            <table className={`w-full text-left border-separate border-spacing-0 text-sm ${loading && currentItems.length > 0 ? 'opacity-40 transition-opacity duration-300' : 'transition-opacity duration-300'}`}>
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 w-32">
                    <button onClick={() => handleSort('codigo')} className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
                      Código {getSortIcon('codigo')}
                    </button>
                  </th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                    <button onClick={() => handleSort('nombre')} className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
                      Tipo de Mantenimiento {getSortIcon('nombre')}
                    </button>
                  </th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 w-44">
                    Aplica a
                  </th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 w-40">
                    Subcategorías
                  </th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 text-right w-40">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-28 bg-slate-100 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><div className="flex gap-2 justify-end"><div className="h-8 w-8 bg-slate-100 rounded-lg" /><div className="h-8 w-8 bg-slate-100 rounded-lg" /></div></td>
                    </tr>
                  ))
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Wrench className="h-16 w-16 text-slate-100" />
                        <span className="text-slate-400 font-medium italic">No se encontraron registros</span>
                        {searchTerm && (
                          <span className="text-xs text-slate-300">Intenta con otro término de búsqueda</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-mono font-bold rounded-lg border border-amber-100/50">
                          {item.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border border-amber-100/50 group-hover:scale-110 transition-transform">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-700 uppercase tracking-wide">{item.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(item.aplica_industrial ?? true) && (
                            <Badge className="bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 px-2.5 py-1 rounded-lg font-medium">
                              Industrial
                            </Badge>
                          )}
                          {(item.aplica_infraestructura ?? true) && (
                            <Badge className="bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium">
                              Infraestructura
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.subcategories?.length > 0 ? (
                          <Badge className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 gap-1 px-2.5 py-1 rounded-lg font-bold text-xs">
                            {item.subcategories.length} subcategorías
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Sin subcategorías</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => handleOpenView(item)}
                            className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(item)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors shadow-sm"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          <div className="bg-slate-50/50 px-6 py-5 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              showInfo={true}
            />
          </div>
        </div>
      </div>

      {/* AlertDialog para confirmar eliminación */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">¿Confirmar Eliminación?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-500 leading-relaxed">
              Estás a punto de eliminar permanentemente el tipo de mantenimiento <span className="font-bold text-slate-800">{itemToDelete?.nombre}</span>.
              Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel onClick={() => setItemToDelete(null)} className="h-12 rounded-xl text-slate-500 border-slate-200">
              Conservar Registro
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Sí, Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal CRUD */}
      <UIModalMantenimiento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        data={selectedItem}
        onSave={handleSave}
      />
    </div>
  );
}
