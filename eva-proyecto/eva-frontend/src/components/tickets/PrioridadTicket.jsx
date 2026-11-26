import { AlertCircle, Check, Clock } from "lucide-react";
import { ESTILO_RELOJ, NIVELES, estadoRespuesta } from "@/utils/criticidad";

/**
 * Nivel de criticidad del servicio donde se reportó el ticket.
 * Un ticket sin nivel es anterior al sistema de prioridad.
 */
export function InsigniaPrioridad({ nivel, grupo }) {
  const n = Number(nivel) || null;
  if (!n || !NIVELES[n]) {
    return <span className="text-[11px] text-gray-400">—</span>;
  }
  const { nombre, color, fondo, plazo } = NIVELES[n];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: fondo, color }}
      title={`Nivel ${n} · ${nombre} · respuesta en menos de ${plazo}${grupo ? `
${grupo}` : ""}`}
    >
      <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ backgroundColor: color }} />
      Nivel {n}
    </span>
  );
}

/**
 * Reloj de primera respuesta. Corre desde que se crea el ticket y se detiene en
 * cuanto sale de "Abierto"; a partir de ahí muestra en cuánto se atendió, en gris.
 *
 * `ahora` llega desde arriba para que todas las filas usen el mismo instante y
 * se refresquen a la vez, en lugar de montar un temporizador por fila.
 */
export function RelojRespuesta({ ticket, ahora }) {
  const r = estadoRespuesta(ticket, ahora);

  if (r.estado === "sin-plazo") {
    return (
      <span className="text-[11px] text-gray-400" title="Ticket anterior al sistema de prioridad">
        {r.texto}
      </span>
    );
  }

  const Icono = r.estado === "vencido" ? AlertCircle : r.estado === "atendido" ? Check : Clock;

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums whitespace-nowrap ${ESTILO_RELOJ[r.estado]}`}
        title={`Plazo de primera respuesta del nivel ${r.nivel}: ${NIVELES[r.nivel].plazo}`}
      >
        <Icono className="h-3 w-3 flex-none" />
        {r.texto}
      </span>
      {r.estado !== "atendido" && (
        <span className="block h-[4px] w-full max-w-[104px] overflow-hidden rounded-full bg-gray-200">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.round((r.consumido ?? 0) * 100)}%`,
              backgroundColor:
                r.estado === "vencido" ? "#B4232A" : r.estado === "aviso" ? "#B45309" : "#1C6B4B",
            }}
          />
        </span>
      )}
    </div>
  );
}
