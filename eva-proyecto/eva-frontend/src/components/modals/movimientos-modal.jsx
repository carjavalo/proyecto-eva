import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, User, MapPin, Building2, FileStack } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import httpService from "@/services/httpService";

export function MovimientosModal({ open, onOpenChange, equipmentId, equipmentName }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && equipmentId) {
      fetchMovimientos();
    }
  }, [open, equipmentId]);

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      // Usar el endpoint de complete-info que ya incluye movimientos
      const response = await httpService.get(`/v1/equipos/${equipmentId}/complete-info`);
      if (response.data.success) {
        setMovimientos(response.data.data.movimientos || []);
      }
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      toast.error("Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] min-w-4xl overflow-y-auto">
        <DialogHeader className="bg-slate-50 border-b border-slate-200 p-6 rounded-t-lg -mt-6 -mx-6 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            <div className="bg-slate-700 p-3 rounded-lg mr-4 shadow-sm">
              <FileStack className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800">Historial de Movimientos</DialogTitle>
              <p className="text-sm text-slate-600 mt-1">{equipmentName}</p>
            </div>
          </motion.div>
        </DialogHeader>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Cambios de Ubicación ({movimientos.length})
          </h3>
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-3"></div>
                <p className="text-slate-600">Cargando movimientos...</p>
              </motion.div>
            ) : movimientos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200"
              >
                <FileStack className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No hay movimientos registrados para este equipo</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {movimientos.map((movimiento, index) => (
                  <motion.div
                    key={movimiento.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
                  >
                    {/* Header con fecha y responsable */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                          Movimiento #{movimientos.length - index}
                        </Badge>
                        {movimiento.fecha && (
                          <span className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            {formatDate(movimiento.fecha)}
                          </span>
                        )}
                      </div>
                      {movimiento.responsable_nombre && (
                        <span className="flex items-center gap-1 text-sm text-slate-600">
                          <User className="w-4 h-4" />
                          {movimiento.responsable_nombre}
                        </span>
                      )}
                    </div>

                    {/* Contenido del movimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Ubicación Origen */}
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-rose-600" />
                          <h4 className="font-semibold text-rose-900 text-sm">Origen</h4>
                        </div>
                        <div className="space-y-2 text-xs text-slate-700">
                          <div>
                            <span className="font-medium text-slate-600">Sede:</span>{' '}
                            <span>{movimiento.sede_origen_nombre || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Servicio:</span>{' '}
                            <span>{movimiento.servicio_origen_nombre || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Área:</span>{' '}
                            <span>{movimiento.area_origen_nombre || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Flecha */}
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-8 h-8 text-slate-400" />
                      </div>

                      {/* Ubicación Destino */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-semibold text-emerald-900 text-sm">Destino</h4>
                        </div>
                        <div className="space-y-2 text-xs text-slate-700">
                          <div>
                            <span className="font-medium text-slate-600">Sede:</span>{' '}
                            <span>{movimiento.sede_destino_nombre || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Servicio:</span>{' '}
                            <span>{movimiento.servicio_destino_nombre || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Área:</span>{' '}
                            <span>{movimiento.area_destino_nombre || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
