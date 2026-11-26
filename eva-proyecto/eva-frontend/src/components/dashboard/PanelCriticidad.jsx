import { useEffect, useId, useMemo, useState } from "react";
import httpService from "@/services/httpService";
import { NIVELES, PLAZO_RESPUESTA_MIN, formatearDuracion } from "@/utils/criticidad";

/**
 * Cumplimiento del plazo de primera respuesta de la matriz de criticidad.
 *
 * Pide sus propios datos a /v1/dashboard/criticidad en vez de colgarse del resumen
 * general: son cifras distintas, y así un fallo aquí no tumba el resto del tablero.
 *
 * Solo cuenta tickets creados con nivel. Los anteriores a la puesta en marcha tienen
 * `criticidad` nula y quedan fuera, por eso el panel arranca vacío.
 */
export default function PanelCriticidad({ consulta }) {
  const id = useId();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const params = useMemo(() => {
    const p = JSON.parse(consulta || "{}");
    // La sede y la línea no aplican: el plazo es del servicio, no de la ubicación.
    return p.anio ? { anio: p.anio } : { desde: p.desde, hasta: p.hasta };
  }, [consulta]);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError(null);
    httpService
      .get("/v1/dashboard/criticidad", { params, signal: control.signal })
      .then((res) => {
        if (res?.data?.success && res.data.data) setDatos(res.data.data);
        else setError(res?.data?.message || "No se pudo cargar el cumplimiento de criticidad.");
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        setError(err?.response?.data?.message || err.message);
      })
      .finally(() => setCargando(false));
    return () => control.abort();
  }, [params]);

  const vacio =
    datos &&
    !datos.promedio_por_nivel?.length &&
    !datos.vencidos_ahora?.length &&
    !datos.abiertos_con_plazo;

  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 content-start gap-3 rounded-[18px] border border-[#E2E7EE] bg-white p-4"
    >
      <div>
        <h2 id={id} className="text-[14px]! font-bold leading-snug! text-[#1B2335]">
          Primera respuesta según criticidad del servicio
        </h2>
        <p className="mt-0.5 text-[12px] text-[#5E6A82]">
          Plazos de la matriz: nivel 1 en 10 min · nivel 2 en 1 h · nivel 3 en 8 h · nivel 4 en 24 h.
          Tiempo corrido. Solo entran los tickets creados con nivel asignado.
        </p>
      </div>

      {cargando && <div className="h-28 animate-pulse rounded-[14px] bg-[#F1F4F8]" />}

      {!cargando && error && (
        <p role="alert" className="rounded-[12px] border border-[#F0C9CB] bg-[#FCEFEF] px-3 py-2 text-[12.5px] text-[#B4232A]">
          {error}
        </p>
      )}

      {!cargando && !error && vacio && (
        <p className="rounded-[12px] border border-dashed border-[#D5DCE6] px-3 py-7 text-center text-[13px] text-[#5E6A82]">
          Todavía no hay tickets con plazo. Las cifras empiezan a contar con los tickets que se
          creen a partir de ahora; los anteriores quedaron sin plazo a propósito.
        </p>
      )}

      {!cargando && !error && datos && !vacio && (
        <div className="grid gap-3 lg:grid-cols-2">
          <BloquePorNivel filas={datos.promedio_por_nivel} />
          <BloqueVencidos filas={datos.vencidos_ahora} abiertos={datos.abiertos_con_plazo} />
          <BloquePorLinea filas={datos.cumplimiento_por_linea} className="lg:col-span-2" />
        </div>
      )}
    </section>
  );
}

function Rotulo({ children }) {
  return (
    <p className="mb-2 font-mono text-[10.5px] tracking-[0.09em] text-[#5E6A82] uppercase">{children}</p>
  );
}

