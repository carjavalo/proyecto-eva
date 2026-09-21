"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, useId } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Download,
  Gauge,
  Loader2,
  Package,
  RotateCcw,
  Ticket,
  Wrench,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoundedPieChart } from "./ui/rounded-pie-chart";
import httpService from "@/services/httpService";
import { ExportTicketsModal } from "@/components/modals/export-tickets-modal";

// Tipografías del nuevo inicio (ver HomePage). Login.css fija una fuente global en
// `body` sin capa, por eso se aplican con style en el contenedor de la página.
const FONT_UI = '"Public Sans", system-ui, "Segoe UI", Roboto, sans-serif';
const FONT_DISPLAY = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

const fmt = new Intl.NumberFormat("es-CO");
const fmt1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const NAVY = "#2A377E";
const PISTA = "#DCE3EE";

// Línea = ordenes.subproceso_id. La clave es la que usa /v1/dashboard/resumen.
const LINEAS = [
  { id: 1, key: "biomedico", label: "Biomédico", color: "#2563EB" },
  { id: 2, key: "industrial", label: "Industrial", color: "#E8710A" },
  { id: 3, key: "infraestructura", label: "Infraestructura", color: "#16A34A" },
];
const TODAS_LAS_LINEAS = [1, 2, 3];
// Apilado de abajo arriba: infraestructura, biomédico, industrial. Así el verde y el
// naranja nunca quedan juntos (combinación validada para daltonismo).
const ORDEN_APILADO = [3, 1, 2];

// estado_id 1..5 de ordenes, con la clave de por_estado.
const ESTADOS = [
  { key: "abierto", label: "Abierto", plural: "Abiertos", color: "#B42318" },
  { key: "asignado", label: "Asignado", plural: "Asignados", color: "#2563EB" },
  { key: "diagnosticado", label: "Diagnosticado", plural: "Diagnosticados", color: "#7C3AED" },
  { key: "cerrado", label: "Cerrado", plural: "Cerrados", color: "#94A3B8" },
  { key: "esperando_cierre", label: "Esperando cierre", plural: "Esperando cierre", color: "#D97706" },
];

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const TABS = [
  { key: "resumen", label: "Resumen", Icon: BarChart3 },
  { key: "correctivos", label: "Correctivos", Icon: Wrench },
  { key: "preventivos", label: "Preventivos", Icon: CalendarDays },
  { key: "calibraciones", label: "Calibraciones", Icon: Gauge },
  { key: "equipos", label: "Equipos", Icon: Package },
];

const URL_EQUIPOS = "/v1/equipos/medical-devices-complete";
// Claves de los filtros en la URL (los valores por defecto se omiten).
const CLAVES_URL = ["anio", "desde", "hasta", "sede", "lineas"];

// Clases compartidas de la barra de filtros. En el celular los rótulos de grupo se
// ocultan a la vista (siguen para lectores de pantalla) para que la barra fija ocupe menos.
const ROTULO = "text-[11px] font-bold uppercase tracking-[0.06em] text-[#5E6A82]";
const ROTULO_GRUPO = `sr-only sm:not-sr-only ${ROTULO}`;
const FOCO = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8]";

// ─── Fechas (siempre en hora local) ─────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
// 'AAAA-MM-DD' de una fecha local (el formato ISO de Date la pasa a UTC y de noche da el día siguiente).
const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// 'AAAA-MM-DD' → Date local. Nunca new Date(texto): lo toma como medianoche UTC y
// en Bogotá (UTC-5) se muestra el día anterior.
function parseFecha(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || ""));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return fecha;
}

const fechaCorta = (texto) => {
  const f = parseFecha(texto);
  return f ? `${f.getDate()} ${MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}` : texto;
};

// 'AAAA-MM' → 'abr' o 'abr 24' (cuando el periodo abarca más de un año).
const etiquetaMes = (mes, conAnio) => {
  const [anio, m] = mes.split("-").map(Number);
  return conAnio ? `${MESES_CORTOS[m - 1]} ${String(anio).slice(2)}` : MESES_CORTOS[m - 1];
};

