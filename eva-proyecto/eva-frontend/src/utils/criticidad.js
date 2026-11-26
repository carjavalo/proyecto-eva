/**
 * Prioridad de tickets según la criticidad del servicio donde se reportan.
 *
 * Origen: plantillas/Matriz_Criticidad_Servicios_Biomedica_Infraestructura.xlsx
 * El nivel vive en `servicios.criticidad` y se sella en `ordenes.criticidad` al crear
 * el ticket, así que un cambio posterior en el servicio no reescribe el pasado.
 *
 * El plazo es de PRIMERA RESPUESTA, no de resolución: cuenta hasta que el ticket
 * sale de "Abierto". Se cuenta a tiempo corrido, fines de semana incluidos.
 *
 * `criticidad` en null significa ticket anterior al sistema de prioridad: no lleva plazo.
 */

/** Minutos de plazo para la primera respuesta, por nivel. */
export const PLAZO_RESPUESTA_MIN = { 1: 10, 2: 60, 3: 480, 4: 1440 };

export const NIVELES = {
  1: { nombre: "Muy alta", plazo: "10 min", color: "#B4232A", fondo: "#FCEFEF" },
  2: { nombre: "Alta", plazo: "1 hora", color: "#B45309", fondo: "#FFF4E0" },
  3: { nombre: "Media", plazo: "8 horas", color: "#2A377E", fondo: "#EEF3FF" },
  4: { nombre: "Baja", plazo: "24 horas", color: "#3D4A63", fondo: "#EEF1F6" },
};

/** Estados en los que el ticket todavía no ha sido atendido. */
const ESTADO_ABIERTO = 1;

/** Formatea una cantidad de minutos como "45 min", "3 h 20 min" o "2 d 4 h". */
export function formatearDuracion(minutos) {
  const m = Math.abs(Math.round(minutos));
  if (m < 60) return `${m} min`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  }
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/**
 * Estado del reloj de primera respuesta de un ticket.
 *
 * Devuelve uno de estos `estado`:
 *   'sin-plazo'  el ticket no tiene nivel (anterior al sistema)
 *   'atendido'   ya salió de Abierto; el reloj está detenido
 *   'ok'         dentro de plazo, queda más del 30%
 *   'aviso'      dentro de plazo, queda menos del 30%
 *   'vencido'    pasó el plazo sin respuesta
 */
export function estadoRespuesta(ticket, ahora = new Date()) {
  const nivel = Number(ticket?.criticidad) || null;
  if (!nivel || !PLAZO_RESPUESTA_MIN[nivel]) {
    return { estado: "sin-plazo", nivel: null, texto: "Sin plazo" };
  }

  const plazo = PLAZO_RESPUESTA_MIN[nivel];
  const inicio = ticket.fecha_inicio ? new Date(ticket.fecha_inicio) : null;
  if (!inicio || Number.isNaN(inicio.getTime())) {
    return { estado: "sin-plazo", nivel, texto: "Sin fecha" };
  }

  // El reloj se detiene en la primera respuesta: ya no es una alerta, es un dato.
  const atendido = Number(ticket.estado_id) !== ESTADO_ABIERTO;
  if (atendido) {
    const marca = ticket.fecha_primera_respuesta ? new Date(ticket.fecha_primera_respuesta) : null;
    if (!marca || Number.isNaN(marca.getTime())) {
      return { estado: "atendido", nivel, texto: "Atendido" };
    }
    const tardo = (marca - inicio) / 60000;
    return {
      estado: "atendido",
      nivel,
      minutos: tardo,
      dentroDePlazo: tardo <= plazo,
      texto: `Atendido en ${formatearDuracion(tardo)}`,
    };
  }

  const transcurrido = (ahora - inicio) / 60000;
  const restante = plazo - transcurrido;

  if (restante < 0) {
    return {
      estado: "vencido",
      nivel,
      minutos: restante,
      consumido: 1,
      texto: `Vencido hace ${formatearDuracion(restante)}`,
    };
  }
  return {
    estado: restante / plazo < 0.3 ? "aviso" : "ok",
    nivel,
    minutos: restante,
    consumido: Math.max(0, Math.min(1, transcurrido / plazo)),
    texto: `Quedan ${formatearDuracion(restante)}`,
  };
}

/** Clases de Tailwind para el chip del reloj, por estado. */
export const ESTILO_RELOJ = {
  ok: "bg-[#E6F4ED] text-[#1C6B4B]",
  aviso: "bg-[#FFF4E0] text-[#B45309]",
  vencido: "bg-[#FCEFEF] text-[#B4232A]",
  atendido: "bg-[#EEF1F6] text-[#5E6A82]",
  "sin-plazo": "bg-transparent text-[#94A1B6]",
};

/**
 * Peso para ordenar la cola de trabajo: primero lo vencido, dentro de eso el nivel
 * más alto, y a igual nivel lo que lleva más tiempo esperando. Lo atendido va al final.
 *
 * El orden lo pone el reloj y no el nivel a propósito: el 91% de los tickets cae en
 * nivel 1 o 2, así que ordenar solo por nivel no separaría nada.
 */
export function pesoDeCola(ticket, ahora = new Date()) {
  const r = estadoRespuesta(ticket, ahora);
  if (r.estado === "atendido") return [3, r.nivel ?? 9, 0];
  if (r.estado === "sin-plazo") return [2, 9, 0];
  if (r.estado === "vencido") return [0, r.nivel, r.minutos];
  return [1, r.nivel, r.minutos];
}
