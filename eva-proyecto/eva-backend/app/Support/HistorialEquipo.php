<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Historial de la hoja de vida del equipo.
 *
 * Los traslados (servicio, área y sede) se guardan en `cambios_ubicaciones`, que es donde
 * el sistema anterior los venía registrando, y el resto de campos editados en `cambios_hdv`,
 * con el mismo formato de texto («Se cambio X de A a B») que la hoja de vida ya muestra.
 *
 * La comparación se hace entre la fila ANTES y la fila DESPUÉS de guardar, no contra lo que
 * envió el formulario, para que el historial diga exactamente lo que quedó en la base.
 */
class HistorialEquipo
{
    /** Columnas que no se registran: técnicas, de ubicación (van al traslado) o sin valor para el usuario. */
    private const IGNORAR = [
        'id', 'created_at', 'updated_at', 'fecha_cambio', 'status',
        'servicio_id', 'area_id', 'sede_id', // se registran como traslado
        'manual', 'plano', 'file', 'plan',
    ];

    /** Llaves foráneas cuyo nombre se resuelve para mostrarlo: campo => [tabla, columna del nombre]. */
    private const RELACIONES = [
        'propietario_id'   => ['propietarios', 'nombre'],
        'estadoequipo_id'  => ['estadoequipos', 'name'],
        'tipo_id'          => ['tipos', 'name'],
        'criesgo_id'       => ['criesgos', 'name'],
        'cbiomedica_id'    => ['cbiomedica', 'name'],
        'tadquisicion_id'  => ['tadquisicion', 'name'],
        'fuente_id'        => ['fuenteal', 'name'],
        'tecnologia_id'    => ['tecnologiap', 'name'],
        'orden_compra_id'  => ['ordenes_compra', 'orden'],
        'manual_id'        => ['manuales', 'descripcion'],
        'guia_id'          => ['guias_rapidas', 'name'],
        'invima_id'        => ['invimas', 'invima'],
        'disponibilidad_id' => ['disponibilidades', 'name'],
        'centro_id'        => ['centros', 'name'],
    ];

    /** Rótulos legibles; las columnas que no estén aquí se muestran con el nombre de la columna. */
    private const ROTULOS = [
        'name' => 'nombre', 'code' => 'código', 'serial' => 'serie', 'marca' => 'marca',
        'modelo' => 'modelo', 'descripcion' => 'descripción', 'image' => 'imagen',
        'localizacion_actual' => 'localización actual', 'costo' => 'costo', 'vida_util' => 'vida útil',
        'periodicidad' => 'periodicidad', 'calibracion' => 'calibración', 'movilidad' => 'movilidad',
        'propiedad' => 'propiedad', 'garantia' => 'garantía', 'accesorios' => 'accesorios',
        'observacion' => 'observación', 'otros' => 'otros', 'invima' => 'INVIMA',
        'numero_invima' => 'número de INVIMA', 'registro_sanitario' => 'registro sanitario',
        'estado_invima' => 'estado del INVIMA', 'archivo_invima' => 'archivo del INVIMA',
        'codigo_antiguo' => 'código antiguo', 'pais_origen' => 'país de origen',
        'activo_comodato' => 'activo en comodato', 'evaluacion_desempenio' => 'evaluación de desempeño',
        'verificacion_inventario' => 'verificación de inventario', 'repuesto_pendiente' => 'repuesto pendiente',
        'estado_mantenimiento' => 'estado de mantenimiento', 'fecha_ad' => 'fecha de adquisición',
        'fecha_instalacion' => 'fecha de instalación', 'fecha_fabricacion' => 'fecha de fabricación',
        'fecha_inicio_operacion' => 'fecha de inicio de operación', 'fecha_acta_recibo' => 'fecha del acta de recibo',
        'fecha_recepcion_almacen' => 'fecha de recepción en almacén', 'fecha_vencimiento_garantia' => 'vencimiento de la garantía',
        'fecha_vencimiento_invima' => 'vencimiento del INVIMA', 'fecha_mantenimiento' => 'fecha de mantenimiento',
        'propietario_id' => 'propietario', 'estadoequipo_id' => 'estado del equipo', 'tipo_id' => 'tipo de equipo',
        'criesgo_id' => 'clasificación de riesgo', 'cbiomedica_id' => 'clasificación biomédica',
        'tadquisicion_id' => 'tipo de adquisición', 'fuente_id' => 'fuente de alimentación',
        'tecnologia_id' => 'tecnología predominante', 'frecuencia_id' => 'frecuencia de mantenimiento',
        'disponibilidad_id' => 'disponibilidad', 'necesidad_id' => 'necesidad', 'centro_id' => 'centro de costo',
        'manual_id' => 'manual', 'guia_id' => 'guía rápida', 'orden_compra_id' => 'orden de compra',
        'baja_id' => 'baja', 'invima_id' => 'registro INVIMA',
    ];