// 'AAAA-MM' → 'Abril 2024'.
const mesLargo = (mes) => {
  const [anio, m] = mes.split("-").map(Number);
  const texto = `${MESES_LARGOS[m - 1]} ${anio}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Mismas reglas que el backend: fechas válidas entre 2000 y 2100, hasta ≥ desde y
// como máximo 3 años. Devuelve el mensaje de error o null.
function validarRango(desde, hasta) {
  if (!desde || !hasta) return "Elige la fecha inicial y la final.";
  const d = parseFecha(desde);
  const h = parseFecha(hasta);
  if (!d || !h || d.getFullYear() < 2000 || h.getFullYear() > 2100) return "Las fechas no son válidas (años 2000 a 2100).";
  if (h < d) return "La fecha final debe ser igual o posterior a la inicial.";
  // Mismo día 3 años después; si no existe (29 de febrero) se usa el último día de ese mes.
  const y3 = d.getFullYear() + 3;
  const limite = new Date(y3, d.getMonth(), Math.min(d.getDate(), new Date(y3, d.getMonth() + 1, 0).getDate()));
  if (h > limite) return "El rango no puede superar 3 años.";
  return null;
}

// Texto del periodo para la cabecera: 'Enero – diciembre 2024',
// 'Enero – septiembre 2026 · hasta hoy' o '3 mar 2024 – 15 jun 2024'.
function textoPeriodo(periodo, hoy) {
  const futuro = periodo.desde > hoy;
  const parcial = !futuro && hoy < periodo.hasta;
  let texto;
  if (periodo.anio) {
    const mesFin = parcial ? Number(hoy.slice(5, 7)) : 12;
    texto = mesFin === 1 ? `Enero ${periodo.anio}` : `Enero – ${MESES_LARGOS[mesFin - 1]} ${periodo.anio}`;
  } else {
    texto = periodo.desde === periodo.hasta
      ? fechaCorta(periodo.desde)
      : `${fechaCorta(periodo.desde)} – ${fechaCorta(periodo.hasta)}`;
  }
  if (parcial) texto += " · hasta hoy";
  if (futuro) texto += " · aún sin datos";
  return texto;
}

// ─── Filtros en la URL ──────────────────────────────────────────────────────
const mismoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function leerLineas(sp) {
  if (!sp.has("lineas")) return TODAS_LAS_LINEAS;
  const crudo = (sp.get("lineas") || "").trim();
  if (crudo === "") return []; // el usuario apagó todas las líneas
  const ids = [...new Set(crudo.split(",").map((t) => t.trim()).filter((t) => /^[123]$/.test(t)).map(Number))];
  return ids.length ? ids.sort((a, b) => a - b) : TODAS_LAS_LINEAS;
}

function leerFiltros(sp, anioActual) {
  const anioUrl = Number(sp.get("anio"));
  const anio = Number.isInteger(anioUrl) && anioUrl >= 2000 && anioUrl <= 2100 ? anioUrl : anioActual;
  const desde = sp.get("desde") || "";
  const hasta = sp.get("hasta") || "";
  const rango = desde && hasta && !validarRango(desde, hasta) ? { desde, hasta } : null;
  const sede = sp.get("sede") || "";
  return { anio, rango, sede: /^[1-9]\d{0,8}$/.test(sede) ? sede : "all", lineas: leerLineas(sp) };
}

function escribirFiltros(prev, f, anioActual) {
  const sp = new URLSearchParams(prev);
  CLAVES_URL.forEach((clave) => sp.delete(clave));
  if (f.rango) {
    sp.set("desde", f.rango.desde);
    sp.set("hasta", f.rango.hasta);
  } else if (f.anio !== anioActual) {
    sp.set("anio", String(f.anio));
  }
  if (f.sede !== "all") sp.set("sede", f.sede);
  if (!mismoConjunto(f.lineas, TODAS_LAS_LINEAS)) sp.set("lineas", f.lineas.join(","));
  return sp;
}

const periodoDe = (f) =>
  f.rango
    ? { desde: f.rango.desde, hasta: f.rango.hasta, anio: null }
    : { desde: `${f.anio}-01-01`, hasta: `${f.anio}-12-31`, anio: f.anio };

// ─── Exportación ────────────────────────────────────────────────────────────
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

// ─── Gráficas SVG ───────────────────────────────────────────────────────────
// Ancho real del contenedor: el viewBox usa ese ancho para que el texto quede a
// 11 px en cualquier pantalla y las etiquetas del eje se puedan espaciar.
function useAncho(ref, inicial = 600) {
  const [ancho, setAncho] = useState(inicial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setAncho(Math.max(240, w));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return ancho;
}

// Escala «redonda» del eje Y en unos 4 tramos (conteos: el paso mínimo es 1).
function escalaEje(maximo) {
  if (!(maximo > 0)) return { tope: 4, paso: 1 };
  const bruto = maximo / 4;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = Math.max(1, [1, 2, 5, 10].map((m) => m * potencia).find((s) => s >= bruto));
  return { tope: Math.ceil(maximo / paso) * paso, paso };
}

// Cada cuántos meses se rotula el eje X según el espacio (alineado al calendario:
// con 3 se ven ene, abr, jul, oct).
function pasoEtiquetas(meses, capacidad) {
  const necesario = meses / Math.max(1, Math.floor(capacidad));
  return [1, 2, 3, 4, 6, 12].find((p) => p >= necesario) || 12;
}

// Rectángulo con solo las esquinas superiores redondeadas.
function topeRedondeado(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/**
 * Barras mensuales. `series` se apilan de abajo arriba; `interior` es una barra más
 * angosta dentro de la principal (cumplidas dentro de programadas). `detalle(i)`
 * devuelve { titulo, filas: [{ label, color, valor }], pie } para el tooltip.
 * Se recorre con el mouse o, con el foco en la gráfica, con las flechas.
 */
function BarrasMensuales({ meses, series, interior = null, etiqueta, detalle }) {
  const envolturaRef = useRef(null);
  const W = useAncho(envolturaRef);
  const [activo, setActivo] = useState(null);

  const H = 220;
  const L = 44;
  const R = 6;
  const T = 12;
  const B = 24;
  const n = meses.length;
  const altoUtil = H - T - B;
  const cw = (W - L - R) / Math.max(n, 1);
  // El ancho de barra se adapta al número de meses (un rango puede tener 37).
  const bw = Math.max(2, Math.min(26, cw * 0.62));
  const totales = meses.map((_, i) => series.reduce((s, se) => s + (se.valores[i] || 0), 0));
  const cimas = totales.map((t, i) => Math.max(t, interior ? interior.valores[i] || 0 : 0));
  const { tope, paso } = escalaEje(Math.max(0, ...cimas));
  const y = (v) => T + altoUtil * (1 - v / tope);
  const conAnio = new Set(meses.map((m) => m.slice(0, 4))).size > 1;
  const cada = pasoEtiquetas(n, (W - L - R) / (conAnio ? 46 : 30));
  const marcas = [];
  for (let v = 0; v <= tope; v += paso) marcas.push(v);

  const indice = activo !== null && activo < n ? activo : null;
  const tip = indice !== null ? detalle(indice) : null;
  const cx = indice !== null ? L + indice * cw + cw / 2 : 0;
  const desplazamiento = cx < 110 ? "-14px" : cx > W - 110 ? "calc(-100% + 14px)" : "-50%";
  const textoTip = tip
    ? `${tip.titulo}: ${tip.filas.map((f) => `${f.label} ${f.valor}`).join(", ")}${tip.pie ? `. ${tip.pie}` : ""}`
    : "";

  const onKeyDown = (e) => {
    if (!n) return;
    let siguiente = null;
    if (e.key === "ArrowRight") siguiente = indice === null ? 0 : Math.min(n - 1, indice + 1);
    else if (e.key === "ArrowLeft") siguiente = indice === null ? n - 1 : Math.max(0, indice - 1);
    else if (e.key === "Home") siguiente = 0;
    else if (e.key === "End") siguiente = n - 1;
    else if (e.key === "Escape") setActivo(null);
    if (siguiente !== null) {
      e.preventDefault();
      setActivo(siguiente);
    }
  };

  return (
    <div ref={envolturaRef} className="relative" onMouseLeave={() => setActivo(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`block h-auto w-full rounded-md ${FOCO}`}
        role="img"
        aria-label={`${etiqueta}. Con el foco en la gráfica, las flechas recorren los meses.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActivo(null)}
      >
        {marcas.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#CBD2DC" : "#EEF1F5"} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#8792A7">
              {fmt.format(v)}
            </text>
          </g>
        ))}
        {indice !== null && (
          <rect x={L + indice * cw + 1} y={T} width={Math.max(0, cw - 2)} height={altoUtil} rx={4} fill="#F1F4F9" />
        )}
        {meses.map((mes, i) => {
          const x = L + i * cw + (cw - bw) / 2;
          const visibles = series.filter((s) => (s.valores[i] || 0) > 0);
          const valorInterior = interior ? interior.valores[i] || 0 : 0;
          const margen = Math.min(4, bw * 0.22);
          let base = 0;
          return (
            <g key={mes}>
              {visibles.map((s, k) => {
                const v = s.valores[i];
                const y0 = y(base);
                const y1 = y(base + v);
                // 1,5 px de separación entre tramos apilados.
                const alto = Math.max(0, y0 - y1 - (k > 0 ? 1.5 : 0));
                base += v;
                return k === visibles.length - 1 ? (
                  <path key={s.key} d={topeRedondeado(x, y1, bw, alto, 4)} fill={s.color} />
                ) : (
                  <rect key={s.key} x={x} y={y1} width={bw} height={alto} fill={s.color} />
                );
              })}
              {valorInterior > 0 && (
                <path
                  d={topeRedondeado(x + margen, y(valorInterior), bw - 2 * margen, y(0) - y(valorInterior), 3)}
                  fill={interior.color}
                />
              )}
              {(Number(mes.slice(5, 7)) - 1) % cada === 0 && (
                <text x={L + i * cw + cw / 2} y={H - 7} textAnchor="middle" fontSize={11} fill="#8792A7">
                  {etiquetaMes(mes, conAnio)}
                </text>
              )}
            </g>
          );
        })}
        {meses.map((mes, i) => (
          <rect
            key={`zona-${mes}`}
            x={L + i * cw}
            y={T}
            width={cw}
            height={altoUtil + B}
            fill="transparent"
            onMouseEnter={() => setActivo(i)}
            onClick={() => setActivo(i)}
          />
        ))}
      </svg>

      {tip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-[#1B2335] px-2.5 py-2 text-[12px] leading-[1.35] text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)]"
          style={{ left: cx, top: y(cimas[indice]), transform: `translate(${desplazamiento}, calc(-100% - 8px))` }}
        >
          <span className="mb-0.5 block font-bold">{tip.titulo}</span>
          {tip.filas.map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: f.color }} />
              {f.label}: <span className="font-semibold tabular-nums">{f.valor}</span>
            </span>
          ))}
          {tip.pie && <span className="mt-1 block border-t border-white/20 pt-1 font-semibold tabular-nums">{tip.pie}</span>}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {textoTip}
      </p>
    </div>
  );
}

