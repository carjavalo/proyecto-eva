<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\ConexionesVista\ApiController;
use App\ConexionesVista\ResponseFormatter;
use App\Models\Servicio;
use App\Models\Area;
use App\Models\Equipo;
use App\Models\Usuario;
use App\Support\GruposHabilitacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

/**
 * Controlador para gestión completa de servicios
 * Maneja servicios hospitalarios, departamentos y unidades
 */
class ServicioController extends ApiController
{
    /**
     * Obtener lista de servicios con filtros
     */
        /**
     * @OA\GET(
     *     path="/api/servicios",
     *     tags={"Servicios"},
     *     summary="Listar servicios",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Operación exitosa"),
     *     @OA\Response(response=401, description="No autorizado"),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     */
    public function index(Request $request)
    {
        try {
            // Usar el modelo Servicio directamente para asegurar que siga las convenciones de Laravel
            $query = Servicio::query()->from('servicios as s');
            
            // Joins realizados con máxima precaución
            $query->leftJoin('pisos as p',   's.piso_id',   '=', 'p.id')
                  ->leftJoin('zonas as z',   's.zona_id',   '=', 'z.id')
                  ->leftJoin('centros as c', 's.centro_id', '=', 'c.id')
                  ->leftJoin('sedes as se',  's.sede_id',   '=', 'se.id');
            
            // Selección explícita total
            $query->select([
                's.*',
                'p.name as piso_nombre',
                'z.name as zona_nombre',
                'c.name as centro_nombre',
                'se.name as sede_nombre',
            ]);
            
            // Agregar contadores con subconsultas optimizadas
            $query->selectSub(function($q) {
                $q->from('equipos')->whereColumn('servicio_id', 's.id')->where('status', 1)->selectRaw('count(*)');
            }, 'total_equipos');
            
            $query->selectSub(function($q) {
                $q->from('usuarios')->whereColumn('servicio_id', 's.id')->where('estado', 1)->selectRaw('count(*)');
            }, 'total_usuarios');

            // Búsqueda multi-campo heredada de lógica original
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('s.name',    'like', "%{$search}%")
                      ->orWhere('s.code',  'like', "%{$search}%")
                      ->orWhere('z.name',  'like', "%{$search}%")
                      ->orWhere('se.name', 'like', "%{$search}%")
                      ->orWhere('p.name',  'like', "%{$search}%");
                });
            }

            // Filtro de estado
            if ($request->has('is_active')) {
                $query->where('s.is_active', $request->is_active === 'true' || $request->is_active == 1);
            }

            // Ordenamiento dinámico
            $allowedSorts = ['s.name', 's.code', 'zona_nombre', 'sede_nombre', 'total_equipos', 'total_usuarios'];
            $sortBy = in_array($request->order_by, $allowedSorts) ? $request->order_by : 's.name';
            $order  = $request->order_direction === 'desc' ? 'desc' : 'asc';
            
            $query->orderBy($sortBy, $order);

            // Paginación
            $perPage = (int)$request->get('per_page', 10);
            $servicios = $query->paginate($perPage);

            // Transformación manual para asegurar que TODOS los campos lleguen al frontend
            $items = collect($servicios->items())->map(function($s) {
                // NO usar $s->toArray() ya que filtra campos que no están en $fillable o en la tabla propia
                $data = [
                    'id'             => $s->id,
                    'code'           => $s->code,
                    'name'           => $s->name,
                    'grupo_habilitacion' => $s->grupo_habilitacion ?? null,
                    'criticidad'     => $s->criticidad ?? null,
                    'description'    => $s->description,
                    'is_active'      => (int)$s->is_active,
                    'status'         => (int)$s->status,
                    'piso_id'        => $s->piso_id,
                    'piso_nombre'    => $s->piso_nombre,
                    'zona_id'        => $s->zona_id,
                    'zona_nombre'    => $s->zona_nombre,
                    'centro_id'      => $s->centro_id,
                    'centro_nombre'  => $s->centro_nombre,
                    'sede_id'        => $s->sede_id,
                    'sede_nombre'    => $s->sede_nombre,
                    'total_equipos'  => (int)($s->total_equipos ?? 0),
                    'total_usuarios' => (int)($s->total_usuarios ?? 0),
                    'created_at'     => $s->created_at ? $s->created_at->toDateTimeString() : null,
                ];
                
                // Alias de redundancia absoluta solicitada
                $data['activo'] = $data['is_active'];
                
                return $data;
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'data' => $items,
                    'current_page' => $servicios->currentPage(),
                    'last_page' => $servicios->lastPage(),
                    'per_page' => $servicios->perPage(),
                    'total' => $servicios->total(),
                ],
                'message' => 'Servicios obtenidos exitosamente'
            ]);

        } catch (\Exception $e) {
            \Log::error('🔥 [SERVICIOS] Error en el index: ' . $e->getMessage());
            return ResponseFormatter::error('Error al obtener servicios: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener opciones para selectores (Sedes, Zonas, Pisos, Centros)
     */
    public function getOptions()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'sedes'   => DB::table('sedes')->select('id', 'name')->orderBy('name')->get(),
                    'zonas'   => DB::table('zonas')->select('id', 'name')->orderBy('name')->get(),
                    'pisos'   => DB::table('pisos')->select('id', 'name')->orderBy('name')->get(),
                    'centros' => DB::table('centros')->select('id', 'code', 'name')->where('status', 1)->orderBy('name')->get(),
                    'grupos_habilitacion' => GruposHabilitacion::catalogo(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Crear nuevo servicio
     */
        /**
     * @OA\POST(
     *     path="/api/servicios",
     *     tags={"Servicios"},
     *     summary="Crear nuevo servicio",
     *     security={{"sanctum": {}}},
     *     @OA\Response(response=200, description="Operación exitosa"),
     *     @OA\Response(response=401, description="No autorizado"),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:255',
            'code'         => 'nullable|string|max:50|unique:servicios,code',
            'description'  => 'nullable|string',
            'piso_id'      => 'nullable|exists:pisos,id',
            'zona_id'      => 'nullable|exists:zonas,id',
            'centro_id'    => 'nullable|exists:centros,id',
            'sede_id'      => 'nullable|exists:sedes,id',
            'is_active'    => 'nullable|boolean',
            'status'       => 'nullable|integer',
            // El grupo de habilitación decide el nivel de criticidad del servicio,
            // y con él el plazo de primera respuesta de sus tickets.
            'grupo_habilitacion' => 'nullable|string|in:' . implode(',', GruposHabilitacion::nombres()),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $data = $request->only([
                'name', 'code', 'description', 'piso_id', 'zona_id',
                'centro_id', 'sede_id', 'is_active', 'status', 'grupo_habilitacion'
            ]);

            // La criticidad no se pide al usuario: se deduce del grupo, para que un
            // servicio nuevo no nazca en nivel 4 por descuido. Sin grupo queda en 4.
            if (array_key_exists('grupo_habilitacion', $data)) {
                $data['criticidad'] = GruposHabilitacion::nivelDe($data['grupo_habilitacion']);
            }
            
            // Mapeo de campos antiguos si vienen del frontend
            if ($request->has('activo')) $data['is_active'] = $request->activo;
            if ($request->has('codigo')) $data['code'] = $request->codigo;
            
            $data['is_active'] = $data['is_active'] ?? 1;
            $data['status']    = $data['status'] ?? 1;

            $servicio = Servicio::create($data);

            return response()->json([
                'success' => true,
                'data'    => $servicio,
                'message' => 'Servicio creado exitosamente'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear servicio: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar servicio específico
     */
        /**
     * @OA\GET(
     *     path="/api/servicios/{id}",
     *     tags={"Servicios"},
     *     summary="Obtener servicio específico",
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Operación exitosa"),
     *     @OA\Response(response=401, description="No autorizado"),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     */
    public function show($id)
    {
        try {
            $servicio = Servicio::with([
                'areas:id,name,servicio_id,activo',
                'equipos:id,name,code,servicio_id,area_id,estadoequipo_id',
                'equipos.estadoEquipo:id,name',
                'usuarios:id,nombre,apellido,servicio_id,estado'
            ])->findOrFail($id);

            // Agregar estadísticas detalladas
            $servicio->estadisticas = [
                'total_areas' => $servicio->areas->where('activo', true)->count(),
                'total_equipos' => $servicio->equipos->where('status', true)->count(),
                'total_usuarios' => $servicio->usuarios->where('estado', 1)->count(),
                'equipos_por_estado' => $servicio->equipos->groupBy('estadoEquipo.name')->map->count(),
                'valor_total_equipos' => $servicio->equipos->sum('costo'),
                'areas_activas' => $servicio->areas->where('activo', true)->pluck('name'),
                'equipos_criticos' => $servicio->equipos->filter(function($equipo) {
                    return $equipo->clasificacionRiesgo &&
                           in_array($equipo->clasificacionRiesgo->name, ['ALTO', 'MEDIO ALTO']);
                })->count()
            ];

            return ResponseFormatter::success($servicio, 'Servicio obtenido exitosamente');

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener servicio: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Actualizar servicio
     */
        /**
     * @OA\PUT(
     *     path="/api/servicios/{id}",
     *     tags={"Servicios"},
     *     summary="Actualizar servicio",
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Operación exitosa"),
     *     @OA\Response(response=401, description="No autorizado"),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:255',
            'code'         => 'nullable|string|max:50|unique:servicios,code,' . $id,
            'description'  => 'nullable|string',
            'piso_id'      => 'nullable|exists:pisos,id',
            'zona_id'      => 'nullable|exists:zonas,id',
            'centro_id'    => 'nullable|exists:centros,id',
            'sede_id'      => 'nullable|exists:sedes,id',
            'is_active'    => 'nullable|boolean',
            'status'       => 'nullable|integer',
            // El grupo de habilitación decide el nivel de criticidad del servicio,
            // y con él el plazo de primera respuesta de sus tickets.
            'grupo_habilitacion' => 'nullable|string|in:' . implode(',', GruposHabilitacion::nombres()),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $servicio = Servicio::findOrFail($id);
            
            $data = $request->only([
                'name', 'code', 'description', 'piso_id', 'zona_id',
                'centro_id', 'sede_id', 'is_active', 'status', 'grupo_habilitacion'
            ]);

            // La criticidad no se pide al usuario: se deduce del grupo, para que un
            // servicio nuevo no nazca en nivel 4 por descuido. Sin grupo queda en 4.
            if (array_key_exists('grupo_habilitacion', $data)) {
                $data['criticidad'] = GruposHabilitacion::nivelDe($data['grupo_habilitacion']);
            }

            // Mapeo de campos antiguos si vienen del frontend
            if ($request->has('activo')) $data['is_active'] = $request->activo;
            if ($request->has('codigo')) $data['code'] = $request->codigo;

            $servicio->update($data);

            return response()->json([
                'success' => true,
                'data'    => $servicio,
                'message' => 'Servicio actualizado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar servicio: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar servicio
     */
        /**
     * @OA\DELETE(
     *     path="/api/servicios/{id}",
     *     tags={"Servicios"},
     *     summary="Eliminar servicio",
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Operación exitosa"),
     *     @OA\Response(response=401, description="No autorizado"),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     */
    public function destroy($id)
    {
        try {
            $servicio = Servicio::findOrFail($id);

            // Verificar si el servicio tiene áreas asignadas
            $areasAsignadas = Area::where('servicio_id', $id)->where('activo', true)->count();
            if ($areasAsignadas > 0) {
                return ResponseFormatter::error(
                    "No se puede eliminar el servicio porque tiene {$areasAsignadas} áreas asignadas",
                    400
                );
            }

            // Verificar si el servicio tiene equipos asignados
            $equiposAsignados = Equipo::where('servicio_id', $id)->where('status', true)->count();
            if ($equiposAsignados > 0) {
                return ResponseFormatter::error(
                    "No se puede eliminar el servicio porque tiene {$equiposAsignados} equipos asignados",
                    400
                );
            }

            // Verificar si el servicio tiene usuarios asignados
            $usuariosAsignados = Usuario::where('servicio_id', $id)->where('estado', 1)->count();
            if ($usuariosAsignados > 0) {
                return ResponseFormatter::error(
                    "No se puede eliminar el servicio porque tiene {$usuariosAsignados} usuarios asignados",
                    400
                );
            }

            $servicio->delete();

            return ResponseFormatter::success(null, 'Servicio eliminado exitosamente');

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al eliminar servicio: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener estadísticas de servicios
     */
    public function estadisticas()
    {
        try {
            $stats = [
                'total_servicios' => Servicio::where('activo', true)->count(),
                'servicios_con_equipos' => Servicio::whereHas('equipos', function($query) {
                    $query->where('status', true);
                })->count(),
                'servicios_sin_equipos' => Servicio::whereDoesntHave('equipos', function($query) {
                    $query->where('status', true);
                })->count(),
                'por_tipo' => Servicio::where('activo', true)
                    ->groupBy('tipo')
                    ->selectRaw('tipo, count(*) as total')
                    ->get(),
                'promedio_equipos_por_servicio' => round(
                    Equipo::where('status', true)->count() /
                    max(1, Servicio::where('activo', true)->count()),
                    2
                ),
                'promedio_areas_por_servicio' => round(
                    Area::where('activo', true)->count() /
                    max(1, Servicio::where('activo', true)->count()),
                    2
                ),
                'servicios_mas_equipos' => Servicio::withCount(['equipos' => function($query) {
                    $query->where('status', true);
                }])
                ->where('activo', true)
                ->orderBy('equipos_count', 'desc')
                ->limit(5)
                ->get(['id', 'name', 'equipos_count'])
            ];

            return ResponseFormatter::success($stats, 'Estadísticas de servicios obtenidas');

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener estadísticas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Activar/Desactivar servicio
     */
    public function toggleStatus($id)
    {
        try {
            $servicio = Servicio::findOrFail($id);
            $servicio->update(['activo' => !$servicio->activo]);

            $status = $servicio->activo ? 'activado' : 'desactivado';
            return ResponseFormatter::success($servicio, "Servicio {$status} exitosamente");

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al cambiar estado del servicio: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener servicios activos para selects
     */
    public function getActivos()
    {
        try {
            $servicios = Servicio::where('activo', true)
                ->orderBy('name')
                ->get(['id', 'name', 'codigo', 'tipo']);

            return ResponseFormatter::success($servicios, 'Servicios activos obtenidos');

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener servicios activos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener jerarquía servicio-área
     */
    public function getJerarquia()
    {
        try {
            $servicios = Servicio::with(['areas' => function($query) {
                $query->where('activo', true)->orderBy('name');
            }])
            ->where('activo', true)
            ->orderBy('name')
            ->get(['id', 'name', 'codigo']);

            return ResponseFormatter::success($servicios, 'Jerarquía servicio-área obtenida');

        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener jerarquía: ' . $e->getMessage(), 500);
        }
    }
}
