<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CorrectivoGeneral;
use App\Models\Equipo;
use App\Helpers\ResponseFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Exception;
use Carbon\Carbon;

/**
 * Controlador CorrectivoGeneralController - API Empresarial Completa
 * 
 * Controlador empresarial completo para gestión de correctivos generales
 * con todas las funcionalidades requeridas según especificaciones.
 * 
 * Funcionalidades implementadas:
 * - Listado completo con paginación y filtros
 * - Búsqueda global en todos los campos
 * - Exportación Excel/CSV formato exacto CorrectivosEB.xls
 * - CRUD completo con validaciones empresariales
 * - Integración con equipos y usuarios
 * - Manejo robusto de errores
 * 
 * @package App\Http\Controllers\Api
 * @author Sistema EVA
 * @version 2.0.0
 */
class CorrectivoGeneralController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/correctivos-generales",
     *     tags={"CorrectivoGeneral"},
     *     summary="Listar correctivos generales con búsqueda y filtros",
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="search", in="query", description="Búsqueda global"),
     *     @OA\Parameter(name="status", in="query", description="Filtro por estado"),
     *     @OA\Parameter(name="page", in="query", description="Página"),
     *     @OA\Parameter(name="per_page", in="query", description="Elementos por página"),
     *     @OA\Parameter(name="sort_by", in="query", description="Campo de ordenamiento"),
     *     @OA\Parameter(name="sort_direction", in="query", description="Dirección de ordenamiento"),
     *     @OA\Response(response=200, description="Lista obtenida exitosamente")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:10000',
                'search' => 'nullable|string|max:255',
                'status' => 'nullable|in:all,active,completed,in_progress,pending',
                'sort_by' => 'nullable|string|in:fecha_creacion,codigo_orden,equipo,marca,sede',
                'sort_direction' => 'nullable|in:asc,desc',
                'fecha_desde' => 'nullable|date|date_format:Y-m-d',
                'fecha_hasta' => 'nullable|date|date_format:Y-m-d|after_or_equal:fecha_desde'
            ]);

            if ($validator->fails()) {
                return ResponseFormatter::error($validator->errors(), 'Parámetros de validación incorrectos', 422);
            }

            // Query base usando DB directamente para evitar problemas con relaciones
            // Aumentar límites para reportes grandes
            ini_set('memory_limit', '1024M');
            set_time_limit(300); // 5 minutos

            $query = DB::table('correctivos_generales as cg')
                ->leftJoin('equipos as e', 'cg.equipo_id', '=', 'e.id')
                ->leftJoin('codificacion_cierres as cc', 'cg.cierre_id', '=', 'cc.id')
                ->leftJoin('servicios as s', 'e.servicio_id', '=', 's.id')
                ->leftJoin('sedes as se', 's.sede_id', '=', 'se.id')
                ->leftJoin('areas as ar', 'e.area_id', '=', 'ar.id')
                ->leftJoin('tipos_fallas as tf', 'cg.tipo_falla_id', '=', 'tf.id')
                ->leftJoin('estadoequipos as ee', 'e.estadoequipo_id', '=', 'ee.id')
                ->select([
                    'cg.id',
                    'cg.created_at',
                    'cg.status',
                    'cg.equipo_id',
                    'cg.file',
                    'cg.file_orden',
                    'cg.orden',
                    'cg.fecha_inicio',
                    'cg.code_orden',
                    'cg.diagnostico',
                    'cg.code_diagnostico',
                    'cg.fecha_diagnostico',
                    'cg.description',
                    'cg.code',
                    'cg.fecha_mantenimiento',
                    'cg.repuesto_pendiente',
                    'cg.repuesto_id',
                    'cg.cierre_id',
                    'cg.tipo_falla_id',
                    'e.name as equipo_name',
                    'e.code as equipo_code',
                    'e.marca as equipo_marca',
                    'e.modelo as equipo_modelo',
                    'e.serial as equipo_serial',
                    'cc.name as cierre_name',
                    'cc.code as cierre_code',
                    's.name as servicio_name',
                    'ee.name as estado_equipo_name',
                    'ar.name as area_name',
                    'tf.name as tipo_falla_name',
                    DB::raw('se.name as sede_nombre'),
                    DB::raw('(SELECT responsable FROM planes_mantenimientos WHERE equipo_id = cg.equipo_id ORDER BY id DESC LIMIT 1) as responsable_plan'),
                    DB::raw('(SELECT COUNT(*) FROM avances_correctivos WHERE correctivo_general_id = cg.id) AS conteo_avances')
                ]);

            // Búsqueda global en todos los campos usando campos reales de la BD
            if ($request->filled('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('cg.code_orden', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('cg.description', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('cg.diagnostico', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('cg.code_diagnostico', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('cg.code', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('cg.repuesto_pendiente', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.code', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.marca', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.modelo', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('s.name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('se.name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('ar.name', 'LIKE', "%{$searchTerm}%");
                });
            }

            // Filtros por estado usando campos reales
            if ($request->filled('status') && $request->status !== 'all') {
                switch ($request->status) {
                    case 'active':
                        $query->where('cg.status', 1);
                        break;
                    case 'completed':
                        $query->whereNotNull('cg.fecha_mantenimiento');
                        break;
                    case 'in_progress':
                        $query->whereNull('cg.fecha_mantenimiento')
                              ->whereNotNull('cg.fecha_diagnostico');
                        break;
                    case 'pending':
                        $query->whereNull('cg.fecha_diagnostico');
                        break;
                }
            }

            // Filtros por rango de fechas
            if ($request->filled('fecha_desde')) {
                $query->whereDate('cg.created_at', '>=', $request->fecha_desde);
            }
            
            if ($request->filled('fecha_hasta')) {
                $query->whereDate('cg.created_at', '<=', $request->fecha_hasta);
            }

            // Filtro por SEDE (dashboard): sede efectiva del equipo (propia o del servicio)
            if ($request->filled('sede_id') && $request->sede_id !== 'all') {
                $query->where(DB::raw('COALESCE(e.sede_id, s.sede_id)'), $request->sede_id);
            }

            // Filtro por equipo_id (específico para Hoja de Vida/Consultas)
            // Si es equipo industrial, consultar de correctivos_generales_ind
            if ($request->filled('equipo_id')) {
                $eqId = $request->equipo_id;
                $tipoEquipoIndex = DB::table('equipos')->where('id', $eqId)->value('tipo_id');

                if ($tipoEquipoIndex == 2) {
                    // Equipo industrial: consultar directamente de correctivos_generales_ind
                    $indQuery = DB::table('correctivos_generales_ind as cg')
                        ->leftJoin('equipos as e', 'cg.equipo_id', '=', 'e.id')
                        ->leftJoin('servicios as s', 'e.servicio_id', '=', 's.id')
                        ->leftJoin('sedes as se', 's.sede_id', '=', 'se.id')
                        ->select([
                            'cg.id',
                            'cg.created_at',
                            'cg.status',
                            'cg.equipo_id',
                            'cg.file',
                            'cg.description',
                            'cg.code',
                            'cg.fecha_mantenimiento',
                            'e.name as equipo_name',
                            'e.code as equipo_code',
                            'e.marca as equipo_marca',
                            'e.modelo as equipo_modelo',
                            'e.serial as equipo_serial',
                            's.name as servicio_name',
                            DB::raw('se.name as sede_nombre'),
                        ])
                        ->where('cg.equipo_id', $eqId)
                        ->orderBy('cg.fecha_mantenimiento', 'desc');

                    $perPage = $request->get('per_page', 1000);
                    $indResults = $indQuery->paginate($perPage);

                    return ResponseFormatter::success($indResults, 'Correctivos industriales obtenidos');
                }

                $query->where('cg.equipo_id', $eqId);
            }

            // Filtro por tipo de equipo (biomedico = tipo_id 1, industrial = tipo_id 2)
            // Para industrial: consultar SOLO correctivos_generales_ind (no la tabla principal)
            if ($request->filled('tipo') && $request->tipo === 'industrial' && !$request->filled('equipo_id')) {
                $indQuery = DB::table('correctivos_generales_ind as cgi')
                    ->leftJoin('equipos as ei', 'cgi.equipo_id', '=', 'ei.id')
                    ->leftJoin('servicios as si', 'ei.servicio_id', '=', 'si.id')
                    ->leftJoin('sedes as sei', 'si.sede_id', '=', 'sei.id')
                    ->leftJoin('areas as ari', 'ei.area_id', '=', 'ari.id')
                    ->leftJoin('estadoequipos as eei', 'ei.estadoequipo_id', '=', 'eei.id')
                    ->select([
                        'cgi.id',
                        DB::raw("COALESCE(cgi.created_at, cgi.fecha_mantenimiento) as created_at"),
                        'cgi.status',
                        'cgi.equipo_id',
                        'cgi.file',
                        DB::raw("NULL as file_orden"),
                        DB::raw("cgi.description as orden"),
                        DB::raw("COALESCE(cgi.created_at, cgi.fecha_mantenimiento) as fecha_inicio"),
                        DB::raw("cgi.code as code_orden"),
                        DB::raw("NULL as diagnostico"),
                        DB::raw("NULL as code_diagnostico"),
                        DB::raw("NULL as fecha_diagnostico"),
                        'cgi.description',
                        'cgi.code',
                        'cgi.fecha_mantenimiento',
                        DB::raw("NULL as repuesto_pendiente"),
                        DB::raw("NULL as repuesto_id"),
                        DB::raw("NULL as cierre_id"),
                        DB::raw("NULL as tipo_falla_id"),
                        'ei.name as equipo_name',
                        'ei.code as equipo_code',
                        'ei.marca as equipo_marca',
                        'ei.modelo as equipo_modelo',
                        'ei.serial as equipo_serial',
                        DB::raw("NULL as cierre_name"),
                        DB::raw("NULL as cierre_code"),
                        'si.name as servicio_name',
                        DB::raw("sei.name as sede_nombre"),
                        DB::raw("ari.name as area_name"),
                        DB::raw("NULL as tipo_falla_name"),
                        DB::raw("eei.name as estado_equipo_name"),
                        DB::raw("(SELECT pm.responsable FROM planes_mantenimientos pm WHERE pm.equipo_id = cgi.equipo_id ORDER BY pm.id DESC LIMIT 1) as responsable_plan"),
                        DB::raw("0 as conteo_avances"),
                        DB::raw("'ind' as fuente_tabla"),
                    ]);

                if ($request->filled('search')) {
                    $searchTerm = $request->search;
                    $indQuery->where(function($q) use ($searchTerm) {
                        $q->where('cgi.code', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('cgi.description', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('ei.name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('ei.code', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('si.name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('sei.name', 'LIKE', "%{$searchTerm}%");
                    });
                }
                if ($request->filled('fecha_desde')) {
                    $indQuery->where(function($q) use ($request) {
                        $q->whereDate('cgi.created_at', '>=', $request->fecha_desde)
                          ->orWhere(function($q2) use ($request) {
                              $q2->whereNull('cgi.created_at')
                                 ->whereDate('cgi.fecha_mantenimiento', '>=', $request->fecha_desde);
                          });
                    });
                }
                if ($request->filled('fecha_hasta')) {
                    $indQuery->where(function($q) use ($request) {
                        $q->whereDate('cgi.created_at', '<=', $request->fecha_hasta)
                          ->orWhere(function($q2) use ($request) {
                              $q2->whereNull('cgi.created_at')
                                 ->whereDate('cgi.fecha_mantenimiento', '<=', $request->fecha_hasta);
                          });
                    });
                }
                if ($request->filled('anio') && $request->anio !== 'all') {
                    $indQuery->where(function($q) use ($request) {
                        $q->whereYear('cgi.created_at', $request->anio)
                          ->orWhere(function($q2) use ($request) {
                              $q2->whereNull('cgi.created_at')
                                 ->whereYear('cgi.fecha_mantenimiento', $request->anio);
                          });
                    });
                }
                if ($request->filled('status') && $request->status !== 'all') {
                    if ($request->status == 'completed') {
                        $indQuery->whereNotNull('cgi.fecha_mantenimiento');
                    } elseif ($request->status == 'pending') {
                        $indQuery->whereNull('cgi.fecha_mantenimiento');
                    }
                }

                $indQuery->orderBy(DB::raw("COALESCE(cgi.created_at, cgi.fecha_mantenimiento)"), 'desc');

                $perPage = $request->get('per_page', 1000);
                $page = $request->get('page', 1);
                $offset = ($page - 1) * $perPage;

                // También obtener tickets industriales de la tabla ordenes
                $ticketsIndQuery = DB::table('ordenes as o')
                    ->leftJoin('equipos as eo', 'o.equipo_id', '=', 'eo.id')
                    ->leftJoin('servicios as so', 'o.servicio_id', '=', 'so.id')
                    ->leftJoin('sedes as seo', 'so.sede_id', '=', 'seo.id')
                    ->leftJoin('areas as aro', 'eo.area_id', '=', 'aro.id')
                    ->leftJoin('estadoequipos as eeo', 'eo.estadoequipo_id', '=', 'eeo.id')
                    ->leftJoin('codificacion_cierres as cco', 'o.cierre_id', '=', 'cco.id')
                    ->leftJoin('estados as esto', 'o.estado_id', '=', 'esto.id')
                    ->select([
                        'o.id',
                        DB::raw("CAST(o.fecha_inicio AS DATETIME) as created_at"),
                        'o.equipo_id',
                        'o.fecha_inicio',
                        DB::raw("NULL as code"),
                        'o.descripcion as orden',
                        'o.fecha_fin as fecha_mantenimiento',
                        DB::raw("NULL as file"),
                        DB::raw("o.id as code_orden"),
                        'eo.name as equipo_name',
                        'eo.code as equipo_code',
                        'eo.marca as equipo_marca',
                        'eo.modelo as equipo_modelo',
                        'eo.serial as equipo_serial',
                        'so.name as servicio_name',
                        DB::raw("seo.name as sede_nombre"),
                        DB::raw("aro.name as area_name"),
                        DB::raw("eeo.name as estado_equipo_name"),
                        DB::raw("(SELECT pm.responsable FROM planes_mantenimientos pm WHERE pm.equipo_id = o.equipo_id ORDER BY pm.id DESC LIMIT 1) as responsable_plan"),
                        'cco.code as cierre_code',
                        'cco.name as cierre_name',
                        'esto.descripcion as estado_descripcion',
                        'o.reparacion',
                        'o.tecnico_cierre_text',
                        DB::raw("'ticket' as fuente_tabla"),
                    ])
                    ->where(function($q) {
                        $q->where('eo.tipo_id', 2)
                          ->orWhere('o.subproceso_id', 2);
                    })
                    ->where(function($q) {
                        $q->whereNull('o.equipo_id')
                          ->orWhere('o.equipo_id', 0)
                          ->orWhereNotNull('eo.id');
                    });

                if ($request->filled('search')) {
                    $searchTerm = $request->search;
                    $ticketsIndQuery->where(function($q) use ($searchTerm) {
                        $q->where('o.descripcion', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('eo.name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('eo.code', 'LIKE', "%{$searchTerm}%");
                    });
                }
                if ($request->filled('fecha_desde')) {
                    $ticketsIndQuery->whereDate('o.fecha_inicio', '>=', $request->fecha_desde);
                }
                if ($request->filled('fecha_hasta')) {
                    $ticketsIndQuery->whereDate('o.fecha_inicio', '<=', $request->fecha_hasta);
                }
                if ($request->filled('anio') && $request->anio !== 'all') {
                    $ticketsIndQuery->whereYear('o.fecha_inicio', $request->anio);
                }
                if ($request->filled('status') && $request->status !== 'all') {
                    if ($request->status == 'completed') {
                        $ticketsIndQuery->whereNotNull('o.fecha_fin');
                    } elseif ($request->status == 'pending') {
                        $ticketsIndQuery->whereNull('o.fecha_fin');
                    }
                }

                $ticketsInd = $ticketsIndQuery->get();

                // Obtener todos los _ind (sin paginación) para combinar con tickets
                $allInd = $indQuery->get();

                // Combinar _ind + tickets, ordenar y paginar
                $combined = collect($allInd)->concat($ticketsInd)
                    ->sortByDesc('created_at')
                    ->values();

                $totalCount = $combined->count();
                $correctivos = $combined->slice($offset, $perPage)->values();

                // Formatear resultados combinados (_ind + tickets)
                $formattedData = $correctivos->map(function ($correctivo) {
                    $esTicket = isset($correctivo->fuente_tabla) && $correctivo->fuente_tabla === 'ticket';

                    $data = [
                        'id' => $correctivo->id,
                        'fuente' => $esTicket ? 'Tickets' : 'Correctivos industriales',
                        'responsable_mantenimiento' => $correctivo->responsable_plan ?? 'Sistema EVA',
                        'equipo_id' => $correctivo->equipo_id,
                        'fecha_creacion' => $correctivo->fecha_inicio
                            ? Carbon::parse($correctivo->fecha_inicio)->format('Y-m-d')
                            : ($correctivo->fecha_mantenimiento
                                ? Carbon::parse($correctivo->fecha_mantenimiento)->format('Y-m-d')
                                : ''),
                        'codigo_orden' => $correctivo->code_orden ?? $correctivo->code ?? 'SIN_CODIGO',
                        'descripcion_orden' => $correctivo->orden ?? '',
                        'codificacion_cierre' => $esTicket
                            ? (trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . ($correctivo->cierre_name ?? '')) ?: ($correctivo->estado_descripcion ?? ''))
                            : ($correctivo->fecha_mantenimiento ? 'Completado' : 'Sin Info'),
                        'equipo' => $correctivo->equipo_name ?? 'Equipo no especificado',
                        'codigo_equipo' => $correctivo->equipo_code ?? '',
                        'marca' => $correctivo->equipo_marca ?? '',
                        'modelo' => $correctivo->equipo_modelo ?? '',
                        'serie' => $correctivo->equipo_serial ?? '',
                        'estado_actual' => $correctivo->estado_equipo_name ?? 'Activo',
                        'sede' => $correctivo->sede_nombre ?? '',
                        'servicio' => $correctivo->servicio_name ?? '',
                        'area' => $correctivo->area_name ?? '',
                        'archivo' => $correctivo->file ?? '',
                        'tipo_falla' => '',
                        'cierre_code' => $correctivo->cierre_code ?? '',
                        'cierre_name' => $correctivo->cierre_name ?? '',
                        'conteo_avances' => 0,
                        'avances' => [],
                        'fecha_avance' => '',
                        'titulo_avance1' => '',
                        'descripcion_avance' => '',
                        'retro_cierre' => $correctivo->fecha_mantenimiento ? 'Completado' : 'Pendiente',
                        'descripcion_cierre' => $esTicket
                            ? ($correctivo->reparacion ?? $correctivo->tecnico_cierre_text ?? '')
                            : ($correctivo->description ?? ''),
                        'fecha_cierre' => $correctivo->fecha_mantenimiento ?? '',
                        'fecha_fin' => $correctivo->fecha_mantenimiento ?? '',
                    ];
                    return $data;
                });

                $lastPage = ceil($totalCount / $perPage);
                $from = $totalCount > 0 ? $offset + 1 : 0;
                $to = min($offset + $perPage, $totalCount);

                return ResponseFormatter::success([
                    'correctivos' => $formattedData,
                    'pagination' => [
                        'current_page' => (int)$page,
                        'last_page' => $lastPage,
                        'per_page' => (int)$perPage,
                        'total' => $totalCount,
                        'from' => $from,
                        'to' => $to
                    ]
                ], 'Correctivos industriales obtenidos exitosamente');
            }

            if ($request->filled('tipo') && $request->tipo !== 'all' && !$request->filled('equipo_id')) {
                if ($request->tipo === 'biomedico') {
                    $query->where('e.tipo_id', 1);
                }
            }

            // Filtro por año
            if ($request->filled('anio') && $request->anio !== 'all') {
                $query->whereYear('cg.created_at', $request->anio);
            }

            // Ordenamiento usando campos reales
            $sortBy = $request->get('sort_by', 'fecha_inicio');
            $sortDirection = $request->get('sort_direction', 'desc');
            
            // Mapear campos de ordenamiento a campos reales
            $sortMapping = [
                'fecha_creacion' => 'cg.created_at',
                'codigo_orden' => 'cg.code_orden',
                'equipo' => 'e.name',
                'marca' => 'e.marca',
                'sede' => 'se.name',
                'servicio' => 's.name',
                'area' => 'ar.name'
            ];
            
            $actualSortBy = $sortMapping[$sortBy] ?? 'cg.fecha_inicio';
            $query->orderBy($actualSortBy, $sortDirection);

            // Ejecutar la consulta con paginación manual
            $perPage = $request->get('per_page', 1000);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;

            // Contar total de registros (con los mismos filtros)
            $totalQuery = DB::table('correctivos_generales as cg')
                ->leftJoin('equipos as e', 'cg.equipo_id', '=', 'e.id')
                ->leftJoin('servicios as s', 'e.servicio_id', '=', 's.id')
                ->leftJoin('sedes as se', 's.sede_id', '=', 'se.id')
                ->leftJoin('areas as ar', 'e.area_id', '=', 'ar.id');
            
            if ($request->filled('search')) {
                $searchTerm = $request->search;
                $totalQuery->where(function($q) use ($searchTerm) {
                    $q->where('cg.code_orden', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('e.code', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('s.name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('se.name', 'LIKE', "%{$searchTerm}%");
                });
            }
            if ($request->filled('status') && $request->status !== 'all') {
                // ... aplicar filtros de estado ...
                if ($request->status == 'active') $totalQuery->where('cg.status', 1);
            }
            if ($request->filled('equipo_id')) $totalQuery->where('cg.equipo_id', $request->equipo_id);
            if ($request->filled('tipo') && $request->tipo === 'biomedico') {
                $totalQuery->where('e.tipo_id', 1);
            }

            $totalCount = $totalQuery->count();

            // Obtener los datos paginados
            $correctivos = $query->offset($offset)->limit($perPage)->get();

            // Obtener avances para todos los correctivos de esta página para evitar N+1
            $correctivoIds = $correctivos->pluck('id')->toArray();
            $avances = DB::table('avances_correctivos')
                ->whereIn('correctivo_general_id', $correctivoIds)
                ->orderBy('date', 'desc')
                ->get()
                ->groupBy('correctivo_general_id');

            // Formatear datos para el frontend
            $formattedData = $correctivos->map(function ($correctivo) use ($avances) {
                // Obtener los últimos 3 avances
                $misAvances = $avances->get($correctivo->id, collect())->take(3);
                
                $data = [
                    'id' => $correctivo->id,
                    'fuente' => 'Correctivos generales',
                    'responsable_mantenimiento' => $correctivo->responsable_plan ?? 'Sistema EVA',
                    'equipo_id' => $correctivo->equipo_id,
                    'fecha_creacion' => $correctivo->fecha_inicio ? 
                        Carbon::parse($correctivo->fecha_inicio)->format('Y-m-d') : 
                        ($correctivo->created_at ? Carbon::parse($correctivo->created_at)->format('Y-m-d') : date('Y-m-d')),
                    'codigo_orden' => $correctivo->code_orden ?? 'SIN_CODIGO',
                    'descripcion_orden' => $correctivo->orden ?? '',
                    'codificacion_cierre' => ($correctivo->cierre_code || $correctivo->cierre_name) 
                        ? trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . $correctivo->cierre_name)
                        : ($correctivo->diagnostico ?? 'Sin Info'),
                    'equipo' => $correctivo->equipo_name ?? 'Equipo no especificado',
                    'codigo_equipo' => $correctivo->equipo_code ?? '',
                    'marca' => $correctivo->equipo_marca ?? '',
                    'modelo' => $correctivo->equipo_modelo ?? '',
                    'serie' => $correctivo->equipo_serial ?? '',
                    'estado_actual' => $correctivo->estado_equipo_name ?? 'Activo',
                    'sede' => $correctivo->sede_nombre ?? '',
                    'servicio' => $correctivo->servicio_name ?? '',
                    'area' => $correctivo->area_name ?? '',
                    'archivo' => $correctivo->file ?? '',
                    'tipo_falla' => $correctivo->tipo_falla_name ?? '',
                    'cierre_code' => $correctivo->cierre_code ?? '',
                    'cierre_name' => $correctivo->cierre_name ?? '',
                    
                    // Avances (mapeados a los campos que la vista actual podría usar o nuevos)
                    'conteo_avances' => (int) ($correctivo->conteo_avances ?? 0),
                    'avances' => $misAvances->map(function($a) {
                        return [
                            'fecha' => $a->date,
                            'titulo' => $a->title,
                            'descripcion' => $a->description
                        ];
                    })
                ];

                // Mapeo retrocompatible para la vista actual (primer avance)
                if ($misAvances->count() > 0) {
                    $first = $misAvances->first();
                    $data['fecha_avance'] = $first->date;
                    $data['titulo_avance1'] = $first->title;
                    $data['descripcion_avance'] = $first->description;
                } else {
                    $data['fecha_avance'] = $correctivo->fecha_diagnostico ?? '';
                    $data['titulo_avance1'] = 'Diagnóstico';
                    $data['descripcion_avance'] = $correctivo->diagnostico ?? '';
                }

                // Cierre
                $data['retro_cierre'] = $correctivo->fecha_mantenimiento ? 'Completado' : 'Pendiente';
                $data['descripcion_cierre'] = $correctivo->description ?? '';
                $data['fecha_cierre'] = $correctivo->fecha_mantenimiento ?? '';
                $data['fecha_fin'] = $correctivo->fecha_mantenimiento ?? '';
                
                return $data;
            });

            // Calcular datos de paginación manual
            $lastPage = ceil($totalCount / $perPage);
            $from = $totalCount > 0 ? $offset + 1 : null;
            $to = min($offset + $perPage, $totalCount);

            $response = [
                'correctivos' => $formattedData,
                'pagination' => [
                    'current_page' => $page,
                    'last_page' => $lastPage,
                    'per_page' => $perPage,
                    'total' => $totalCount,
                    'from' => $from,
                    'to' => $to
                ]
            ];

            return ResponseFormatter::success($response, 'Correctivos obtenidos exitosamente');

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ResponseFormatter::error(null, 'Error al obtener correctivos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/correctivos-generales/export",
     *     tags={"CorrectivoGeneral"},
     *     summary="Exportar correctivos a Excel/CSV",
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="format", type="string", enum={"excel", "csv"}),
     *             @OA\Property(property="filename", type="string"),
     *             @OA\Property(property="data", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(response=200, description="Archivo exportado exitosamente")
     * )
     */
    public function export(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'format' => 'required|in:excel,csv',
                'filename' => 'nullable|string|max:255',
                'data' => 'required|array'
            ]);

            if ($validator->fails()) {
                return ResponseFormatter::error($validator->errors(), 'Parámetros de exportación incorrectos', 422);
            }

            $format = $request->get('format', 'excel');
            $filename = $request->get('filename', 'correctivos_generales_' . date('Y-m-d_H-i-s'));
            $data = $request->get('data', []);

            if ($format === 'excel') {
                return $this->exportToExcelCustom($data, $filename);
            } else {
                return $this->exportToCsvCustom($data, $filename);
            }

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::export', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ResponseFormatter::error(null, 'Error al exportar: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Exportar a Excel con formato exacto de CorrectivosEB.xls (usando datos reales de BD)
     */
    protected function exportToExcelCustom(array $data, string $filename)
    {
        // Extraer los IDs de los correctivos a exportar
        $correctivoIds = array_column($data, 'id');
        
        // Consultar datos reales de la base de datos usando consulta completa
        $correctivos = DB::table('correctivos_generales as cg')
            ->leftJoin('equipos as e', 'cg.equipo_id', '=', 'e.id')
            ->leftJoin('codificacion_cierres as cc', 'cg.cierre_id', '=', 'cc.id')
            ->leftJoin('servicios as s', 'e.servicio_id', '=', 's.id')
            ->leftJoin('sedes as se', 's.sede_id', '=', 'se.id')
            ->leftJoin('areas as ar', 'e.area_id', '=', 'ar.id')
            ->leftJoin('tipos_fallas as tf', 'cg.tipo_falla_id', '=', 'tf.id')
            ->leftJoin('estadoequipos as ee', 'e.estadoequipo_id', '=', 'ee.id')
            ->select([
                'cg.*',
                'e.name as equipo_name',
                'e.code as equipo_code',
                'e.marca as equipo_marca',
                'e.modelo as equipo_modelo',
                'e.serial as equipo_serial',
                'cc.name as cierre_name',
                'cc.code as cierre_code',
                's.name as servicio_name',
                'se.name as sede_nombre',
                'ar.name as area_name',
                'tf.name as tipo_falla_name',
                'ee.name as estado_equipo_name',
                DB::raw('(SELECT responsable FROM planes_mantenimientos WHERE equipo_id = cg.equipo_id ORDER BY id DESC LIMIT 1) as responsable_plan')
            ])
            ->whereIn('cg.id', $correctivoIds)
            ->get();

        // Obtener avances para estos correctivos para los 3 espacios de Excel
        $avances = DB::table('avances_correctivos')
            ->whereIn('correctivo_general_id', $correctivoIds)
            ->orderBy('date', 'desc')
            ->get()
            ->groupBy('correctivo_general_id');

        Log::info("📊 [EXPORT CUSTOM] Exportando " . count($correctivos) . " correctivos con JOINs completos");

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Configurar encabezados exactos según CorrectivosEB.xls
        $headers = [
            'Fuente', 'Responsable del mantenimiento', 'Equipo Id', 'Fecha de creación de la orden',
            'Codigo de orden de trabajo', 'Descripcion de la orden', 'Codificación de cierre',
            'Equipo', 'Codigo Equipo', 'Marca', 'Modelo', 'Serie', 'Estado actual del equipo',
            'Sede', 'Servicio', 'Area', 'Archivo', 'Fecha avance', 'Titulo/Retro Avance1',
            'Descripcion avance', 'Fecha avance2', 'Titulo/Retro Avance2', 'Descripcion avance2',
            'Fecha avance3', 'Titulo/Retro Avance3', 'Descripcion avance3', 'Retro de cierre',
            'Descripcion de Cierre', 'Fecha de Cierre', 'Costo del equipo', 'Fecha fin',
            'Repuesto instalado'
        ];

        // Escribir encabezados
        $sheet->fromArray($headers, null, 'A1');

        // Estilo para encabezados
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'DDDDDD']
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN
                ]
            ]
        ];

        $sheet->getStyle('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '1')
              ->applyFromArray($headerStyle);

        // Helper de fecha: rechaza años < 2000 o > año actual
        $sanitizeDate = function($dateStr) {
            if (!$dateStr) return '';
            if (preg_match('/^0{4}-/', $dateStr)) return '';
            $ts = strtotime($dateStr);
            if (!$ts || $ts <= 0) return '';
            $year = (int)date('Y', $ts);
            if ($year < 2000 || $year > (int)date('Y')) return '';
            return $dateStr;
        };

        // Escribir datos reales
        $row = 2;
        foreach ($correctivos as $correctivo) {
            $misAvances = $avances->get($correctivo->id, collect())->take(3)->values();
            
            $rowData = [
                'Correctivos generales', // fuente
                $correctivo->responsable_plan ?? 'Sistema EVA', // responsable
                $correctivo->equipo_id ?? '', // equipo_id
                $sanitizeDate($correctivo->fecha_inicio ?? $correctivo->created_at ?? ''), // fecha_creacion
                $correctivo->code_orden ?? '', // codigo_orden
                $correctivo->orden ?? '', // descripcion_orden (TEXT)
                trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . $correctivo->cierre_name) ?: ($correctivo->diagnostico ?? ''), // codificacion_cierre
                $correctivo->equipo_name ?? 'N/A', // equipo
                $correctivo->equipo_code ?? '', // codigo_equipo
                $correctivo->equipo_marca ?? '', // marca
                $correctivo->equipo_modelo ?? '', // modelo
                $correctivo->equipo_serial ?? '', // serie
                $correctivo->estado_equipo_name ?? 'Activo', // estado_actual
                $correctivo->sede_nombre ?? '', // sede
                $correctivo->servicio_name ?? '', // servicio
                $correctivo->area_name ?? '', // area
                $correctivo->file ?? '', // archivo
                
                // Avance 1
                $sanitizeDate(isset($misAvances[0]) ? $misAvances[0]->date : ''),
                isset($misAvances[0]) ? $misAvances[0]->title : '',
                isset($misAvances[0]) ? $misAvances[0]->description : '',
                
                // Avance 2
                $sanitizeDate(isset($misAvances[1]) ? $misAvances[1]->date : ''),
                isset($misAvances[1]) ? $misAvances[1]->title : '',
                isset($misAvances[1]) ? $misAvances[1]->description : '',
                
                // Avance 3
                $sanitizeDate(isset($misAvances[2]) ? $misAvances[2]->date : ''),
                isset($misAvances[2]) ? $misAvances[2]->title : '',
                isset($misAvances[2]) ? $misAvances[2]->description : '',
                
                // Cierre
                $correctivo->fecha_mantenimiento ? 'Completado' : 'Pendiente', // retro_cierre
                $correctivo->repuesto_pendiente ?? '', // descripcion_cierre
                $sanitizeDate($correctivo->fecha_mantenimiento ?? ''), // fecha_cierre
                0, // costo_equipo
                $sanitizeDate($correctivo->fecha_mantenimiento ?? ''), // fecha_fin
                $correctivo->repuesto_pendiente ?? '' // repuesto_instalado
            ];

            // Escribir celda a celda con tipo explícito para evitar fórmulas involuntarias
            $colIdx = 1;
            foreach ($rowData as $cellValue) {
                $cellRef = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx) . $row;
                if (is_float($cellValue) || is_int($cellValue)) {
                    $sheet->setCellValue($cellRef, $cellValue);
                } elseif (is_null($cellValue) || $cellValue === '') {
                    $sheet->setCellValue($cellRef, '');
                } else {
                    $sheet->setCellValueExplicit($cellRef, $this->cleanText((string)$cellValue), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                }
                $colIdx++;
            }
            $row++;
        }

        // Ajustar ancho de columnas
        $maxCol = count($headers);
        for ($i = 1; $i <= $maxCol; $i++) {
            $colStr = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($colStr)->setAutoSize(true);
        }

        // Crear respuesta de descarga
        $writer = new Xlsx($spreadsheet);
        
        return new StreamedResponse(function() use ($writer, $filename) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.xlsx"',
            'Cache-Control' => 'max-age=0'
        ]);
    }

    /**
     * Exportar a CSV
     */
    protected function exportToCsvCustom(array $data, string $filename)
    {
        $correctivoIds = array_column($data, 'id');
        
        $correctivos = DB::table('correctivos_generales as cg')
            ->leftJoin('equipos as e', 'cg.equipo_id', '=', 'e.id')
            ->leftJoin('codificacion_cierres as cc', 'cg.cierre_id', '=', 'cc.id')
            ->leftJoin('servicios as s', 'e.servicio_id', '=', 's.id')
            ->leftJoin('sedes as se', 's.sede_id', '=', 'se.id')
            ->leftJoin('areas as ar', 'e.area_id', '=', 'ar.id')
            ->leftJoin('tipos_fallas as tf', 'cg.tipo_falla_id', '=', 'tf.id')
            ->leftJoin('estadoequipos as ee', 'e.estadoequipo_id', '=', 'ee.id')
            ->select([
                'cg.*',
                'e.name as equipo_name',
                'e.code as equipo_code',
                'e.marca as equipo_marca',
                'e.modelo as equipo_modelo',
                'e.serial as equipo_serial',
                'cc.name as cierre_name',
                'cc.code as cierre_code',
                's.name as servicio_name',
                'se.name as sede_nombre',
                'ar.name as area_name',
                'tf.name as tipo_falla_name',
                'ee.name as estado_equipo_name',
                DB::raw('(SELECT responsable FROM planes_mantenimientos WHERE equipo_id = cg.equipo_id ORDER BY id DESC LIMIT 1) as responsable_plan')
            ])
            ->whereIn('cg.id', $correctivoIds)
            ->get();

        $avances = DB::table('avances_correctivos')
            ->whereIn('correctivo_general_id', $correctivoIds)
            ->orderBy('date', 'desc')
            ->get()
            ->groupBy('correctivo_general_id');

        return new StreamedResponse(function() use ($correctivos, $avances, $filename) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            
            $headers = [
                'Fuente', 'Responsable del mantenimiento', 'Equipo Id', 'Fecha de creación de la orden',
                'Codigo de orden de trabajo', 'Descripcion de la orden', 'Codificación de cierre',
                'Equipo', 'Codigo Equipo', 'Marca', 'Modelo', 'Serie', 'Estado actual del equipo',
                'Sede', 'Servicio', 'Area', 'Archivo', 'Fecha avance', 'Titulo/Retro Avance1',
                'Descripcion avance', 'Fecha avance2', 'Titulo/Retro Avance2', 'Descripcion avance2',
                'Fecha avance3', 'Titulo/Retro Avance3', 'Descripcion avance3', 'Retro de cierre',
                'Descripcion de Cierre', 'Fecha de Cierre', 'Costo del equipo', 'Fecha fin',
                'Repuesto instalado'
            ];
            fputcsv($handle, $headers);
            
            foreach ($correctivos as $correctivo) {
                $misAvances = $avances->get($correctivo->id, collect())->take(3)->values();
                
                $row = [
                    'Correctivos generales',
                    $correctivo->responsable_plan ?? 'Sistema EVA',
                    $correctivo->equipo_id ?? '',
                    $correctivo->fecha_inicio ?? $correctivo->created_at ?? '',
                    $correctivo->code_orden ?? '',
                    $correctivo->orden ?? '',
                    trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . $correctivo->cierre_name) ?: ($correctivo->diagnostico ?? ''),
                    $correctivo->equipo_name ?? 'N/A',
                    $correctivo->equipo_code ?? '',
                    $correctivo->equipo_marca ?? '',
                    $correctivo->equipo_modelo ?? '',
                    $correctivo->equipo_serial ?? '',
                    $correctivo->estado_equipo_name ?? 'Activo',
                    $correctivo->sede_nombre ?? '',
                    $correctivo->servicio_name ?? '',
                    $correctivo->area_name ?? '',
                    $correctivo->file ?? '',
                    isset($misAvances[0]) ? $misAvances[0]->date : '',
                    isset($misAvances[0]) ? $misAvances[0]->title : '',
                    isset($misAvances[0]) ? $misAvances[0]->description : '',
                    isset($misAvances[1]) ? $misAvances[1]->date : '',
                    isset($misAvances[1]) ? $misAvances[1]->title : '',
                    isset($misAvances[1]) ? $misAvances[1]->description : '',
                    isset($misAvances[2]) ? $misAvances[2]->date : '',
                    isset($misAvances[2]) ? $misAvances[2]->title : '',
                    isset($misAvances[2]) ? $misAvances[2]->description : '',
                    $correctivo->fecha_mantenimiento ? 'Completado' : 'Pendiente',
                    $correctivo->repuesto_pendiente ?? '',
                    $correctivo->fecha_mantenimiento ?? '',
                    0,
                    $correctivo->fecha_mantenimiento ?? '',
                    $correctivo->repuesto_pendiente ?? ''
                ];
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
            'Cache-Control' => 'max-age=0'
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/correctivos-generales",
     *     tags={"CorrectivoGeneral"},
     *     summary="Crear nuevo correctivo general",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=201, description="Creado exitosamente")
     * )
     */
    public function store(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $validator = Validator::make($request->all(), [
                'equipo_id' => 'required|exists:equipos,id',
                'code_orden' => 'required|string|max:50',
                'orden' => 'required|string|max:1000',
                'fecha_inicio' => 'required|string', // Se recibe concatenada "YYYY-MM-DD HH:MM"
                
                // Avance
                'diagnostico' => 'nullable|string',
                'fecha_diagnostico' => 'nullable|date',
                'code_diagnostico' => 'nullable|string',

                // Cierre
                'code' => 'nullable|string',
                'description' => 'nullable|string',
                'fecha_mantenimiento' => 'nullable|string', // Se recibe concatenada "YYYY-MM-DD HH:MM"
                'tipo_falla_id' => 'nullable|integer',
                'cierre_id' => 'nullable|integer',

                // Archivo Correctivo
                'file_correctivo' => 'nullable|file|max:20480',
                'titulo_archivo' => 'nullable|string',

                // Repuesto Instalado
                'repuesto_id' => 'nullable|integer',
                'cantidad_entregada' => 'nullable|numeric',
                'fecha_repuesto' => 'nullable|date',
                'observacion_repuesto' => 'nullable|string',
                'file_repuesto' => 'nullable|file|max:20480',

                // Repuestos Pendientes
                'repuestos_pendientes' => 'nullable|array'
            ]);

            if ($validator->fails()) {
                return ResponseFormatter::error($validator->errors(), 'Error de validación', 422);
            }

            // 1. Crear el Correctivo General (Cabecera)
            $correctivoData = [
                'equipo_id' => $request->equipo_id,
                'code_orden' => $request->code_orden,
                'orden' => $request->orden,
                'fecha_inicio' => $request->fecha_inicio,
                'diagnostico' => $request->diagnostico,
                'fecha_diagnostico' => $request->fecha_diagnostico,
                'code_diagnostico' => $request->code_diagnostico,
                'code' => $request->code,
                'description' => $request->description,
                'fecha_mantenimiento' => $request->fecha_mantenimiento,
                'tipo_falla_id' => $request->tipo_falla_id,
                'cierre_id' => $request->cierre_id,
                'status' => 1,
                'created_at' => now()
            ];

            // Si hay repuestos instalados o pendientes, marcar el correctivo
            if ($request->filled('repuesto_id') || $request->filled('repuestos_pendientes')) {
                $correctivoData['repuesto_pendiente'] = $request->filled('repuestos_pendientes') ? 'si' : 'no';
                $correctivoData['repuesto_id'] = $request->repuesto_id;
            }

            // Determinar si es equipo industrial
            $tipoEquipoStore = DB::table('equipos')->where('id', $request->equipo_id)->value('tipo_id');

            if ($tipoEquipoStore == 2) {
                // Equipo industrial: guardar en correctivos_generales_ind con todos los campos disponibles
                $correctivoIndId = DB::table('correctivos_generales_ind')->insertGetId([
                    'equipo_id'          => $request->equipo_id,
                    'status'             => 1,
                    'created_at'         => now(),
                    // Orden de trabajo
                    'code_orden'         => $request->code_orden,
                    'orden'              => $request->orden,
                    'fecha_inicio'       => $request->fecha_inicio,
                    // Diagnóstico / avance
                    'code_diagnostico'   => $request->code_diagnostico,
                    'diagnostico'        => $request->diagnostico,
                    'fecha_diagnostico'  => $request->fecha_diagnostico,
                    // Cierre / trabajo realizado
                    'code'               => $request->code,
                    'description'        => $request->description,
                    'fecha_mantenimiento'=> $request->fecha_mantenimiento,
                    'cierre_id'          => $request->cierre_id ?: 14,
                    // Repuesto
                    'repuesto_id'        => $request->repuesto_id,
                    'repuesto_pendiente' => $request->repuesto_id ? 'si' : ($request->repuestos_pendientes ? 'si' : 'no'),
                    'file'               => null,
                ]);
                $correctivoId = $correctivoIndId;
                Log::info("🏭 [CORRECTIVO-GENERAL] Industrial creado en correctivos_generales_ind con ID: $correctivoIndId");

                // Archivo para industrial
                if ($request->hasFile('file_correctivo')) {
                    $file = $request->file('file_correctivo');
                    $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                    $file->storeAs('correctivos_generales', $filename, 'public');

                    DB::table('correctivos_generales_archivos_ind')->insert([
                        'correctivo_general_id' => $correctivoIndId,
                        'file'                  => $filename,
                        'titulo'                => $request->titulo_archivo ?? 'Documento de Correctivo',
                        'created_at'            => now()
                    ]);
                    DB::table('correctivos_generales_ind')->where('id', $correctivoIndId)->update(['file' => $filename]);
                }
            } else {
                // Equipo biomédico: guardar en correctivos_generales
                $correctivoId = DB::table('correctivos_generales')->insertGetId($correctivoData);
                Log::info("✅ [CORRECTIVO-GENERAL] Biomédico creado con ID: $correctivoId");
            }

            // Las siguientes secciones solo aplican para equipos biomédicos
            // (industrial ya maneja archivo arriba)
            if ($tipoEquipoStore != 2) {
                // 1b. Insertar avance inicial en avances_correctivos si se proporcionó diagnóstico
                if ($request->filled('diagnostico') || $request->filled('code_diagnostico')) {
                    $usuarioId = $request->user() ? $request->user()->id : ($request->input('usuario_id') ?: null);
                    DB::table('avances_correctivos')->insert([
                        'title'                  => $request->code_diagnostico ?? 'Avance inicial',
                        'description'            => $request->diagnostico ?? '',
                        'date'                   => $request->fecha_diagnostico ?? now()->toDateString(),
                        'correctivo_general_id'  => $correctivoId,
                        'usuario_id'             => $usuarioId,
                        'orden_id'               => 0,
                    ]);
                    Log::info("📝 [CORRECTIVO-GENERAL] Avance inicial insertado en avances_correctivos.");
                }

                // 2. Manejo de Archivo Asociado (correctivos_generales_archivos)
                if ($request->hasFile('file_correctivo')) {
                    $file = $request->file('file_correctivo');
                    $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                    $file->storeAs('correctivos_generales', $filename, 'public');

                    DB::table('correctivos_generales_archivos')->insert([
                        'correctivo_general_id' => $correctivoId,
                        'file'                  => $filename,
                        'titulo'                => $request->titulo_archivo ?? 'Documento de Correctivo',
                        'created_at'            => now()
                    ]);

                    // Actualizar campo file en tabla principal para compatibilidad
                    DB::table('correctivos_generales')->where('id', $correctivoId)->update(['file' => $filename]);
                }
            }

            // 3. Manejo de Repuesto Instalado (equipo_repuestos)
            // Si viene repuesto_nombre en lugar de repuesto_id, crear o buscar el repuesto
            if ($request->filled('repuesto_nombre') && !$request->filled('repuesto_id')) {
                $nombre = trim($request->repuesto_nombre);
                $existente = DB::table('repuestos')->whereRaw('LOWER(name) = ?', [strtolower($nombre)])->first();
                if ($existente) {
                    $request->merge(['repuesto_id' => $existente->id]);
                } else {
                    $nuevoId = DB::table('repuestos')->insertGetId([
                        'name' => $nombre,
                        'cantidad' => 0,
                        'status' => 1,
                        'created_at' => now(),
                    ]);
                    $request->merge(['repuesto_id' => $nuevoId]);
                }
            }

            if ($request->filled('repuesto_id')) {
                $repuestoData = [
                    'equipo_id' => $request->equipo_id,
                    'repuesto_id' => $request->repuesto_id,
                    'correctivo_general_id' => $correctivoId,
                    'cantidad_entregada' => $request->cantidad_entregada ?? 1,
                    'fecha' => $request->fecha_repuesto ?? now()->format('Y-m-d'),
                    'observacion' => $request->observacion_repuesto,
                    'usuario_id' => $request->user() ? $request->user()->id : 1
                ];

                if ($request->hasFile('file_repuesto')) {
                    $fileR = $request->file('file_repuesto');
                    $filenameR = md5(time() . '_rep_' . $fileR->getClientOriginalName()) . '.' . $fileR->getClientOriginalExtension();
                    $fileR->storeAs('equipos/repuestos', $filenameR, 'public');
                    $repuestoData['file'] = $filenameR;
                }

                DB::table('equipo_repuestos')->insert($repuestoData);
                Log::info("⚙️ [CORRECTIVO-GENERAL] Repuesto instalado registrado.");
            }

            // 4. Manejo de Repuestos Pendientes (repuestos_pendientes)
            if ($request->filled('repuestos_pendientes')) {
                $pendientes = $request->repuestos_pendientes;
                foreach ($pendientes as $pName) {
                    if ($pName) {
                        DB::table('repuestos_pendientes')->insert([
                            'name' => $pName,
                            'correctivo_general_id' => $correctivoId,
                            'created_at' => now(),
                            'status' => 1
                        ]);
                    }
                }
                // Actualizar tabla equipos
                DB::table('equipos')->where('id', $request->equipo_id)->update(['repuesto_pendiente' => 'si']);
                Log::info("⏳ [CORRECTIVO-GENERAL] Repuestos pendientes registrados.");
            }

            // 5. Historial de Hoja de Vida (cambios_hdv)
            DB::table('cambios_hdv')->insert([
                'equipo_id' => $request->equipo_id,
                'descripcion' => "Se agregó un correctivo general con ID: $correctivoId. Orden: {$request->code_orden}",
                'usuario_id' => $request->user() ? $request->user()->id : 1,
                'created_at' => now()
            ]);

            DB::commit();
            return ResponseFormatter::success(['id' => $correctivoId], 'Correctivo y datos relacionados guardados exitosamente', 201);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error en CorrectivoGeneralController::store', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ResponseFormatter::error(null, 'Error al crear correctivo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/correctivos-generales/{id}",
     *     tags={"CorrectivoGeneral"},
     *     summary="Obtener correctivo específico",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Obtenido exitosamente")
     * )
     */
    public function show($id): JsonResponse
    {
        try {
            $correctivo = CorrectivoGeneral::with(['equipo'])->findOrFail($id);
            
            return ResponseFormatter::success($correctivo, 'Correctivo obtenido exitosamente');

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::show', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            return ResponseFormatter::error(null, 'Correctivo no encontrado', 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/correctivos-generales/{id}",
     *     tags={"CorrectivoGeneral"},
     *     summary="Actualizar correctivo",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Actualizado exitosamente")
     * )
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            // Buscar en tabla principal o en tabla industrial
            $correctivo = CorrectivoGeneral::find($id);
            $esIndustrial = false;

            if (!$correctivo) {
                // Buscar en correctivos_generales_ind
                $indRecord = DB::table('correctivos_generales_ind')->where('id', $id)->first();
                if (!$indRecord) {
                    return ResponseFormatter::error(null, 'Correctivo no encontrado', 404);
                }
                $esIndustrial = true;
            } else {
                $tipoEquipo = DB::table('equipos')->where('id', $correctivo->equipo_id)->value('tipo_id');
                $esIndustrial = ($tipoEquipo == 2);
            }

            if ($esIndustrial && !$correctivo) {
                // Actualizar directamente en correctivos_generales_ind
                $updateData = array_filter($request->only([
                    'description', 'status', 'equipo_id', 'file',
                    'fecha_mantenimiento', 'code',
                ]), fn($v) => $v !== null);

                DB::table('correctivos_generales_ind')->where('id', $id)->update($updateData);

                // Manejo de archivo para industrial
                if ($request->hasFile('file_correctivo')) {
                    $file = $request->file('file_correctivo');
                    $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                    $file->storeAs('correctivos_generales', $filename, 'public');

                    DB::table('correctivos_generales_archivos_ind')->insert([
                        'correctivo_general_id' => $id,
                        'file'                  => $filename,
                        'titulo'                => $request->titulo_archivo ?? 'Documento de Correctivo',
                        'created_at'            => now()
                    ]);
                    DB::table('correctivos_generales_ind')->where('id', $id)->update(['file' => $filename]);
                }

                $updated = DB::table('correctivos_generales_ind')->where('id', $id)->first();
                return ResponseFormatter::success($updated, 'Correctivo industrial actualizado exitosamente');
            }
            
            $validator = Validator::make($request->all(), [
                'responsable_mantenimiento' => 'sometimes|string|max:255',
                'descripcion_orden' => 'sometimes|string|max:1000',
                'estado' => 'sometimes|in:pendiente,en_proceso,completado,cancelado',
                'fecha_cierre' => 'nullable|date',
                'descripcion_cierre' => 'nullable|string|max:1000'
            ]);

            if ($validator->fails()) {
                return ResponseFormatter::error($validator->errors(), 'Error de validación', 422);
            }

            $updateData = $request->only([
                'status', 'equipo_id', 'file', 'file_orden', 'orden',
                'fecha_inicio', 'code_orden', 'diagnostico', 'code_diagnostico',
                'fecha_diagnostico', 'description', 'code', 'fecha_mantenimiento',
                'repuesto_pendiente', 'repuesto_id', 'cierre_id', 'tipo_falla_id',
            ]);

            // Evitar error de cast: convertir strings vacíos a null en campos enteros
            foreach (['status', 'equipo_id', 'cierre_id', 'tipo_falla_id'] as $intField) {
                if (array_key_exists($intField, $updateData) && $updateData[$intField] === '') {
                    $updateData[$intField] = null;
                }
            }

            $correctivo->update($updateData);

            // Manejo de archivo adjunto en update (biomédico)
            if ($request->hasFile('file_correctivo')) {
                $file = $request->file('file_correctivo');
                $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
                $file->storeAs('correctivos_generales', $filename, 'public');

                DB::table('correctivos_generales_archivos')->insert([
                    'correctivo_general_id' => $correctivo->id,
                    'file'                  => $filename,
                    'titulo'                => $request->titulo_archivo ?? 'Documento de Correctivo',
                    'created_at'            => now()
                ]);

                $correctivo->update(['file' => $filename]);
            }

            return ResponseFormatter::success($correctivo->fresh(), 'Correctivo actualizado exitosamente');

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::update', [
                'id' => $id,
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);
            return ResponseFormatter::error(null, 'Error al actualizar correctivo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/correctivos-generales/{id}",
     *     tags={"CorrectivoGeneral"},
     *     summary="Eliminar correctivo",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Eliminado exitosamente")
     * )
     */
    public function destroy($id): JsonResponse
    {
        try {
            // Buscar primero en correctivos_generales, luego en correctivos_generales_ind
            $correctivo = CorrectivoGeneral::find($id);
            if ($correctivo) {
                $correctivo->delete();
            } else {
                $indRecord = DB::table('correctivos_generales_ind')->where('id', $id)->first();
                if (!$indRecord) {
                    return ResponseFormatter::error(null, 'Correctivo no encontrado', 404);
                }
                // Eliminar archivos asociados de la tabla industrial
                DB::table('correctivos_generales_archivos_ind')
                    ->where('correctivo_general_id', $id)
                    ->delete();
                DB::table('correctivos_generales_ind')->where('id', $id)->delete();
            }

            return ResponseFormatter::success(null, 'Correctivo eliminado exitosamente');

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::destroy', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            return ResponseFormatter::error(null, 'Error al eliminar correctivo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/correctivos-generales/export-excel",
     *     tags={"CorrectivoGeneral"},
     *     summary="Exportar TODOS los correctivos reales a Excel",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Archivo Excel descargado")
     * )
     */
    public function exportAllToExcel(Request $request): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        try {
            set_time_limit(600); // 10 minutos
            ini_set('memory_limit', '1024M');
            set_time_limit(300); // 5 minutos
            
            $formato = $request->query('formato', 'completo'); // 'completo' o 'parada'
            $tipo = $request->query('tipo', null); // 'biomedico' o 'industrial'
            $limit = $request->query('limit', null); // Límite opcional
            
            Log::info("🔄 [EXPORT] Iniciando exportación a Excel - Formato: {$formato}, Tipo: {$tipo}");

            // ================================================================
            // CONSULTA SIMPLIFICADA: parte desde equipos con tipo_id correcto.
            // INNER JOIN garantiza que solo aparecen correctivos/tickets de
            // equipos existentes con el tipo correcto. Tickets manuales
            // (equipo_id NULL/0) y huérfanos se excluyen automáticamente.
            // ================================================================
            $tipoId   = $tipo === 'industrial' ? 2 : 1;
            $subqResp = "(SELECT pm.responsable FROM planes_mantenimientos pm WHERE pm.equipo_id = e.id ORDER BY pm.anio DESC LIMIT 1)";

            // ── 1. CORRECTIVOS de la tabla correspondiente al tipo ────────
            $tablaCorrectivos = $tipo === 'industrial' ? 'correctivos_generales_ind' : 'correctivos_generales';
            $tipoLabel        = $tipo === 'industrial' ? 'Correctivos Industriales' : 'Correctivos Generales';

            // Columnas tipo-específicas (cierre solo existe en correctivos_generales, no en _ind)
            $selectEspecificos = $tipo === 'industrial'
                ? [DB::raw("NULL as cierre_name"), DB::raw("NULL as cierre_code"), DB::raw("cg.code as code_orden")]
                : ['cc.name as cierre_name', 'cc.code as cierre_code', 'cg.code_orden'];

            $fechaColC = $tipo === 'industrial'
                ? DB::raw("COALESCE(cg.created_at, cg.fecha_mantenimiento)")
                : DB::raw("COALESCE(cg.fecha_inicio, cg.created_at)");

            // Fecha para el SELECT: correctivos_generales_ind no tiene la columna fecha_inicio
            $fechaSelect = $tipo === 'industrial'
                ? "COALESCE(cg.created_at, cg.fecha_mantenimiento)"
                : "COALESCE(cg.fecha_inicio, cg.created_at, cg.fecha_mantenimiento)";

            $qC = DB::table("{$tablaCorrectivos} as cg")
                ->join('equipos as e', function ($join) use ($tipoId) {
                    // INNER JOIN: solo correctivos cuyo equipo exista y tenga el tipo correcto
                    $join->on('cg.equipo_id', '=', 'e.id')->where('e.tipo_id', $tipoId);
                })
                ->leftJoin('servicios as s',         'e.servicio_id',       '=', 's.id')
                ->leftJoin('sedes as sede',           's.sede_id',           '=', 'sede.id')
                ->leftJoin('areas as ar',             'e.area_id',           '=', 'ar.id')
                ->leftJoin('estadoequipos as ee',     'e.estadoequipo_id',   '=', 'ee.id')
                ->select(array_merge([
                    'cg.id',
                    DB::raw("{$fechaSelect} as created_at"),
                    'cg.equipo_id',
                    DB::raw("{$fechaSelect} as fecha_inicio"),
                    'sede.name as sede_nombre',
                    DB::raw("'{$tipoLabel}' as tipo"),
                    DB::raw("{$subqResp} as responsable_nombre"),
                    'e.name as equipo_name',
                    'e.code as equipo_code',
                    'e.marca',
                    'e.modelo',
                    'e.serial',
                    's.name as servicio_nombre',
                    'ar.name as area_nombre',
                    'ee.name as estado_actual',
                    'e.costo',
                    'cg.fecha_mantenimiento as fecha_cierre',
                    DB::raw("cg.description as description"),
                    DB::raw("cg.description as descripcion"),
                    'cg.file',
                    // Campos exclusivos de tickets → NULL para correctivos
                    DB::raw("NULL as fecha_fin"),
                    DB::raw("NULL as retro_cierre"),
                    DB::raw("NULL as estado_descripcion"),
                    DB::raw("NULL as nombre_equipo"),
                    DB::raw("NULL as codigo_equipo"),
                    DB::raw("NULL as marca_equipo"),
                    DB::raw("NULL as modelo_equipo"),
                    DB::raw("NULL as serie_equipo"),
                    DB::raw("NULL as tecnico_cierre_text"),
                    DB::raw("NULL as reparacion"),
                    DB::raw("NULL as repuesto_pendiente"),
                ], $selectEspecificos));

            // JOIN codificacion_cierres siempre que NO sea industrial (la tabla _ind no tiene
            // cierre_id). Debe coincidir con el criterio de $selectEspecificos: sin el join,
            // una llamada sin ?tipo= pide cc.name sobre una tabla no unida y revienta el SQL.
            if ($tipo !== 'industrial') {
                $qC->leftJoin('codificacion_cierres as cc', 'cg.cierre_id', '=', 'cc.id');
            }

            // Filtros de fecha/búsqueda/estado para correctivos
            if ($request->filled('fecha_desde')) {
                $qC->whereDate($fechaColC, '>=', $request->fecha_desde);
            }
            if ($request->filled('fecha_hasta')) {
                $qC->whereDate($fechaColC, '<=', $request->fecha_hasta);
            }
            if ($request->filled('anio') && $request->anio !== 'all') {
                $qC->whereYear($fechaColC, $request->anio);
            }
            if ($request->filled('mes') && $request->mes !== 'all') {
                $qC->whereMonth($fechaColC, $request->mes);
            }
            if ($request->filled('search')) {
                $st = $request->search;
                $qC->where(function ($q) use ($st) {
                    $q->where('cg.description', 'LIKE', "%{$st}%")
                      ->orWhere('e.name',        'LIKE', "%{$st}%")
                      ->orWhere('e.code',        'LIKE', "%{$st}%");
                });
            }
            if ($request->filled('status') && $request->status !== 'all') {
                if ($request->status === 'completed') {
                    $qC->whereNotNull('cg.fecha_mantenimiento');
                } elseif ($request->status === 'pending') {
                    $qC->whereNull('cg.fecha_mantenimiento');
                }
            }
            if ($request->filled('sede_id') && $request->sede_id !== 'all') {
                $qC->where(DB::raw('COALESCE(e.sede_id, s.sede_id)'), $request->sede_id);
            }
            if ($limit) { $qC->limit($limit); }

            $correctivosGenerales = $qC->get();

            // ── 2. TICKETS (ordenes) — INNER JOIN sobre equipos del tipo correcto ──
            // Tickets manuales (equipo_id NULL/0) quedan automáticamente excluidos.
            $qT = DB::table('ordenes as o')
                ->join('equipos as e', function ($join) use ($tipoId) {
                    // INNER JOIN: solo tickets cuyo equipo exista y tenga el tipo correcto
                    $join->on('o.equipo_id', '=', 'e.id')->where('e.tipo_id', $tipoId);
                })
                ->leftJoin('servicios as s',         'o.servicio_id',       '=', 's.id')
                ->leftJoin('sedes as sede',           's.sede_id',           '=', 'sede.id')
                ->leftJoin('areas as ar',             'e.area_id',           '=', 'ar.id')
                ->leftJoin('estadoequipos as ee',     'e.estadoequipo_id',   '=', 'ee.id')
                ->leftJoin('codificacion_cierres as cc', 'o.cierre_id',      '=', 'cc.id')
                ->leftJoin('estados as est',          'o.estado_id',         '=', 'est.id')
                ->select([
                    'o.id',
                    DB::raw("CAST(o.fecha_inicio AS DATETIME) as created_at"),
                    'o.equipo_id',
                    'o.fecha_inicio',
                    'sede.name as sede_nombre',
                    DB::raw("'Tickets' as tipo"),
                    DB::raw("{$subqResp} as responsable_nombre"),
                    'e.name as equipo_name',
                    'e.code as equipo_code',
                    'e.marca',
                    'e.modelo',
                    'e.serial',
                    's.name as servicio_nombre',
                    'ar.name as area_nombre',
                    'ee.name as estado_actual',
                    'e.costo',
                    'o.fecha_fin as fecha_cierre',
                    'o.fecha_fin',
                    DB::raw("o.descripcion as description"),
                    'o.descripcion',
                    DB::raw("NULL as file"),
                    DB::raw("o.id as code_orden"),
                    'cc.code as cierre_code',
                    'cc.name as cierre_name',
                    'o.retro_cierre',
                    'est.descripcion as estado_descripcion',
                    // Campos manuales (NULL: el equipo viene del JOIN, no de campos libres)
                    DB::raw("NULL as nombre_equipo"),
                    DB::raw("NULL as codigo_equipo"),
                    DB::raw("NULL as marca_equipo"),
                    DB::raw("NULL as modelo_equipo"),
                    DB::raw("NULL as serie_equipo"),
                    'o.tecnico_cierre_text',
                    'o.reparacion',
                    'o.repuesto_pendiente',
                ])
                ->orderBy('o.fecha_inicio', 'desc');

            // Filtros de fecha/búsqueda/estado para tickets
            if ($request->filled('fecha_desde')) {
                $qT->whereDate('o.fecha_inicio', '>=', $request->fecha_desde);
            }
            if ($request->filled('fecha_hasta')) {
                $qT->whereDate('o.fecha_inicio', '<=', $request->fecha_hasta);
            }
            if ($request->filled('anio') && $request->anio !== 'all') {
                $qT->whereYear('o.fecha_inicio', $request->anio);
            }
            if ($request->filled('mes') && $request->mes !== 'all') {
                $qT->whereMonth('o.fecha_inicio', $request->mes);
            }
            if ($request->filled('search')) {
                $st = $request->search;
                $qT->where(function ($q) use ($st) {
                    $q->where('o.descripcion', 'LIKE', "%{$st}%")
                      ->orWhere('e.name',       'LIKE', "%{$st}%")
                      ->orWhere('e.code',       'LIKE', "%{$st}%");
                });
            }
            if ($request->filled('status') && $request->status !== 'all') {
                if ($request->status === 'completed') {
                    $qT->whereNotNull('o.fecha_fin');
                } elseif ($request->status === 'pending') {
                    $qT->whereNull('o.fecha_fin');
                }
            }
            if ($request->filled('sede_id') && $request->sede_id !== 'all') {
                $qT->where(DB::raw('COALESCE(e.sede_id, s.sede_id)'), $request->sede_id);
            }
            if ($limit) { $qT->limit($limit); }

            $tickets = $qT->get();

            Log::info("🔎 [EXPORT] tipo={$tipo} | correctivos=" . count($correctivosGenerales) . " | tickets=" . count($tickets));

            // Combinar y ordenar por fecha descendente
            $queryFinal = collect($correctivosGenerales)
                ->concat($tickets)
                ->sortByDesc('created_at')
                ->values();

            if ($limit) {
                $queryFinal = $queryFinal->take($limit);
            }
            
            \Log::info("📊 [EXPORT] Iniciando stream de datos...");

            Log::info("📊 [EXPORT] Total de correctivos a exportar: Consultando...");

            // Precargar mapa de codificacion_cierres para resolver retro_cierre numérico
            $cierreMap = DB::table('codificacion_cierres')
                ->get()
                ->keyBy('id')
                ->map(fn($c) => ['code' => $c->code ?? '', 'name' => $c->name ?? ''])
                ->toArray();

            if ($formato === 'parada') {
                $tipoNombre = $tipo === 'industrial' ? 'Industrial' : 'Biomedico';
                $filename = "Parada_Equipo_{$tipoNombre}_" . date('Y-m-d') . '.xlsx';
            } else {
                $filename = 'correctivos_TODOS_' . date('Y-m-d_H-i-s') . '.xlsx';
            }

            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

                if ($formato === 'parada') {
                    // ========== FORMATO PARADA DE EQUIPO ==========
                    $sheet->setTitle('Parada de Equipo');

                    // Agregar logo
                    $logoPath = public_path('logo_huv.jpg');
                    if (file_exists($logoPath)) {
                        $drawing = new \PhpOffice\PhpSpreadsheet\Worksheet\Drawing();
                        $drawing->setName('Logo HUV');
                        $drawing->setDescription('Logo Hospital Universitario del Valle');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(80);
                        $drawing->setCoordinates('A1');
                        $drawing->setWorksheet($sheet);
                    } else {
                        \Log::warning('⚠️ Logo HUV no encontrado en: ' . $logoPath);
                    }

                    // Ajustar altura de filas para el header
                    $sheet->getRowDimension('1')->setRowHeight(40);
                    $sheet->getRowDimension('2')->setRowHeight(30);
                    $sheet->getRowDimension('3')->setRowHeight(10); // Fila vacía
                    
                    // Título principal - Hospital
                    $sheet->mergeCells('C1:Q1');
                    $sheet->setCellValue('C1', 'HOSPITAL UNIVERSITARIO DEL VALLE "EVARISTO GARCÍA" ESE');
                    $sheet->getStyle('C1')->getFont()->setBold(true)->setSize(14);
                    $sheet->getStyle('C1')->getAlignment()
                        ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER)
                        ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);

                    // Subtítulo - Parada de Equipo (dinámico según tipo)
                    $tipoEquipo = $tipo === 'industrial' ? 'INDUSTRIAL' : 'BIOMÉDICO';
                    $sheet->mergeCells('C2:Q2');
                    $sheet->setCellValue('C2', "PARADA DE EQUIPO {$tipoEquipo}");
                    $sheet->getStyle('C2')->getFont()->setBold(true)->setSize(12);
                    $sheet->getStyle('C2')->getAlignment()
                        ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER)
                        ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);

                    // Headers de la tabla (fila 4)
                    $headers = [
                        'FECHA DE CREACIÓN',
                        'CODIFICACIÓN DE CIERRE',
                        'SEDE',
                        'SERVICIO',
                        'AREA',
                        'TIPO',
                        'RESPONSABLE DE MANTENIMIENTO',
                        'ID CORRECTIVO',
                        'NOMBRE EQUIPO',
                        'CÓDIGO EQUIPO',
                        'MARCA',
                        'MODELO',
                        'SERIE',
                        'ESTADO DEL EQUIPO',
                        'FECHA CIERRE',
                        'FECHA FIN',
                        'DESCRIPCIÓN',
                        'DESCRIPCIÓN DE CIERRE DEL TICKET'
                    ];

                    // Ajustar altura de fila de headers
                    $sheet->getRowDimension('4')->setRowHeight(30);

                    // Escribir valores de headers en bloque con fromArray
                    $sheet->fromArray($headers, null, 'A4');

                    // Aplicar estilo de headers en UN solo rango (18 veces menos llamadas)
                    $sheet->getStyle('A4:R4')->applyFromArray([
                        'font' => [
                            'bold' => true,
                            'color' => ['rgb' => '000000'],
                        ],
                        'fill' => [
                            'fillType'   => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'FFD700'], // Amarillo oro
                        ],
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                                'color'       => ['rgb' => '000000'],
                            ],
                        ],
                        'alignment' => [
                            'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                            'vertical'   => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                            'wrapText'   => true,
                        ],
                    ]);

                    // Datos
                    $row = 5;
                    // Helper: igual que formato completo — devuelve fecha Excel para que Excel agrupe por año/mes/día
                    $safeDate = function($dateStr) {
                        if (!$dateStr) return '';
                        if (preg_match('/^0{4}-/', $dateStr)) return '';
                        $ts = strtotime($dateStr);
                        if (!$ts || $ts <= 0) return '';
                        $year = (int)date('Y', $ts);
                        if ($year < 2000 || $year > (int)date('Y')) return '';
                        return \PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel($ts);
                    };
                    // Procesar registros iterando Collection
                    foreach ($queryFinal as $correctivo) {
                        // FECHA DE CREACIÓN
                        $fechaCreacion = $correctivo->fecha_inicio ?? $correctivo->created_at ?? '';
                        $fechaCreacion = $safeDate($fechaCreacion);
                        $sheet->setCellValue('A' . $row, $fechaCreacion);
                        
                        // CODIFICACIÓN DE CIERRE (formato: código - nombre)
                        $codificacionCierre = '';
                        $esTicket = str_contains($correctivo->tipo ?? '', 'Tickets');
                        if ($esTicket) {
                            // Ticket cerrado = tiene cierre_id enlazado a codificacion_cierres
                            if (!empty($correctivo->cierre_code) || !empty($correctivo->cierre_name)) {
                                $codificacionCierre = trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . ($correctivo->cierre_name ?? ''));
                            } elseif (!empty($correctivo->retro_cierre)) {
                                $rc = $correctivo->retro_cierre;
                                if (is_numeric($rc) && isset($cierreMap[(int)$rc])) {
                                    $m = $cierreMap[(int)$rc];
                                    $codificacionCierre = ($m['code'] ? $m['code'] . ' - ' : '') . $m['name'];
                                } else {
                                    $codificacionCierre = $rc;
                                }
                            } else {
                                // Ticket no cerrado → estado actual del ticket
                                $codificacionCierre = $correctivo->estado_descripcion ?? '';
                            }
                        } else {
                            // Correctivos Generales → codificacion_cierres siempre
                            if (!empty($correctivo->cierre_code) && !empty($correctivo->cierre_name)) {
                                $codificacionCierre = $correctivo->cierre_code . ' - ' . $correctivo->cierre_name;
                            } elseif (!empty($correctivo->cierre_name)) {
                                $codificacionCierre = $correctivo->cierre_name;
                            } elseif (!empty($correctivo->cierre_code)) {
                                $codificacionCierre = $correctivo->cierre_code;
                            }
                        }
                        $sheet->setCellValueExplicit('B' . $row, $codificacionCierre, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // SEDE
                        $sheet->setCellValueExplicit('C' . $row, $correctivo->sede_nombre ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);

                        // SERVICIO
                        $sheet->setCellValueExplicit('D' . $row, $correctivo->servicio_nombre ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // AREA
                        $sheet->setCellValueExplicit('E' . $row, $correctivo->area_nombre ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // TIPO
                        $sheet->setCellValueExplicit('F' . $row, $correctivo->tipo ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // RESPONSABLE DE MANTENIMIENTO
                        $sheet->setCellValueExplicit('G' . $row, trim($correctivo->responsable_nombre ?? ''), \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // ID
                        $sheet->setCellValue('H' . $row, $correctivo->id ?? '');
                        
                        // NOMBRE del equipo (usar campo manual si no hay join con equipos)
                        $nombreEquipo = $correctivo->equipo_name ?? $correctivo->nombre_equipo ?? '';
                        $sheet->setCellValueExplicit('I' . $row, $nombreEquipo, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // CÓDIGO del equipo (usar campo manual si no hay join con equipos)
                        $codigoEquipo = $correctivo->equipo_code ?? $correctivo->codigo_equipo ?? '';
                        $sheet->setCellValueExplicit('J' . $row, $codigoEquipo, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // MARCA (usar campo manual si no hay join con equipos)
                        $marca = $correctivo->marca ?? $correctivo->marca_equipo ?? '';
                        $sheet->setCellValueExplicit('K' . $row, $marca, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // MODELO (usar campo manual si no hay join con equipos)
                        $modelo = $correctivo->modelo ?? $correctivo->modelo_equipo ?? '';
                        $sheet->setCellValueExplicit('L' . $row, $modelo, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // SERIE (usar campo manual si no hay join con equipos)
                        $serie = $correctivo->serial ?? $correctivo->serie_equipo ?? '';
                        $sheet->setCellValueExplicit('M' . $row, $serie, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // ESTADO DEL EQUIPO
                        $sheet->setCellValueExplicit('N' . $row, $correctivo->estado_actual ?? 'N/A', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // CIERRE
                        $fechaCierre = $safeDate($correctivo->fecha_cierre ?? '');
                        $sheet->setCellValue('O' . $row, $fechaCierre);
                        
                        // FECHA FIN
                        $fechaFin = $safeDate($correctivo->fecha_fin ?? '');
                        $sheet->setCellValue('P' . $row, $fechaFin);
                        
                        // DESCRIPCIÓN
                        $sheet->setCellValueExplicit('Q' . $row, $correctivo->descripcion ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        // DESCRIPCIÓN DE CIERRE DEL TICKET
                        $sheet->setCellValueExplicit('R' . $row, $correctivo->tecnico_cierre_text ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                        
                        $row++;
                    }

                    // Aplicar estilos en bloque (una sola operación por tipo) — mucho más rápido que por fila
                    $lastParadaRow = $row - 1;
                    if ($lastParadaRow >= 5) {
                        // Formato fecha en columnas A, O, P
                        foreach (['A', 'O', 'P'] as $dateCol) {
                            $sheet->getStyle($dateCol . '5:' . $dateCol . $lastParadaRow)
                                  ->getNumberFormat()
                                  ->setFormatCode('yyyy-mm-dd');
                        }
                        // Bordes + wrapText en rango completo de datos (antes era por fila — lentísimo)
                        $sheet->getStyle('A5:R' . $lastParadaRow)->applyFromArray([
                            'borders' => [
                                'allBorders' => [
                                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                                    'color'       => ['rgb' => '000000'],
                                ],
                            ],
                            'alignment' => [
                                'vertical'  => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_TOP,
                                'wrapText'  => true,
                            ],
                        ]);
                        // Centrar columnas angostas (fechas, ID, código, estado)
                        foreach (['A', 'H', 'J', 'N', 'O', 'P'] as $centerCol) {
                            $sheet->getStyle($centerCol . '5:' . $centerCol . $lastParadaRow)
                                  ->getAlignment()
                                  ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
                        }
                    }

                    // Anchos fijos proporcionales al contenido de cada columna
                    // A=Fecha creación, B=Cod.Cierre, C=Sede, D=Servicio, E=Área
                    // F=Tipo, G=Responsable, H=ID, I=Nombre equipo, J=Código
                    // K=Marca, L=Modelo, M=Serie, N=Estado, O=F.Cierre, P=F.Fin
                    // Q=Descripción, R=Desc.Cierre ticket
                    $colWidths = [
                        'A' => 14, 'B' => 35, 'C' => 20, 'D' => 35, 'E' => 20,
                        'F' => 24, 'G' => 30, 'H' => 10, 'I' => 35, 'J' => 18,
                        'K' => 18, 'L' => 18, 'M' => 18, 'N' => 18, 'O' => 14,
                        'P' => 14, 'Q' => 50, 'R' => 50,
                    ];
                    foreach ($colWidths as $col => $width) {
                        $sheet->getColumnDimension($col)->setWidth($width);
                    }

                } else {
                    // ========== FORMATO COMPLETO (ORIGINAL) ==========
                    // Encabezados exactos según CorrectivosEB.xls
                    $headers = [
                    'Fuente',
                    'Responsable del mantenimiento', 
                    'Equipo Id',
                    'Fecha de creación de la orden',
                    'Codigo de orden de trabajo',
                    'Descripcion de la orden',
                    'Codificación de cierre',
                    'Equipo',
                    'Codigo Equipo',
                    'Marca',
                    'Modelo',
                    'Serie',
                    'Estado actual del equipo',
                    'Sede',
                    'Servicio',
                    'Area',
                    'Archivo',
                    'Fecha avance',
                    'Titulo/Retro Avance1',
                    'Descripcion avance',
                    'Fecha avance2',
                    'Titulo/Retro Avance2',
                    'Descripcion avance2',
                    'Fecha avance3',
                    'Titulo/Retro Avance3',
                    'Descripcion avance3',
                    'Retro de cierre',
                    'Descripcion de Cierre',
                    'Fecha de Cierre',
                    'Costo del equipo',
                    'Fecha fin',
                    'Repuesto instalado'
                ];

                // Escribir encabezados
                $sheet->fromArray($headers, null, 'A1');

                // Estilo para encabezados (AZUL INSTITUCIONAL)
                $headerStyle = [
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '003366'] // Azul institucional fuerte
                    ],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                            'color' => ['rgb' => '000000']
                        ]
                    ]
                ];

                $sheet->getStyle('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '1')
                      ->applyFromArray($headerStyle);

                // Obtener avances en bloque para eficiencia
                $cgIds = $queryFinal->where('tipo', 'Correctivos Generales')->pluck('id')->toArray();
                $ticketIds = $queryFinal->filter(fn($x) => str_contains($x->tipo, 'Tickets'))->pluck('id')->toArray();

                $avancesCG = DB::table('avances_correctivos')
                                ->whereIn('correctivo_general_id', $cgIds)
                                ->whereNotNull('correctivo_general_id')
                                ->orderBy('date', 'desc')
                                ->get()
                                ->groupBy('correctivo_general_id');

                $avancesTickets = DB::table('avances_correctivos')
                                    ->whereIn('orden_id', $ticketIds)
                                    ->whereNotNull('orden_id')
                                    ->orderBy('date', 'desc')
                                    ->get()
                                    ->groupBy('orden_id');

                // Definir helper de fecha UNA SOLA VEZ fuera del loop
                $formatDate = function($dateStr) {
                        if (!$dateStr) return '';
                        // Ignorar fechas claramente inválidas: "0000-00-00", "0000-00-00 00:00:00", etc.
                        if (preg_match('/^0{4}-/', $dateStr)) return '';
                        $ts = strtotime($dateStr);
                        // Ignorar timestamps inválidos, negativos (antes de 1970) o del año 1970 (epoch=0)
                        if (!$ts || $ts <= 0) return '';
                        $year = (int)date('Y', $ts);
                        // Ignorar años antes de 2000 o posteriores al año actual (datos erróneos)
                        if ($year < 2000 || $year > (int)date('Y')) return '';
                        return \PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel($ts);
                };

                // Escribir datos
                $row = 2;
                foreach ($queryFinal as $correctivo) {
                    // Obtener avances específicos
                    $misAvances = collect();
                    if (str_contains($correctivo->tipo, 'Tickets')) {
                        $misAvances = $avancesTickets->get($correctivo->id, collect());
                    } else {
                        $misAvances = $avancesCG->get($correctivo->id, collect());
                    }

                    $avance1 = $misAvances->get(0);
                    $avance2 = $misAvances->get(1);
                    $avance3 = $misAvances->get(2);

                    $rowData = [
                        $correctivo->tipo ?? 'Correctivo', // 1. Fuente
                        $correctivo->responsable_nombre ?? 'No especificado', // 2. Responsable
                        $correctivo->equipo_id ?? 'N/A', // 3. Equipo Id
                        $formatDate($correctivo->fecha_inicio), // 4. F. Creación (Excel Date)
                        $correctivo->code_orden ?? $correctivo->id ?? '', // 5. Código Orden
                        $correctivo->description ?? $correctivo->descripcion ?? $correctivo->orden ?? '', // 6. Descripción
                        (function() use ($correctivo, $cierreMap) { // 7. Codificación Cierre
                            $esTicket = str_contains($correctivo->tipo ?? '', 'Tickets');
                            if ($esTicket) {
                                // Cerrado → tiene cierre enlazado
                                if (!empty($correctivo->cierre_code) || !empty($correctivo->cierre_name)) {
                                    return trim(($correctivo->cierre_code ? $correctivo->cierre_code . ' - ' : '') . ($correctivo->cierre_name ?? ''));
                                }
                                if (!empty($correctivo->retro_cierre)) {
                                    $rc = $correctivo->retro_cierre;
                                    if (is_numeric($rc) && isset($cierreMap[(int)$rc])) {
                                        $m = $cierreMap[(int)$rc];
                                        return ($m['code'] ? $m['code'] . ' - ' : '') . $m['name'];
                                    }
                                    return $rc;
                                }
                                // No cerrado → estado del ticket
                                return $correctivo->estado_descripcion ?? '';
                            } else {
                                // Correctivo General → codificacion_cierres
                                if (!empty($correctivo->cierre_code) && !empty($correctivo->cierre_name)) {
                                    return $correctivo->cierre_code . ' - ' . $correctivo->cierre_name;
                                } elseif (!empty($correctivo->cierre_name)) {
                                    return $correctivo->cierre_name;
                                } elseif (!empty($correctivo->cierre_code)) {
                                    return $correctivo->cierre_code;
                                }
                                return '';
                            }
                        })(),
                        $correctivo->equipo_name ?? $correctivo->nombre_equipo ?? 'N/A', // 8. Equipo
                        $correctivo->equipo_code ?? $correctivo->codigo_equipo ?? '', // 9. Cód. Equipo
                        $correctivo->marca ?? $correctivo->marca_equipo ?? '', // 10. Marca
                        $correctivo->modelo ?? $correctivo->modelo_equipo ?? '', // 11. Modelo
                        ($correctivo->serial ?? $correctivo->serie_equipo) ? "SN: " . ($correctivo->serial ?? $correctivo->serie_equipo) : '', // 12. Serie
                        // 13. Estado Actual del equipo (desde tabla estadoequipos): activo, dado de baja, etc.
                        // Si no hay equipo asociado al ticket, mostrar 'Sin equipo'; si el equipo no tiene estado, 'N/A'.
                        (function() use ($correctivo) {
                            if (!empty($correctivo->estado_actual)) {
                                return $correctivo->estado_actual;
                            }
                            $sinEquipo = empty($correctivo->equipo_id) || $correctivo->equipo_id == 0 || empty($correctivo->equipo_name);
                            return $sinEquipo ? 'Sin equipo' : 'N/A';
                        })(),
                        $correctivo->sede_nombre ?? '', // 14. Sede
                        $correctivo->servicio_nombre ?? '', // 15. Servicio
                        $correctivo->area_nombre ?? '', // 16. Area
                        $correctivo->file ? url('storage/correctivos_generales/' . $correctivo->file) : '', // 17. Archivo
                        $formatDate($avance1->date ?? null), // 18. F. Avance 1 (Excel Date)
                        $avance1->title ?? '', // 19. Título Avance 1
                        $avance1->description ?? '', // 20. Desc. Avance 1
                        $formatDate($avance2->date ?? null), // 21. F. Avance 2 (Excel Date)
                        $avance2->title ?? '', // 22. Título Avance 2
                        $avance2->description ?? '', // 23. Desc. Avance 2
                        $formatDate($avance3->date ?? null), // 24. F. Avance 3 (Excel Date)
                        $avance3->title ?? '', // 25. Título Avance 3
                        $avance3->description ?? '', // 26. Desc. Avance 3
                        $correctivo->retro_cierre ?? '', // 27. Retro Cierre (campo retro_cierre de ordenes, texto libre del técnico)
                        $correctivo->reparacion ?? $correctivo->description ?? $correctivo->orden ?? '', // 28. Desc. Cierre
                        $formatDate($correctivo->fecha_asignacion_cierre ?? $correctivo->fecha_cierre ?? null), // 29. Fecha Cierre (Excel Date)
                        $correctivo->costo ?? 0, // 30. Costo
                        $formatDate($correctivo->fecha_fin ?? null), // 31. Fecha Fin (Excel Date)
                        $correctivo->repuesto_pendiente ?? '' // 32. Repuesto
                    ];

                    // Escribir celda a celda con tipo explícito para evitar que valores como
                    // "=C014", "+123", "-abc" sean interpretados como fórmulas de Excel.
                    $colIdx = 1;
                    foreach ($rowData as $cellValue) {
                        $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
                        $cellRef   = $colLetter . $row;
                        if (is_float($cellValue) || is_int($cellValue)) {
                            // Valores numéricos y fechas Excel (float) → tipo numérico
                            $sheet->setCellValue($cellRef, $cellValue);
                        } elseif (is_null($cellValue) || $cellValue === '') {
                            $sheet->setCellValue($cellRef, '');
                        } else {
                            // Texto: forzar tipo STRING y limpiar encoding
                            $sheet->setCellValueExplicit(
                                $cellRef,
                                $this->cleanText((string)$cellValue),
                                \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING
                            );
                        }
                        $colIdx++;
                    }

                    // Si hay link de archivo, ponerlo como hipervínculo
                    if (!empty($rowData[16])) {
                        $sheet->getCell('Q' . $row)->getHyperlink()->setUrl($rowData[16]);
                    }

                    $row++;
                }

                // Aplicar estilos en bloque tras el loop (una llamada por operación)
                $lastRow = $row - 1;
                if ($lastRow >= 2) {
                    // Formato fecha en las 6 columnas de fecha
                    foreach (['D', 'R', 'U', 'X', 'AC', 'AE'] as $col) {
                        $sheet->getStyle($col . '2:' . $col . $lastRow)
                              ->getNumberFormat()->setFormatCode('yyyy-mm-dd');
                    }
                    // Bordes + wrapText + verticalTop en todo el rango de datos
                    $lastColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
                    $sheet->getStyle('A2:' . $lastColLetter . $lastRow)->applyFromArray([
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                                'color'       => ['rgb' => '000000'],
                            ],
                        ],
                        'alignment' => [
                            'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_TOP,
                            'wrapText' => true,
                        ],
                    ]);
                    // Estilo hipervínculo en columna Q (archivo)
                    $sheet->getStyle('Q2:Q' . $lastRow)->applyFromArray([
                        'font' => [
                            'color'     => ['rgb' => '0563C1'],
                            'underline' => true,
                        ],
                    ]);
                }

                // Anchos fijos para todas las columnas (evita setAutoSize que escanea todas las celdas)
                // A=Fuente, B=Responsable, C=EquipoId, D=F.Creación, E=CódOrden, F=Descripción
                // G=Cod.Cierre, H=Equipo, I=CódEquipo, J=Marca, K=Modelo, L=Serie
                // M=Estado, N=Sede, O=Servicio, P=Area, Q=Archivo
                // R=F.Av1, S=TítAv1, T=DescAv1  U=F.Av2, V=TítAv2, W=DescAv2
                // X=F.Av3, Y=TítAv3, Z=DescAv3  AA=Retro, AB=DescCierre, AC=F.Cierre
                // AD=Costo, AE=F.Fin, AF=Repuesto
                $fixedWidths = [
                    'A'=>18, 'B'=>28, 'C'=>12, 'D'=>14, 'E'=>18, 'F'=>40,
                    'G'=>32, 'H'=>30, 'I'=>16, 'J'=>16, 'K'=>16, 'L'=>18,
                    'M'=>18, 'N'=>20, 'O'=>30, 'P'=>18, 'Q'=>32,
                    'R'=>14, 'S'=>22, 'T'=>35, 'U'=>14, 'V'=>22, 'W'=>35,
                    'X'=>14, 'Y'=>22, 'Z'=>35, 'AA'=>24, 'AB'=>38, 'AC'=>14,
                    'AD'=>12, 'AE'=>14, 'AF'=>22,
                ];
                foreach ($fixedWidths as $col => $width) {
                    $sheet->getColumnDimension($col)->setWidth($width);
                }
                }

                // Guardar el archivo en un archivo temporal para ahorrar memoria
                $writer = new Xlsx($spreadsheet);
                $tempFile = tempnam(sys_get_temp_dir(), 'export_excel_');
                $writer->save($tempFile);

                // Retornar como StreamedResponse para que Laravel lo trate como tal
                // y para que se cumpla el type hint si existe en alguna parte del sistema.
                return response()->stream(function() use ($tempFile) {
                    $stream = fopen($tempFile, 'rb');
                    while (!feof($stream)) {
                        echo fread($stream, 8192);
                        flush();
                    }
                    fclose($stream);
                    @unlink($tempFile);
                }, 200, [
                    'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                    'Cache-Control' => 'max-age=0',
                    'Pragma' => 'public',
                ]);

            } catch (Exception $e) {
                Log::error('❌ [EXPORT] Error en exportación completa Excel', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                return response()->json([
                    'success' => false,
                    'error' => 'Error al exportar: ' . $e->getMessage()
                ], 500);
            }
        }

    /**
     * @OA\Post(
     *     path="/api/correctivos-generales/export-custom",
     *     tags={"CorrectivoGeneral"},
     *     summary="Exportar correctivos personalizados/filtrados",
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="format", type="string", enum={"excel", "csv"}),
     *             @OA\Property(property="filename", type="string"),
     *             @OA\Property(property="data", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(response=200, description="Archivo exportado exitosamente")
     * )
     */
    public function exportCustom(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'format' => 'required|in:excel,csv',
                'filename' => 'nullable|string|max:255',
                'data' => 'required|array'
            ]);

            if ($validator->fails()) {
                return ResponseFormatter::error($validator->errors(), 'Parámetros de exportación incorrectos', 422);
            }

            $format = $request->get('format', 'excel');
            $filename = $request->get('filename', 'correctivos_filtrados_' . date('Y-m-d_H-i-s'));
            $data = $request->get('data', []);

            Log::info("🔄 [EXPORT] Exportación personalizada {$format}: " . count($data) . " registros");

            if ($format === 'excel') {
                return $this->exportToExcelCustom($data, $filename);
            } else {
                return $this->exportToCsvCustom($data, $filename);
            }

        } catch (Exception $e) {
            Log::error('❌ [EXPORT] Error en exportación personalizada', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ResponseFormatter::error(null, 'Error al exportar: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener estadísticas de correctivos
     */
    /**
     * Limpiar y normalizar valor de texto a UTF-8 para exportación Excel.
     * Evita caracteres corruptos (nulos, CR, encoding incorrecto).
     */
    private function cleanText($value): string
    {
        if (is_null($value)) return '';
        $text = (string) $value;
        $text = str_replace(["\0", "\r"], ['', ''], $text);
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
        }
        return $text;
    }

    public function estadisticas(): JsonResponse
    {
        try {
            $stats = [
                'total' => CorrectivoGeneral::count(),
                'completados' => CorrectivoGeneral::whereNotNull('fecha_cierre')->count(),
                'en_proceso' => CorrectivoGeneral::whereNull('fecha_cierre')
                                               ->whereNotNull('fecha_avance')->count(),
                'pendientes' => CorrectivoGeneral::whereNull('fecha_avance')->count(),
                'vencidos' => CorrectivoGeneral::where('fecha_fin', '<', now())
                                               ->whereNotIn('estado', ['completado', 'cancelado'])
                                               ->count()
            ];

            return ResponseFormatter::success($stats, 'Estadísticas obtenidas exitosamente');

        } catch (Exception $e) {
            Log::error('Error en CorrectivoGeneralController::estadisticas', [
                'error' => $e->getMessage()
            ]);
            return ResponseFormatter::error(null, 'Error al obtener estadísticas', 500);
        }
    }
}