// Barras horizontales de tickets sin cerrar por estado.
function BarrasEstado({ filas }) {
  const envolturaRef = useRef(null);
  const W = useAncho(envolturaRef);
  const L = 132;
  const R = 52;
  const altoFila = 34;
  const H = filas.length * altoFila + 4;
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  const etiqueta = `Tickets sin cerrar por estado: ${filas.map((f) => `${f.label} ${fmt.format(f.valor)}`).join(", ")}`;

  return (
    <div ref={envolturaRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={etiqueta}>
        {filas.map((f, i) => {
          const yy = i * altoFila + 4;
          const ancho = f.valor > 0 ? Math.max(3, ((W - L - R) * f.valor) / maximo) : 0;
          const alerta = f.alerta && f.valor > 0;
          return (
            <g key={f.key}>
              <text x={0} y={yy + 18} fontSize={12} fontWeight={alerta ? 700 : 500} fill={alerta ? "#B45309" : "#475569"}>
                {alerta ? "⚠ " : ""}
                {f.label}
              </text>
              <rect x={L} y={yy + 5} width={Math.max(0, W - L - R)} height={18} rx={4} fill="#F4F6F9" />
              {ancho > 0 && <rect x={L} y={yy + 5} width={ancho} height={18} rx={4} fill={alerta ? "#D97706" : NAVY} />}
              <text x={L + ancho + 8} y={yy + 18} fontSize={12} fontWeight={600} fill="#1B2335">
                {fmt.format(f.valor)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Tabla con los mismos datos de una gráfica mensual (accesible y copiable).
function TablaMensual({ meses, columnas }) {
  const totales = columnas.map((c) => c.valores.reduce((s, v) => s + (v || 0), 0));
  return (
    <details className="text-[12.5px]">
      <summary className={`w-fit cursor-pointer rounded font-semibold text-[#2563EB] hover:underline ${FOCO}`}>
        Ver datos en tabla
      </summary>
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-[#E2E7EE] text-[11.5px] text-[#5E6A82]">
              <th scope="col" className="px-1.5 py-1 text-left font-semibold">Mes</th>
              {columnas.map((c) => (
                <th key={c.label} scope="col" className="px-1.5 py-1 text-right font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meses.map((mes, i) => (
              <tr key={mes} className="border-b border-[#EEF1F5]">
                <th scope="row" className="px-1.5 py-1 text-left font-normal">{mesLargo(mes)}</th>
                {columnas.map((c) => (
                  <td key={c.label} className="px-1.5 py-1 text-right">{fmt.format(c.valores[i] || 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" className="px-1.5 py-1 text-left">Total</th>
              {totales.map((v, k) => (
                <td key={columnas[k].label} className="px-1.5 py-1 text-right">{fmt.format(v)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}

// ─── Piezas de interfaz ─────────────────────────────────────────────────────
function Pulso({ className = "" }) {
  return <div className={`animate-pulse rounded bg-[#EEF1F6] ${className}`} />;
}

// Contenedor blanco de cada bloque. `subtitulo === null` muestra un esqueleto.
function Panel({ titulo, subtitulo, acciones, children, className = "" }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid min-w-0 content-start gap-2.5 rounded-[18px] border border-[#E2E7EE] bg-white p-4 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 id={id} className="text-[14px]! font-bold leading-snug! text-[#1B2335]">
            {titulo}
          </h2>
          {subtitulo === null ? (
            <Pulso className="mt-1.5 h-3 w-56 max-w-full" />
          ) : (
            subtitulo && <p className="mt-0.5 text-[12px] text-[#5E6A82]">{subtitulo}</p>
          )}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

function Kpi({ titulo, valor, sub, alerta = false }) {
  return (
    <div className="grid content-start gap-0.5 rounded-[18px] border border-[#E2E7EE] bg-white px-4 py-3">
      <span className="text-[12px] font-semibold text-[#5E6A82]">{titulo}</span>
      <span className="text-[34px] font-bold leading-[1.05] tabular-nums text-[#1B2335]" style={{ fontFamily: FONT_DISPLAY }}>
        {valor}
      </span>
      {sub === null ? <Pulso className="mt-1 h-3 w-32" /> : <span className="text-[12px] tabular-nums text-[#5E6A82]">{sub}</span>}
      {alerta && (
        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-[#FFF4E0] px-1.5 py-px text-[11.5px] font-semibold text-[#B45309]">
          ⚠ Revisar
        </span>
      )}
    </div>
  );
}

// Número grande con rótulo, para las pestañas de detalle.
function Cifra({ titulo, valor, color = "#1B2335", acento }) {
  return (
    <div
      className="rounded-[14px] border border-[#E2E7EE] bg-[#FBFCFE] px-3.5 py-3"
      style={acento ? { boxShadow: `inset 3px 0 0 ${acento}` } : undefined}
    >
      <p className="text-[12px] font-semibold text-[#5E6A82]">{titulo}</p>
      <p className="text-[30px] font-bold leading-tight tabular-nums" style={{ fontFamily: FONT_DISPLAY, color }}>
        {valor}
      </p>
    </div>
  );
}

function Leyenda({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#5E6A82]">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          <span className={it.extra ? "font-semibold text-[#1B2335]" : undefined}>{it.label}</span>
          {it.extra && <span className="tabular-nums">{it.extra}</span>}
        </li>
      ))}
    </ul>
  );
}

function Vacio({ children }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[#D5DCE6] px-3 py-7 text-center text-[13px] text-[#5E6A82]">
      {children}
    </div>
  );
}

function Aviso({ titulo, texto, onReintentar }) {
  return (
    <div role="alert" className="grid justify-items-center gap-2 rounded-[18px] border border-[#E2E7EE] bg-white px-4 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-[#B45309]" aria-hidden="true" />
      <p className="text-[14px] font-semibold text-[#1B2335]">{titulo}</p>
      {texto && <p className="max-w-md text-[12.5px] text-[#5E6A82]">{texto}</p>}
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className={`mt-1 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9E0EA] bg-white px-4 text-[13px] font-semibold text-[#334155] hover:bg-[#F6F8FB] ${FOCO}`}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

function BotonExportar({ onClick, cargando, etiqueta = "Exportar Excel", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cargando}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[#2A377E] px-3.5 text-[13px] font-semibold text-white hover:bg-[#222C6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {cargando ? "Exportando…" : etiqueta}
    </button>
  );
}

function OpcionExportar({ icono, titulo, descripcion, onClick, cargando, etiqueta }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#E2E7EE] bg-[#FBFCFE] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#EEF3FF] text-[#2A377E]">
          {icono}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-[#1B2335]">{titulo}</p>
          <p className="mt-0.5 text-[12px] text-[#5E6A82]">{descripcion}</p>
        </div>
      </div>
      <BotonExportar onClick={onClick} cargando={cargando} etiqueta={etiqueta} className="mt-auto w-full" />
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────
export default function DashboardUnificado() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hoy = useMemo(() => isoLocal(new Date()), []);
  const anioActual = Number(hoy.slice(0, 4));
  const filtros = useMemo(() => leerFiltros(searchParams, anioActual), [searchParams, anioActual]);
  const periodo = useMemo(() => periodoDe(filtros), [filtros]);
  // Año del plan preventivo (exportación y pestaña Equipos): el elegido, o el de «hasta» en un rango.
  const anioReferencia = filtros.rango ? Number(filtros.rango.hasta.slice(0, 4)) : filtros.anio;

  const [tab, setTab] = useState("resumen");
  const [sedes, setSedes] = useState([]);

  // Resumen: una sola petición a /v1/dashboard/resumen por combinación de filtros.
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [anios, setAnios] = useState([]);
  const [reintentos, setReintentos] = useState(0);
  const peticionRef = useRef(0);

  const [rangoAbierto, setRangoAbierto] = useState(false);
  const [borrador, setBorrador] = useState({ desde: "", hasta: "" });
  const [errorRango, setErrorRango] = useState(null);

  // Pestaña Equipos: se carga solo cuando está activa.
  const [equipos, setEquipos] = useState({ datos: null, cargando: false, error: false });
  const equiposClaveRef = useRef(null);
  const equiposPeticionRef = useRef(0);

  const [exportLoading, setExportLoading] = useState({ correctivos: false, preventivos: false, calibraciones: false });
  const [modalTicketsOpen, setModalTicketsOpen] = useState(false);

  const idPeriodo = useId();
  const idSede = useId();
  const idLinea = useId();
  const idRango = useId();

  const permitidas = resumen?.lineas_permitidas?.length ? resumen.lineas_permitidas : TODAS_LAS_LINEAS;
  const lineasEfectivas = filtros.lineas.filter((id) => permitidas.includes(id));
  const sinLineas = lineasEfectivas.length === 0;

  // Parámetros de la consulta serializados: solo se vuelve a pedir si cambian de verdad.
  const consulta = useMemo(() => {
    const p = periodo.anio ? { anio: periodo.anio } : { desde: periodo.desde, hasta: periodo.hasta };
    if (filtros.sede !== "all") p.sede_id = filtros.sede;
    if (!mismoConjunto(filtros.lineas, TODAS_LAS_LINEAS)) p.lineas = filtros.lineas.join(",");
    return JSON.stringify(p);
  }, [periodo, filtros.sede, filtros.lineas]);

  // ── Catálogo de sedes (una vez) ───────────────────────────
  useEffect(() => {
    let vivo = true;
    httpService
      .get("/v1/sedes", { params: { per_page: 100 } })
      .then((res) => {
        const lista = res?.data?.data?.data || res?.data?.data || [];
        if (vivo) setSedes(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => console.error("Error cargando sedes:", err)); // sin sedes el filtro solo ofrece «Todas»
    return () => {
      vivo = false;
    };
  }, []);

  // ── Resumen del periodo ───────────────────────────────────
  useEffect(() => {
    // El contador descarta respuestas de filtros anteriores; el abort ahorra la petición.
    const id = ++peticionRef.current;
    if (sinLineas) {
      setCargando(false);
      setError(null);
      return undefined;
    }
    const control = new AbortController();
    setCargando(true);
    setError(null);
    httpService
      .get("/v1/dashboard/resumen", { params: JSON.parse(consulta), signal: control.signal })
      .then((res) => {
        if (id !== peticionRef.current) return;
        if (res?.data?.success && res.data.data) {
          setResumen(res.data.data);
          if (Array.isArray(res.data.data.anios_disponibles)) setAnios(res.data.data.anios_disponibles);
        } else {
          setError({ mensaje: res?.data?.message || "No se pudo cargar el resumen del dashboard." });
        }
      })
      .catch((err) => {
        if (id !== peticionRef.current) return;
        console.error("Error cargando el resumen del dashboard:", err);
        const status = err?.response?.status;
        if (status === 403) {
          setError({ prohibido: true, mensaje: "Solo los administradores pueden ver el dashboard." });
        } else {
          setError({
            status,
            mensaje: (status === 422 && err.response?.data?.message) || "No se pudo cargar el resumen del dashboard.",
          });
        }
      })
      .finally(() => {
        if (id === peticionRef.current) setCargando(false);
      });
    return () => control.abort();
  }, [consulta, sinLineas, reintentos]);

  // ── Equipos (pestaña perezosa) ────────────────────────────
  const claveEquipos = `${filtros.sede}|${anioReferencia}`;
  const cargarEquipos = useCallback(async () => {
    const id = ++equiposPeticionRef.current;
    equiposClaveRef.current = claveEquipos;
    setEquipos((prev) => ({ ...prev, cargando: true, error: false }));
    const base = { per_page: 1, ...(filtros.sede !== "all" ? { sede_id: filtros.sede } : {}) };
    const total = (r) => r?.data?.data?.total || r?.data?.total || 0;
    try {
      const [eqRes, planRes, sinRes, comRes] = await Promise.all([
        httpService.get(URL_EQUIPOS, { params: base }),
        httpService.get(URL_EQUIPOS, { params: { ...base, incluido_en_plan_anio: anioReferencia } }),
        httpService.get(URL_EQUIPOS, { params: { ...base, no_incluido_en_plan_anio: anioReferencia } }),
        // El conteo de comodato es opcional: si falla se muestra «—».
        httpService.get(URL_EQUIPOS, { params: { ...base, tadquisicion_id: 4 } }).catch(() => null),
      ]);
      if (id !== equiposPeticionRef.current) return;
      setEquipos({
        datos: {
          total: total(eqRes),
          enPlan: total(planRes),
          sinPlan: total(sinRes),
          comodato: comRes ? total(comRes) : null,
        },
        cargando: false,
        error: false,
      });
    } catch (err) {
      if (id !== equiposPeticionRef.current) return;
      console.error("Error cargando los indicadores de equipos:", err);
      equiposClaveRef.current = null; // al volver a la pestaña se intenta de nuevo
      setEquipos({ datos: null, cargando: false, error: true });
    }
  }, [claveEquipos, filtros.sede, anioReferencia]);

  useEffect(() => {
    if (tab !== "equipos" || equiposClaveRef.current === claveEquipos) return;
    cargarEquipos();
  }, [tab, claveEquipos, cargarEquipos]);

  // ── Cambios de filtros (van a la URL) ─────────────────────
  const actualizar = useCallback(
    (cambios) =>
      setSearchParams((prev) => escribirFiltros(prev, { ...leerFiltros(prev, anioActual), ...cambios }, anioActual), {
        replace: true,
      }),
    [setSearchParams, anioActual]
  );

  const elegirAnio = (anio) => {
    actualizar({ anio, rango: null });
    setRangoAbierto(false);
    setErrorRango(null);
  };

  const alternarRango = () => {
    if (!rangoAbierto) {
      setBorrador(
        filtros.rango
          ? { ...filtros.rango }
          : { desde: periodo.desde, hasta: periodo.hasta < hoy ? periodo.hasta : hoy < periodo.desde ? periodo.hasta : hoy }
      );
    }
    setErrorRango(null);
    setRangoAbierto((v) => !v);
  };

  const aplicarRango = (e) => {
    e.preventDefault();
    const problema = validarRango(borrador.desde, borrador.hasta);
    if (problema) {
      setErrorRango(problema);
      return;
    }
    actualizar({ rango: { desde: borrador.desde, hasta: borrador.hasta } });
    setErrorRango(null);
    setRangoAbierto(false);
  };

  const alternarLinea = (id) =>
    actualizar({
      lineas: filtros.lineas.includes(id)
        ? filtros.lineas.filter((l) => l !== id)
        : [...filtros.lineas, id].sort((a, b) => a - b),
    });

  const limpiarFiltros = () => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        CLAVES_URL.forEach((clave) => sp.delete(clave));
        return sp;
      },
      { replace: true }
    );
    setRangoAbierto(false);
    setErrorRango(null);
  };

  const hayFiltros =
    !!filtros.rango || filtros.anio !== anioActual || filtros.sede !== "all" || !mismoConjunto(lineasEfectivas, permitidas);

  // Hasta 5 años con datos (los más recientes); antes de la primera respuesta, el actual.
  const aniosBotones = useMemo(() => {
    const recientes = anios.map(Number).filter(Number.isInteger).sort((a, b) => b - a).slice(0, 5);
    const lista = new Set(recientes.length ? recientes : [anioActual]);
    if (!filtros.rango) lista.add(filtros.anio);
    return [...lista].sort((a, b) => a - b);
  }, [anios, anioActual, filtros.rango, filtros.anio]);

  // ── Exportaciones ─────────────────────────────────────────
  const sedeElegida = sedes.find((s) => String(s.id) === filtros.sede);
  const nombreSede = filtros.sede === "all" ? "" : sedeElegida?.name || sedeElegida?.nombre || "";
  const sedeParams = filtros.sede !== "all" ? { sede_id: filtros.sede } : {};

  const makeExporter = (key, endpoint, filename, textos, extraParams = {}) => async () => {
    const idToast = `export-${key}`;
    try {
      setExportLoading((prev) => ({ ...prev, [key]: true }));
      toast.loading(textos.cargando, { id: idToast });
      const response = await httpService.get(endpoint, {
        params: { ...extraParams, ...sedeParams },
        responseType: "blob",
        timeout: 300000,
        headers: { Accept: XLSX_MIME },
      });
      descargarArchivo(response.data, `${filename}_${isoLocal(new Date())}.xlsx`);
      toast.success(textos.exito, { id: idToast });
    } catch (err) {
      console.error(`Error exportando ${key}:`, err);
      toast.error(await mensajeDeError(err, textos.error), { id: idToast });
    } finally {
      setExportLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleExportCorrectivos = makeExporter("correctivos", "/v1/correctivos-generales/export-excel", "Correctivos_Generales", {
    cargando: "Exportando correctivos…",
    exito: "Correctivos exportados",
    error: "No se pudieron exportar los correctivos",
  });
  const handleExportPreventivos = makeExporter(
    "preventivos",
    "/v1/planes-mantenimientos/export-excel",
    `Preventivos_${anioReferencia}`,
    {
      cargando: `Exportando el plan preventivo ${anioReferencia}…`,
      exito: "Plan preventivo exportado",
      error: "No se pudo exportar el plan preventivo",
    },
    { anio: anioReferencia }
  );
  const handleExportCalibraciones = makeExporter("calibraciones", "/v1/export/calibraciones", "Calibraciones", {
    cargando: "Exportando calibraciones…",
    exito: "Calibraciones exportadas",
    error: "No se pudieron exportar las calibraciones",
  });

  // ── Estado de los datos ───────────────────────────────────
  const prohibido = !!error?.prohibido;
  const sinLineasEnDatos = !sinLineas && !cargando && !error && resumen && resumen.lineas?.length === 0;
  const listo = !sinLineas && !cargando && !error && !!resumen && !sinLineasEnDatos;
  const d = listo ? resumen : null;
  const lineasDatos = d ? LINEAS.filter((l) => d.lineas.includes(l.id)) : [];
  const periodoTexto = textoPeriodo(periodo, hoy);
  const num = (valor) => {
    if (!listo) return "…";
    if (valor === null || valor === undefined) return "—";
    return fmt.format(valor);
  };

  // ── Bloques de cada pestaña ───────────────────────────────
  const bloqueSinDatos = () => {
    if (sinLineas || sinLineasEnDatos) {
      return (
        <Vacio>
          <span className="block text-[14px] font-semibold text-[#1B2335]">Activa al menos una línea</span>
          Elige Biomédico, Industrial o Infraestructura en la barra de filtros para ver los indicadores.
        </Vacio>
      );
    }
    if (error?.status === 422) {
      // Filtro inválido (p. ej. un enlace editado a mano): reintentar no sirve.
      return <Aviso titulo={error.mensaje} texto="Revisa los filtros o usa «Limpiar filtros»." />;
    }
    if (error) {
      return <Aviso titulo={error.mensaje} texto="Revisa la conexión e inténtalo de nuevo." onReintentar={() => setReintentos((n) => n + 1)} />;
    }
    return null;
  };

  const renderResumen = () => {
    const t = d?.tickets;
    const p = d?.preventivo;
    const c = d?.calibraciones;

    const kpiPreventivo = !p
      ? { valor: "…", sub: null }
      : !p.aplica
      ? { valor: "—", sub: "No aplica a infraestructura" }
      : !p.programadas
      ? { valor: "—", sub: "Sin plan cargado para el periodo" }
      : {
          valor: `${fmt1.format(p.porcentaje ?? (p.cumplidas * 100) / p.programadas)} %`,
          sub: `${fmt.format(p.cumplidas)} de ${fmt.format(p.programadas)} programaciones`,
        };
    const kpiCalibraciones = !c
      ? { valor: "…", sub: null }
      : !c.aplica
      ? { valor: "—", sub: "No aplica a infraestructura" }
      : { valor: fmt.format(c.total), sub: `${fmt.format(c.equipos)} ${c.equipos === 1 ? "equipo calibrado" : "equipos calibrados"}` };

    const kpis = [
      { titulo: "Tickets creados", valor: num(t?.creados), sub: t ? `≈ ${fmt1.format(t.promedio_dia || 0)} por día` : null },
      { titulo: "Sin cerrar", valor: num(t?.sin_cerrar), sub: t ? "De los creados en el periodo" : null },
      {
        titulo: "Esperando cierre",
        valor: num(t?.por_estado?.esperando_cierre),
        sub: t ? "Enviados a cierre sin confirmar" : null,
        alerta: (t?.por_estado?.esperando_cierre || 0) > 0,
      },
      { titulo: "Cumplimiento preventivo", ...kpiPreventivo },
      { titulo: "Calibraciones", ...kpiCalibraciones },
    ];

    const esqueleto = <Pulso className="h-[220px] rounded-xl" />;
    const meses = d?.meses || [];
    const dias = d?.periodo?.dias || 0;

    // Tickets por mes
    let graficaTickets = esqueleto;
    let leyendaTickets = null;
    if (t) {
      const porMes = t.por_mes || [];
      const apiladas = ORDEN_APILADO.filter((id) => d.lineas.includes(id)).map((id) => {
        const l = LINEAS.find((x) => x.id === id);
        return { key: l.key, label: l.label, color: l.color, valores: porMes.map((m) => m[l.key] || 0) };
      });
      const totalMes = (i) => lineasDatos.reduce((s, l) => s + (porMes[i]?.[l.key] || 0), 0);
      leyendaTickets = (
        <Leyenda
          items={lineasDatos.map((l) => {
            const total = t.por_linea?.[l.key] || 0;
            return { label: l.label, color: l.color, extra: `${fmt.format(total)}${dias > 0 ? ` · ${fmt1.format(total / dias)}/día` : ""}` };
          })}
        />
      );
      graficaTickets = !t.creados ? (
        <Vacio>No hay tickets creados en el periodo.</Vacio>
      ) : (
        <>
          <BarrasMensuales
            meses={meses}
            series={apiladas}
            etiqueta="Tickets creados por mes, apilados por línea"
            detalle={(i) => ({
              titulo: mesLargo(meses[i]),
              filas: lineasDatos.map((l) => ({ label: l.label, color: l.color, valor: fmt.format(porMes[i]?.[l.key] || 0) })),
              pie: lineasDatos.length > 1 ? `Total: ${fmt.format(totalMes(i))}` : null,
            })}
          />
          <TablaMensual
            meses={meses}
            columnas={[
              ...lineasDatos.map((l) => ({ label: l.label, valores: porMes.map((m) => m[l.key] || 0) })),
              ...(lineasDatos.length > 1 ? [{ label: "Total", valores: meses.map((_, i) => totalMes(i)) }] : []),
            ]}
          />
        </>
      );
    }

    // Tickets sin cerrar por estado
    let subEstado = null;
    let graficaEstado = esqueleto;
    if (t) {
      const cerrados = t.por_estado?.cerrado || 0;
      subEstado = t.creados
        ? `${fmt.format(cerrados)} cerrados (${fmt1.format((cerrados * 100) / t.creados)} %) — no se grafican para no aplastar a los pendientes`
        : "Sin tickets creados en el periodo";
      graficaEstado = !t.creados ? (
        <Vacio>No hay tickets creados en el periodo.</Vacio>
      ) : (
        <BarrasEstado
          filas={[
            { key: "abierto", label: "Abierto", valor: t.por_estado?.abierto || 0 },
            { key: "asignado", label: "Asignado", valor: t.por_estado?.asignado || 0 },
            { key: "diagnosticado", label: "Diagnosticado", valor: t.por_estado?.diagnosticado || 0 },
            { key: "esperando_cierre", label: "Esperando cierre", valor: t.por_estado?.esperando_cierre || 0, alerta: true },
          ]}
        />
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <Kpi key={k.titulo} {...k} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel
            titulo="Tickets creados por mes"
            subtitulo={!t ? null : lineasDatos.length > 1 ? "Apilados por línea" : `Línea ${lineasDatos[0]?.label.toLowerCase() || ""}`}
          >
            {leyendaTickets}
            {graficaTickets}
          </Panel>
          <Panel titulo="Tickets sin cerrar, por estado" subtitulo={subEstado}>
            {graficaEstado}
          </Panel>
          <Panel titulo="Cumplimiento del plan preventivo" subtitulo="Programaciones del plan con mantenimiento registrado en el mismo mes">
            {renderGraficaPreventivo(esqueleto)}
          </Panel>
          <Panel titulo="Calibraciones registradas por mes" subtitulo={textoCalibraciones()}>
            {renderGraficaCalibraciones(esqueleto)}
          </Panel>
        </div>
      </>
    );
  };

  const textoCalibraciones = () => {
    if (!d) return null;
    const bio = d.lineas.includes(1);
    const ind = d.lineas.includes(2);
    if (bio && ind) return "Biomédicas e industriales";
    if (bio) return "Biomédicas";
    if (ind) return "Industriales";
    return "Solo equipos biomédicos e industriales";
  };

  const renderGraficaPreventivo = (esqueleto) => {
    const p = d?.preventivo;
    if (!p) return esqueleto;
    if (!p.aplica) return <Vacio>No aplica a infraestructura: el plan preventivo es de equipos biomédicos e industriales.</Vacio>;
    if (!p.programadas) return <Vacio>Sin plan cargado para el periodo.</Vacio>;
    const porMes = p.por_mes || [];
    const programadas = porMes.map((m) => m.programadas || 0);
    const cumplidas = porMes.map((m) => m.cumplidas || 0);
    return (
      <>
        <Leyenda
          items={[
            { label: "Programadas", color: PISTA },
            { label: "Cumplidas", color: NAVY },
          ]}
        />
        <BarrasMensuales
          meses={d.meses}
          series={[{ key: "programadas", label: "Programadas", color: PISTA, valores: programadas }]}
          interior={{ label: "Cumplidas", color: NAVY, valores: cumplidas }}
          etiqueta="Programaciones del plan preventivo por mes y cuántas se cumplieron"
          detalle={(i) => ({
            titulo: mesLargo(d.meses[i]),
            filas: [
              { label: "Programadas", color: PISTA, valor: fmt.format(programadas[i]) },
              {
                label: "Cumplidas",
                color: NAVY,
                valor: `${fmt.format(cumplidas[i])}${programadas[i] ? ` (${fmt1.format((cumplidas[i] * 100) / programadas[i])} %)` : ""}`,
              },
            ],
            pie: null,
          })}
        />
        <TablaMensual
          meses={d.meses}
          columnas={[
            { label: "Programadas", valores: programadas },
            { label: "Cumplidas", valores: cumplidas },
          ]}
        />
      </>
    );
  };

  const renderGraficaCalibraciones = (esqueleto) => {
    const c = d?.calibraciones;
    if (!c) return esqueleto;
    if (!c.aplica) return <Vacio>No aplica a infraestructura: las calibraciones son de equipos biomédicos e industriales.</Vacio>;
    if (!c.total) return <Vacio>No hay calibraciones registradas en el periodo.</Vacio>;
    const porMes = c.por_mes || [];
    const lineasCal = lineasDatos.filter((l) => l.id !== 3);
    return (
      <>
        <BarrasMensuales
          meses={d.meses}
          series={[{ key: "total", label: "Calibraciones", color: NAVY, valores: porMes.map((m) => m.total || 0) }]}
          etiqueta="Calibraciones registradas por mes"
          detalle={(i) => ({
            titulo: mesLargo(d.meses[i]),
            filas: lineasCal.map((l) => ({ label: l.label, color: l.color, valor: fmt.format(porMes[i]?.[l.key] || 0) })),
            pie: `Total: ${fmt.format(porMes[i]?.total || 0)}`,
          })}
        />
        <TablaMensual
          meses={d.meses}
          columnas={[
            ...lineasCal.map((l) => ({ label: l.label, valores: porMes.map((m) => m[l.key] || 0) })),
            { label: "Total", valores: porMes.map((m) => m.total || 0) },
          ]}
        />
      </>
    );
  };

  const renderExportar = () => (
    <section aria-labelledby="dashboard-exportar" className="rounded-[18px] border border-[#E2E7EE] bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="dashboard-exportar" className="text-[14px]! font-bold leading-snug! text-[#1B2335]">
          Exportar
        </h2>
        <span className="text-[11.5px] text-[#5E6A82]">
          Excel · {nombreSede ? `sede ${nombreSede}` : "todas las sedes"} · las fechas del periodo no aplican, salvo el año del plan preventivo
        </span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <OpcionExportar
          icono={<Wrench className="h-[18px] w-[18px]" aria-hidden="true" />}
          titulo="Correctivos"
          descripcion="Todos los correctivos generales"
          onClick={handleExportCorrectivos}
          cargando={exportLoading.correctivos}
        />
        <OpcionExportar
          icono={<Ticket className="h-[18px] w-[18px]" aria-hidden="true" />}
          titulo="Tickets"
          descripcion="Consolidado por sede y tipo de ticket"
          onClick={() => setModalTicketsOpen(true)}
          cargando={false}
          etiqueta="Exportar Excel…"
        />
        <OpcionExportar
          icono={<CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />}
          titulo="Preventivos"
          descripcion={`Plan de mantenimiento ${anioReferencia}`}
          onClick={handleExportPreventivos}
          cargando={exportLoading.preventivos}
        />
        <OpcionExportar
          icono={<Gauge className="h-[18px] w-[18px]" aria-hidden="true" />}
          titulo="Calibraciones"
          descripcion="Todas las calibraciones registradas"
          onClick={handleExportCalibraciones}
          cargando={exportLoading.calibraciones}
        />
      </div>
    </section>
  );

  const renderCorrectivos = () => {
    const t = d?.tickets;
    if (!t) {
      return (
        <Panel titulo="Tickets correctivos creados en el periodo" subtitulo={null}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Pulso className="h-72 rounded-[14px]" />
            <Pulso className="h-72 rounded-[14px]" />
          </div>
        </Panel>
      );
    }
    const datosEstado = ESTADOS.map((e) => ({ name: e.label, value: t.por_estado?.[e.key] || 0, fill: e.color })).filter((x) => x.value > 0);
    const configEstado = Object.fromEntries(ESTADOS.map((e) => [e.label, { label: e.label, color: e.color }]));
    const datosLinea = lineasDatos
      .map((l) => ({ name: l.label, value: t.por_linea?.[l.key] || 0, fill: l.color }))
      .filter((x) => x.value > 0);
    const configLinea = Object.fromEntries(LINEAS.map((l) => [l.label, { label: l.label, color: l.color }]));
    return (
      <>
        <Panel
          titulo="Tickets correctivos creados en el periodo"
          subtitulo={`${fmt.format(t.creados)} ${t.creados === 1 ? "ticket" : "tickets"} · estado actual de cada uno`}
        >
          {!t.creados ? (
            <Vacio>No hay tickets creados en el periodo.</Vacio>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-[14px] border border-[#E2E7EE] p-3">
                <p className="text-center text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#5E6A82]">Por estado</p>
                <RoundedPieChart
                  chartData={datosEstado}
                  chartConfig={configEstado}
                  title=""
                  description={`Total: ${fmt.format(t.creados)} tickets`}
                  valueFormatter={(v) => fmt.format(v)}
                />
              </div>
              <div className="rounded-[14px] border border-[#E2E7EE] p-3">
                <p className="text-center text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#5E6A82]">Por línea</p>
                <RoundedPieChart
                  chartData={datosLinea}
                  chartConfig={configLinea}
                  title=""
                  description={lineasDatos.map((l) => l.label).join(" · ")}
                  valueFormatter={(v) => fmt.format(v)}
                />
              </div>
            </div>
          )}
        </Panel>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {ESTADOS.map((e) => (
            <Cifra key={e.key} titulo={e.plural} valor={fmt.format(t.por_estado?.[e.key] || 0)} acento={e.color} />
          ))}
        </div>
      </>
    );
  };

  const renderPreventivos = () => {
    const p = d?.preventivo;
    const acciones = (
      <BotonExportar onClick={handleExportPreventivos} cargando={exportLoading.preventivos} etiqueta={`Exportar plan ${anioReferencia}`} />
    );
    let contenido;
    if (!p) {
      contenido = (
        <div className="grid gap-3">
          <Pulso className="h-28 rounded-[14px]" />
          <Pulso className="h-[220px] rounded-xl" />
        </div>
      );
    } else if (!p.aplica) {
      contenido = <Vacio>No aplica a infraestructura: el plan preventivo es de equipos biomédicos e industriales.</Vacio>;
    } else if (!p.programadas) {
      contenido = <Vacio>Sin plan cargado para el periodo.</Vacio>;
    } else {
      const porcentaje = p.porcentaje ?? (p.cumplidas * 100) / p.programadas;
      contenido = (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-[14px] bg-[#F6F8FB] p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
            <div>
              <p className="text-[12px] font-semibold text-[#5E6A82]">Cumplimiento</p>
              <p className="text-[52px] font-bold leading-none tabular-nums text-[#2A377E]" style={{ fontFamily: FONT_DISPLAY }}>
                {fmt1.format(porcentaje)} %
              </p>
            </div>
            <div className="grid gap-2">
              <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-[#DCE3EE]">
                <div className="h-full rounded-full bg-[#2A377E]" style={{ width: `${Math.min(100, porcentaje)}%` }} />
              </div>
              <p className="text-[12.5px] tabular-nums text-[#5E6A82]">
                {fmt.format(p.cumplidas)} de {fmt.format(p.programadas)} programaciones cumplidas
              </p>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Cifra titulo="Programadas" valor={fmt.format(p.programadas)} />
            <Cifra titulo="Cumplidas" valor={fmt.format(p.cumplidas)} color={NAVY} />
            <Cifra titulo="Sin cumplir" valor={fmt.format(Math.max(0, p.programadas - p.cumplidas))} />
          </div>
          <p className="rounded-[12px] border border-[#E2E7EE] px-3 py-2.5 text-[12.5px] text-[#5E6A82]">
            <span className="font-semibold text-[#1B2335]">Cómo se calcula. </span>
            Programaciones del plan con mantenimiento registrado en el mismo mes: cada mes marcado en el plan de un equipo es
            una programación, y cuenta como cumplida si ese equipo tiene un mantenimiento registrado dentro de ese mes.
          </p>
          {renderGraficaPreventivo(null)}
        </div>
      );
    }
    return (
      <Panel titulo="Mantenimiento preventivo" subtitulo={periodoTexto} acciones={acciones}>
        {contenido}
      </Panel>
    );
  };

  const renderCalibraciones = () => {
    const c = d?.calibraciones;
    const acciones = (
      <BotonExportar onClick={handleExportCalibraciones} cargando={exportLoading.calibraciones} etiqueta="Exportar calibraciones" />
    );
    let contenido;
    if (!c) {
      contenido = (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Pulso key={i} className="h-20 rounded-[14px]" />
            ))}
          </div>
          <Pulso className="h-[220px] rounded-xl" />
        </div>
      );
    } else if (!c.aplica) {
      contenido = <Vacio>No aplica a infraestructura: las calibraciones son de equipos biomédicos e industriales.</Vacio>;
    } else {
      const conBio = d.lineas.includes(1);
      const conInd = d.lineas.includes(2);
      const suma = (c.biomedico || 0) + (c.industrial || 0);
      const pctBio = suma > 0 ? ((c.biomedico || 0) * 100) / suma : 0;
      contenido = (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Cifra titulo="Total" valor={fmt.format(c.total)} />
            {conBio && <Cifra titulo="Biomédicas" valor={fmt.format(c.biomedico || 0)} acento={LINEAS[0].color} />}
            {conInd && <Cifra titulo="Industriales" valor={fmt.format(c.industrial || 0)} acento={LINEAS[1].color} />}
            <Cifra titulo="Equipos calibrados" valor={fmt.format(c.equipos || 0)} />
          </div>
          {conBio && conInd && suma > 0 && (
            <div className="grid gap-1.5">
              <div className="flex flex-wrap justify-between gap-2 text-[12px] tabular-nums text-[#5E6A82]">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: LINEAS[0].color }} />
                  Biomédicas {fmt.format(c.biomedico || 0)} ({fmt1.format(pctBio)} %)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: LINEAS[1].color }} />
                  Industriales {fmt.format(c.industrial || 0)} ({fmt1.format(100 - pctBio)} %)
                </span>
              </div>
              <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[#EEF1F5]">
                <div className="h-full" style={{ width: `${pctBio}%`, background: LINEAS[0].color }} />
                <div className="h-full" style={{ width: `${100 - pctBio}%`, background: LINEAS[1].color }} />
              </div>
            </div>
          )}
          {renderGraficaCalibraciones(null)}
        </div>
      );
    }
    return (
      <Panel titulo="Calibraciones" subtitulo={periodoTexto} acciones={acciones}>
        {contenido}
      </Panel>
    );
  };

  const renderEquipos = () => {
    const e = equipos.datos;
    const cifras = [
      { titulo: "Total registrados", valor: e?.total },
      { titulo: `En plan preventivo ${anioReferencia}`, valor: e?.enPlan },
      { titulo: "En comodato", valor: e?.comodato },
      { titulo: `Sin plan preventivo ${anioReferencia}`, valor: e?.sinPlan },
    ];
    return (
      <Panel
        titulo="Equipos"
        subtitulo={`Inventario actual${nombreSede ? ` de la sede ${nombreSede}` : ""}. No depende de la línea ni de las fechas del periodo, salvo el año del plan preventivo.`}
      >
        {equipos.error ? (
          <Aviso titulo="No se pudieron cargar los indicadores de equipos." onReintentar={cargarEquipos} />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {cifras.map((c) =>
              equipos.cargando || !e ? (
                <Pulso key={c.titulo} className="h-[86px] rounded-[14px]" />
              ) : (
                <Cifra key={c.titulo} titulo={c.titulo} valor={c.valor === null || c.valor === undefined ? "—" : fmt.format(c.valor)} />
              )
            )}
          </div>
        )}
      </Panel>
    );
  };

  const renderTab = () => {
    if (tab === "equipos") return renderEquipos();
    const sinDatos = bloqueSinDatos();
    if (tab === "resumen") {
      return (
        <>
          {sinDatos || renderResumen()}
          {renderExportar()}
        </>
      );
    }
    if (sinDatos) return sinDatos;
    if (tab === "correctivos") return renderCorrectivos();
    if (tab === "preventivos") return renderPreventivos();
    return renderCalibraciones();
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#F1F4F6] p-3 text-[#1B2335] sm:p-4 lg:p-6" style={{ fontFamily: FONT_UI }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3.5">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">Dashboard · Reportes</p>
            <h1 className="mt-1 text-[22px]! font-bold leading-tight! tracking-[-0.015em] sm:text-[24px]!">Dashboard de gestión</h1>
          </div>
          <p className="text-[13px] text-[#5E6A82]">
            {periodoTexto}
            {nombreSede ? ` · ${nombreSede}` : ""}
          </p>
        </header>

        {prohibido ? (
          <Aviso titulo={error.mensaje} />
        ) : (
          <>
            {/* ── Barra de filtros (fija bajo la barra de navegación) ── */}
            <section
              aria-label="Filtros del dashboard"
              className="sticky top-[4.5rem] z-30 grid gap-2 rounded-[14px] border border-[#E2E7EE] bg-white px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.5)]"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div role="group" aria-labelledby={idPeriodo} className="flex flex-wrap items-center gap-2">
                  <span id={idPeriodo} className={ROTULO_GRUPO}>
                    Periodo
                  </span>
                  <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-[9px] border border-[#D9E0EA]">
                    {aniosBotones.map((anio) => (
                      <button
                        key={anio}
                        type="button"
                        aria-pressed={!filtros.rango && filtros.anio === anio}
                        onClick={() => elegirAnio(anio)}
                        className={`h-8 border-r border-[#D9E0EA] px-2 text-[12.5px] font-semibold tabular-nums sm:px-2.5 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#93B4F8] ${
                          !filtros.rango && filtros.anio === anio ? "bg-[#2A377E] text-white" : "bg-white text-[#334155] hover:bg-[#F3F6FB]"
                        }`}
                      >
                        {anio}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-pressed={!!filtros.rango}
                      aria-expanded={rangoAbierto}
                      aria-controls={rangoAbierto ? idRango : undefined}
                      onClick={alternarRango}
                      className={`inline-flex h-8 items-center gap-1.5 px-2 text-[12.5px] font-semibold sm:px-2.5 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#93B4F8] ${
                        filtros.rango ? "bg-[#2A377E] text-white" : "bg-white text-[#334155] hover:bg-[#F3F6FB]"
                      }`}
                    >
                      <CalendarRange className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
                      Rango
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span id={idSede} className={ROTULO_GRUPO}>
                    Sede
                  </span>
                  <Select value={filtros.sede} onValueChange={(v) => actualizar({ sede: v })}>
                    <SelectTrigger
                      size="sm"
                      aria-labelledby={idSede}
                      className="w-[190px] max-w-[62vw] rounded-[9px] border-[#D9E0EA] bg-white text-[12.5px] font-semibold text-[#334155] shadow-none"
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

                {/* En el celular las líneas van al final para que «Limpiar filtros» quepa junto a la sede */}
                <div role="group" aria-labelledby={idLinea} className="flex flex-wrap items-center gap-1.5 max-sm:order-last sm:gap-2">
                  <span id={idLinea} className={ROTULO_GRUPO}>
                    Línea
                  </span>
                  {LINEAS.filter((l) => permitidas.includes(l.id)).map((l) => {
                    const activa = filtros.lineas.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => alternarLinea(l.id)}
                        className={`inline-flex h-8 items-center gap-1 rounded-full border px-2 text-[12px] font-semibold sm:gap-[7px] sm:px-3 sm:text-[12.5px] ${FOCO} ${
                          activa
                            ? "border-[#D9E0EA] bg-white text-[#334155] hover:bg-[#F6F8FB]"
                            : "border-[#D9E0EA] bg-[#F6F8FB] text-[#98A2B3] hover:text-[#5E6A82]"
                        }`}
                      >
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: activa ? l.color : "#CBD2DC" }} />
                        {l.label}
                      </button>
                    );
                  })}
                </div>

                {hayFiltros && (
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className={`ml-auto inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-semibold text-[#2563EB] hover:underline ${FOCO}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Limpiar filtros
                  </button>
                )}
              </div>

              {rangoAbierto && (
                <form
                  id={idRango}
                  onSubmit={aplicarRango}
                  noValidate
                  className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[#EEF1F5] pt-2"
                >
                  <span className={ROTULO} aria-hidden="true">
                    Desde
                  </span>
                  <input
                    type="date"
                    aria-label="Desde"
                    value={borrador.desde}
                    min="2000-01-01"
                    max="2100-12-31"
                    onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value }))}
                    className={`h-8 rounded-[9px] border border-[#D9E0EA] bg-white px-2 text-[12.5px] text-[#334155] ${FOCO}`}
                  />
                  <span className={ROTULO} aria-hidden="true">
                    Hasta
                  </span>
                  <input
                    type="date"
                    aria-label="Hasta"
                    value={borrador.hasta}
                    min="2000-01-01"
                    max="2100-12-31"
                    onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value }))}
                    className={`h-8 rounded-[9px] border border-[#D9E0EA] bg-white px-2 text-[12.5px] text-[#334155] ${FOCO}`}
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-[9px] bg-[#2A377E] px-3 text-[12.5px] font-semibold text-white hover:bg-[#222C6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8] focus-visible:ring-offset-1"
                  >
                    Aplicar
                  </button>
                  <span className="text-[11.5px] text-[#8792A7]">Máximo 3 años</span>
                  {errorRango && (
                    <p role="alert" className="basis-full text-[12px] font-medium text-[#B42318]">
                      {errorRango}
                    </p>
                  )}
                </form>
              )}
            </section>

            {/* ── Pestañas ── */}
            <nav aria-label="Secciones del dashboard">
              <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[14px] border border-[#E2E7EE] bg-white p-1">
                {TABS.map((t) => {
                  const Icono = t.Icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={tab === t.key}
                      onClick={() => setTab(t.key)}
                      className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold sm:px-3.5 ${FOCO} ${
                        tab === t.key ? "bg-[#2A377E] text-white" : "text-[#5E6A82] hover:bg-[#F3F6FB] hover:text-[#1B2335]"
                      }`}
                    >
                      <Icono className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div aria-busy={cargando && !sinLineas} className="grid grid-cols-1 gap-3.5">
              {renderTab()}
            </div>
          </>
        )}
      </div>

      <ExportTicketsModal
        open={modalTicketsOpen}
        onOpenChange={setModalTicketsOpen}
        sedes={sedes}
        sedeInicial={filtros.sede}
        tiposIniciales={lineasEfectivas}
      />
    </div>
  );
}
