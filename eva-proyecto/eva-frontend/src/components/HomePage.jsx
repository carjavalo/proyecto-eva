"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  ExternalLink,
  Activity,
  Factory,
  Building2,
  CalendarDays,
  Ticket,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Send,
  UserCheck,
  Wrench,
  PenLine,
} from "lucide-react";
import httpService from "@/services/httpService";
import { useAuth } from "../contexts/AuthContext";
import { useAuth as usePermissions } from "../hooks/useAuth.jsx";
import HospitalTicketModal from "@/components/modals/hospital-ticket-modal";

const AVATARS_IMG = "/images/loadingavatars.png";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

// Tipografías del inicio (se cargan en index.html). Solo se usan en esta vista;
// si Google Fonts no carga, caen a la fuente del sistema.
const FONT_UI = '"Public Sans", system-ui, "Segoe UI", Roboto, sans-serif';
const FONT_DISPLAY = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

const fmt = new Intl.NumberFormat("es-CO");
const sinAcentos = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const CONECTORES = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "con", "para", "por", "en", "a", "o", "al", "sin"]);

/**
 * Nombre de una guía para mostrar: sin el prefijo redundante «Guía rápida de»
 * (todo el panel ya son guías) y con mayúsculas consistentes. En la base de datos
 * conviven «MONITOR DRAGUER VISTA XL» y «guía rapida de fuente de luz bl-7000».
 * Los códigos de modelo (con dígitos) y las siglas en mayúscula se respetan.
 */
function nombreGuia(raw) {
  const original = String(raw || "").replace(/\s+/g, " ").trim();
  const base = original.replace(/^gu[ií]a\s+r[aá]pida\s*(de\s+)?/i, "").trim() || original;
  return base
    .split(" ")
    .map((tok, i) => {
      if (/\d/.test(tok)) return /[A-Z]/.test(tok) ? tok : tok.toUpperCase();
      const lower = tok.toLocaleLowerCase("es");
      if (i > 0 && CONECTORES.has(lower)) return lower;
      const letras = tok.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
      if (letras.length > 0 && letras.length <= 3 && letras === letras.toUpperCase()) return tok;
      // Mayúscula inicial, también tras «/» o «-» (p. ej. «Refrigerador/Congelador»).
      return lower.replace(/(^|[/-])(\p{L})/gu, (_, sep, c) => sep + c.toLocaleUpperCase("es"));
    })
    .join(" ");
}