function BloquePorNivel({ filas = [] }) {
  return (
    <div className="rounded-[14px] border border-[#E2E7EE] p-3">
      <Rotulo>Promedio de respuesta por nivel</Rotulo>
      {!filas.length ? (
        <p className="py-3 text-center text-[12.5px] text-[#5E6A82]">Sin tickets atendidos en el periodo.</p>
      ) : (
        <ul className="grid gap-2.5">
          {filas.map((f) => {
            const n = NIVELES[f.nivel];
            const dentro = f.promedio_min <= PLAZO_RESPUESTA_MIN[f.nivel];
            return (
              <li key={f.nivel} className="grid gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
                    style={{ backgroundColor: n.fondo, color: n.color }}
                  >
                    Nivel {f.nivel} · {n.nombre}
                  </span>
                  <span className="font-mono text-[12.5px] tabular-nums text-[#1B2335]">
                    {formatearDuracion(f.promedio_min)}
                    <span className="text-[#5E6A82]"> / {n.plazo}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#EEF1F6]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, f.cumplimiento ?? 0)}%`,
                        backgroundColor: dentro ? "#1C6B4B" : n.color,
                      }}
                    />
                  </span>
                  <span className="w-28 text-right font-mono text-[11.5px] tabular-nums text-[#5E6A82]">
                    {f.cumplimiento}% · {f.atendidos} tickets
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BloqueVencidos({ filas = [], abiertos = 0 }) {
  const total = filas.reduce((a, f) => a + f.vencidos, 0);
  return (
    <div className="rounded-[14px] border border-[#E2E7EE] p-3">
      <Rotulo>Vencidos ahora mismo</Rotulo>
      <p className="font-mono text-[30px] leading-none font-semibold tabular-nums text-[#B4232A]">
        {total}
      </p>
      <p className="mt-1 text-[12px] text-[#5E6A82]">
        de {abiertos} abiertos con plazo · sin primera respuesta dentro del tiempo
      </p>
      {filas.length > 0 && (
        <ul className="mt-2.5 grid gap-1.5">
          {filas.map((f) => (
            <li key={f.nivel} className="flex items-baseline justify-between gap-3 text-[12.5px]">
              <span style={{ color: NIVELES[f.nivel].color }} className="font-semibold">
                Nivel {f.nivel}
              </span>
              <span className="font-mono tabular-nums text-[#3D4A63]">
                {f.vencidos} · retraso medio {formatearDuracion(f.retraso_medio_min)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BloquePorLinea({ filas = [], className = "" }) {
  return (
    <div className={`rounded-[14px] border border-[#E2E7EE] p-3 ${className}`}>
      <Rotulo>Cumplimiento por línea</Rotulo>
      {!filas.length ? (
        <p className="py-3 text-center text-[12.5px] text-[#5E6A82]">Sin tickets atendidos en el periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Línea", "Atendidos", "Promedio", "En plazo", "Cumplimiento"].map((t, i) => (
                  <th
                    key={t}
                    className={`border-b border-[#E2E7EE] px-2 py-1.5 font-mono text-[10.5px] font-medium tracking-[0.08em] text-[#5E6A82] uppercase ${i ? "text-right" : "text-left"}`}
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.subproceso_id}>
                  <td className="border-b border-[#EEF1F6] px-2 py-2 text-[#1B2335]">{f.linea}</td>
                  <td className="border-b border-[#EEF1F6] px-2 py-2 text-right font-mono tabular-nums">{f.atendidos}</td>
                  <td className="border-b border-[#EEF1F6] px-2 py-2 text-right font-mono tabular-nums">
                    {formatearDuracion(f.promedio_min)}
                  </td>
                  <td className="border-b border-[#EEF1F6] px-2 py-2 text-right font-mono tabular-nums">{f.en_plazo}</td>
                  <td
                    className="border-b border-[#EEF1F6] px-2 py-2 text-right font-mono font-semibold tabular-nums"
                    style={{ color: f.cumplimiento >= 80 ? "#1C6B4B" : f.cumplimiento >= 50 ? "#B45309" : "#B4232A" }}
                  >
                    {f.cumplimiento}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
