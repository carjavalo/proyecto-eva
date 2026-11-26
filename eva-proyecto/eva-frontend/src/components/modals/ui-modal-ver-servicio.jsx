"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { NIVELES } from "@/utils/criticidad";

/** Una pareja etiqueta/valor. Sin dato, un guion en gris en vez de un hueco. */
function Dato({ etiqueta, valor, ancho = "" }) {
  return (
    <div className={`min-w-0 ${ancho}`}>
      <p className="font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">{etiqueta}</p>
      <p className="mt-1 text-[13.5px] break-words text-[#1B2335]">
        {valor || <span className="text-[#94A1B6]">—</span>}
      </p>
    </div>
  );
}

function Cifra({ etiqueta, valor }) {
  return (
    <div className="rounded-[12px] border border-[#E2E7EE] px-4 py-3">
      <p className="font-mono text-[26px] leading-none font-semibold text-[#1B2335] tabular-nums">
        {Number(valor) || 0}
      </p>
      <p className="mt-1 text-[12px] text-[#5E6A82]">{etiqueta}</p>
    </div>
  );
}

export default function UIModalVerServicio({ isOpen, onClose, servicio }) {
  if (!servicio) return null;

  const nivel = Number(servicio.criticidad) || null;
  const info = nivel ? NIVELES[nivel] : null;
  const activo = servicio.is_active === 1 || servicio.is_active === true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto rounded-[18px] border-[#E2E7EE] sm:max-w-[680px]">
        <DialogHeader className="border-b border-[#EEF1F6] pb-3">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-[#1B2335]">
            {servicio.name || "Servicio"}
          </DialogTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] text-[#5E6A82]">
              {servicio.code || `ID ${servicio.id}`}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                activo ? "bg-[#E6F4ED] text-[#1C6B4B]" : "bg-[#EEF1F6] text-[#5E6A82]"
              }`}
            >
              {activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {/* Prioridad: lo primero, porque decide el plazo de sus tickets. */}
          <section className="rounded-[14px] border border-[#E2E7EE] p-3.5">
            <p className="mb-2.5 font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">
              Clasificación
            </p>
            {info ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
                  style={{ backgroundColor: info.fondo, color: info.color }}
                >
                  <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: info.color }} />
                  Nivel {nivel} · {info.nombre}
                </span>
                <span className="text-[13px] text-[#3D4A63]">
                  Primera respuesta en menos de {info.plazo}
                </span>
              </div>
            ) : (
              <p className="text-[13px] text-[#5E6A82]">Sin nivel asignado.</p>
            )}
            <p className="mt-2 text-[12.5px] text-[#5E6A82]">
              {servicio.grupo_habilitacion || "Sin grupo de habilitación"}
            </p>
          </section>

          {/* Ubicación */}
          <section className="rounded-[14px] border border-[#E2E7EE] p-3.5">
            <p className="mb-3 font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">
              Ubicación
            </p>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
              <Dato etiqueta="Sede" valor={servicio.sede_nombre} />
              <Dato etiqueta="Zona" valor={servicio.zona_nombre} />
              <Dato etiqueta="Piso" valor={servicio.piso_nombre} />
              <Dato etiqueta="Centro de costo" valor={servicio.centro_nombre} ancho="sm:col-span-3" />
            </div>
          </section>

          {/* Lo que cuelga del servicio */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Cifra etiqueta="equipos registrados" valor={servicio.total_equipos} />
            <Cifra etiqueta="usuarios vinculados" valor={servicio.total_usuarios} />
          </div>

          {servicio.description && (
            <section className="rounded-[14px] border border-[#E2E7EE] p-3.5">
              <p className="mb-2 font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">
                Descripción
              </p>
              <p className="text-[13.5px] leading-relaxed text-[#3D4A63]">{servicio.description}</p>
            </section>
          )}
        </div>

        <div className="flex justify-end border-t border-[#EEF1F6] pt-3">
          <Button
            onClick={onClose}
            className="rounded-[10px] bg-[#1D293D] px-6 text-white hover:bg-[#2A3B52]"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
