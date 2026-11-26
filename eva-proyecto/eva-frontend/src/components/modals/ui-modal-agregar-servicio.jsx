"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { toast } from "sonner";
import httpService from "../../services/httpService";
import { Loader2 } from "lucide-react";
import CamposServicio from "./campos-servicio";

const VACIO = {
  name: "",
  code: "",
  description: "",
  piso_id: "",
  zona_id: "",
  centro_id: "",
  sede_id: "",
  grupo_habilitacion: "",
  is_active: true,
};

export default function UIModalAgregarServicio({ isOpen, onClose }) {
  const [formData, setFormData] = useState(VACIO);
  const [options, setOptions] = useState({
    sedes: [],
    zonas: [],
    pisos: [],
    centros: [],
    grupos_habilitacion: [],
  });
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    setCargandoOpciones(true);
    httpService
      .get("/v1/servicios/options")
      .then((res) => {
        if (vivo && res.data.success) setOptions(res.data.data);
      })
      .catch((err) => {
        console.error("Error al cargar opciones:", err);
        toast.error("No se pudieron cargar las opciones de ubicación");
      })
      .finally(() => vivo && setCargandoOpciones(false));
    return () => {
      vivo = false;
    };
  }, [isOpen]);

  const handleInputChange = (campo, valor) => setFormData((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await httpService.post("/v1/servicios", formData);
      if (res.data.success) {
        toast.success("Servicio creado correctamente");
        setFormData(VACIO);
        onClose(true);
      } else {
        toast.error(res.data.message || "Error al crear el servicio");
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      toast.error(err.response?.data?.message || "Error en el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto rounded-[18px] border-[#E2E7EE] sm:max-w-[680px]">
        <DialogHeader className="border-b border-[#EEF1F6] pb-3">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#1B2335]">
            Nuevo servicio
          </DialogTitle>
          <p className="mt-0.5 text-[12.5px] text-[#5E6A82]">
            El grupo de habilitación define la prioridad de los tickets que se reporten aquí.
          </p>
        </DialogHeader>

        {cargandoOpciones ? (
          <div className="grid gap-3 py-2">
            <div className="h-24 animate-pulse rounded-[14px] bg-[#F1F4F8]" />
            <div className="h-24 animate-pulse rounded-[14px] bg-[#F1F4F8]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 py-1">
            <CamposServicio formData={formData} options={options} onChange={handleInputChange} />

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#EEF1F6] pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                className="rounded-[10px] border-[#D5DCE6] px-5 text-[#3D4A63]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-[10px] bg-[#1D293D] px-6 text-white hover:bg-[#2A3B52]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Crear servicio"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