    /**
     * Registra lo que cambió en una edición del equipo. Nunca lanza: si el historial falla,
     * la edición del equipo debe seguir su curso.
     *
     * @param object $antes   Fila de `equipos` antes de guardar.
     * @param object $despues Fila de `equipos` después de guardar.
     */
    public static function registrar(int $equipoId, object $antes, object $despues, ?int $usuarioId = null): void
    {
        try {
            self::registrarTraslado($equipoId, $antes, $despues, $usuarioId);
        } catch (\Throwable $e) {
            Log::error('No se pudo registrar el traslado del equipo: ' . $e->getMessage(), ['equipo_id' => $equipoId]);
        }

        try {
            $lineas = self::lineasDeCampos($antes, $despues);
            if (!empty($lineas)) {
                DB::table('cambios_hdv')->insert([
                    'equipo_id'   => $equipoId,
                    'descripcion' => implode("\n", $lineas),
                    'usuario_id'  => $usuarioId ?: 0, // 0 se muestra como «Sistema» en la hoja de vida
                    'created_at'  => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('No se pudo registrar el cambio de datos del equipo: ' . $e->getMessage(), ['equipo_id' => $equipoId]);
        }
    }

    /** Una línea por cada columna que quedó distinta después de guardar. */
    private static function lineasDeCampos(object $antes, object $despues): array
    {
        $lineas = [];
        foreach (get_object_vars($despues) as $campo => $valorDespues) {
            if (in_array($campo, self::IGNORAR, true)) {
                continue;
            }
            $valorAntes = $antes->{$campo} ?? null;
            $relacion   = self::RELACIONES[$campo] ?? null;
            if (self::sonIguales($valorAntes, $valorDespues, $relacion !== null)) {
                continue;
            }
            $lineas[] = sprintf(
                'Se cambio %s de %s a %s',
                self::ROTULOS[$campo] ?? str_replace('_', ' ', $campo),
                self::etiqueta($valorAntes, $relacion),
                self::etiqueta($valorDespues, $relacion)
            );
        }

        return $lineas;
    }

    /** Traslados: servicio, área y sede efectiva. Se guarda una fila por movimiento. */
    private static function registrarTraslado(int $equipoId, object $antes, object $despues, ?int $usuarioId): void
    {
        $servicioAntes   = (int) ($antes->servicio_id ?? 0);
        $servicioDespues = (int) ($despues->servicio_id ?? 0);
        $areaAntes       = (int) ($antes->area_id ?? 0);
        $areaDespues     = (int) ($despues->area_id ?? 0);

        // equipos.sede_id casi siempre viene vacío: la sede real es la del servicio.
        $sedeAntes   = self::sedeEfectiva($antes->sede_id ?? null, $servicioAntes);
        $sedeDespues = self::sedeEfectiva($despues->sede_id ?? null, $servicioDespues);

        if ($servicioAntes === $servicioDespues && $areaAntes === $areaDespues && $sedeAntes === $sedeDespues) {
            return;
        }

        DB::table('cambios_ubicaciones')->insert([
            'equipo_id'           => $equipoId,
            'servicio_origen_id'  => $servicioAntes,
            'servicio_destino_id' => $servicioDespues,
            'area_origen_id'      => $areaAntes,
            'area_destino_id'     => $areaDespues,
            'sede_origen_id'      => $sedeAntes,
            'sede_destino_id'     => $sedeDespues,
            'usuario_id'          => $usuarioId,
            'created_at'          => now(),
        ]);
    }

    /**
     * Líneas de texto de un traslado, para mostrarlo junto al resto del historial.
     * Devuelve un arreglo vacío cuando la fila no representa ningún movimiento real.
     */
    public static function lineasTraslado(object $fila): array
    {
        $partes = [
            'servicio' => ['servicio_origen_id', 'servicio_destino_id', 'servicio_origen', 'servicio_destino'],
            'área'     => ['area_origen_id', 'area_destino_id', 'area_origen', 'area_destino'],
            'sede'     => ['sede_origen_id', 'sede_destino_id', 'sede_origen', 'sede_destino'],
        ];

        $lineas = [];
        foreach ($partes as $rotulo => [$campoIdOrigen, $campoIdDestino, $campoOrigen, $campoDestino]) {
            $idOrigen  = (int) ($fila->{$campoIdOrigen} ?? 0);
            $idDestino = (int) ($fila->{$campoIdDestino} ?? 0);
            if ($idOrigen === $idDestino) {
                continue;
            }
            $origen  = self::nombreRelacionado($idOrigen, $fila->{$campoOrigen} ?? null, $rotulo);
            $destino = self::nombreRelacionado($idDestino, $fila->{$campoDestino} ?? null, $rotulo);
            if ($origen === $destino) {
                continue; // p. ej. dos ids distintos que ya no existen: no hay nada que contar
            }
            $lineas[] = "Se cambio {$rotulo} de {$origen} a {$destino}";
        }

        return $lineas;
    }

    /** Texto de un traslado; cadena vacía si la fila no dice nada. */
    public static function textoTraslado(object $fila): string
    {
        return implode("\n", self::lineasTraslado($fila));
    }

    /** Sede del equipo si la tiene; si no, la del servicio. */
    private static function sedeEfectiva($sedeId, int $servicioId): int
    {
        if (!empty($sedeId)) {
            return (int) $sedeId;
        }
        if (!$servicioId) {
            return 0;
        }

        return (int) (DB::table('servicios')->where('id', $servicioId)->value('sede_id') ?? 0);
    }

    /**
     * Compara el valor guardado con el nuevo. null y '' son lo mismo; en las llaves foráneas
     * el 0 también cuenta como vacío, pero en los campos de texto un 0 es un valor real.
     */
    private static function sonIguales($antes, $despues, bool $esRelacion): bool
    {
        $normalizar = function ($v) use ($esRelacion) {
            if ($v === null) {
                return '';
            }
            $v = trim((string) $v); // un cambio de solo espacios no merece una línea del historial

            return ($esRelacion && $v === '0') ? '' : $v;
        };

        return $normalizar($antes) === $normalizar($despues);
    }

    /** Valor legible: el nombre de la tabla relacionada cuando es una llave foránea. */
    private static function etiqueta($valor, ?array $relacion): string
    {
        if ($valor === null || trim((string) $valor) === '') {
            return 'sin asignar';
        }
        if (!$relacion) {
            // El salto de línea separa un cambio de otro: no puede venir dentro del valor.
            return trim(str_replace(["\r\n", "\r", "\n"], ' ', (string) $valor));
        }
        if (trim((string) $valor) === '0') {
            return 'sin asignar';
        }

        [$tabla, $columna] = $relacion;
        $nombre = DB::table($tabla)->where('id', (int) $valor)->value($columna);

        return $nombre !== null && trim((string) $nombre) !== ''
            ? trim((string) $nombre)
            : '#' . (int) $valor . ' (no encontrado)';
    }

    /** Nombre de un servicio/área/sede ya resuelto por el JOIN, distinguiendo «vacío» de «eliminado». */
    private static function nombreRelacionado(int $id, $nombre, string $rotulo): string
    {
        if ($id === 0) {
            return 'sin asignar';
        }
        if ($nombre !== null && trim((string) $nombre) !== '') {
            return trim((string) $nombre);
        }

        return "{$rotulo} #{$id} (eliminado)";
    }
}