function saludoSegunHora(fecha) {
  const h = fecha.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaLarga(fecha) {
  const f = fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

const LINEAS_TICKET = [
  { tipo: "biomedico", label: "Biomédico", Icon: Activity },
  { tipo: "industrial", label: "Industrial", Icon: Factory },
  { tipo: "infraestructura", label: "Infraestructura", Icon: Building2 },
];

// Lo que ven los usuarios que no son administradores en lugar de los conteos de
// tickets. El paso 4 es el que más se olvida: sin la firma de quien recibe
// (obligatoria al enviar a cierre) el ticket no puede cerrarse.
const PASOS_REPORTE = [
  { titulo: "Reportas la falla", texto: "Eliges la línea y describes qué le pasa al equipo o al espacio.", Icon: Send },
  { titulo: "Se asigna un técnico", texto: "El área de mantenimiento recibe el ticket y lo asigna.", Icon: UserCheck },
  { titulo: "Diagnóstico y reparación", texto: "El técnico revisa el equipo y registra lo que hizo.", Icon: Wrench },
  { titulo: "Firmas el recibido", texto: "Al terminar, confirmas con tu firma que quedó funcionando. Sin esa firma el ticket no puede cerrarse.", Icon: PenLine, tuyo: true },
];

// Color del número según su estado; en cero se muestra neutro.
const TONO = {
  warn: "bg-[#FEF3C7] text-[#92400E]",
  crit: "bg-[#FEE4E2] text-[#B42318]",
  info: "bg-[#EEF3FF] text-[#1D4ED8]",
  cero: "bg-[#F1F4F8] text-[#5E6A82]",
};

export default function EvaDashboard() {
  const navigate = useNavigate();
  const { user, permissionService } = useAuth();
  const { loading: permissionsLoading } = usePermissions();

  const [guias, setGuias] = useState([]);
  const [loadingGuias, setLoadingGuias] = useState(true);
  const [errorGuias, setErrorGuias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [letra, setLetra] = useState(null);

  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);

  const [tipoTicket, setTipoTicket] = useState("biomedico");
  const [modalTicketOpen, setModalTicketOpen] = useState(false);

  const inputRef = useRef(null);
  const ahora = useMemo(() => new Date(), []);

  // Mismo criterio que el sidebar: nunca se ofrece un acceso a una página que el
  // usuario no puede abrir. Mientras cargan los permisos, los administradores
  // (rol ≤ 2) ven todo, igual que en Navbar.
  const puede = useCallback(
    (ruta) => {
      if (!user) return false;
      if (permissionsLoading) return user.rol_id <= 2;
      try {
        return !!permissionService?.canAccessRoute(ruta);
      } catch {
        return false;
      }
    },
    [user, permissionsLoading, permissionService]
  );

  // Las estadísticas de tickets solo las ven los administradores (roles 1 y 2),
  // el mismo criterio con el que el menú muestra «Dashboard».
  const esAdmin = !!user && Number(user.rol_id) <= 2;
  const esGestion = puede("/ordenes/gestion-tickets");
  const tieneMisTickets = puede("/ordenes/mis-tickets");
  const puedeReportar = esGestion || tieneMisTickets;
  const alcance = esAdmin ? "gestion" : "propio";

  // ── Guías rápidas ─────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        setLoadingGuias(true);
        setErrorGuias(false);
        const res = await httpService.get("/v1/guias-rapidas");
        const lista = Array.isArray(res?.data?.data) ? res.data.data : [];
        const preparadas = lista
          .filter((g) => g && g.name && String(g.name).trim())
          .map((g) => {
            const nombre = nombreGuia(g.name);
            const clave = sinAcentos(nombre);
            return { id: g.id, original: String(g.name).trim(), nombre, clave, inicial: /[a-z]/.test(clave[0]) ? clave[0] : "#" };
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        if (vivo) setGuias(preparadas);
      } catch (error) {
        console.error("❌ Error cargando guías rápidas:", error);
        if (vivo) setErrorGuias(true);
      } finally {
        if (vivo) setLoadingGuias(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // ── Resumen (conteos del inicio) ──────────────────────────
  const cargarResumen = useCallback(async () => {
    try {
      setLoadingResumen(true);
      const res = await httpService.get("/v1/inicio/resumen", { params: { alcance } });
      setResumen(res?.data?.success ? res.data.data : null);
    } catch (error) {
      console.error("❌ Error cargando el resumen del inicio:", error);
      setResumen(null);
    } finally {
      setLoadingResumen(false);
    }
  }, [alcance]);

  useEffect(() => {
    // El alcance depende solo del rol (disponible de inmediato), no de los permisos.
    if (!user) return;
    cargarResumen();
  }, [user, cargarResumen]);

  // ── Filtro y apertura de guías ────────────────────────────
  const terminos = useMemo(() => sinAcentos(busqueda).trim().split(/\s+/).filter(Boolean), [busqueda]);

  const guiasVisibles = useMemo(
    () => guias.filter((g) => (!letra || g.inicial === letra) && terminos.every((t) => g.clave.includes(t))),
    [guias, letra, terminos]
  );

  const iniciales = useMemo(() => [...new Set(guias.map((g) => g.inicial))].sort(), [guias]);

  const abrirGuia = (guia) => {
    try {
      window.open(`${API_BASE_URL}/v1/guias-rapidas/${guia.id}/archivo`, "_blank");
    } catch (error) {
      console.error("❌ Error abriendo guía:", error);
      toast.error("No se pudo abrir la guía rápida");
    }
  };

  // «/» enfoca el buscador desde cualquier parte de la página (salvo si ya se escribe en un campo).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = document.activeElement;
      const escribiendo = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (escribiendo || modalTicketOpen) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalTicketOpen]);

  const onKeyBuscador = (e) => {
    if (e.key === "Enter" && guiasVisibles[0]) {
      e.preventDefault();
      abrirGuia(guiasVisibles[0]);
    }
    if (e.key === "Escape") setBusqueda("");
  };

  const abrirReporte = (tipo) => {
    setTipoTicket(tipo);
    setModalTicketOpen(true);
  };

  // ── Datos derivados para la columna derecha ───────────────
  const num = (valor) => {
    if (loadingResumen && !resumen) return "…";
    if (valor === null || valor === undefined) return "—";
    return fmt.format(valor);
  };
  const tono = (valor, base) => (valor === 0 ? TONO.cero : TONO[base]);
  const t = resumen?.tickets;

  const rutaEquipos = puede("/equipos/biomedicos") ? "/equipos/biomedicos" : puede("/equipos/industriales") ? "/equipos/industriales" : null;

  const filasAtencion = esAdmin
    ? [
        { key: "cierre", valor: t?.esperando_cierre, base: "warn", titulo: "Esperando confirmación de cierre", sub: "Enviados a cierre sin confirmar", cta: "Revisar", ir: () => navigate("/ordenes/gestion-tickets", { state: { estado: "5" } }) },
        { key: "abiertos", valor: t?.abiertos, base: "crit", titulo: "Abiertos sin responsable", sub: "Tickets nuevos por asignar", cta: "Asignar", ir: () => navigate("/ordenes/gestion-tickets", { state: { estado: "1" } }) },
        { key: "asignados", valor: t?.asignados, base: "info", titulo: "Asignados en curso", sub: "Con técnico asignado", cta: "Ver", ir: () => navigate("/ordenes/gestion-tickets", { state: { estado: "2" } }) },
        { key: "diag", valor: t?.diagnosticados, base: "info", titulo: "Diagnosticados", sub: "Pendientes de reparación", cta: "Ver", ir: () => navigate("/ordenes/gestion-tickets", { state: { estado: "3" } }) },
        ...(rutaEquipos
          ? [{ key: "calib", valor: resumen?.calibraciones_vencidas, base: "warn", titulo: "Calibración vencida", sub: "Sin registro en los últimos 12 meses", cta: "Ver", ir: () => navigate(rutaEquipos) }]
          : []),
      ]
    : [];

  const accesos = [
    { ruta: "/equipos/biomedicos", Icon: Activity, label: "Equipos biomédicos", sub: resumen ? `${fmt.format(resumen.equipos.biomedicos)} equipos` : "Inventario" },
    { ruta: "/equipos/industriales", Icon: Factory, label: "Equipos industriales", sub: resumen ? `${fmt.format(resumen.equipos.industriales)} equipos` : "Inventario" },
    { ruta: "/planes/preventivo", Icon: CalendarDays, label: "Mantenimiento preventivo", sub: `Cronograma ${ahora.getFullYear()}` },
    { ruta: "/ordenes/mis-tickets", Icon: Ticket, label: "Mis tickets", sub: "Tus solicitudes" },
    { ruta: "/equipos/manuales", Icon: BookOpen, label: "Manuales", sub: resumen ? `${fmt.format(resumen.manuales)} manuales` : "Documentación" },
    { ruta: "/capacitaciones", Icon: GraduationCap, label: "Capacitaciones", sub: "Material de formación" },
  ].filter((a) => puede(a.ruta));

  const filtrando = Boolean(busqueda.trim() || letra);
  const metaGuias = loadingGuias
    ? "Cargando…"
    : filtrando
    ? `${guiasVisibles.length} ${guiasVisibles.length === 1 ? "resultado" : "resultados"}`
    : `${fmt.format(guias.length)} guías`;

  const nombreUsuario = user?.nombre ? `, ${user.nombre}` : "";

  return (
    <div
      className="w-full bg-[#F1F4F6] p-3 sm:p-4 text-[#1B2335] lg:h-[calc(100vh-6.5rem)] lg:overflow-hidden"
      style={{ fontFamily: FONT_UI }}
    >
      <div className="grid gap-3.5 lg:h-full lg:grid-rows-[auto_minmax(0,1fr)]">
        {/* ── Franja de identidad ───────────────────────────── */}
        <section
          aria-label="Bienvenida"
          className="relative flex min-h-[132px] flex-col gap-4 overflow-hidden rounded-[18px] border border-[#E2E7EE] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:pr-[280px]"
        >
          <div className="relative z-[2]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">Plataforma EVA</p>
            <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.015em] sm:text-2xl">
              {saludoSegunHora(ahora)}
              {nombreUsuario}
            </h1>
            <p className="mt-0.5 text-[13px] text-[#5E6A82]">{fechaLarga(ahora)}</p>
          </div>

          <div className="relative z-[2] md:border-l md:border-[#E2E7EE] md:pl-6 md:text-right">
            <p
              className="text-[26px] font-bold uppercase leading-[0.95] tracking-[0.01em] text-[#2A377E] sm:text-[30px]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              EVA gestiona
              <br />
              la tecnología
            </p>
            <p className="mt-[7px] flex flex-wrap items-baseline gap-2 md:justify-end">
              <span
                className="text-[19px] font-bold uppercase leading-none tracking-[0.09em] text-[#9A7B1C]"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                Acreditación
              </span>
              <span className="text-[12.5px] font-semibold">¡Un compromiso de todos!</span>
            </p>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 bg-gradient-to-r from-transparent to-[#EAF1FF] md:block"
          />
          <div
            role="img"
            aria-label="Equipo EVA: enfermera y médico del HUV"
            className="absolute bottom-0 right-[18px] z-[1] hidden h-[132px] w-[240px] bg-no-repeat md:block"
            style={{
              backgroundImage: `url(${AVATARS_IMG})`,
              backgroundSize: "412px 258px",
              backgroundPosition: "-96px -19px",
            }}
          />
        </section>

        {/* ── Mesa de trabajo ───────────────────────────────── */}
        <div className="grid min-h-0 gap-3.5 lg:grid-cols-12">
          {/* Guías rápidas */}
          <section
            aria-labelledby="inicio-guias"
            className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#E2E7EE] bg-white lg:col-span-7"
          >
            <div className="grid gap-2.5 border-b border-[#E2E7EE] px-[18px] pb-3 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="inicio-guias" className="text-base font-bold">
                  Guías rápidas
                </h2>
                <span className="text-xs tabular-nums text-[#5E6A82]" aria-live="polite">
                  {metaGuias}
                </span>
              </div>

              <label className="relative block">
                <span className="sr-only">Buscar guías rápidas</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8792A7]" />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={onKeyBuscador}
                  placeholder="Busca por equipo, marca o modelo — p. ej. desfibrilador zoll"
                  className="h-10 w-full rounded-[11px] border border-[#D9E0EA] bg-[#F6F8FB] pl-[38px] pr-11 text-[13.5px] placeholder:text-[#8B96AA] focus:border-[#93B4F8] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#2563EB]/15"
                />
                <kbd
                  aria-hidden="true"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-b-2 border-[#D5DCE6] bg-white px-1.5 py-[3px] text-[11px] font-semibold leading-none text-[#5E6A82]"
                >
                  /
                </kbd>
              </label>

              {iniciales.length > 0 && (
                <div role="group" aria-label="Filtrar por letra inicial" className="flex flex-wrap gap-[3px]">
                  {[null, ...iniciales].map((l) => (
                    <button
                      key={l ?? "todas"}
                      type="button"
                      aria-pressed={letra === l}
                      onClick={() => setLetra(letra === l ? null : l)}
                      className="h-6 min-w-[26px] rounded-[7px] border border-transparent px-[7px] text-xs font-semibold leading-none text-[#5E6A82] hover:bg-[#F1F4F9] hover:text-[#1B2335] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8] aria-pressed:border-[#C9D8FB] aria-pressed:bg-[#EEF3FF] aria-pressed:text-[#2563EB]"
                    >
                      {l === null ? "Todas" : l.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ul className="grid max-h-[28rem] min-h-0 flex-1 content-start gap-x-2.5 gap-y-0.5 overflow-auto px-2.5 py-2 sm:grid-cols-2 lg:max-h-none">
              {loadingGuias ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-2.5 px-2 py-[7px]">
                    <span className="h-[30px] w-[26px] flex-none animate-pulse rounded-[5px] bg-[#EEF1F6]" />
                    <span className="h-3 flex-1 animate-pulse rounded bg-[#EEF1F6]" />
                  </li>
                ))
              ) : errorGuias ? (
                <li className="col-span-full px-3 py-7 text-center text-[13px] text-[#5E6A82]">
                  No se pudieron cargar las guías rápidas. Recarga la página para intentarlo de nuevo.
                </li>
              ) : guiasVisibles.length === 0 ? (
                <li className="col-span-full px-3 py-7 text-center text-[13px] text-[#5E6A82]">
                  {guias.length === 0
                    ? "Todavía no hay guías rápidas publicadas."
                    : "Ninguna guía coincide. Prueba solo con la marca o el modelo, por ejemplo «zoll» o «im50»."}
                </li>
              ) : (
                guiasVisibles.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      title={g.original}
                      onClick={() => abrirGuia(g)}
                      className="group flex w-full items-center gap-2.5 rounded-[9px] px-2 py-[7px] text-left text-[13px] font-medium leading-[1.3] hover:bg-[#F3F6FB] focus-visible:bg-[#F3F6FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#93B4F8]"
                    >
                      <span className="grid h-[30px] w-[26px] flex-none place-items-center rounded-[5px] bg-[#FDECEC] text-[8.5px] font-bold tracking-wider text-[#B42318]">
                        PDF
                      </span>
                      <span className="min-w-0 flex-1">{g.nombre}</span>
                      <ExternalLink className="h-3.5 w-3.5 flex-none text-[#2563EB] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex flex-wrap justify-between gap-3 border-t border-[#E2E7EE] px-[18px] py-2 text-[11.5px] text-[#8792A7]">
              <span>Abre el PDF en una pestaña nueva</span>
              <span>Enter abre la primera coincidencia</span>
            </div>
          </section>

          {/* Columna derecha */}
          <aside className="flex min-h-0 flex-col gap-3.5 lg:col-span-5 lg:overflow-auto">
            {puedeReportar && (
              <section aria-labelledby="inicio-reportar" className="grid gap-2.5 rounded-[18px] bg-[#2A377E] p-3.5 text-white">
                <div>
                  <h2 id="inicio-reportar" className="text-[15px] font-bold">
                    Reportar una falla
                  </h2>
                  <p className="mt-0.5 text-xs text-white/75">Elige la línea y describe el problema.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LINEAS_TICKET.map(({ tipo, label, Icon }) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => abrirReporte(tipo)}
                      className="flex flex-col items-start gap-1.5 rounded-xl border border-white/20 bg-white/[0.07] px-2.5 pb-2 pt-[9px] text-left text-[12.5px] font-semibold leading-tight hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <Icon className="h-[18px] w-[18px] opacity-90" />
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {filasAtencion.length > 0 && (
              <section aria-labelledby="inicio-atencion" className="rounded-[18px] border border-[#E2E7EE] bg-white">
                <div className="flex items-baseline justify-between gap-2.5 px-4 pb-0.5 pt-3">
                  <h2 id="inicio-atencion" className="text-sm font-bold">
                    Requiere atención
                  </h2>
                  <span className="text-[11.5px] text-[#667085]">Según tu rol</span>
                </div>
                <ul className="grid gap-px px-2 pb-2 pt-1">
                  {filasAtencion.map((f) => (
                    <li key={f.key}>
                      <button
                        type="button"
                        onClick={f.ir}
                        className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-[11px] rounded-[10px] px-2 py-[5px] text-left hover:bg-[#F5F7FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8]"
                      >
                        <span
                          className={`rounded-[9px] py-[5px] text-center text-[19px] font-bold leading-none tabular-nums ${tono(f.valor, f.base)}`}
                          style={{ fontFamily: FONT_DISPLAY }}
                        >
                          {num(f.valor)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold leading-tight">{f.titulo}</span>
                          <span className="block text-[11.5px] text-[#5E6A82]">{f.sub}</span>
                        </span>
                        <span className="flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-[#2563EB]">
                          {f.cta}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Usuarios que no son administradores: paso a paso en lugar de conteos */}
            {user && !esAdmin && (
              <section aria-labelledby="inicio-flujo" className="rounded-[18px] border border-[#E2E7EE] bg-white px-4 pb-3.5 pt-3">
                <div className="flex items-baseline justify-between gap-2.5">
                  <h2 id="inicio-flujo" className="text-sm font-bold">
                    Así avanza tu reporte
                  </h2>
                  <span className="text-[11.5px] text-[#667085]">De la falla al cierre</span>
                </div>
                <ol className="mt-2.5 grid">
                  {PASOS_REPORTE.map(({ titulo, texto, Icon, tuyo }, i) => (
                    <li key={titulo} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 pb-3.5 last:pb-0">
                      {i < PASOS_REPORTE.length - 1 && (
                        <span aria-hidden="true" className="absolute bottom-0.5 left-[19px] top-10 w-0.5 rounded bg-[#E2E7EE]" />
                      )}
                      <span
                        className={`relative grid h-10 w-10 place-items-center rounded-xl ${
                          tuyo ? "bg-[#2A377E] text-white" : "bg-[#EEF3FF] text-[#2A377E]"
                        }`}
                      >
                        <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
                        <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-[#D5DCE6] bg-white text-[10.5px] font-bold leading-none text-[#475569]">
                          {i + 1}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="mt-0.5 text-[13.5px] font-semibold leading-snug">
                          {titulo}
                          {tuyo && (
                            <span className="ml-1.5 rounded-full bg-[#E8EDFB] px-[7px] py-px align-[1px] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#2A377E]">
                              Tu parte
                            </span>
                          )}
                        </p>
                        <p className="text-[12.5px] text-[#5E6A82]">{texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {tieneMisTickets && (
                  <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-[#E2E7EE] pt-2.5 text-xs text-[#5E6A82]">
                    <span>¿Ya reportaste algo?</span>
                    <button
                      type="button"
                      onClick={() => navigate("/ordenes/mis-tickets")}
                      className="flex items-center gap-0.5 rounded font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      Ver mis tickets
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </section>
            )}

            {accesos.length > 0 && (
              <section aria-labelledby="inicio-accesos" className="rounded-[18px] border border-[#E2E7EE] bg-white">
                <div className="px-4 pb-0.5 pt-3">
                  <h2 id="inicio-accesos" className="text-sm font-bold">
                    Accesos directos
                  </h2>
                </div>
                <div className="grid gap-1.5 px-3 pb-3 pt-1.5 sm:grid-cols-2">
                  {accesos.map(({ ruta, Icon, label, sub }) => (
                    <button
                      key={ruta}
                      type="button"
                      onClick={() => navigate(ruta)}
                      className="grid grid-cols-[30px_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-px rounded-xl border border-[#E2E7EE] bg-[#FBFCFE] px-2.5 py-[9px] text-left hover:border-[#C9D8FB] hover:bg-white hover:shadow-[0_8px_16px_-12px_rgba(37,99,235,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B4F8]"
                    >
                      <span className="row-span-2 grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[#EEF3FF] text-[#2563EB]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="self-end text-[12.5px] font-semibold leading-tight">{label}</span>
                      <span className="self-start text-[11.5px] tabular-nums text-[#5E6A82]">{sub}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <HospitalTicketModal
        isOpen={modalTicketOpen}
        onClose={() => setModalTicketOpen(false)}
        ticketType={tipoTicket}
        onSuccess={cargarResumen}
      />
    </div>
  );
}
