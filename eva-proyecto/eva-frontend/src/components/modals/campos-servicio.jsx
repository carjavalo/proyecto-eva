"use client";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import SearchableSelect from "../ui/searchable-select";

/**
 * Campos del formulario de servicio, compartidos por el modal de crear y el de editar.
 * Estaban duplicados en los dos, y cada arreglo había que hacerlo dos veces.
 *
 * `prefijo` evita que los id de los <label> choquen cuando ambos modales existen
 * en el árbol al mismo tiempo.
 */

const CONTROL =
  "rounded-[10px] border-[#D5DCE6] focus:border-[#2A377E] focus:ring-2 focus:ring-[#2A377E]/20";

export function Seccion({ titulo, children, columnas = "sm:grid-cols-2" }) {
  return (
    <section className="rounded-[14px] border border-[#E2E7EE] p-3.5">
      <p className="mb-3 font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">
        {titulo}
      </p>
      <div className={`grid gap-x-4 gap-y-3.5 ${columnas}`}>{children}</div>
    </section>
  );
}

export function Campo({ id, etiqueta, requerido = false, ayuda, children, ancho = "" }) {
  return (
    <div className={`grid min-w-0 gap-1.5 ${ancho}`}>
      <Label htmlFor={id} className="text-[12.5px] font-medium text-[#3D4A63]">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-[#B4232A]">*</span>}
      </Label>
      {children}
      {ayuda && <p className="text-[11.5px] leading-snug text-[#5E6A82]">{ayuda}</p>}
    </div>
  );
}

/** Texto que explica qué implica el grupo elegido: es el porqué del plazo. */
function ayudaDelGrupo(grupos, elegido) {
  const g = (grupos || []).find((x) => x.grupo === elegido);
  if (!g) {
    return "Sin grupo el servicio queda en nivel 4: sus tickets tendrán 24 h para la primera respuesta.";
  }
  const plazo =
    g.plazo_min < 60
      ? `${g.plazo_min} min`
      : g.plazo_min < 1440
        ? `${g.plazo_min / 60} h`
        : `${g.plazo_min / 1440} día(s)`;
  return `Nivel ${g.criticidad} · primera respuesta en menos de ${plazo}. ${g.ejemplos || ""}`;
}

export default function CamposServicio({ prefijo = "", formData, options, onChange }) {
  const p = (campo) => `${prefijo}${campo}`;

  return (
    <div className="grid gap-4">
      <Seccion titulo="Identificación">
        <Campo id={p("name")} etiqueta="Nombre del servicio" requerido ancho="sm:col-span-2">
          <Input
            id={p("name")}
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Ej. URGENCIAS ADULTOS"
            className={CONTROL}
            required
          />
        </Campo>

        <Campo id={p("code")} etiqueta="Código">
          <Input
            id={p("code")}
            value={formData.code}
            onChange={(e) => onChange("code", e.target.value)}
            placeholder="Ej. SERV-001"
            className={CONTROL}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Clasificación" columnas="">
        <Campo
          id={p("grupo_habilitacion")}
          etiqueta="Grupo de habilitación"
          ayuda={ayudaDelGrupo(options.grupos_habilitacion, formData.grupo_habilitacion)}
        >
          <Select
            value={formData.grupo_habilitacion || ""}
            onValueChange={(v) => onChange("grupo_habilitacion", v)}
          >
            <SelectTrigger id={p("grupo_habilitacion")} className={CONTROL}>
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {(options.grupos_habilitacion || []).map((g) => (
                <SelectItem key={g.grupo} value={g.grupo}>
                  {g.grupo} — nivel {g.criticidad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </Seccion>

      <Seccion titulo="Ubicación">
        <Campo id={p("sede_id")} etiqueta="Sede">
          <Select
            value={formData.sede_id?.toString() || ""}
            onValueChange={(v) => onChange("sede_id", v)}
          >
            <SelectTrigger id={p("sede_id")} className={CONTROL}>
              <SelectValue placeholder="Seleccionar sede" />
            </SelectTrigger>
            <SelectContent>
              {(options.sedes || []).map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id={p("zona_id")} etiqueta="Zona">
          <Select
            value={formData.zona_id?.toString() || ""}
            onValueChange={(v) => onChange("zona_id", v)}
          >
            <SelectTrigger id={p("zona_id")} className={CONTROL}>
              <SelectValue placeholder="Seleccionar zona" />
            </SelectTrigger>
            <SelectContent>
              {(options.zonas || []).map((z) => (
                <SelectItem key={z.id} value={z.id.toString()}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id={p("piso_id")} etiqueta="Piso">
          <Select
            value={formData.piso_id?.toString() || ""}
            onValueChange={(v) => onChange("piso_id", v)}
          >
            <SelectTrigger id={p("piso_id")} className={CONTROL}>
              <SelectValue placeholder="Seleccionar piso" />
            </SelectTrigger>
            <SelectContent>
              {(options.pisos || []).map((pi) => (
                <SelectItem key={pi.id} value={pi.id.toString()}>
                  {pi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id={p("centro_id")} etiqueta="Centro de costo">
          <SearchableSelect
            placeholder="Buscar centro de costo…"
            options={options.centros || []}
            value={formData.centro_id}
            onValueChange={(v) => onChange("centro_id", v)}
            className="w-full"
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Detalle" columnas="">
        <Campo id={p("description")} etiqueta="Descripción">
          <textarea
            id={p("description")}
            value={formData.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Detalles adicionales del servicio…"
            className={`min-h-[84px] w-full bg-white p-2.5 text-[13.5px] text-[#1B2335] outline-none placeholder:text-[#94A1B6] ${CONTROL} border`}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
