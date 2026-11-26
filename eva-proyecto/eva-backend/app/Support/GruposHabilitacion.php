<?php

namespace App\Support;

/**
 * Grupos de habilitación (Resolución 3100) y el nivel de criticidad que les
 * corresponde, según la hoja "Clasificacion" de
 * plantillas/Matriz_Criticidad_Servicios_Biomedica_Infraestructura.xlsx
 *
 * El grupo es lo que se elige al crear un servicio; el nivel sale de él, para que
 * nadie tenga que acordarse de la tabla de puntajes. Un servicio sin grupo se queda
 * en nivel 4, que es el plazo más holgado: es preferible a asignarle sin querer un
 * plazo de 10 minutos que nadie va a cumplir.
 */
class GruposHabilitacion
{
    /** Grupo => nivel de criticidad (1 muy alta … 4 baja). */
    public const NIVEL_POR_GRUPO = [
        'Quirurgico'                                      => 1,
        'Internación Cuidado Intensivo'                   => 1,
        'Atención Inmediata Urgencias'                    => 1,
        'Atención Inmediata Obstetricia'                  => 1,
        'Internación Hospitalización'                     => 2,
        'Apoyo diagnóstico y complementación terapeutica' => 2,
        'Consulta Externa'                                => 3,
        'Procesos Administrativos y apoyo'                => 4,
    ];

    /** Qué incluye cada grupo, para que el usuario sepa cuál elegir. */
    public const EJEMPLOS = [
        'Quirurgico'                                      => 'Quirófanos, recuperación, cirugía ambulatoria',
        'Internación Cuidado Intensivo'                   => 'UCI adulto, pediátrica y neonatal',
        'Atención Inmediata Urgencias'                    => 'Reanimación, observación, consulta de urgencias',
        'Atención Inmediata Obstetricia'                  => 'Sala de partos, trabajo de parto',
        'Internación Hospitalización'                     => 'Hospitalización adulto y pediátrica',
        'Apoyo diagnóstico y complementación terapeutica' => 'Imágenes diagnósticas, hemodinamia, laboratorio',
        'Consulta Externa'                                => 'Medicina general y especialidades',
        'Procesos Administrativos y apoyo'                => 'Archivo, facturación, oficinas administrativas',
    ];

    /** Minutos de plazo para la primera respuesta, por nivel. */
    public const PLAZO_MIN = [1 => 10, 2 => 60, 3 => 480, 4 => 1440];

    public static function nombres(): array
    {
        return array_keys(self::NIVEL_POR_GRUPO);
    }

    /** Nivel que corresponde a un grupo. Sin grupo o grupo desconocido: 4. */
    public static function nivelDe(?string $grupo): int
    {
        return self::NIVEL_POR_GRUPO[$grupo] ?? 4;
    }

    /** Catálogo listo para pintar un selector. */
    public static function catalogo(): array
    {
        $salida = [];
        foreach (self::NIVEL_POR_GRUPO as $grupo => $nivel) {
            $salida[] = [
                'grupo'       => $grupo,
                'criticidad'  => $nivel,
                'plazo_min'   => self::PLAZO_MIN[$nivel],
                'ejemplos'    => self::EJEMPLOS[$grupo] ?? null,
            ];
        }
        return $salida;
    }
}
