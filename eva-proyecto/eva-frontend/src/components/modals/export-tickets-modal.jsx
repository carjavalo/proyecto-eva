"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import httpService from "@/services/httpService";

// Misma tipografía que el dashboard (el diálogo se monta en un portal, fuera del contenedor).
const FONT_UI = '"Public Sans", system-ui, "Segoe UI", Roboto, sans-serif';
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Tipo de ticket = ordenes.subproceso_id. `archivo` es el nombre sin tildes para el nombre del Excel.
const TIPOS = [
  { id: 1, label: "Biomédico", archivo: "Biomedico", color: "#2563EB" },
  { id: 2, label: "Industrial", archivo: "Industrial", color: "#E8710A" },
  { id: 3, label: "Infraestructura", archivo: "Infraestructura", color: "#16A34A" },
];

const pad2 = (n) => String(n).padStart(2, "0");
// Fecha local para el nombre del archivo (el formato ISO de Date usa UTC y de noche da el día siguiente).
const fechaLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const paraArchivo = (s) => sinAcentos(s).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// «Biomédico e Industrial», «Biomédico, Industrial e Infraestructura».
function unirConY(lista) {
  if (lista.length <= 1) return lista.join("");
  const ultimo = lista[lista.length - 1];
  const conjuncion = /^h?i/i.test(sinAcentos(ultimo)) ? " e " : " y ";
  return `${lista.slice(0, -1).join(", ")}${conjuncion}${ultimo}`;
}

// Con responseType «blob» el mensaje de error del backend llega como Blob con JSON adentro.
async function mensajeDeError(error, porDefecto) {
  const datos = error?.response?.data;
  try {
    if (datos instanceof Blob) {
      const json = JSON.parse(await datos.text());
      if (json?.message) return json.message;
    } else if (datos?.message) {
      return datos.message;
    }
  } catch {
    /* la respuesta no era JSON */
  }
  return porDefecto;
}

function descargarArchivo(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exporta el consolidado de tickets a Excel eligiendo sede y tipo de ticket.
 * Se abre con los filtros de la barra del dashboard; el periodo no aplica porque
 * el export del backend no filtra por fecha.
 */
export function ExportTicketsModal({ open, onOpenChange, sedes = [], sedeInicial = "all", tiposIniciales = [1, 2, 3] }) {
  const [sede, setSede] = useState("all");
  const [tipos, setTipos] = useState([]);
  const [exportando, setExportando] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(false);

  const idSede = useId();
  const idTipo = useId();

  // Cada vez que se abre, parte de los filtros del dashboard. Se ajusta durante el
  // render para no pisar lo que el usuario cambie mientras el diálogo sigue abierto.
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      const iniciales = tiposIniciales.filter((t) => TIPOS.some((x) => x.id === t));
      setSede(sedeInicial || "all");
      setTipos(iniciales.length ? iniciales : TIPOS.map((t) => t.id));
    }
  }

  const elegidos = TIPOS.filter((t) => tipos.includes(t.id));
  const sinTipos = elegidos.length === 0;
  // Solo se envía tipo_equipo cuando no están los tres (si están, no hay nada que filtrar).
  const filtraTipos = elegidos.length !== TIPOS.length;
  const sedeElegida = sedes.find((s) => String(s.id) === sede);
  const nombreSede = sede === "all" ? "" : sedeElegida?.name || sedeElegida?.nombre || `Sede ${sede}`;

  const alternarTipo = (id) =>
    setTipos((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id].sort((a, b) => a - b)));

  const exportar = async () => {
    if (sinTipos || exportando) return;
    const idToast = "export-tickets";
    const params = {};
    if (sede !== "all") params.sede_id = sede;
    if (filtraTipos) params.tipo_equipo = elegidos.map((t) => t.id).join(",");

    setExportando(true);
    toast.loading("Exportando tickets…", { id: idToast });
    try {
      const res = await httpService.get("/v1/gestion-tickets/export-excel", {
        params,
        responseType: "blob",
        timeout: 300000,
        headers: { Accept: XLSX_MIME },
      });
      const partes = ["Tickets_Consolidado"];
      if (sede !== "all") partes.push(paraArchivo(nombreSede) || `Sede_${sede}`);
      if (filtraTipos) partes.push(elegidos.map((t) => t.archivo).join("-"));
      partes.push(fechaLocal());
      descargarArchivo(res.data, `${partes.join("_")}.xlsx`);
      toast.success("Tickets exportados", { id: idToast });
      onOpenChange?.(false);
    } catch (error) {
      console.error("Error exportando tickets:", error);
      toast.error(await mensajeDeError(error, "No se pudieron exportar los tickets"), { id: idToast });
    } finally {
      setExportando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-5 text-[#1B2335] sm:max-w-md" style={{ fontFamily: FONT_UI }}>
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="text-[17px]! font-bold leading-snug!">Exportar consolidado de tickets</DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#5E6A82]">Incluye tickets de todas las fechas.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span id={idSede} className="text-[12px] font-semibold text-[#5E6A82]">
              Sede
            </span>
            <Select value={sede} onValueChange={setSede} disabled={exportando}>
              <SelectTrigger
                aria-labelledby={idSede}
                className="h-10 w-full rounded-[10px] border-[#D9E0EA] bg-white text-[13px] font-semibold text-[#334155] shadow-none"
              >
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sedes</SelectItem>
                {sedes.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name || s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <span id={idTipo} className="text-[12px] font-semibold text-[#5E6A82]">
              Tipo de ticket
            </span>
            <div role="group" aria-labelledby={idTipo} className="flex flex-wrap gap-2">
              {TIPOS.map((t) => {
                const activo = tipos.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={activo}
                    disabled={exportando}
                    onClick={() => alternarTipo(t.id)}
                    className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8] disabled:opacity-60 ${
                      activo
                        ? "border-[#C9D3E3] bg-white text-[#1B2335] hover:bg-[#F6F8FB]"
                        : "border-[#D9E0EA] bg-[#F6F8FB] text-[#8792A7] hover:text-[#5E6A82]"
                    }`}
                  >
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: activo ? t.color : "#CBD2DC" }} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {sinTipos && (
              <p role="alert" className="text-[12px] font-medium text-[#B45309]">
                Elige al menos un tipo de ticket.
              </p>
            )}
          </div>

          {!sinTipos && (
            <p className="rounded-[10px] bg-[#F6F8FB] px-3 py-2 text-[12.5px] text-[#334155]">
              Se exportarán los tickets de{" "}
              <span className="font-semibold text-[#1B2335]">{sede === "all" ? "todas las sedes" : nombreSede}</span> ·{" "}
              {unirConY(elegidos.map((t) => t.label))}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#D9E0EA] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F6F8FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={exportar}
            disabled={sinTipos || exportando}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[#2A377E] px-4 text-[13px] font-semibold text-white hover:bg-[#222C6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {exportando ? "Exportando…" : "Exportar Excel"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
