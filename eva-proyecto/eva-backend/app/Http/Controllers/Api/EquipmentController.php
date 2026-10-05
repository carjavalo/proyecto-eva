<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\ConexionesVista\ApiController;
use App\ConexionesVista\ResponseFormatter;
use App\Models\Equipo;
use App\Models\Servicio;
use App\Models\Area;
use App\Models\Propietario;
use App\Models\FuenteAlimentacion;
use App\Models\Tecnologia;
use App\Models\FrecuenciaMantenimiento;
use App\Models\ClasificacionBiomedica;
use App\Models\ClasificacionRiesgo;
use App\Models\TipoAdquisicion;
use App\Models\EstadoEquipo;
use App\Models\Usuario;
use Illuminate\Http\Request;
use App\Http\Requests\StoreEquipmentRequest;
use App\Http\Requests\UpdateEquipmentRequest;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * @OA\Tag(
 *     name="Equipos",
 *     description="Gestión completa de equipos médicos e industriales"
 * )
 *
 * Controlador para gestión completa de equipos médicos e industriales
 * Basado en la estructura real de la base de datos gestionthuv
 */
class EquipmentController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/equipos",
     *     tags={"Equipos"},
     *     summary="Listar equipos con filtros avanzados",
     *     description="Obtiene lista paginada de equipos con filtros opcionales por servicio, área, estado, etc.",
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         description="Número de página",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Elementos por página",
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\Parameter(
     *         name="servicio_id",
     *         in="query",
     *         description="Filtrar por servicio",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="area_id",
     *         in="query",
     *         description="Filtrar por área",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="estado",
     *         in="query",
     *         description="Filtrar por estado",
     *         @OA\Schema(type="string", enum={"Operativo", "Fuera de Servicio", "En Mantenimiento"})
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lista de equipos obtenida exitosamente",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="message", type="string", example="Equipos obtenidos exitosamente"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="current_page", type="integer", example=1),
     *                 @OA\Property(property="total", type="integer", example=150),
     *                 @OA\Property(property="per_page", type="integer", example=15),
     *                 @OA\Property(
     *                     property="data",
     *                     type="array",
     *                     @OA\Items(
     *                         @OA\Property(property="id", type="integer", example=1),
     *                         @OA\Property(property="nombre", type="string", example="Monitor de Signos Vitales"),
     *                         @OA\Property(property="codigo", type="string", example="EQ-001"),
     *                         @OA\Property(property="marca", type="string", example="Philips"),
     *                         @OA\Property(property="modelo", type="string", example="IntelliVue MX40"),
     *                         @OA\Property(property="serie", type="string", example="ABC123456"),
     *                         @OA\Property(property="estado", type="string", example="Operativo")
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=500, description="Error interno del servidor")
     * )
     *
     * Obtener lista de equipos con filtros avanzados y paginación
     */
    public function index(Request $request)
    {
        try {
            // Nota: Se removieron los with() porque causan problemas de pluralización
            // El método getMedicalDevicesComplete tiene la lógica correcta con JOINs
            $query = Equipo::query();

            // Aplicar filtros de búsqueda
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('marca', 'like', "%{$search}%")
                        ->orWhere('modelo', 'like', "%{$search}%")
                        ->orWhere('serial', 'like', "%{$search}%")
                        ->orWhere('descripcion', 'like', "%{$search}%");
                });
            }

            // Filtros específicos
            if ($request->has('servicio_id')) {
                $query->where('servicio_id', $request->servicio_id);
            }

            if ($request->has('area_id')) {
                $query->where('area_id', $request->area_id);
            }

            if ($request->has('propietario_id')) {
                $query->where('propietario_id', $request->propietario_id);
            }

            if ($request->has('estadoequipo_id')) {
                $query->where('estadoequipo_id', $request->estadoequipo_id);
            }

            if ($request->has('criesgo_id')) {
                $query->where('criesgo_id', $request->criesgo_id);
            }

            if ($request->has('fuente_id')) {
                $query->where('fuente_id', $request->fuente_id);
            }

            if ($request->has('tecnologia_id')) {
                $query->where('tecnologia_id', $request->tecnologia_id);
            }

            // Filtros por fechas
            if ($request->has('fecha_desde')) {
                $query->where('created_at', '>=', $request->fecha_desde);
            }

            if ($request->has('fecha_hasta')) {
                $query->where('created_at', '<=', $request->fecha_hasta);
            }

            // Filtros por costo
            if ($request->has('costo_min')) {
                $query->where('costo', '>=', $request->costo_min);
            }

            if ($request->has('costo_max')) {
                $query->where('costo', '<=', $request->costo_max);
            }

            // Filtro por estado activo
            if ($request->has('solo_activos') && $request->solo_activos) {
                $query->where('status', true);
            }

            // Filtro por marca
            if ($request->has('marca')) {
                $query->where('marca', $request->marca);
            }

            // Filtro por modelo
            if ($request->has('modelo')) {
                $query->where('modelo', $request->modelo);
            }

            // Filtro por año de fabricación
            if ($request->has('año_fabricacion')) {
                $query->whereYear('fecha_fabricacion', $request->año_fabricacion);
            }

            // Filtro por calibración requerida
            if ($request->has('requiere_calibracion')) {
                $query->where('calibracion', $request->requiere_calibracion);
            }

            // Filtro por repuesto pendiente
            if ($request->has('repuesto_pendiente')) {
                $query->where('repuesto_pendiente', $request->repuesto_pendiente);
            }

            // Ordenamiento
            $orderBy = $request->get('order_by', 'created_at');
            $orderDirection = $request->get('order_direction', 'desc');
            $query->orderBy($orderBy, $orderDirection);

            // Paginación con límite de seguridad
            $perPage = min($request->get('per_page', 15), 100); // Máximo 100 por página
            $equipos = $query->paginate($perPage);

            // Agregar URL de imagen y metadatos adicionales
            $equipos->getCollection()->transform(function ($equipo) {
                if ($equipo->image) {
                    $equipo->image_url = Storage::disk('public')->url($equipo->image);
                }

                // Agregar información adicional útil
                $equipo->mantenimientos_pendientes = $equipo->mantenimientos()
                    ->where('status', 'programado')
                    ->where('fecha_programada', '<=', now()->addDays(30))
                    ->count();

                $equipo->contingencias_activas = $equipo->contingencias()
                    ->where('estado_id', '!=', 3) // 3 = Cerrado
                    ->count();

                return $equipo;
            });

            return ResponseFormatter::success($equipos, 'Equipos obtenidos exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener equipos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Crear nuevo equipo con validaciones completas
     */
    public function store(StoreEquipmentRequest $request)
    {
        // Las validaciones ya están manejadas por el FormRequest

        try {
            DB::beginTransaction();

            $equipoData = $request->except(['image', 'archivo_excel']);
            $equipoData['status'] = 1;

            // Manejar propietario_id = 0 como null
            if (isset($equipoData['propietario_id']) && $equipoData['propietario_id'] == '0') {
                $equipoData['propietario_id'] = null;
            }

            // Manejar area_id = 0 como null
            if (isset($equipoData['area_id']) && $equipoData['area_id'] == '0') {
                $equipoData['area_id'] = null;
            }

            // Asegurar que los IDs foráneos tengan valores por defecto válidos
            $defaultValues = [
                'fuente_id' => 1,
                'tecnologia_id' => 1,
                'frecuencia_id' => 1,
                'cbiomedica_id' => 1,
                'criesgo_id' => 1,
                'tadquisicion_id' => 1,
                'invima_id' => 1,
                'orden_compra_id' => 1,
                'baja_id' => 1,
                'estadoequipo_id' => 1,
                'tipo_id' => 1,
                'guia_id' => 1,
                'manual_id' => 1,
                'disponibilidad_id' => 1
            ];

            foreach ($defaultValues as $field => $defaultValue) {
                if (!isset($equipoData[$field]) || empty($equipoData[$field])) {
                    $equipoData[$field] = $defaultValue;
                }
            }

            // Procesar manuales y planos JSON - SOLUCIÓN ROBUSTA
            \Log::info('DEBUG: Before processing manuales and planos', [
                'request_all' => $request->all(),
                'has_manuales' => $request->has('manuales'),
                'has_planos' => $request->has('planos'),
                'manuales_value' => $request->input('manuales'),
                'planos_value' => $request->input('planos')
            ]);

            $this->processManualesAndPlanos($request, $equipoData);

            \Log::info('DEBUG: After processing manuales and planos', [
                'has_manual_in_data' => isset($equipoData['manual']),
                'manual_value' => $equipoData['manual'] ?? 'NOT_SET',
                'has_plano_in_data' => isset($equipoData['plano']),
                'plano_value' => $equipoData['plano'] ?? 'NOT_SET'
            ]);

            // Manejar subida de imagen
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $timestamp = now()->format('YmdHis');
                $imageName = "equipo_{$timestamp}_" . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = $image->storeAs('equipos/images', $imageName, 'public');
                $equipoData['image'] = $imagePath;
            } elseif ($request->has('copy_image_path')) {
                // Copiar imagen existente si se solicita
                $sourcePath = $request->input('copy_image_path');
                if (Storage::disk('public')->exists($sourcePath)) {
                    $extension = pathinfo($sourcePath, PATHINFO_EXTENSION);
                    $timestamp = now()->format('YmdHis');
                    $newImageName = "equipo_copy_{$timestamp}_" . uniqid() . '.' . $extension;
                    $newImagePath = 'equipos/images/' . $newImageName;
                    
                    if (Storage::disk('public')->copy($sourcePath, $newImagePath)) {
                        $equipoData['image'] = $newImagePath;
                    }
                }
            }

            // Manejar subida de archivo Excel/PDF
            if ($request->hasFile('archivo_excel')) {
                $archivo = $request->file('archivo_excel');
                $timestamp = now()->format('YmdHis');
                $archivoName = "hoja_vida_{$timestamp}_" . uniqid() . '.' . $archivo->getClientOriginalExtension();
                $archivoPath = $archivo->storeAs('equipos/documentos', $archivoName, 'public');
                $equipoData['archivo_hoja_vida'] = $archivoPath;
            }

            // Final verification and forced setting of manual/plano before creation
            if ($request->filled('manuales') && !isset($equipoData['manual'])) {
                $manualesInput = $request->input('manuales');
                if (is_string($manualesInput)) {
                    $equipoData['manual'] = $manualesInput;
                }
            }

            if ($request->filled('planos') && !isset($equipoData['plano'])) {
                $planosInput = $request->input('planos');
                if (is_string($planosInput)) {
                    $equipoData['plano'] = $planosInput;
                }
            }

            \Log::info('DEBUG: Final equipoData before creation', [
                'has_manual' => isset($equipoData['manual']),
                'manual_value' => $equipoData['manual'] ?? 'NOT_SET',
                'has_plano' => isset($equipoData['plano']),
                'plano_value' => $equipoData['plano'] ?? 'NOT_SET',
                'total_fields' => count($equipoData)
            ]);

            $equipo = Equipo::create($equipoData);

            \Log::info('DEBUG: Equipment created', [
                'id' => $equipo->id,
                'manual_in_db' => $equipo->manual,
                'plano_in_db' => $equipo->plano
            ]);

            // Skip relationship loading for now to focus on core functionality
            // $equipo->load([...]);

            if ($equipo->image) {
                $equipo->image_url = Storage::disk('public')->url($equipo->image);
            }

            DB::commit();

            return ResponseFormatter::success($equipo, 'Equipo creado exitosamente', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseFormatter::error('Error al crear equipo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mostrar equipo específico con todas sus relaciones
     */
    public function show(string $id)
    {
        try {
            $equipo = Equipo::with([
                'servicio:id,name',
                'area:id,name',
                'propietario:id,nombre',
                'fuenteAlimentacion:id,nombre',
                'tecnologia:id,nombre',
                'frecuenciaMantenimiento:id,nombre',
                'clasificacionBiomedica:id,nombre',
                'clasificacionRiesgo:id,nombre',
                'estadoEquipo:id,nombre',
                'tipo:id,nombre',
                'mantenimientos' => function ($query) {
                    $query->with('tecnico:id,nombre,apellido')
                        ->orderBy('fecha_programada', 'desc')
                        ->limit(10);
                },
                'contingencias' => function ($query) {
                    $query->with('usuarioReporta:id,nombre,apellido')
                        ->where('estado_id', '!=', 4)
                        ->orderBy('fecha', 'desc');
                },
                'calibraciones' => function ($query) {
                    $query->orderBy('fecha', 'desc')->limit(5);
                },
                'observaciones' => function ($query) {
                    $query->with('usuario:id,nombre,apellido')
                        ->orderBy('created_at', 'desc')
                        ->limit(10);
                },
                'archivos',
                'contactos',
                'especificaciones',
                'repuestos'
            ])->findOrFail($id);

            // Agregar URL de imagen si existe
            if ($equipo->image) {
                $equipo->image_url = Storage::disk('public')->url($equipo->image);
            }

            // Calcular estadísticas del equipo
            $equipo->estadisticas = [
                'total_mantenimientos' => $equipo->mantenimientos->count(),
                'mantenimientos_completados' => $equipo->mantenimientos->where('status', 'completado')->count(),
                'contingencias_activas' => $equipo->contingencias->count(),
                'ultima_calibracion' => $equipo->calibraciones->first()?->fecha,
                'dias_desde_ultimo_mantenimiento' => $equipo->fecha_mantenimiento
                    ? Carbon::parse($equipo->fecha_mantenimiento)->diffInDays(now())
                    : null,
                'valor_depreciado' => $this->calcularDepreciacion($equipo)
            ];

            return ResponseFormatter::success($equipo, 'Equipo obtenido exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::notFound('Equipo no encontrado');
        }
    }

    /**
     * Actualizar equipo con validaciones completas
     */
    public function update(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'servicio_id' => 'required|exists:servicios,id',
            'area_id' => 'nullable|exists:areas,id',
            'marca' => 'nullable|string|max:100',
            'modelo' => 'nullable|string|max:100',
            'serial' => 'nullable|string|max:100',
            'descripcion' => 'nullable|string',
            'costo' => 'nullable|numeric|min:0',
            'fecha_fabricacion' => 'nullable|date',
            'fecha_instalacion' => 'nullable|date',
            'fecha_inicio_operacion' => 'nullable|date',
            'fecha_acta_recibo' => 'nullable|date',
            'fecha_vencimiento_garantia' => 'nullable|date',
            'vida_util' => 'nullable|integer|min:1',
            'propietario_id' => 'nullable|exists:propietarios,id',
            'fuente_id' => 'nullable|exists:fuenteal,id',
            'tecnologia_id' => 'nullable|exists:tecnologiap,id',
            'frecuencia_id' => 'nullable|exists:frecuenciam,id',
            'cbiomedica_id' => 'nullable|exists:cbiomedica,id',
            'criesgo_id' => 'nullable|exists:criesgo,id',
            'tadquisicion_id' => 'nullable|exists:tadquisicion,id',
            'estadoequipo_id' => 'nullable|exists:estadoequipos,id',
            'tipo_id' => 'nullable|exists:tipos,id',
            'invima' => 'nullable|string|max:100',
            'garantia' => 'nullable|string|max:255',
            'accesorios' => 'nullable|string',
            'localizacion_actual' => 'nullable|string|max:255',
            'verificacion_inventario' => 'nullable|boolean',
            'calibracion' => 'nullable|boolean',
            'repuesto_pendiente' => 'nullable|boolean',
            'movilidad' => 'nullable|string|max:100',
            'propiedad' => 'nullable|string|max:100',
            'evaluacion_desempenio' => 'nullable|string|max:100',
            'periodicidad' => 'nullable|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'manuales' => 'nullable|json',
            'planos' => 'nullable|json'
        ]);

        if ($validator->fails()) {
            return ResponseFormatter::validation($validator->errors());
        }

        try {
            DB::beginTransaction();

            $equipo = Equipo::findOrFail($id);
            $equipoData = $request->except(['image', 'manuales', 'planos']);

            // Process manuales and planos JSON
            if ($request->has('manuales')) {
                $manuales = is_string($request->manuales) ? json_decode($request->manuales, true) : $request->manuales;
                $equipoData['manual'] = json_encode($manuales);
            }

            if ($request->has('planos')) {
                $planos = is_string($request->planos) ? json_decode($request->planos, true) : $request->planos;
                $equipoData['plano'] = json_encode($planos);
            }

            // Manejar actualización de imagen
            if ($request->hasFile('image')) {
                // Eliminar imagen anterior si existe
                if ($equipo->image && Storage::disk('public')->exists($equipo->image)) {
                    Storage::disk('public')->delete($equipo->image);
                }

                $image = $request->file('image');
                $imageName = 'equipos/' . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = $image->storeAs('equipos', $imageName, 'public');
                $equipoData['image'] = $imagePath;
            }

            $equipo->update($equipoData);

            // Cargar relaciones para la respuesta
            $equipo->load([
                'servicio:id,name',
                'area:id,name',
                'propietario:id,nombre',
                'fuenteAlimentacion:id,name',
                'tecnologia:id,name',
                'frecuenciaMantenimiento:id,name',
                'clasificacionBiomedica:id,name',
                'clasificacionRiesgo:id,name',
                'estadoEquipo:id,name',
                'tipo:id,name'
            ]);

            if ($equipo->image) {
                $equipo->image_url = Storage::disk('public')->url($equipo->image);
            }

            DB::commit();

            return ResponseFormatter::success($equipo, 'Equipo actualizado exitosamente');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseFormatter::error('Error al actualizar equipo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Eliminar equipo (soft delete con validaciones)
     */
    public function destroy(string $id)
    {
        try {
            $equipo = Equipo::findOrFail($id);

            // Verificar si el equipo tiene mantenimientos activos
            $mantenimientosActivos = $equipo->mantenimientos()
                ->whereIn('status', ['programado', 'en_proceso'])
                ->count();

            if ($mantenimientosActivos > 0) {
                return ResponseFormatter::error(
                    'No se puede eliminar el equipo porque tiene mantenimientos activos',
                    400
                );
            }

            // Verificar si tiene contingencias activas
            $contingenciasActivas = $equipo->contingencias()
                ->where('estado_id', '!=', 4)
                ->count();

            if ($contingenciasActivas > 0) {
                return ResponseFormatter::error(
                    'No se puede eliminar el equipo porque tiene contingencias activas',
                    400
                );
            }

            // Marcar como inactivo en lugar de eliminar
            $equipo->update(['status' => false]);

            return ResponseFormatter::success(null, 'Equipo eliminado exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al eliminar equipo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Dar de baja un equipo con motivo
     */
    public function darDeBaja(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'motivo' => 'required|string|max:500',
            'fecha_baja' => 'nullable|date',
            'observaciones' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return ResponseFormatter::validation($validator->errors());
        }

        try {
            DB::beginTransaction();

            $equipo = Equipo::findOrFail($id);

            // Crear registro en tabla de bajas
            $bajaId = DB::table('equipos_bajas')->insertGetId([
                'equipo_id' => $id,
                'motivo' => $request->motivo,
                'fecha_baja' => $request->fecha_baja ?: now(),
                'observaciones' => $request->observaciones,
                'usuario_id' => auth()->id(),
                'created_at' => now()
            ]);

            // Actualizar estado del equipo
            $equipo->update([
                'baja_id' => $bajaId,
                'status' => false
            ]);

            // Cancelar mantenimientos programados
            $equipo->mantenimientos()
                ->where('status', 'programado')
                ->update(['status' => 'cancelado']);

            DB::commit();

            return ResponseFormatter::success($equipo, 'Equipo dado de baja exitosamente');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseFormatter::error('Error al dar de baja equipo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Duplicar equipo
     */
    public function duplicar($id)
    {
        try {
            $equipoOriginal = Equipo::findOrFail($id);

            $equipoDuplicado = $equipoOriginal->replicate();
            $equipoDuplicado->code = $equipoOriginal->code . '-COPY-' . time();
            $equipoDuplicado->name = $equipoOriginal->name . ' (Copia)';
            $equipoDuplicado->created_at = now();
            $equipoDuplicado->save();

            // Cargar relaciones
            $equipoDuplicado->load([
                'servicio:id,name',
                'area:id,name',
                'propietario:id,name'
            ]);

            return ResponseFormatter::success($equipoDuplicado, 'Equipo duplicado exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al duplicar equipo: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener equipos por servicio
     */
    public function porServicio($servicioId)
    {
        try {
            $equipos = Equipo::with(['area:id,name', 'estadoEquipo:id,name'])
                ->where('servicio_id', $servicioId)
                ->where('status', true)
                ->orderBy('name')
                ->get();

            return ResponseFormatter::success($equipos, 'Equipos del servicio obtenidos');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener equipos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener equipos por área
     */
    public function porArea($areaId)
    {
        try {
            $equipos = Equipo::with(['servicio:id,name', 'estadoEquipo:id,name'])
                ->where('area_id', $areaId)
                ->where('status', true)
                ->orderBy('name')
                ->get();

            return ResponseFormatter::success($equipos, 'Equipos del área obtenidos');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener equipos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener equipos críticos (alto riesgo con mantenimiento vencido)
     */
    public function equiposCriticos()
    {
        try {
            $equipos = Equipo::with([
                'servicio:id,name',
                'area:id,name',
                'clasificacionRiesgo:id,name',
                'contingencias' => function ($query) {
                    $query->where('estado_id', '!=', 4);
                }
            ])
                ->whereHas('clasificacionRiesgo', function ($query) {
                    $query->whereIn('name', ['ALTO', 'MEDIO ALTO']);
                })
                ->where(function ($query) {
                    $query->where('fecha_mantenimiento', '<', now()->subDays(30))
                        ->orWhereHas('contingencias', function ($q) {
                            $q->where('estado_id', '!=', 4)
                                ->where('severidad', 'Alta');
                        });
                })
                ->where('status', true)
                ->orderBy('created_at', 'desc')
                ->get();

            return ResponseFormatter::success($equipos, 'Equipos críticos obtenidos');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener equipos críticos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener estadísticas completas de equipos
     */
    public function getStats()
    {
        try {
            $stats = [
                'total' => Equipo::where('status', true)->count(),
                'por_servicio' => Equipo::join('servicios', 'equipos.servicio_id', '=', 'servicios.id')
                    ->where('equipos.status', true)
                    ->groupBy('servicios.id', 'servicios.name')
                    ->selectRaw('servicios.name as servicio, count(*) as total')
                    ->get(),
                'por_area' => Equipo::join('areas', 'equipos.area_id', '=', 'areas.id')
                    ->where('equipos.status', true)
                    ->groupBy('areas.id', 'areas.name')
                    ->selectRaw('areas.name as area, count(*) as total')
                    ->get(),
                'por_riesgo' => Equipo::join('criesgo', 'equipos.criesgo_id', '=', 'criesgo.id')
                    ->where('equipos.status', true)
                    ->groupBy('criesgo.id', 'criesgo.name')
                    ->selectRaw('criesgo.name as riesgo, count(*) as total')
                    ->get(),
                'por_estado' => Equipo::join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.status', true)
                    ->groupBy('estadoequipos.id', 'estadoequipos.name')
                    ->selectRaw('estadoequipos.name as estado, count(*) as total')
                    ->get(),
                'valor_total' => Equipo::where('status', true)->sum('costo'),
                'promedio_vida_util' => Equipo::where('status', true)->avg('vida_util'),
                'equipos_con_calibracion' => Equipo::where('status', true)->where('calibracion', true)->count(),
                'equipos_con_repuesto_pendiente' => Equipo::where('status', true)->where('repuesto_pendiente', true)->count()
            ];

            return ResponseFormatter::success($stats, 'Estadísticas obtenidas exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener estadísticas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Buscar equipos por código
     */
    public function searchByCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string'
        ]);

        if ($validator->fails()) {
            return ResponseFormatter::validation($validator->errors());
        }

        try {
            $equipos = Equipo::with(['servicio:id,name', 'area:id,name', 'propietario:id,name'])
                ->where('code', 'like', "%{$request->code}%")
                ->where('status', true)
                ->limit(10)
                ->get();

            return ResponseFormatter::success($equipos, 'Búsqueda completada exitosamente');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error en la búsqueda: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Buscar equipos con filtros avanzados
     */
    public function busquedaAvanzada(Request $request)
    {
        try {
            $query = Equipo::with([
                'servicio:id,name',
                'area:id,name',
                'propietario:id,nombre',
                'clasificacionRiesgo:id,name',
                'estadoEquipo:id,name'
            ]);

            // Aplicar múltiples filtros
            if ($request->filled('servicios')) {
                $query->whereIn('servicio_id', $request->servicios);
            }

            if ($request->filled('areas')) {
                $query->whereIn('area_id', $request->areas);
            }

            if ($request->filled('riesgos')) {
                $query->whereIn('criesgo_id', $request->riesgos);
            }

            if ($request->filled('estados')) {
                $query->whereIn('estadoequipo_id', $request->estados);
            }

            if ($request->filled('marcas')) {
                $query->whereIn('marca', $request->marcas);
            }

            if ($request->filled('fecha_fabricacion_desde')) {
                $query->where('fecha_fabricacion', '>=', $request->fecha_fabricacion_desde);
            }

            if ($request->filled('fecha_fabricacion_hasta')) {
                $query->where('fecha_fabricacion', '<=', $request->fecha_fabricacion_hasta);
            }

            if ($request->filled('costo_min')) {
                $query->where('costo', '>=', $request->costo_min);
            }

            if ($request->filled('costo_max')) {
                $query->where('costo', '<=', $request->costo_max);
            }

            if ($request->filled('vida_util_min')) {
                $query->where('vida_util', '>=', $request->vida_util_min);
            }

            if ($request->filled('con_mantenimiento_vencido')) {
                $query->where('fecha_mantenimiento', '<', now()->subDays(30));
            }

            if ($request->filled('requiere_calibracion')) {
                $query->where('calibracion', $request->requiere_calibracion);
            }

            $equipos = $query->where('status', true)
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 15));

            return ResponseFormatter::success($equipos, 'Búsqueda avanzada completada');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error en búsqueda avanzada: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener marcas disponibles
     */
    public function getMarcas()
    {
        try {
            $marcas = Equipo::where('status', true)
                ->whereNotNull('marca')
                ->distinct()
                ->pluck('marca')
                ->sort()
                ->values();

            return ResponseFormatter::success($marcas, 'Marcas obtenidas');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener marcas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener modelos por marca
     */
    public function getModelosPorMarca($marca)
    {
        try {
            $modelos = Equipo::where('status', true)
                ->where('marca', $marca)
                ->whereNotNull('modelo')
                ->distinct()
                ->pluck('modelo')
                ->sort()
                ->values();

            return ResponseFormatter::success($modelos, 'Modelos obtenidos');
        } catch (\Exception $e) {
            return ResponseFormatter::error('Error al obtener modelos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Calcular depreciación del equipo
     */
    private function calcularDepreciacion($equipo)
    {
        if (!$equipo->costo || !$equipo->vida_util || !$equipo->fecha_instalacion) {
            return null;
        }

        $añosTranscurridos = Carbon::parse($equipo->fecha_instalacion)->diffInYears(now());
        $depreciacionAnual = $equipo->costo / $equipo->vida_util;
        $depreciacionTotal = $depreciacionAnual * $añosTranscurridos;

        return max(0, $equipo->costo - $depreciacionTotal);
    }

    /**
     * Obtener equipos industriales con información completa
     * Similar a getMedicalDevicesComplete pero para equipos industriales (tipo_id = 2)
     */
    public function getIndustrialDevicesComplete(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            $search = $request->get('search', '');
            $sortBy = $request->get('sort_by', 'equipos.name');
            $sortOrder = $request->get('sort_order', 'asc');

            // Debug: Log todos los filtros recibidos
            $activeFilters = array_filter($request->all(), function($value, $key) {
                return !empty($value) && !in_array($key, ['page', 'per_page', 'sort_by', 'sort_order']);
            }, ARRAY_FILTER_USE_BOTH);

            if (!empty($activeFilters)) {
                \Log::info('🔍 Backend: Filtros activos recibidos para equipos industriales', [
                    'active_filters' => $activeFilters,
                    'total_filters' => count($activeFilters)
                ]);
            }

            // Consulta SQL completa para equipos industriales
            $query = DB::table('equipos')
                ->select([
                    'equipos.id',
                    'equipos.name',
                    'equipos.code',
                    'equipos.serial',
                    'equipos.marca',
                    'equipos.modelo',
                    'equipos.image',
                    'equipos.file',
                    'equipos.archivo_invima',
                    'equipos.fecha_ad',
                    'equipos.invima_id',
                    'equipos.manual_id',
                    'equipos.guia_id',
                    'equipos.tadquisicion_id',
                    'equipos.tipo_id',
                    'servicios.name as servicios',
                    'areas.name as area',
                    DB::raw('COALESCE(sedes_equipo.name, sedes.name) as sede'),
                    // Campos de ubicación hospitalaria específicos
                    'zonas.name as zona_hospitalaria',
                    'pisos.name as piso_servicio',
                    'equipos.localizacion_actual',
                    'estadoequipos.name as estadoequipo',
                    'cbiomedica.name as clasificacion',
                    'criesgo.name as riesgo',
                    // Información adicional dinámica
                    DB::raw('(SELECT COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) FROM mantenimiento
                             WHERE equipo_id = equipos.id
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento'),
                    // Archivo e id de ESA misma fila, para que el enlace de la tabla abra el documento
                    // que corresponde a la fecha mostrada y no tenga que adivinarlo el navegador.
                    DB::raw('(SELECT file FROM mantenimiento
                             WHERE equipo_id = equipos.id
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento_file'),
                    DB::raw('(SELECT id FROM mantenimiento
                             WHERE equipo_id = equipos.id
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento_id'),
                    DB::raw("(SELECT NULLIF(
                                 GREATEST(
                                     COALESCE((SELECT MAX(fecha_calibracion) FROM calibracion WHERE equipo_id = equipos.id), '0001-01-01'),
                                     COALESCE((SELECT MAX(fecha_calibracion) FROM calibracion_ind WHERE equipo_id = equipos.id), '0001-01-01')
                                 ),
                                 '0001-01-01'
                             )) AS ultima_calibracion"),
                    DB::raw('(SELECT fecha_mantenimiento FROM correctivos_generales
                             WHERE equipo_id = equipos.id
                             ORDER BY fecha_mantenimiento DESC LIMIT 1) AS ultimo_correctivo'),
                    DB::raw('(SELECT fecha_inicio FROM correctivos_generales 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_inicio DESC LIMIT 1) AS ultimo_correctivo_general'),
                    DB::raw('(SELECT fecha_mantenimiento FROM correctivos_generales 
                             WHERE equipo_id = equipos.id AND fecha_mantenimiento IS NOT NULL
                             ORDER BY fecha_mantenimiento DESC LIMIT 1) AS ultimo_procedimiento_correctivo'),
                    DB::raw('(SELECT fecha_inicio FROM ordenes
                             WHERE equipo_id = equipos.id
                             ORDER BY fecha_inicio DESC LIMIT 1) AS fecha_inicio_ultimo_ticket'),
                    DB::raw('(SELECT fecha_fin FROM ordenes 
                             WHERE equipo_id = equipos.id AND fecha_fin IS NOT NULL
                             ORDER BY fecha_fin DESC LIMIT 1) AS fecha_ultimo_cierre_ticket'),
                    DB::raw('(SELECT CASE WHEN estado_id = 3 THEN 1 ELSE 0 END FROM ordenes 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_inicio DESC LIMIT 1) AS ultimo_ticket_cerrado'),
                    // Conteos específicos para reemplazar archivos y planes mantenimiento
                    DB::raw('((SELECT COUNT(*) FROM calibracion WHERE equipo_id = equipos.id)
                             + (SELECT COUNT(*) FROM calibracion_ind WHERE equipo_id = equipos.id)) AS cuenta_calibraciones'),
                    DB::raw('(SELECT COUNT(*) FROM mantenimiento 
                             WHERE equipo_id = equipos.id) AS cuenta_preventivos'),
                    DB::raw('(SELECT COUNT(*) FROM contingencias 
                             WHERE equipo_id = equipos.id) AS cuenta_contingencias'),
                    DB::raw('(SELECT COUNT(*) FROM contingencias 
                             WHERE equipo_id = equipos.id AND estado_id = 1) AS contingencias_abiertas'),
                    DB::raw('(SELECT description FROM observaciones
                             WHERE equipo_id = equipos.id
                             ORDER BY id DESC LIMIT 1) AS ultima_observacion'),
                    // Plan de mantenimiento del año vigente
                    DB::raw('(SELECT COUNT(*) FROM planes_mantenimientos
                             WHERE equipo_id = equipos.id
                             AND anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)) AS incluido_en_plan'),
                    DB::raw('(SELECT fm.name FROM planes_mantenimientos pm
                             LEFT JOIN frecuenciam fm ON fm.id = pm.frecuencia_id
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS frecuencia_plan'),
                    DB::raw('(SELECT pm.mes1 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado1'),
                    DB::raw('(SELECT pm.mes2 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado2'),
                    DB::raw('(SELECT pm.mes3 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado3'),
                    DB::raw('(SELECT pm.responsable FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS responsable_plan'),
                    DB::raw('(SELECT anio FROM vigencias_mantenimiento LIMIT 1) AS anio_vigente'),
                    'invimas.invima as registro_sanitario_invima',
                    // 'invimas.file as archivo_registro_sanitario',
                    'pro.nombre as propietario',
                    'pro.logo as propietario_logo',
                    'ordenes_compra.orden as orden_compra',
                    'ordenes_compra.file as orden_compra_file',
                    'tipos_compra.tipo_compra as tipo_compra',
                    // Documentos asociados
                    'manuales.descripcion as manual_descripcion',
                    'manuales.url as manual_url',
                    'guias_rapidas.name as guia_name',
                    'guias_rapidas.file as guia_file',
                    // Registro INVIMA (tabla invimas)
                    'invimas.invima as invima_numero_registro',
                    'invimas.file as invima_archivo',
                    'invimas.titulo as invima_titulo'
                ])
                ->leftJoin('servicios', 'servicios.id', '=', 'equipos.servicio_id')
                ->leftJoin('areas', 'areas.id', '=', 'equipos.area_id')
                ->leftJoin('sedes', 'sedes.id', '=', 'servicios.sede_id')
                ->leftJoin('sedes as sedes_equipo', 'sedes_equipo.id', '=', 'equipos.sede_id')
                ->leftJoin('zonas', 'zonas.id', '=', 'servicios.zona_id')
                ->leftJoin('pisos', 'pisos.id', '=', 'servicios.piso_id')
                ->leftJoin('estadoequipos', 'estadoequipos.id', '=', 'equipos.estadoequipo_id')
                ->leftJoin('cbiomedica', 'cbiomedica.id', '=', 'equipos.cbiomedica_id')
                ->leftJoin('criesgo', 'criesgo.id', '=', 'equipos.criesgo_id')
                ->leftJoin('invimas', 'invimas.id', '=', 'equipos.invima_id')
                ->leftJoin('propietarios as pro', 'pro.id', '=', 'equipos.propietario_id')
                ->leftJoin('ordenes_compra', 'ordenes_compra.id', '=', 'equipos.orden_compra_id')
                ->leftJoin('tipos_compra', 'tipos_compra.id', '=', 'ordenes_compra.tipo_compra_id')
                // JOINs para documentos asociados
                ->leftJoin('manuales', 'manuales.id', '=', 'equipos.manual_id')
                ->leftJoin('guias_rapidas', 'guias_rapidas.id', '=', 'equipos.guia_id')
                ->where('equipos.status', '!=', 0)
                ->where('equipos.tipo_id', 2); // Solo equipos industriales

            // Sección 2: Ubicación Geográfica
            if ($request->has('filtro_zona') && !empty($request->filtro_zona)) {
                $query->where(DB::raw('COALESCE(NULLIF(equipos.sede_id,0), servicios.sede_id)'), $request->filtro_zona);
            } elseif ($request->has('sede_id') && !empty($request->sede_id)) {
                $query->where(DB::raw('COALESCE(NULLIF(equipos.sede_id,0), servicios.sede_id)'), $request->sede_id);
            }

            if ($request->has('servicio_id_auxiliar') && !empty($request->servicio_id_auxiliar)) {
                $query->where('equipos.servicio_id', $request->servicio_id_auxiliar);
            } elseif ($request->has('servicio_id') && !empty($request->servicio_id)) {
                $query->where('equipos.servicio_id', $request->servicio_id);
            }

            if ($request->has('area_id_auxiliar') && !empty($request->area_id_auxiliar)) {
                $query->where('equipos.area_id', $request->area_id_auxiliar);
            } elseif ($request->has('area_id') && !empty($request->area_id)) {
                $query->where('equipos.area_id', $request->area_id);
            }

            // Sección 3: Estado del equipo
            if ($request->has('filtro_estadoequipo_id') && !empty($request->filtro_estadoequipo_id)) {
                $query->where('equipos.estadoequipo_id', $request->filtro_estadoequipo_id);
            } elseif ($request->has('estado_id') && !empty($request->estado_id)) {
                $query->where('equipos.estadoequipo_id', $request->estado_id);
            }

            // FILTRO POR ID ESPECÍFICO (consulta_id) - actúa como búsqueda exacta por ID
            if ($request->has('consulta_id') && !empty($request->consulta_id)) {
                $equipmentId = (int) $request->consulta_id;
                $query->where('equipos.id', $equipmentId);
                // No aplicar búsqueda global cuando se busca por ID exacto
            } else {
                // Aplicar búsqueda global si se proporciona
                if (!empty($search)) {
                    $query->where(function ($q) use ($search) {
                        $q->where('equipos.name', 'like', "%{$search}%")
                            ->orWhere('equipos.code', 'like', "%{$search}%")
                            ->orWhere('equipos.marca', 'like', "%{$search}%")
                            ->orWhere('equipos.modelo', 'like', "%{$search}%")
                            ->orWhere('equipos.serial', 'like', "%{$search}%")
                            ->orWhere('servicios.name', 'like', "%{$search}%")
                            ->orWhere('areas.name', 'like', "%{$search}%");
                    });
                }
            }

            // Aplicar ordenamiento
            $query->orderBy($sortBy, $sortOrder);

            // Obtener total antes de paginar
            $total = $query->count();

            // Debug: Log resultados si se buscó por ID
            if ($request->has('consulta_id')) {
                \Log::info('📊 Backend: Resultados de búsqueda por ID (industrial)', [
                    'consulta_id' => $request->consulta_id,
                    'total_found' => $total,
                    'page' => $page,
                    'per_page' => $perPage
                ]);
            }

            // Aplicar paginación manual para luego formatear los items
            $offset = ($page - 1) * $perPage;
            $equipos = $query->skip($offset)->take($perPage)->get();

            // Formatear datos para que coincidan con getMedicalDevicesComplete
            $formattedEquipos = collect($equipos)->map(function ($equipo) {
                // Campos top-level para compatibilidad con frontend (vistas antiguas)
                $topPropietario = $equipo->propietario ?: null;
                $topClasificacion = $equipo->clasificacion ?: null;
                $topRiesgo = $equipo->riesgo ?: null;
                $topEstadoEquipo = $equipo->estadoequipo ?: null;

                return [
                    'id' => $equipo->id,
                    'tipo_id' => (int) ($equipo->tipo_id ?? 2),
                    // Compatibilidad: algunos componentes esperan propiedades al nivel superior
                    'propietario' => $topPropietario,
                    'clasificacion' => $topClasificacion,
                    'riesgo' => $topRiesgo,
                    'estadoequipo' => $topEstadoEquipo,

                    'equipo' => [
                        'id' => $equipo->id,
                        'name' => $equipo->name,
                        'code' => $equipo->code,
                        'brand' => $equipo->marca,
                        'model' => $equipo->modelo,
                        'series' => $equipo->serial,
                        'image' => $equipo->image ? url('storage/equipos/images/' . $equipo->image) : null,
                        'hasImage' => !empty($equipo->image),
                        'manual_id' => $equipo->manual_id,
                        'guia_id' => $equipo->guia_id,
                        'invima_id' => $equipo->invima_id,
                    ],

                    'data' => [
                        'status' => $equipo->estadoequipo,
                        'registroSanitario' => $equipo->invima_id && isset($equipo->registro_sanitario_invima) ? $equipo->registro_sanitario_invima : null,
                        'numeroInvima' => null,
                        'fechaVencimientoInvima' => null,
                        'estadoInvima' => null,
                        'archivoInvima' => $equipo->archivo_invima,
                        'clasificacion' => $equipo->clasificacion,
                        'riesgo' => $equipo->riesgo,
                        'archivos' => (int) ($equipo->cuenta_archivos ?? 0),
                        'planesMantenimiento' => (int) ($equipo->cuenta_planes_mantenimientos ?? 0),
                    ],
                    // Nuevos campos agregados directamente al nivel raíz
                    'fecha_ad' => $equipo->fecha_ad,
                    'zona_hospitalaria' => $equipo->zona_hospitalaria,
                    'piso_servicio' => $equipo->piso_servicio,
                    'localizacion_actual' => $equipo->localizacion_actual,
                    'cuenta_calibraciones' => (int) ($equipo->cuenta_calibraciones ?? 0),
                    'cuenta_preventivos' => (int) ($equipo->cuenta_preventivos ?? 0),
                    'cuenta_contingencias' => (int) ($equipo->cuenta_contingencias ?? 0),
                    'contingencias_abiertas' => (int) ($equipo->contingencias_abiertas ?? 0),
                    'orden_compra' => $equipo->orden_compra,
                    'orden_compra_file' => $equipo->orden_compra_file,
                    'tipo_compra' => $equipo->tipo_compra,

                    'ubicacion' => [
                        'servicio' => $equipo->servicios,
                        'area' => $equipo->area,
                        'sede' => $equipo->sede,
                    ],

                    // Información adicional agrupada para la UI
                    'informacion_adicional' => [
                        'ultimo_mantenimiento' => $equipo->ultimo_mantenimiento,
                        'ultima_calibracion' => $equipo->ultima_calibracion,
                        'ultimo_correctivo' => $equipo->ultimo_correctivo,
                        'ultimo_correctivo_general' => $equipo->ultimo_correctivo_general,
                        'ultimo_procedimiento_correctivo' => $equipo->ultimo_procedimiento_correctivo,
                        'fecha_inicio_ultimo_ticket' => $equipo->fecha_inicio_ultimo_ticket,
                        'fecha_ultimo_cierre_ticket' => $equipo->fecha_ultimo_cierre_ticket,
                        'ultimo_ticket_cerrado' => (bool) ($equipo->ultimo_ticket_cerrado ?? false),
                        'cuenta_archivos' => (int) ($equipo->cuenta_archivos ?? 0),
                    ],

                    'mantenimiento' => [
                        'ultimoMantenimiento' => $equipo->ultimo_mantenimiento,
                        'ultimoMantenimientoArchivo' => $equipo->ultimo_mantenimiento_file ?? null,
                        'ultimoMantenimientoId' => $equipo->ultimo_mantenimiento_id ?? null,
                        'ultimaCalibración' => $equipo->ultima_calibracion,
                        'ultimoCorrectivo' => $equipo->ultimo_correctivo,
                        'ultimoCorrectivoGeneral' => $equipo->ultimo_correctivo_general,
                        'ultimoProcedimientoCorrectivo' => $equipo->ultimo_procedimiento_correctivo,
                    ],

                    // Plan de mantenimiento vigente
                    'incluido_en_plan' => (int) ($equipo->incluido_en_plan ?? 0),
                    'frecuencia_plan' => $equipo->frecuencia_plan ?? null,
                    'responsable_plan' => $equipo->responsable_plan ?? null,
                    'mes_programado1' => $equipo->mes_programado1 ?? null,
                    'mes_programado2' => $equipo->mes_programado2 ?? null,
                    'mes_programado3' => $equipo->mes_programado3 ?? null,
                    'anio_vigente' => $equipo->anio_vigente ?? null,

                    'propietario' => [
                        'nombre' => $equipo->propietario,
                        'logo' => $equipo->propietario_logo,
                        'logo_url' => $equipo->propietario_logo ? url('storage/equipos/images/' . $equipo->propietario_logo) : null,
                    ],

                    'compra' => [
                        'orden' => $equipo->orden_compra,
                        'propietario' => $equipo->propietario,
                        'tipo' => $equipo->tipo_compra,
                    ],

                    'observaciones' => [
                        'ultima' => $equipo->ultima_observacion,
                    ],

                    'tickets' => [
                        'fechaUltimoTicket' => $equipo->fecha_inicio_ultimo_ticket ?? null,
                        'fechaCreacionUltimoTicket' => $equipo->fecha_inicio_ultimo_ticket ?? null,
                        'fechaUltimoCierre' => $equipo->fecha_ultimo_cierre_ticket ?? null,
                        'ultimoTicketCerrado' => (bool) ($equipo->ultimo_ticket_cerrado ?? false),
                    ],

                    // Documentos asociados
                    'manual' => $equipo->manual_descripcion ? [
                        'id' => $equipo->manual_id,
                        'descripcion' => $equipo->manual_descripcion,
                        'url' => $equipo->manual_url,
                    ] : null,
                    'guia_rapida' => $equipo->guia_name ? [
                        'id' => $equipo->guia_id,
                        'name' => $equipo->guia_name,
                        'file' => $equipo->guia_file,
                    ] : null,
                    'registros_invima' => $equipo->invima_id ? [[
                        'id' => $equipo->invima_id,
                        'numero_registro' => $equipo->invima_numero_registro ?? null,
                        'nombre_equipo' => $equipo->invima_titulo ?? null,
                        'archivo_registro_sanitario' => $equipo->invima_archivo ?? null,
                    ]] : null,
                ];
            });

            $responseData = [
                'current_page' => (int) $page,
                'data' => $formattedEquipos,
                'per_page' => (int) $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Equipos industriales obtenidos exitosamente',
                'data' => $responseData
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getIndustrialDevicesComplete: ' . $e->getMessage());
            return ResponseFormatter::error('Error al obtener equipos industriales: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obtener equipos médicos con información completa usando la consulta SQL especificada
     * Esta función implementa la consulta SQL completa solicitada
     */
    public function getMedicalDevicesComplete(Request $request)
    {
        try {
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            $search = $request->get('search', '');
            $sortBy = $request->get('sort_by', 'equipos.name');
            $sortOrder = $request->get('sort_order', 'asc');

            // Debug: Log todos los filtros recibidos
            $activeFilters = array_filter($request->all(), function($value, $key) {
                return !empty($value) && !in_array($key, ['page', 'per_page', 'sort_by', 'sort_order']);
            }, ARRAY_FILTER_USE_BOTH);

            if (!empty($activeFilters)) {
                \Log::info('🔍 Backend: Filtros activos recibidos', [
                    'active_filters' => $activeFilters,
                    'total_filters' => count($activeFilters)
                ]);
            }

            // Consulta SQL completa con subconsultas corregidas
            $query = DB::table('equipos')
                ->select([
                    'equipos.id',
                    'equipos.name',
                    'equipos.code',
                    'equipos.serial',
                    'equipos.marca',
                    'equipos.modelo',
                    'equipos.image',
                    'equipos.file',
                    'equipos.archivo_invima',
                    'equipos.fecha_ad',
                    // IDs para documentos asociados
                    'equipos.manual_id',
                    'equipos.guia_id', 
                    'equipos.invima_id',
                    'equipos.tadquisicion_id',
                    'equipos.tipo_id',
                    'servicios.name as servicios',
                    'areas.name as area',
                    DB::raw('COALESCE(sedes_equipo.name, sedes.name) as sede'),
                    // Campos de ubicación hospitalaria específicos
                    'zonas.name as zona_hospitalaria',
                    'pisos.name as piso_servicio',
                    'equipos.localizacion_actual',
                    'estadoequipos.name as estadoequipo',
                    'cbiomedica.name as clasificacion',
                    'criesgo.name as riesgo',
                    // Información de documentos asociados
                    'manuales.descripcion as manual_descripcion',
                    'manuales.url as manual_url',
                    'guias_rapidas.name as guia_name',
                    'guias_rapidas.file as guia_file',
                    // Registro INVIMA (tabla invimas)
                    'invimas.invima as invima_numero_registro',
                    'invimas.file as invima_archivo',
                    'invimas.titulo as invima_titulo',
                    // Información adicional dinámica con subconsultas corregidas
                    DB::raw('(SELECT COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) FROM mantenimiento 
                             WHERE equipo_id = equipos.id 
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento'),
                    // Archivo e id de ESA misma fila, para que el enlace de la tabla abra el documento
                    // que corresponde a la fecha mostrada y no tenga que adivinarlo el navegador.
                    DB::raw('(SELECT file FROM mantenimiento
                             WHERE equipo_id = equipos.id
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento_file'),
                    DB::raw('(SELECT id FROM mantenimiento
                             WHERE equipo_id = equipos.id
                             ORDER BY COALESCE(fecha_mantenimiento, fecha_programada, DATE(created_at)) DESC, id DESC LIMIT 1) AS ultimo_mantenimiento_id'),
                    DB::raw('(SELECT fecha_calibracion FROM calibracion 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_calibracion DESC LIMIT 1) AS ultima_calibracion'),
                    DB::raw('(SELECT fecha_mantenimiento FROM correctivos_generales 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_mantenimiento DESC LIMIT 1) AS ultimo_correctivo'),
                    DB::raw('(SELECT fecha_inicio FROM ordenes 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_inicio DESC LIMIT 1) AS fecha_inicio_ultimo_ticket'),
                    DB::raw('(SELECT fecha_inicio FROM correctivos_generales 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_inicio DESC LIMIT 1) AS ultimo_correctivo_general'),
                    DB::raw('(SELECT fecha_mantenimiento FROM correctivos_generales 
                             WHERE equipo_id = equipos.id AND fecha_mantenimiento IS NOT NULL
                             ORDER BY fecha_mantenimiento DESC LIMIT 1) AS ultimo_procedimiento_correctivo'),
                    DB::raw('(SELECT fecha_fin FROM ordenes 
                             WHERE equipo_id = equipos.id AND fecha_fin IS NOT NULL
                             ORDER BY fecha_fin DESC LIMIT 1) AS fecha_ultimo_cierre_ticket'),
                    DB::raw('(SELECT CASE WHEN estado_id = 3 THEN 1 ELSE 0 END FROM ordenes 
                             WHERE equipo_id = equipos.id 
                             ORDER BY fecha_inicio DESC LIMIT 1) AS ultimo_ticket_cerrado'),
                    // Conteos específicos para reemplazar archivos y planes mantenimiento
                    DB::raw('(SELECT COUNT(*) FROM calibracion 
                             WHERE equipo_id = equipos.id) AS cuenta_calibraciones'),
                    DB::raw('(SELECT COUNT(*) FROM mantenimiento 
                             WHERE equipo_id = equipos.id) AS cuenta_preventivos'),
                    DB::raw('(SELECT COUNT(*) FROM contingencias 
                             WHERE equipo_id = equipos.id) AS cuenta_contingencias'),
                    DB::raw('(SELECT COUNT(*) FROM contingencias 
                             WHERE equipo_id = equipos.id AND estado_id = 1) AS contingencias_abiertas'),
                    DB::raw('(SELECT description FROM observaciones 
                             WHERE equipo_id = equipos.id 
                             ORDER BY id DESC LIMIT 1) AS ultima_observacion'),
                    // Plan de mantenimiento del año vigente
                    DB::raw('(SELECT COUNT(*) FROM planes_mantenimientos 
                             WHERE equipo_id = equipos.id 
                             AND anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)) AS incluido_en_plan'),
                    DB::raw('(SELECT fm.name FROM planes_mantenimientos pm
                             LEFT JOIN frecuenciam fm ON fm.id = pm.frecuencia_id
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS frecuencia_plan'),
                    DB::raw('(SELECT pm.mes1 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado1'),
                    DB::raw('(SELECT pm.mes2 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado2'),
                    DB::raw('(SELECT pm.mes3 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado3'),
                    DB::raw('(SELECT pm.responsable FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS responsable_plan'),
                    DB::raw('(SELECT anio FROM vigencias_mantenimiento LIMIT 1) AS anio_vigente'),
                    'invimas.invima as registro_sanitario_invima',
                    // 'invimas.file as archivo_registro_sanitario',
                    'pro.nombre as propietario',
                    'pro.logo as propietario_logo',
                    'ordenes_compra.orden as orden_compra',
                    'ordenes_compra.file as orden_compra_file',
                    'tipos_compra.tipo_compra as tipo_compra',
                    // Documento de baja (para badge en tabla principal)
                    // Busca primero por equipos.baja_id (legacy/directo) y si no existe usa equipos_bajas (flujo nuevo)
                    DB::raw('COALESCE(
                        (SELECT b.archivo FROM bajas b WHERE b.id = equipos.baja_id AND b.archivo IS NOT NULL AND b.archivo != "" LIMIT 1),
                        (SELECT b.archivo FROM equipos_bajas eb LEFT JOIN bajas b ON eb.baja_id = b.id WHERE eb.equipo_id = equipos.id AND b.archivo IS NOT NULL AND b.archivo != "" ORDER BY b.fecha_baja DESC LIMIT 1)
                    ) AS archivo_baja'),
                    'centros.id as centro_costo_id',
                    'centros.code as centro_costo',
                    'centros.name as centro_costo_nombre'
                ])
                ->leftJoin('servicios', 'servicios.id', '=', 'equipos.servicio_id')
                ->leftJoin('centros', 'centros.id', '=', 'servicios.centro_id')
                ->leftJoin('areas', 'areas.id', '=', 'equipos.area_id')
                ->leftJoin('sedes', 'sedes.id', '=', 'servicios.sede_id')
                ->leftJoin('sedes as sedes_equipo', 'sedes_equipo.id', '=', 'equipos.sede_id')
                ->leftJoin('zonas', 'zonas.id', '=', 'servicios.zona_id')
                ->leftJoin('pisos', 'pisos.id', '=', 'servicios.piso_id')
                ->leftJoin('estadoequipos', 'estadoequipos.id', '=', 'equipos.estadoequipo_id')
                ->leftJoin('cbiomedica', 'cbiomedica.id', '=', 'equipos.cbiomedica_id')
                ->leftJoin('criesgo', 'criesgo.id', '=', 'equipos.criesgo_id')
                ->leftJoin('invimas', 'invimas.id', '=', 'equipos.invima_id')
                ->leftJoin('propietarios as pro', 'pro.id', '=', 'equipos.propietario_id')
                ->leftJoin('ordenes_compra', 'ordenes_compra.id', '=', 'equipos.orden_compra_id')
                ->leftJoin('tipos_compra', 'tipos_compra.id', '=', 'ordenes_compra.tipo_compra_id')
                // JOINs para documentos asociados
                ->leftJoin('manuales', 'manuales.id', '=', 'equipos.manual_id')
                ->leftJoin('guias_rapidas', 'guias_rapidas.id', '=', 'equipos.guia_id')
                ->where('equipos.status', '!=', 0)
                ->where('equipos.tipo_id', 1); // Solo equipos médicos

            // FILTRO POR ID ESPECÍFICO (consulta_id) - Debe ser exacto y único
            if ($request->has('consulta_id') && !empty($request->consulta_id)) {
                $equipmentId = (int) $request->consulta_id;
                $query->where('equipos.id', $equipmentId);
                // Cuando se busca por ID específico, no aplicar otros filtros de búsqueda
            } else {
                // Aplicar filtros de búsqueda solo si no se está buscando por ID específico
                if (!empty($search)) {
                    $query->where(function ($q) use ($search) {
                        $q->where('equipos.id', 'like', "%{$search}%")
                            ->orWhere('equipos.name', 'like', "%{$search}%")
                            ->orWhere('equipos.code', 'like', "%{$search}%")
                            ->orWhere('equipos.marca', 'like', "%{$search}%")
                            ->orWhere('equipos.modelo', 'like', "%{$search}%")
                            ->orWhere('equipos.serial', 'like', "%{$search}%")
                            ->orWhere('servicios.name', 'like', "%{$search}%")
                            ->orWhere('areas.name', 'like', "%{$search}%");
                    });
                }
            }

            // FILTROS ESPECÍFICOS SEGÚN EL INFORME

            // Sección 1: Identificación del Equipo
            if ($request->has('filtro_code') && !empty($request->filtro_code)) {
                $query->where('equipos.code', 'like', "%{$request->filtro_code}%");
            }

            if ($request->has('filtro_name') && !empty($request->filtro_name)) {
                $query->where('equipos.name', 'like', "%{$request->filtro_name}%");
            }

            if ($request->has('filtro_serial') && !empty($request->filtro_serial)) {
                $query->where('equipos.serial', 'like', "%{$request->filtro_serial}%");
            }

            if ($request->has('filtro_marca') && !empty($request->filtro_marca)) {
                $query->where('equipos.marca', 'like', "%{$request->filtro_marca}%");
            }

            if ($request->has('filtro_modelo') && !empty($request->filtro_modelo)) {
                $query->where('equipos.modelo', 'like', "%{$request->filtro_modelo}%");
            }

            // Sección 2: Ubicación Geográfica
            if ($request->has('filtro_zona') && !empty($request->filtro_zona)) {
                $query->where(DB::raw('COALESCE(NULLIF(equipos.sede_id,0), servicios.sede_id)'), $request->filtro_zona);
            } elseif ($request->has('sede_id') && !empty($request->sede_id)) {
                $query->where(DB::raw('COALESCE(NULLIF(equipos.sede_id,0), servicios.sede_id)'), $request->sede_id);
            }

            if ($request->has('servicio_id_auxiliar') && !empty($request->servicio_id_auxiliar)) {
                $query->where('equipos.servicio_id', $request->servicio_id_auxiliar);
            } elseif ($request->has('servicio_id') && !empty($request->servicio_id)) {
                $query->where('equipos.servicio_id', $request->servicio_id);
            }

            if ($request->has('area_id_auxiliar') && !empty($request->area_id_auxiliar)) {
                $query->where('equipos.area_id', $request->area_id_auxiliar);
            } elseif ($request->has('area_id') && !empty($request->area_id)) {
                $query->where('equipos.area_id', $request->area_id);
            }

            // Sección 3: Estado del equipo
            if ($request->has('filtro_estadoequipo_id') && !empty($request->filtro_estadoequipo_id)) {
                $query->where('equipos.estadoequipo_id', $request->filtro_estadoequipo_id);
            } elseif ($request->has('estado_id') && !empty($request->estado_id)) {
                $query->where('equipos.estadoequipo_id', $request->estado_id);
            }

            if ($request->has('filtro_estadom') && !empty($request->filtro_estadom)) {
                $query->where('equipos.estado_mantenimiento', $request->filtro_estadom);
            }

            if ($request->has('proveedor_mantenimiento') && !empty($request->proveedor_mantenimiento)) {
                // Filtrar por proveedor de mantenimiento (puede requerir join con tabla de mantenimientos)
                $query->whereExists(function ($subQuery) use ($request) {
                    $subQuery->select(DB::raw(1))
                        ->from('mantenimiento')
                        ->whereColumn('mantenimiento.equipo_id', 'equipos.id')
                        ->where('mantenimiento.proveedor_mantenimiento_id', $request->proveedor_mantenimiento);
                });
            }

            // Sección 4: Clasificación Técnica
            if ($request->has('tipo_id') && !empty($request->tipo_id)) {
                $query->where('equipos.tipo_id', $request->tipo_id);
            }

            if ($request->has('criesgo_id') && !empty($request->criesgo_id)) {
                $query->where('equipos.criesgo_id', $request->criesgo_id);
            }

            if ($request->has('estado_id_cg') && !empty($request->estado_id_cg)) {
                $query->where('equipos.propietario_id', $request->estado_id_cg);
            }

            // Filtro por tipo de adquisición (Comodato)
            if ($request->has('tadquisicion_id') && !empty($request->tadquisicion_id)) {
                $query->where('equipos.tadquisicion_id', $request->tadquisicion_id);
            }

            // Filtro por inclusión en plan de mantenimiento
            if ($request->has('incluido_en_plan_anio')) {
                $anioPlan = $request->get('incluido_en_plan_anio');
                $query->whereExists(function ($subQuery) use ($anioPlan) {
                    $subQuery->select(DB::raw(1))
                        ->from('planes_mantenimientos')
                        ->whereColumn('planes_mantenimientos.equipo_id', 'equipos.id')
                        ->where('planes_mantenimientos.anio', $anioPlan);
                });
            }

            // Filtro por NO inclusión en plan de mantenimiento
            if ($request->has('no_incluido_en_plan_anio')) {
                $anioPlan = $request->get('no_incluido_en_plan_anio');
                $query->whereNotExists(function ($subQuery) use ($anioPlan) {
                    $subQuery->select(DB::raw(1))
                        ->from('planes_mantenimientos')
                        ->whereColumn('planes_mantenimientos.equipo_id', 'equipos.id')
                        ->where('planes_mantenimientos.anio', $anioPlan);
                });
            }

            // anio_plan: filtro de plan de mantenimiento (NO filtrar por created_at)
            // Se omite intencionalmente para no filtrar por año de creación del equipo

            if ($request->has('clasificacion_id') && !empty($request->clasificacion_id)) {
                $query->where('equipos.cbiomedica_id', $request->clasificacion_id);
            }

            if ($request->has('riesgo_id') && !empty($request->riesgo_id)) {
                $query->where('equipos.criesgo_id', $request->riesgo_id);
            }

            if ($request->has('propietario_id') && !empty($request->propietario_id)) {
                $query->where('equipos.propietario_id', $request->propietario_id);
            }

            // Filtro por estado del equipo (estadoequipo_id)
            if ($request->has('estadoequipo_id') && !empty($request->estadoequipo_id)) {
                $query->where('equipos.estadoequipo_id', $request->estadoequipo_id);
            }

            // Filtro por estado general del equipo
            if ($request->has('estado_id') && !empty($request->estado_id)) {
                $query->where('equipos.estadoequipo_id', $request->estado_id);
            }

            // Ordenamiento
            $query->orderBy($sortBy, $sortOrder);

            // Obtener total de registros para paginación
            $total = $query->count();

            // Si se solicita obtener todos los IDs (para selección global)
            if ($request->has('get_all_ids') && $request->get_all_ids == 1) {
                $allIds = $query->pluck('equipos.id')->toArray();
                return response()->json([
                    'success' => true,
                    'message' => 'IDs de equipos obtenidos exitosamente',
                    'ids' => $allIds,
                    'total' => count($allIds)
                ]);
            }

            // Debug: Log resultados de la consulta
            if ($request->has('consulta_id')) {
                \Log::info('📊 Backend: Resultados de búsqueda por ID', [
                    'consulta_id' => $request->consulta_id,
                    'total_found' => $total,
                    'page' => $page,
                    'per_page' => $perPage
                ]);
            }

            // Aplicar paginación
            $offset = ($page - 1) * $perPage;
            $equipos = $query->skip($offset)->take($perPage)->get();

            // Formatear datos para respuesta
            $formattedEquipos = $equipos->map(function ($equipo) {
                return [
                    'id' => $equipo->id,
                    'tipo_id' => (int) ($equipo->tipo_id ?? 1),
                    'propietario' => $equipo->propietario,
                    'equipo' => [
                        'id' => $equipo->id,
                        'name' => $equipo->name,
                        'code' => $equipo->code,
                        'brand' => $equipo->marca,
                        'model' => $equipo->modelo,
                        'series' => $equipo->serial,
                        'image' => $equipo->image ? url('storage/equipos/images/' . $equipo->image) : null,
                        'hasImage' => !empty($equipo->image),
                        // IDs de documentos asociados para condiciones en frontend
                        'manual_id' => $equipo->manual_id,
                        'guia_id' => $equipo->guia_id,
                        'invima_id' => $equipo->invima_id,
                    ],
                    'data' => [
                        'status' => $equipo->estadoequipo,
                        // Mostrar el registro INVIMA desde la relación invimas
                        'registroSanitario' => $equipo->invima_id && isset($equipo->registro_sanitario_invima) ? $equipo->registro_sanitario_invima : null,
                        'numeroInvima' => null,
                        'fechaVencimientoInvima' => null,
                        'estadoInvima' => null,
                        'archivoInvima' => $equipo->archivo_invima,
                        'clasificacion' => $equipo->clasificacion,
                        'riesgo' => $equipo->riesgo,
                        'archivos' => (int) ($equipo->cuenta_archivos ?? 0),
                        'planesMantenimiento' => (int) ($equipo->cuenta_planes_mantenimientos ?? 0),
                    ],
                    // Nuevos campos agregados directamente al nivel raíz
                    'fecha_ad' => $equipo->fecha_ad,
                    'zona_hospitalaria' => $equipo->zona_hospitalaria,
                    'piso_servicio' => $equipo->piso_servicio,
                    'localizacion_actual' => $equipo->localizacion_actual,
                    'cuenta_calibraciones' => (int) ($equipo->cuenta_calibraciones ?? 0),
                    'cuenta_preventivos' => (int) ($equipo->cuenta_preventivos ?? 0),
                    'cuenta_contingencias' => (int) ($equipo->cuenta_contingencias ?? 0),
                    'contingencias_abiertas' => (int) ($equipo->contingencias_abiertas ?? 0),
                    'orden_compra' => $equipo->orden_compra,
                    'orden_compra_file' => $equipo->orden_compra_file,
                    'tipo_compra' => $equipo->tipo_compra,
                    'ubicacion' => [
                        'servicio' => $equipo->servicios,
                        'area' => $equipo->area,
                        'sede' => $equipo->sede,
                    ],
                    'mantenimiento' => [
                        'ultimoMantenimiento' => $equipo->ultimo_mantenimiento,
                        'ultimoMantenimientoArchivo' => $equipo->ultimo_mantenimiento_file ?? null,
                        'ultimoMantenimientoId' => $equipo->ultimo_mantenimiento_id ?? null,
                        'ultimaCalibración' => $equipo->ultima_calibracion ?? null,
                        'ultimoCorrectivo' => $equipo->ultimo_correctivo ?? null,
                        'ultimoCorrectivoGeneral' => $equipo->ultimo_correctivo_general ?? null,
                        'ultimoProcedimientoCorrectivo' => $equipo->ultimo_procedimiento_correctivo ?? null,
                    ],
                    // Plan de mantenimiento vigente
                    'incluido_en_plan' => (int) ($equipo->incluido_en_plan ?? 0),
                    'frecuencia_plan' => $equipo->frecuencia_plan ?? null,
                    'responsable_plan' => $equipo->responsable_plan ?? null,
                    'mes_programado1' => $equipo->mes_programado1 ?? null,
                    'mes_programado2' => $equipo->mes_programado2 ?? null,
                    'mes_programado3' => $equipo->mes_programado3 ?? null,
                    'anio_vigente' => $equipo->anio_vigente ?? null,
                    'propietario' => [
                        'nombre' => $equipo->propietario,
                        'logo' => $equipo->propietario_logo,
                        'logo_url' => $equipo->propietario_logo ? url('storage/equipos/images/' . $equipo->propietario_logo) : null,
                    ],
                    'compra' => [
                        'orden' => $equipo->orden_compra,
                        'tipo' => $equipo->tipo_compra,
                    ],
                    'observaciones' => [
                        'ultima' => $equipo->ultima_observacion ?? null,
                    ],
                    'tickets' => [
                        'fechaUltimoTicket' => $equipo->fecha_inicio_ultimo_ticket ?? null,
                        'fechaCreacionUltimoTicket' => $equipo->fecha_inicio_ultimo_ticket ?? null,
                        'fechaUltimoCierre' => $equipo->fecha_ultimo_cierre_ticket ?? null,
                        'ultimoTicketCerrado' => (bool) ($equipo->ultimo_ticket_cerrado ?? false),
                    ],
                    // Documentos asociados  
                    'manual' => $equipo->manual_descripcion ? [
                        'id' => $equipo->manual_id,
                        'descripcion' => $equipo->manual_descripcion,
                        'url' => $equipo->manual_url,
                    ] : null,
                    'guia_rapida' => $equipo->guia_name ? [
                        'id' => $equipo->guia_id,
                        'name' => $equipo->guia_name,
                        'file' => $equipo->guia_file,
                    ] : null,
                    'registros_invima' => $equipo->invima_id ? [[
                        'id' => $equipo->invima_id,
                        'numero_registro' => $equipo->invima_numero_registro ?? null,
                        'nombre_equipo' => $equipo->invima_titulo ?? null,
                        'archivo_registro_sanitario' => $equipo->invima_archivo ?? null,
                    ]] : null,
                    // Documento de baja (badge en tabla principal)
                    'archivo_baja' => $equipo->archivo_baja ?? null,
                    // Centro de costo (servicios.centro_id -> centros.code)
                    'centro_costo_id' => $equipo->centro_costo_id ?? null,
                    'centro_costo' => $equipo->centro_costo ?? null,
                    'centro_costo_nombre' => $equipo->centro_costo_nombre ?? null,
                ];
            });

            $responseData = [
                'current_page' => (int) $page,
                'data' => $formattedEquipos,
                'per_page' => (int) $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Equipos médicos obtenidos exitosamente',
                'data' => $responseData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener equipos médicos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener información completa de un equipo específico
     * Incluye todos los campos requeridos según el informe de hoja de vida
     */
    public function getCompleteInfo($id)
    {
        try {
            // Primero obtener el equipo básico
            $equipoBasico = DB::table('equipos')->where('id', $id)->first();

            if (!$equipoBasico) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }

            // Luego hacer joins seguros uno por uno
            $equipo = DB::table('equipos')
                ->select([
                    // Información básica del equipo
                    'equipos.*',

                    // Información de relaciones básicas
                    'servicios.name as servicio_nombre',
                    'areas.name as area_nombre',
                    'estadoequipos.name as estado_nombre',
                    'pro.nombre as propietario_nombre',
                    'pro.logo as propietario_logo',
                    // Centro de costo (servicios.centro_id -> centros)
                    'centros.id as centro_costo_id',
                    'centros.code as centro_costo',
                    'centros.name as centro_costo_nombre',
                    
                    // Plan de mantenimiento del año vigente
                    DB::raw('(SELECT COUNT(*) FROM planes_mantenimientos 
                             WHERE equipo_id = equipos.id 
                             AND anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)) AS incluido_en_plan'),
                    DB::raw('(SELECT fm.name FROM planes_mantenimientos pm
                             LEFT JOIN frecuenciam fm ON fm.id = pm.frecuencia_id
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS frecuencia_plan'),
                    DB::raw('(SELECT pm.mes1 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado1'),
                    DB::raw('(SELECT pm.mes2 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado2'),
                    DB::raw('(SELECT pm.mes3 FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS mes_programado3'),
                    DB::raw('(SELECT pm.responsable FROM planes_mantenimientos pm
                             WHERE pm.equipo_id = equipos.id
                             AND pm.anio = (SELECT anio FROM vigencias_mantenimiento LIMIT 1)
                             LIMIT 1) AS responsable_plan'),
                    DB::raw('(SELECT anio FROM vigencias_mantenimiento LIMIT 1) AS anio_vigente')
                ])
                ->leftJoin('servicios', 'servicios.id', '=', 'equipos.servicio_id')
                ->leftJoin('centros', 'centros.id', '=', 'servicios.centro_id')
                ->leftJoin('areas', 'areas.id', '=', 'equipos.area_id')
                ->leftJoin('estadoequipos', 'estadoequipos.id', '=', 'equipos.estadoequipo_id')
                ->leftJoin('propietarios as pro', 'pro.id', '=', 'equipos.propietario_id')
                ->where('equipos.id', $id)
                ->first();

            if (!$equipo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }

            // Convertir a array para manipulación
            $equipoData = (array) $equipo;

            // Intentar obtener información adicional de forma segura
            try {
                // La sede se guarda directamente en el equipo (equipos.sede_id).
                // Para equipos antiguos sin sede propia, se deriva del servicio (compatibilidad).
                $sedePropiaId = !empty($equipo->sede_id) ? (int) $equipo->sede_id : null;

                if ($sedePropiaId) {
                    $sedeRow = DB::table('sedes')
                        ->where('id', $sedePropiaId)
                        ->select('id as sede_id', 'name as sede_nombre')
                        ->first();
                    $equipoData['sede_id'] = $sedePropiaId;
                    $equipoData['sede_nombre'] = $sedeRow->sede_nombre ?? null;
                } else {
                    $sede = DB::table('sedes')
                        ->join('servicios', 'servicios.sede_id', '=', 'sedes.id')
                        ->where('servicios.id', $equipo->servicio_id)
                        ->select('sedes.id as sede_id', 'sedes.name as sede_nombre')
                        ->first();
                    $equipoData['sede_id'] = $sede->sede_id ?? null;
                    $equipoData['sede_nombre'] = $sede->sede_nombre ?? null;
                }
            } catch (\Exception $e) {
                $equipoData['sede_id'] = null;
                $equipoData['sede_nombre'] = null;
            }

            try {
                $clasificacion = DB::table('cbiomedica')->where('id', $equipo->cbiomedica_id)->first();
                if ($clasificacion) {
                    $equipoData['clasificacion_nombre'] = $clasificacion->name;
                }
            } catch (\Exception $e) {
                $equipoData['clasificacion_nombre'] = null;
            }

            try {
                $riesgo = DB::table('criesgo')->where('id', $equipo->criesgo_id)->first();
                if ($riesgo) {
                    $equipoData['riesgo_nombre'] = $riesgo->name;
                }
            } catch (\Exception $e) {
                $equipoData['riesgo_nombre'] = null;
            }

            try {
                // Query the correct invimas table
                $registroInvima = DB::table('invimas')->where('id', $equipo->invima_id)->first();
                if ($registroInvima) {
                    // Número de registro sanitario (columna `invima` en tabla invimas)
                    $equipoData['invima_numero_registro'] = $registroInvima->invima;
                    $equipoData['registro_sanitario_invima'] = $registroInvima->invima;
                    $equipoData['archivo_registro_sanitario'] = $registroInvima->file;
                    $equipoData['invima_archivo'] = $registroInvima->file;

                    // Si el campo texto `equipos.invima` está vacío, usar el de la tabla invimas
                    if (empty($equipoData['invima'])) {
                        $equipoData['invima'] = $registroInvima->invima;
                    }

                    // Additional INVIMA data for completeness
                    $equipoData['invima_nombre_equipo'] = $registroInvima->titulo;
                    $equipoData['invima_fabricante'] = $registroInvima->marcas;
                    $equipoData['invima_modelo'] = $registroInvima->description;
                    $equipoData['invima_estado'] = 'vigente'; // Por defecto vigente
                    $equipoData['estado_invima'] = 'vigente';

                    \Log::info('INVIMA data retrieved successfully', [
                        'equipo_id' => $equipo->id,
                        'invima_id' => $equipo->invima_id,
                        'numero_registro' => $registroInvima->invima
                    ]);
                } else {
                    \Log::warning('INVIMA record not found', [
                        'equipo_id' => $equipo->id,
                        'invima_id' => $equipo->invima_id
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Error retrieving INVIMA data', [
                    'equipo_id' => $equipo->id,
                    'invima_id' => $equipo->invima_id,
                    'error' => $e->getMessage()
                ]);
                // $equipoData['registro_sanitario'] = null;
                // $equipoData['archivo_registro_sanitario'] = null;
            }

            // Calcular campos derivados básicos
            if ($equipo->fecha_fabricacion) {
                try {
                    $equipoData['edad_equipo'] = \Carbon\Carbon::parse($equipo->fecha_fabricacion)->diffInYears(now());
                } catch (\Exception $e) {
                    $equipoData['edad_equipo'] = null;
                }
            }

            if ($equipo->fecha_mantenimiento) {
                try {
                    $equipoData['dias_desde_ultimo_mantenimiento'] = \Carbon\Carbon::parse($equipo->fecha_mantenimiento)->diffInDays(now());
                } catch (\Exception $e) {
                    $equipoData['dias_desde_ultimo_mantenimiento'] = null;
                }
            }

            // Contar archivos de forma segura
            try {
                $cuentaArchivos = DB::table('equipo_archivo')
                    ->where('equipo_id', $id)
                    ->where('archivo_id', '!=', 9)
                    ->count();
                $equipoData['cuenta_archivos'] = $cuentaArchivos;
            } catch (\Exception $e) {
                $equipoData['cuenta_archivos'] = 0;
            }

            // Agregar URLs de archivos si existen
            if ($equipo->image) {
                $equipoData['image_url'] = url('storage/equipos/images/' . $equipo->image);
            }

            if ($equipo->file) {
                $equipoData['file_url'] = url('storage/' . $equipo->file);
            }

            // ===== OBTENER DATOS RELACIONADOS PARA PDF =====

            // 1. Mantenimientos Preventivos (últimos 10)
            try {
                $mantenimientos = DB::table('mantenimiento')
                    ->leftJoin('proveedores_mantenimiento', 'mantenimiento.proveedor_mantenimiento_id', '=', 'proveedores_mantenimiento.id')
                    ->where('mantenimiento.equipo_id', $id)
                    ->select(
                        'mantenimiento.id',
                        'mantenimiento.description',
                        'mantenimiento.created_at',
                        'mantenimiento.status',
                        'mantenimiento.equipo_id',
                        'mantenimiento.file',
                        'mantenimiento.fecha_mantenimiento',
                        'mantenimiento.fecha_programada',
                        'mantenimiento.repuesto_pendiente',
                        'mantenimiento.repuesto_id',
                        'mantenimiento.observacion',
                        'mantenimiento.proveedor_mantenimiento_id',
                        'proveedores_mantenimiento.name as tecnico_nombre'
                    )
                    ->orderBy('mantenimiento.fecha_mantenimiento', 'desc')
                    ->get();
                $equipoData['mantenimientos_preventivos'] = $mantenimientos;
            } catch (\Exception $e) {
                Log::warning('Error obteniendo mantenimientos preventivos: ' . $e->getMessage());
                $equipoData['mantenimientos_preventivos'] = [];
            }

            // 2. Contingencias/Mantenimientos Correctivos (todos)
            try {
                $contingencias = DB::table('contingencias')
                    ->leftJoin('usuarios', 'contingencias.usuario_id', '=', 'usuarios.id')
                    ->where('contingencias.equipo_id', $id)
                    ->select(
                        'contingencias.*',
                        'contingencias.fecha as fecha_reporte',
                        'contingencias.observacion as descripcion_problema', 
                        'contingencias.observacion as solucion_aplicada',
                        'usuarios.nombre as usuario_nombre',
                        'usuarios.apellido as usuario_apellido'
                    )
                    ->orderBy('contingencias.fecha', 'desc')
                    ->get();
                $equipoData['contingencias'] = $contingencias;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo contingencias: ' . $e->getMessage());
                $equipoData['contingencias'] = [];
            }

            // 3. Calibraciones
            // Industrial: combina ambas tablas (calibracion_ind + calibracion), por si hay
            // registros mezclados asociados al equipo industrial.
            // Biomédico: solo calibracion.
            try {
                if ($equipoBasico->tipo_id == 2) {
                    $calibracionesInd = DB::table('calibracion_ind')
                        ->where('equipo_id', $id)
                        ->where('status', 1)
                        ->get()
                        ->map(function ($row) {
                            $row->origen_tabla = 'calibracion_ind';
                            $row->tipo_calibracion = $row->description ?? null;
                            $row->proxima_calibracion = $row->fecha_programada ?? null;
                            $row->resultado = 'Conforme';
                            return $row;
                        });

                    $calibracionesBio = DB::table('calibracion')
                        ->where('equipo_id', $id)
                        ->where('status', 1)
                        ->get()
                        ->map(function ($row) {
                            $row->origen_tabla = 'calibracion';
                            $row->tipo_calibracion = $row->description ?? null;
                            $row->proxima_calibracion = $row->fecha_programada ?? null;
                            $row->resultado = 'Conforme';
                            return $row;
                        });

                    $calibraciones = $calibracionesInd
                        ->concat($calibracionesBio)
                        ->sortByDesc(function ($row) {
                            return $row->fecha_calibracion ?? '';
                        })
                        ->values();
                    $equipoData['calibraciones'] = $calibraciones;
                } else {
                    $calibraciones = DB::table('calibracion')
                        ->where('equipo_id', $id)
                        ->where('status', 1)
                        ->select(
                            'calibracion.*',
                            'calibracion.fecha_calibracion',
                            'calibracion.fecha_programada as proxima_calibracion',
                            'calibracion.description as tipo_calibracion',
                            DB::raw("'Conforme' as resultado"),
                            DB::raw("'calibracion' as origen_tabla")
                        )
                        ->orderBy('fecha_calibracion', 'desc')
                        ->get();
                    $equipoData['calibraciones'] = $calibraciones;
                }
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo calibraciones: ' . $e->getMessage());
                $equipoData['calibraciones'] = [];
            }

            // 4. Documentos Asociados (todos)
            try {
                $documentos = DB::table('archivos')
                    ->leftJoin('equipo_archivo', 'archivos.id', '=', 'equipo_archivo.archivo_id')
                    ->where('equipo_archivo.equipo_id', $id)
                    ->select(
                        'archivos.*',
                        'archivos.name as nombre_archivo',
                        'archivos.name as tipo_documento',
                        'equipo_archivo.otro as tipo_personalizado',
                        'equipo_archivo.created_at as fecha_subida',
                        'equipo_archivo.vinculo',
                        'equipo_archivo.created_at'
                    )
                    ->orderBy('equipo_archivo.created_at', 'desc')
                    ->get();
                $equipoData['documentos'] = $documentos;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo documentos: ' . $e->getMessage());
                $equipoData['documentos'] = [];
            }

            // 5. Repuestos/Accesorios
            try {
                $repuestos = DB::table('equipo_repuestos')
                    ->leftJoin('repuestos', 'equipo_repuestos.repuesto_id', '=', 'repuestos.id')
                    ->where('equipo_repuestos.equipo_id', $id)
                    ->select(
                        'equipo_repuestos.*',
                        'repuestos.name as repuesto_name'
                    )
                    ->orderBy('equipo_repuestos.fecha', 'desc')
                    ->limit(50)
                    ->get();
                $equipoData['repuestos'] = $repuestos;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo repuestos: ' . $e->getMessage());
                $equipoData['repuestos'] = [];
            }

            // 6. Contactos Técnicos (todos)
            try {
                $contactos = DB::table('contacto')
                    ->leftJoin('equipo_contacto', 'contacto.id', '=', 'equipo_contacto.contacto_id')
                    ->where('equipo_contacto.equipo_id', $id)
                    ->where('equipo_contacto.status', 1)
                    ->select('contacto.*')
                    ->orderBy('contacto.nombre')
                    ->get();
                $equipoData['contactos_tecnicos'] = $contactos;
            } catch (\Exception $e) {
                $equipoData['contactos_tecnicos'] = [];
            }

            // 7. Observaciones del Equipo (todas)
            try {
                $observaciones = DB::table('observaciones')
                    ->leftJoin('usuarios', 'observaciones.usuario_id', '=', 'usuarios.id')
                    ->where('observaciones.equipo_id', $id)
                    ->select(
                        'observaciones.id',
                        'observaciones.description',
                        'observaciones.created_at',
                        'observaciones.equipo_id',
                        'observaciones.file',
                        'observaciones.usuario_id',
                        'observaciones.repuesto_id',
                        'observaciones.repuesto_pendiente',
                        'observaciones.preventivo_id',
                        'observaciones.fecha_nota',
                        'usuarios.nombre as usuario_nombre',
                        'usuarios.apellido as usuario_apellido',
                        DB::raw("CONCAT(usuarios.nombre, ' ', COALESCE(usuarios.apellido, '')) as usuario_nombre_completo")
                    )
                    ->orderBy('observaciones.created_at', 'desc')
                    ->get();
                $equipoData['observaciones'] = $observaciones;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo observaciones: ' . $e->getMessage());
                $equipoData['observaciones'] = [];
            }

            // 8. Capacitaciones (documentos de tipo capacitacion en equipo_archivo)
            try {
                $capacitaciones = DB::table('equipo_archivo')
                    ->join('archivos', 'equipo_archivo.archivo_id', '=', 'archivos.id')
                    ->where('equipo_archivo.equipo_id', $id)
                    ->where('archivos.name', 'Capacitación')
                    ->select([
                        'equipo_archivo.id',
                        'equipo_archivo.vinculo as archivo',
                        'equipo_archivo.created_at as fecha_subida',
                        'equipo_archivo.otro as descripcion',
                        'archivos.name as tipo_documento',
                        'archivos.id as archivo_id'
                    ])
                    ->orderBy('equipo_archivo.created_at', 'desc')
                    ->get()
                    ->map(function ($doc) {
                        $doc->url_acceso = url('storage/equipos/archivos/' . $doc->archivo);
                        return $doc;
                    });
                $equipoData['capacitaciones'] = $capacitaciones;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo capacitaciones: ' . $e->getMessage());
                $equipoData['capacitaciones'] = [];
            }

            // 9. Movimientos (cambios de ubicacion)
            try {
                // Primero verificar si hay registros
                $countMovimientos = DB::table('cambios_ubicaciones')
                    ->where('equipo_id', $id)
                    ->count();
                
                \Log::info("Movimientos para equipo {$id}: {$countMovimientos} registros encontrados");
                
                $movimientos = DB::table('cambios_ubicaciones')
                    ->leftJoin('servicios as servicios_origen', 'cambios_ubicaciones.servicio_origen_id', '=', 'servicios_origen.id')
                    ->leftJoin('servicios as servicios_destino', 'cambios_ubicaciones.servicio_destino_id', '=', 'servicios_destino.id')
                    ->leftJoin('areas as areas_origen', 'cambios_ubicaciones.area_origen_id', '=', 'areas_origen.id')
                    ->leftJoin('areas as areas_destino', 'cambios_ubicaciones.area_destino_id', '=', 'areas_destino.id')
                    ->leftJoin('sedes as sedes_origen', 'cambios_ubicaciones.sede_origen_id', '=', 'sedes_origen.id')
                    ->leftJoin('sedes as sedes_destino', 'cambios_ubicaciones.sede_destino_id', '=', 'sedes_destino.id')
                    ->leftJoin('usuarios', 'cambios_ubicaciones.usuario_id', '=', 'usuarios.id')
                    ->where('cambios_ubicaciones.equipo_id', $id)
                    ->select([
                        'cambios_ubicaciones.id',
                        'cambios_ubicaciones.equipo_id',
                        'cambios_ubicaciones.servicio_origen_id',
                        'cambios_ubicaciones.servicio_destino_id',
                        'cambios_ubicaciones.area_origen_id',
                        'cambios_ubicaciones.area_destino_id',
                        'cambios_ubicaciones.sede_origen_id',
                        'cambios_ubicaciones.sede_destino_id',
                        'cambios_ubicaciones.usuario_id',
                        'cambios_ubicaciones.created_at as fecha',
                        'servicios_origen.name as servicio_origen_nombre',
                        'servicios_destino.name as servicio_destino_nombre',
                        'areas_origen.name as area_origen_nombre',
                        'areas_destino.name as area_destino_nombre',
                        'sedes_origen.name as sede_origen_nombre',
                        'sedes_destino.name as sede_destino_nombre',
                        'usuarios.nombre as usuario_nombre',
                        'usuarios.apellido as usuario_apellido',
                        'usuarios.username as usuario_username',
                        DB::raw("CONCAT(COALESCE(usuarios.nombre, ''), ' ', COALESCE(usuarios.apellido, '')) as responsable_nombre")
                    ])
                    ->orderBy('cambios_ubicaciones.created_at', 'desc')
                    ->get();
                
                \Log::info("Movimientos obtenidos: " . $movimientos->count());
                $equipoData['movimientos'] = $movimientos;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo movimientos: ' . $e->getMessage());
                $equipoData['movimientos'] = [];
            }

            // 10. Correctivos Generales
            try {
                $esIndustrial = (isset($equipoBasico->tipo_id) && $equipoBasico->tipo_id == 2);

                if ($esIndustrial) {
                    // Industrial: leer de correctivos_generales_ind
                    $correctivos = DB::table('correctivos_generales_ind')
                        ->where('equipo_id', $id)
                        ->where('status', 1)
                        ->orderBy('fecha_mantenimiento', 'desc')
                        ->limit(50)
                        ->get();

                    $corIds = $correctivos->pluck('id')->toArray();
                    $archivosPorCorrectivo = !empty($corIds)
                        ? DB::table('correctivos_generales_archivos_ind')
                            ->whereIn('correctivo_general_id', $corIds)
                            ->orderBy('created_at', 'desc')
                            ->get()
                            ->groupBy('correctivo_general_id')
                        : collect();
                    $correctivos = $correctivos->map(function ($c) use ($archivosPorCorrectivo) {
                        $c->archivos = $archivosPorCorrectivo->get($c->id, collect())->values();
                        return $c;
                    });
                } else {
                    // Biomédico: leer de correctivos_generales con joins
                    $correctivos = DB::table('correctivos_generales')
                        ->leftJoin('codificacion_cierres', 'codificacion_cierres.id', '=', 'correctivos_generales.cierre_id')
                        ->where('correctivos_generales.equipo_id', $id)
                        ->select([
                            'correctivos_generales.*',
                            'codificacion_cierres.name as descripcion_codigo',
                            'codificacion_cierres.code as codigo_cierre',
                            DB::raw('(SELECT COUNT(*) FROM avances_correctivos WHERE correctivo_general_id = correctivos_generales.id) AS conteo_avances')
                        ])
                        ->orderBy('correctivos_generales.fecha_inicio', 'desc')
                        ->get();

                    $corIds = $correctivos->pluck('id')->toArray();
                    $archivosPorCorrectivo = !empty($corIds)
                        ? DB::table('correctivos_generales_archivos')
                            ->whereIn('correctivo_general_id', $corIds)
                            ->orderBy('created_at', 'desc')
                            ->get()
                            ->groupBy('correctivo_general_id')
                        : collect();
                    $correctivos = $correctivos->map(function ($c) use ($archivosPorCorrectivo) {
                        $c->archivos = $archivosPorCorrectivo->get($c->id, collect())->values();
                        return $c;
                    });
                }

                $equipoData['correctivos_generales'] = $correctivos;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo correctivos generales: ' . $e->getMessage());
                $equipoData['correctivos_generales'] = [];
            }

            // 11. Especificaciones del Equipo
            try {
                $especificaciones = DB::table('equipo_especificacion as ee')
                    ->join('especificacion as e', 'ee.especificacion_id', '=', 'e.id')
                    ->where('ee.equipo_id', $id)
                    ->where('ee.status', 1)
                    ->select('ee.*', 'e.name as especificacion_nombre')
                    ->orderBy('ee.created_at', 'desc')
                    ->get();
                $equipoData['especificaciones'] = $especificaciones;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo especificaciones: ' . $e->getMessage());
                $equipoData['especificaciones'] = [];
            }

            // 11b. Mapear especificaciones clave a los campos fijos de la hoja de vida
            // (Potencia, Corriente, Voltaje). Así, al agregar/editar esas especificaciones
            // en el modal de editar, se reflejan en "Características Técnicas y Especificaciones".
            // Se mapea por NOMBRE del catálogo (robusto ante distintos IDs entre entornos):
            //   "RANGO DE POTENCIA [W]"  -> potencia
            //   "RANGO DE CORRIENTE [A]" -> corriente
            //   "RANGO DE TENSIÓN [V]"   -> voltaje
            $equipoData['potencia'] = $equipoData['potencia'] ?? null;
            $equipoData['corriente'] = $equipoData['corriente'] ?? null;
            $equipoData['voltaje'] = $equipoData['voltaje'] ?? null;
            foreach (($equipoData['especificaciones'] ?? []) as $espec) {
                $valor = $espec->valor ?? null;
                if ($valor === null || trim((string) $valor) === '') continue;
                $nombre = strtoupper(strtr((string) ($espec->especificacion_nombre ?? ''), [
                    'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U'
                ]));
                if (str_contains($nombre, 'POTENCIA') && empty($equipoData['potencia'])) {
                    $equipoData['potencia'] = $valor;
                } elseif (str_contains($nombre, 'CORRIENTE') && empty($equipoData['corriente'])) {
                    $equipoData['corriente'] = $valor;
                } elseif (str_contains($nombre, 'TENSION') && empty($equipoData['voltaje'])) {
                    $equipoData['voltaje'] = $valor;
                }
            }
            // Respaldo de Voltaje: columna v1 (equipos biomédicos) si no hay especificación de tensión
            if (empty($equipoData['voltaje']) && !empty($equipoData['v1'])) {
                $equipoData['voltaje'] = $equipoData['v1'];
            }

            // 12. Historial de Usuario (observaciones + documentos + mantenimientos)
            try {
                $userHistory = [];

                // Observaciones
                $observaciones = DB::table('observaciones as o')
                    ->leftJoin('usuarios as u', 'o.usuario_id', '=', 'u.id')
                    ->where('o.equipo_id', $id)
                    ->select([
                        'o.id',
                        'o.description as detalle',
                        'o.created_at as fecha',
                        'u.nombre as usuario',
                        DB::raw("'observacion' as tipo"),
                        DB::raw("'Agregó observación' as accion")
                    ])
                    ->get();

                foreach ($observaciones as $obs) {
                    $userHistory[] = [
                        'id' => 'obs_' . $obs->id,
                        'usuario' => $obs->usuario ?? 'Usuario desconocido',
                        'accion' => $obs->accion,
                        'detalle' => $obs->detalle ?? 'Sin detalle',
                        'fecha' => $obs->fecha,
                        'tipo' => $obs->tipo
                    ];
                }

                // Documentos
                $documentos = DB::table('equipo_archivo as ea')
                    ->leftJoin('archivos as a', 'ea.archivo_id', '=', 'a.id')
                    ->where('ea.equipo_id', $id)
                    ->select([
                        'ea.id',
                        'a.name as detalle',
                        'ea.created_at as fecha',
                        DB::raw("'Sistema' as usuario"),
                        DB::raw("'documento' as tipo"),
                        DB::raw("'Archivo vinculado' as accion")
                    ])
                    ->get();

                foreach ($documentos as $doc) {
                    $userHistory[] = [
                        'id' => 'doc_' . $doc->id,
                        'usuario' => $doc->usuario ?? 'Usuario desconocido',
                        'accion' => $doc->accion,
                        'detalle' => $doc->detalle ?? 'Documento sin nombre',
                        'fecha' => $doc->fecha,
                        'tipo' => $doc->tipo
                    ];
                }

                // Mantenimientos
                $mantenimientosUsuario = DB::table('mantenimiento as m')
                    ->where('m.equipo_id', $id)
                    ->select([
                        'm.id',
                        'm.description as detalle',
                        'm.created_at as fecha',
                        DB::raw("'Sistema' as usuario"),
                        DB::raw("'mantenimiento' as tipo"),
                        DB::raw("'Mantenimiento registrado' as accion")
                    ])
                    ->get();

                foreach ($mantenimientosUsuario as $mant) {
                    $userHistory[] = [
                        'id' => 'mant_' . $mant->id,
                        'usuario' => $mant->usuario ?? 'Usuario desconocido',
                        'accion' => $mant->accion,
                        'detalle' => $mant->detalle ?? 'Mantenimiento registrado',
                        'fecha' => $mant->fecha,
                        'tipo' => $mant->tipo
                    ];
                }

                // Ordenar por fecha descendente
                usort($userHistory, function($a, $b) {
                    return strtotime($b['fecha']) - strtotime($a['fecha']);
                });

                // Limitar a 50
                $equipoData['user_history'] = array_slice($userHistory, 0, 50);
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo user history: ' . $e->getMessage());
                $equipoData['user_history'] = [];
            }

            // 13. Tickets/Órdenes del equipo: se envían todos (la hoja de vida los despliega);
            // el tope alto es solo una salvaguarda, hoy ningún equipo pasa de 30.
            try {
                $tickets = DB::table('ordenes')
                    ->leftJoin('subprocesos', 'ordenes.subproceso_id', '=', 'subprocesos.id')
                    ->leftJoin('usuarios as reportante', 'ordenes.reportante_id', '=', 'reportante.id')
                    ->leftJoin('usuarios as asignado', 'ordenes.asignado_id', '=', 'asignado.id')
                    ->leftJoin('servicios', 'ordenes.servicio_id', '=', 'servicios.id')
                    ->leftJoin('areas', 'ordenes.area_id', '=', 'areas.id')
                    ->leftJoin('sedes', 'servicios.sede_id', '=', 'sedes.id')
                    ->where('ordenes.equipo_id', $id)
                    ->select([
                        'ordenes.id',
                        'ordenes.asunto',
                        'ordenes.descripcion',
                        'ordenes.fecha_inicio',
                        'ordenes.fecha_fin',
                        'ordenes.estado_id',
                        'ordenes.prioridad',
                        'ordenes.diagnostico',
                        'ordenes.reparacion',
                        'ordenes.image',
                        // Un ticket puede traer evidencia, soporte del diagnóstico y orden de cierre:
                        // sin estas dos la hoja de vida mostraba «Sin archivo» aunque el archivo existiera.
                        'ordenes.file_diagnostico',
                        'ordenes.file_cierre',
                        'subprocesos.nombre as origen',
                        'reportante.nombre as reportante_nombre',
                        'reportante.apellido as reportante_apellido',
                        'asignado.nombre as asignado_nombre',
                        'asignado.apellido as asignado_apellido',
                        'servicios.name as servicio_nombre',
                        'areas.name as area_nombre',
                        'sedes.name as sede_nombre'
                    ])
                    ->orderBy('ordenes.fecha_inicio', 'desc')
                    ->limit(300)
                    ->get();

                // Mapear estado_id a texto (mismos valores que /v1/gestion-tickets)
                $estadoMap = [
                    1 => 'Abierto',
                    2 => 'Asignado',
                    3 => 'Diagnosticado',
                    4 => 'Cerrado',
                    5 => 'Esperando cierre',
                ];
                $tickets = $tickets->map(function ($t) use ($estadoMap) {
                    $t->estado = $estadoMap[$t->estado_id] ?? 'Sin estado';
                    $t->estado_nombre = $t->estado;
                    return $t;
                });

                $equipoData['tickets'] = $tickets;
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo tickets: ' . $e->getMessage());
                $equipoData['tickets'] = [];
            }

            // 14. Cambios de Hoja de Vida (incluye los traslados de servicio, área y sede)
            try {
                $equipoData['cambios_hdv'] = $this->historialDeCambios($id);
            } catch (\Exception $e) {
                \Log::warning('Error obteniendo cambios HDV: ' . $e->getMessage());
                $equipoData['cambios_hdv'] = [];
            }

            return response()->json([
                'success' => true,
                'message' => 'Información completa del equipo obtenida exitosamente',
                'data' => $equipoData
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getCompleteInfo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener información completa del equipo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener historial de actividad de usuarios para un equipo específico
     * Incluye observaciones y documentos agregados por usuarios
     */
    public function getUserHistory($id)
    {
        try {
            // Verificar que el equipo existe
            $equipo = DB::table('equipos')->where('id', $id)->first();
            
            if (!$equipo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }

            $userHistory = [];

            // 1. Obtener historial de observaciones (CORREGIDO: columna se llama 'description')
            $observaciones = DB::table('observaciones as o')
                ->leftJoin('usuarios as u', 'o.usuario_id', '=', 'u.id')
                ->where('o.equipo_id', $id)
                ->select([
                    'o.id',
                    'o.description as detalle', // CORREGIDO: usar 'description' en lugar de 'observacion'
                    'o.created_at as fecha',
                    'u.nombre as usuario',
                    DB::raw("'observacion' as tipo"),
                    DB::raw("'Agregó observación' as accion")
                ])
                ->get();

            foreach ($observaciones as $obs) {
                $userHistory[] = [
                    'id' => 'obs_' . $obs->id,
                    'usuario' => $obs->usuario ?? 'Usuario desconocido',
                    'accion' => $obs->accion,
                    'detalle' => $obs->detalle ?? 'Sin detalle',
                    'fecha' => $obs->fecha,
                    'tipo' => $obs->tipo
                ];
            }

            // 2. Obtener historial de documentos/archivos (CORREGIDO: equipo_archivo NO tiene usuario_id)
            $documentos = DB::table('equipo_archivo as ea')
                ->leftJoin('archivos as a', 'ea.archivo_id', '=', 'a.id')
                ->where('ea.equipo_id', $id)
                ->select([
                    'ea.id',
                    'a.name as detalle', // Usar name de tabla archivos
                    'ea.created_at as fecha',
                    DB::raw("'Sistema' as usuario"), // No hay usuario_id en equipo_archivo
                    DB::raw("'documento' as tipo"),
                    DB::raw("'Archivo vinculado' as accion")
                ])
                ->get();

            foreach ($documentos as $doc) {
                $userHistory[] = [
                    'id' => 'doc_' . $doc->id,
                    'usuario' => $doc->usuario ?? 'Usuario desconocido',
                    'accion' => $doc->accion,
                    'detalle' => $doc->detalle ?? 'Documento sin nombre',
                    'fecha' => $doc->fecha,
                    'tipo' => $doc->tipo
                ];
            }

            // 3. Obtener historial de mantenimientos (CORREGIDO: columna es 'description', sin usuario_id)
            $mantenimientos = DB::table('mantenimiento as m')
                ->where('m.equipo_id', $id)
                ->select([
                    'm.id',
                    'm.description as detalle', // CORREGIDO: usar 'description' no 'descripcion'
                    'm.created_at as fecha',
                    DB::raw("'Sistema' as usuario"), // No hay usuario_id en mantenimiento
                    DB::raw("'mantenimiento' as tipo"),
                    DB::raw("'Mantenimiento registrado' as accion")
                ])
                ->get();

            foreach ($mantenimientos as $mant) {
                $userHistory[] = [
                    'id' => 'mant_' . $mant->id,
                    'usuario' => $mant->usuario ?? 'Usuario desconocido',
                    'accion' => $mant->accion,
                    'detalle' => $mant->detalle ?? 'Mantenimiento registrado',
                    'fecha' => $mant->fecha,
                    'tipo' => $mant->tipo
                ];
            }

            // Ordenar por fecha descendente (más reciente primero)
            usort($userHistory, function($a, $b) {
                return strtotime($b['fecha']) - strtotime($a['fecha']);
            });

            // Limitar a los últimos 50 registros
            $userHistory = array_slice($userHistory, 0, 50);

            return response()->json([
                'success' => true,
                'data' => $userHistory,
                'message' => 'Historial de usuarios obtenido exitosamente',
                'total' => count($userHistory)
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getUserHistory: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener historial de usuarios: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Obtener opciones para filtros
     */
    public function getFilterOptions()
    {
        try {
            // Helper function to safely query tables with optional status column and default fallback
            $safeQuery = function($table, $select = ['id', 'name'], $orderBy = 'name', $defaultOption = null) {
                try {
                    $query = DB::table($table)->select($select);

                    // Check if status column exists
                    $columns = DB::getSchemaBuilder()->getColumnListing($table);
                    if (in_array('status', $columns)) {
                        $query->where('status', 1);
                    }

                    $results = $query->orderBy($orderBy)->get();

                    // Si no hay resultados y se especifica una opción por defecto, agregarla
                    if ($results->isEmpty() && $defaultOption) {
                        $results = collect([$defaultOption]);
                    }

                    return $results;
                } catch (\Exception $e) {
                    // Si la tabla no existe o hay problemas, devolver opción por defecto si se especifica
                    if ($defaultOption) {
                        return collect([$defaultOption]);
                    }
                    return collect([]);
                }
            };

            $options = [
                // Ubicación geográfica con relaciones
                'sedes' => $safeQuery('sedes'),
                'servicios' => $safeQuery('servicios', ['id', 'name', 'sede_id', 'centro_id']),
                'areas' => $safeQuery('areas', ['id', 'name', 'servicio_id']),
                'centros' => $safeQuery('centros', ['id', 'name', 'code'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar centros de costo']),

                // Estados y clasificaciones
                'estados' => $this->getEstadosEquipoWithDefault(),
                'funcionalidades' => DB::table('estadoequipos')
                    ->where('tipoestado_id', 1)
                    ->where('status', 1)
                    ->get(['id', 'name']),
                'clasificaciones' => $safeQuery('cbiomedica', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar clasificaciones biomédicas']),
                'riesgos' => $safeQuery('criesgo', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar clasificaciones de riesgo']),
                'propietarios' => $safeQuery('propietarios', ['id', 'nombre as name'], 'nombre',
                    ['id' => 0, 'name' => 'No disponible - Configurar propietarios']),
                'tipos_equipos' => $safeQuery('tipos', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar tipos de equipos']),

                // Proveedores y tecnología
                'proveedores' => $safeQuery('proveedores', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar proveedores']),
                'tecnologias' => $safeQuery('tecnologiap', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar tecnologías']),
                'fuentes' => $safeQuery('fuenteal', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar fuentes de alimentación']),
                'frecuencias' => $safeQuery('frecuenciam', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar frecuencias de mantenimiento']),

                // Tipos de adquisición
                'tipos_adquisicion' => $safeQuery('tadquisicion', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar tipos de adquisición']),

                // Estados de mantenimiento (valores fijos según el informe)
                'estados_mantenimiento' => collect([
                    ['id' => 1, 'name' => 'Pendiente'],
                    ['id' => 2, 'name' => 'Realizado'],
                    ['id' => 3, 'name' => 'Atrasado'],
                    ['id' => 4, 'name' => 'No definido'],
                    ['id' => 5, 'name' => 'Frecuencia no definida'],
                    ['id' => 6, 'name' => 'Programado']
                ]),

                // Disponibilidad y documentación
                'disponibilidades' => $safeQuery('disponibilidades', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar disponibilidades']),
                'guias' => $safeQuery('guias', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar guías']),
                'manuales' => $safeQuery('manuales', ['id', 'name'], 'name',
                    ['id' => 0, 'name' => 'No disponible - Configurar manuales']),

                // Años disponibles para filtros temporales
                'years' => collect(range(date('Y') - 10, date('Y') + 2))->map(function($year) {
                    return ['id' => $year, 'name' => $year];
                }),

                // Períodos de garantía
                'periodos_garantias' => $safeQuery('periodos_garantias', ['id', 'name'], 'id',
                    ['id' => 0, 'name' => 'No disponible'])
            ];

            return response()->json([
                'success' => true,
                'message' => 'Opciones de filtros obtenidas exitosamente',
                'data' => $options
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener opciones de filtros: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas específicas para equipos médicos
     */
    public function getMedicalDevicesStats()
    {
        try {
            $stats = [
                'total_equipos' => DB::table('equipos')->where('tipo_id', 1)->where('status', '!=', 0)->count(),
                'operativos' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 1)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'Operativo')
                    ->count(),
                'en_mantenimiento' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 1)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'En Mantenimiento')
                    ->count(),
                'fuera_servicio' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 1)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'Fuera de Servicio')
                    ->count(),
                'mantenimientos_mes' => DB::table('mantenimiento')
                    ->whereMonth('fecha_mantenimiento', now()->month)
                    ->whereYear('fecha_mantenimiento', now()->year)
                    ->count(),
                'calibraciones_mes' => DB::table('calibracion')
                    ->whereMonth('fecha_calibracion', now()->month)
                    ->whereYear('fecha_calibracion', now()->year)
                    ->count(),
                'por_clasificacion' => DB::table('equipos')
                    ->join('cbiomedica', 'equipos.cbiomedica_id', '=', 'cbiomedica.id')
                    ->where('equipos.tipo_id', 1)
                    ->where('equipos.status', '!=', 0)
                    ->groupBy('cbiomedica.name')
                    ->select('cbiomedica.name', DB::raw('count(*) as total'))
                    ->get(),
                'por_riesgo' => DB::table('equipos')
                    ->join('criesgo', 'equipos.criesgo_id', '=', 'criesgo.id')
                    ->where('equipos.tipo_id', 1)
                    ->where('equipos.status', '!=', 0)
                    ->groupBy('criesgo.name')
                    ->select('criesgo.name', DB::raw('count(*) as total'))
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de equipos médicos obtenidas exitosamente',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas específicas para equipos industriales
     */
    public function getIndustrialDevicesStats()
    {
        try {
            $stats = [
                'total_equipos' => DB::table('equipos')->where('tipo_id', 2)->where('status', '!=', 0)->count(),
                'operativos' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 2)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'Operativo')
                    ->count(),
                'en_mantenimiento' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 2)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'En Mantenimiento')
                    ->count(),
                'fuera_servicio' => DB::table('equipos')
                    ->join('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                    ->where('equipos.tipo_id', 2)
                    ->where('equipos.status', '!=', 0)
                    ->where('estadoequipos.name', 'Fuera de Servicio')
                    ->count(),
                'mantenimientos_mes' => DB::table('mantenimiento')
                    ->join('equipos', 'mantenimiento.equipo_id', '=', 'equipos.id')
                    ->where('equipos.tipo_id', 2)
                    ->whereMonth('mantenimiento.fecha_mantenimiento', now()->month)
                    ->whereYear('mantenimiento.fecha_mantenimiento', now()->year)
                    ->count(),
                'calibraciones_mes' => DB::table('calibracion')
                    ->join('equipos', 'calibracion.equipo_id', '=', 'equipos.id')
                    ->where('equipos.tipo_id', 2)
                    ->whereMonth('calibracion.fecha_calibracion', now()->month)
                    ->whereYear('calibracion.fecha_calibracion', now()->year)
                    ->count(),
                'por_clasificacion' => DB::table('equipos')
                    ->join('cbiomedica', 'equipos.cbiomedica_id', '=', 'cbiomedica.id')
                    ->where('equipos.tipo_id', 2)
                    ->where('equipos.status', '!=', 0)
                    ->groupBy('cbiomedica.name')
                    ->select('cbiomedica.name', DB::raw('count(*) as total'))
                    ->get(),
                'por_riesgo' => DB::table('equipos')
                    ->join('criesgo', 'equipos.criesgo_id', '=', 'criesgo.id')
                    ->where('equipos.tipo_id', 2)
                    ->where('equipos.status', '!=', 0)
                    ->groupBy('criesgo.name')
                    ->select('criesgo.name', DB::raw('count(*) as total'))
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Estadísticas de equipos industriales obtenidas exitosamente',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas de equipos industriales: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exportar equipos filtrados a Excel con 54 columnas completas
     */
    public function exportFilteredEquipment(Request $request)
    {
        // Aumentar límites para grandes exportaciones
        set_time_limit(300); // 5 minutos
        ini_set('memory_limit', '512M');

        try {
            // Query con TODOS los JOINs necesarios para las 54 columnas
            $query = DB::table('equipos')
                ->select([
                    // Información básica (8 columnas)
                    'equipos.id',
                    'equipos.name',
                    'equipos.descripcion',
                    'equipos.marca',
                    'equipos.modelo',
                    'equipos.serial',
                    'equipos.code',
                    'equipos.codigo_antiguo',
                    
                    // Información regulatoria
                    'estadoequipos.name as estado_equipo',
                    
                    // Fechas importantes (3 columnas)
                    'equipos.fecha_ad',
                    'equipos.fecha_instalacion',
                    DB::raw("(SELECT b.fecha_baja FROM equipos_bajas eb LEFT JOIN bajas b ON eb.baja_id = b.id WHERE eb.equipo_id = equipos.id ORDER BY b.fecha_baja DESC LIMIT 1) as fecha_baja"),
                    
                    // Ubicación (4 columnas)
                    'servicios.name as servicio',
                    'areas.name as area',
                    DB::raw('COALESCE(sedes_equipo.name, sedes.name) as sede'),
                    'equipos.localizacion_actual',
                    
                    // Mantenimiento (9 columnas)
                    DB::raw("(SELECT MAX(fecha_mantenimiento) FROM mantenimiento WHERE equipo_id = equipos.id) as ultimo_mantenimiento"),
                    'frecuenciam.name as frecuencia',
                    DB::raw("(SELECT frecuencia_id FROM planes_mantenimientos WHERE equipo_id = equipos.id ORDER BY anio DESC LIMIT 1) as frecuencia_utilizada"),
                    DB::raw("(SELECT MAX(anio) FROM planes_mantenimientos WHERE equipo_id = equipos.id) as ultimo_anio_programado"),
                    DB::raw("(SELECT pm.name FROM mantenimiento m LEFT JOIN proveedores_mantenimiento pm ON m.proveedor_mantenimiento_id = pm.id WHERE m.equipo_id = equipos.id ORDER BY m.fecha_mantenimiento DESC LIMIT 1) as proveedor_mantenimiento"),
                    DB::raw("(SELECT COUNT(*) FROM mantenimiento WHERE equipo_id = equipos.id) as cuenta_preventivos"),
                    'equipos.estado_mantenimiento as estadom',
                    DB::raw("(SELECT responsable FROM planes_mantenimientos WHERE equipo_id = equipos.id ORDER BY anio DESC LIMIT 1) as responsable_mantenimiento"),
                    DB::raw("(SELECT f.name FROM planes_mantenimientos pm LEFT JOIN frecuenciam f ON pm.frecuencia_id = f.id WHERE pm.equipo_id = equipos.id ORDER BY pm.anio DESC LIMIT 1) as frecuencia_mantenimiento"),
                    
                    // Calibración (2 columnas)
                    DB::raw("(SELECT MAX(fecha_calibracion) FROM calibracion WHERE equipo_id = equipos.id) as ultima_calibracion"),
                    DB::raw("(SELECT COUNT(*) FROM calibracion WHERE equipo_id = equipos.id) as cuenta_calibraciones"),
                    
                    // Información financiera (4 columnas)
                    'equipos.costo',
                    'ordenes_compra.orden as orden_compra',
                    'tipos_compra.tipo_compra as tipo_compra',
                    'contacto.name as proveedor',
                    
                    // Garantía (2 columnas)
                    'equipos.garantia',
                    'equipos.fecha_vencimiento_garantia',
                    
                    // Clasificaciones técnicas (5 columnas)
                    'fuenteal.name as fuente_alimentacion',
                    'tecnologiap.name as tecnologia_principal',
                    'cbiomedica.name as clasificacion_biomedica',
                    'criesgo.name as clasificacion_riesgo',
                    'tadquisicion.name as tipo_adquisicion',
                    
                    // Propiedad (2 columnas)
                    'propietarios.nombre as propietario',
                    'equipos.otros',
                    
                    // Correctivos (4 columnas)
                    DB::raw("(SELECT MAX(fecha_inicio) FROM ordenes WHERE equipo_id = equipos.id AND subproceso_id = 6) as ultimo_correctivo"),
                    DB::raw("(SELECT descripcion FROM ordenes WHERE equipo_id = equipos.id AND subproceso_id = 6 ORDER BY fecha_inicio DESC LIMIT 1) as descripcion_correctivo"),
                    DB::raw("(SELECT COUNT(*) FROM ordenes WHERE equipo_id = equipos.id AND subproceso_id = 6) as cuenta_correctivos"),
                    DB::raw("(SELECT COUNT(*) FROM ordenes WHERE equipo_id = equipos.id) as cuenta_tickets"),
                    
                    // Información adicional (7 columnas)
                    DB::raw("COALESCE(sedes_equipo.name, sedes.name, 'N/A') as zona"),
                    DB::raw("(SELECT GROUP_CONCAT(CONCAT(name, ' - ', telefono) SEPARATOR '; ') FROM contacto WHERE id IN (SELECT contacto_id FROM equipo_contacto WHERE equipo_id = equipos.id)) as informacion_contacto"),
                    'equipos.file',
                    'equipos.repuesto_pendiente',
                    'equipos.vida_util',
                    DB::raw("CASE WHEN equipos.guia_id IS NOT NULL THEN 'SI' ELSE 'NO' END as tiene_guia"),
                    DB::raw("(SELECT url FROM manuales WHERE id = equipos.manual_id LIMIT 1) as manual_url")
                ])
                ->leftJoin('servicios', 'equipos.servicio_id', '=', 'servicios.id')
                ->leftJoin('areas', 'equipos.area_id', '=', 'areas.id')
                ->leftJoin('sedes', 'servicios.sede_id', '=', 'sedes.id')
                ->leftJoin('sedes as sedes_equipo', 'sedes_equipo.id', '=', 'equipos.sede_id')
                ->leftJoin('estadoequipos', 'equipos.estadoequipo_id', '=', 'estadoequipos.id')
                ->leftJoin('frecuenciam', 'equipos.frecuencia_id', '=', 'frecuenciam.id')
                ->leftJoin('ordenes_compra', 'equipos.orden_compra_id', '=', 'ordenes_compra.id')
                ->leftJoin('tipos_compra', 'ordenes_compra.tipo_compra_id', '=', 'tipos_compra.id')
                ->leftJoin('contacto', 'ordenes_compra.proveedor_id', '=', 'contacto.id')
                ->leftJoin('fuenteal', 'equipos.fuente_id', '=', 'fuenteal.id')
                ->leftJoin('tecnologiap', 'equipos.tecnologia_id', '=', 'tecnologiap.id')
                ->leftJoin('cbiomedica', 'equipos.cbiomedica_id', '=', 'cbiomedica.id')
                ->leftJoin('criesgo', 'equipos.criesgo_id', '=', 'criesgo.id')
                ->leftJoin('tadquisicion', 'equipos.tadquisicion_id', '=', 'tadquisicion.id')
                ->leftJoin('propietarios', 'equipos.propietario_id', '=', 'propietarios.id')
                ->where('equipos.status', '!=', 0)
                ->where('equipos.tipo_id', 1); // Solo equipos biomédicos

            // Aplicar filtros solo si tienen valores válidos (ignorar "all", "", null)
            // Sección 1: Identificación del Equipo
            if ($request->has('filtro_code') && !empty($request->filtro_code) && $request->filtro_code !== 'all') {
                $query->where('equipos.code', 'like', "%{$request->filtro_code}%");
            }

            if ($request->has('filtro_name') && !empty($request->filtro_name) && $request->filtro_name !== 'all') {
                $query->where('equipos.name', 'like', "%{$request->filtro_name}%");
            }

            if ($request->has('filtro_serial') && !empty($request->filtro_serial) && $request->filtro_serial !== 'all') {
                $query->where('equipos.serial', 'like', "%{$request->filtro_serial}%");
            }

            if ($request->has('filtro_marca') && !empty($request->filtro_marca) && $request->filtro_marca !== 'all') {
                $query->where('equipos.marca', 'like', "%{$request->filtro_marca}%");
            }

            if ($request->has('filtro_modelo') && !empty($request->filtro_modelo) && $request->filtro_modelo !== 'all') {
                $query->where('equipos.modelo', 'like', "%{$request->filtro_modelo}%");
            }

            // Sección 2: Ubicación Geográfica
            if ($request->has('filtro_zona') && !empty($request->filtro_zona) && $request->filtro_zona !== 'all') {
                $query->where(DB::raw('COALESCE(NULLIF(equipos.sede_id,0), servicios.sede_id)'), $request->filtro_zona);
            }

            if ($request->has('servicio_id_auxiliar') && !empty($request->servicio_id_auxiliar) && $request->servicio_id_auxiliar !== 'all') {
                $query->where('equipos.servicio_id', $request->servicio_id_auxiliar);
            }

            if ($request->has('area_id_auxiliar') && !empty($request->area_id_auxiliar) && $request->area_id_auxiliar !== 'all') {
                $query->where('equipos.area_id', $request->area_id_auxiliar);
            }

            // Sección 3: Estado y Operación
            if ($request->has('filtro_estadoequipo_id') && !empty($request->filtro_estadoequipo_id) && $request->filtro_estadoequipo_id !== 'all') {
                $query->where('equipos.estadoequipo_id', $request->filtro_estadoequipo_id);
            }

            if ($request->has('filtro_estadom') && !empty($request->filtro_estadom) && $request->filtro_estadom !== 'all') {
                $query->where('equipos.estado_mantenimiento', $request->filtro_estadom);
            }

            if ($request->has('proveedor_mantenimiento') && !empty($request->proveedor_mantenimiento) && $request->proveedor_mantenimiento !== 'all') {
                // Filtro por proveedor de mantenimiento (subquery con JOIN)
                $query->whereExists(function($subquery) use ($request) {
                    $subquery->select(DB::raw(1))
                        ->from('mantenimiento as m')
                        ->leftJoin('proveedores_mantenimiento as pm', 'm.proveedor_mantenimiento_id', '=', 'pm.id')
                        ->whereRaw('m.equipo_id = equipos.id')
                        ->where('pm.name', 'like', "%{$request->proveedor_mantenimiento}%");
                });
            }

            // Sección 4: Clasificación Técnica
            if ($request->has('tipo_id') && !empty($request->tipo_id) && $request->tipo_id !== 'all') {
                $query->where('equipos.tipo_id', $request->tipo_id);
            }

            if ($request->has('estado_id') && !empty($request->estado_id) && $request->estado_id !== 'all') {
                $query->where('equipos.criesgo_id', $request->estado_id);
            }

            if ($request->has('estado_id_cg') && !empty($request->estado_id_cg) && $request->estado_id_cg !== 'all') {
                $query->where('equipos.propietario_id', $request->estado_id_cg);
            }

            // Sección 5: Parámetros Temporales
            if ($request->has('anio_plan') && !empty($request->anio_plan) && $request->anio_plan !== 'all' && $request->anio_plan != date('Y')) {
                $query->whereYear('equipos.created_at', $request->anio_plan);
            }

            // Obtener todos los resultados
            $equipos = $query->orderBy('equipos.name')->get();

            // Log para debugging
            \Log::info('Exportación de equipos', [
                'total_equipos' => $equipos->count(),
                'filtros_aplicados' => $request->except(['_token']),
                'tiene_filtros' => $request->has('filtro_code') || $request->has('filtro_name') || $request->has('filtro_zona')
            ]);

            // Verificar si hay equipos para exportar
            if ($equipos->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron equipos con los filtros aplicados'
                ], 404);
            }

            // Crear archivo Excel usando PhpSpreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            // Configurar encabezados (54 columnas)
            $headers = [
                // Información básica (8)
                'A1' => 'ID', 'B1' => 'Nombre', 'C1' => 'Descripción', 'D1' => 'Marca', 'E1' => 'Modelo', 
                'F1' => 'Serie', 'G1' => 'Código', 'H1' => 'Código Antiguo',
                
                // Información regulatoria (2)
                'I1' => 'Registro Sanitario', 'J1' => 'Estado Equipo',
                
                // Fechas (3)
                'K1' => 'Fecha Adquisición', 'L1' => 'Fecha Instalación', 'M1' => 'Fecha Baja',
                
                // Ubicación (4)
                'N1' => 'Servicio', 'O1' => 'Área', 'P1' => 'Sede', 'Q1' => 'Localización Actual',
                
                // Mantenimiento (7)
                'R1' => 'Último Mantenimiento', 'S1' => 'Frecuencia', 'T1' => 'Frecuencia Utilizada',
                'U1' => 'Último Año Programado', 'V1' => 'Proveedor Mantenimiento', 
                'W1' => 'Cuenta Preventivos', 'X1' => 'Estado Mantenimiento',
                
                // Calibración (2)
                'Y1' => 'Última Calibración', 'Z1' => 'Cuenta Calibraciones',
                
                // Financiera (4)
                'AA1' => 'Costo', 'AB1' => 'Soporte de Compra', 'AC1' => 'Tipo Compra', 'AD1' => 'Proveedor según soporte',
                
                // Garantía (2)
                'AE1' => 'Garantía', 'AF1' => 'Vencimiento Garantía',
                
                // Clasificaciones (5)
                'AG1' => 'Fuente Alimentación', 'AH1' => 'Tecnología Principal', 
                'AI1' => 'Clasificación Biomédica', 'AJ1' => 'Clasificación Riesgo', 'AK1' => 'Tipo Adquisición',
                
                // Propiedad (2)
                'AL1' => 'Propietario', 'AM1' => 'Otros',
                
                // Correctivos (4)
                'AN1' => 'Último Correctivo', 'AO1' => 'Descripción Correctivo', 
                'AP1' => 'Cuenta Correctivos', 'AQ1' => 'Cuenta Tickets',
                
                // Adicionales (7)
                'AR1' => 'Zona', 'AS1' => 'Info Contacto', 'AT1' => 'Archivo Excel cargado de Hoja de vida', 
                'AU1' => 'Repuesto Pendiente', 'AV1' => 'Vida Útil', 'AW1' => 'Tiene Guía', 'AX1' => 'Manual URL'
            ];

            foreach ($headers as $cell => $header) {
                $sheet->setCellValue($cell, $header);
                $sheet->getStyle($cell)->getFont()->setBold(true);
                $sheet->getStyle($cell)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('4472C4');
                $sheet->getStyle($cell)->getFont()->getColor()->setRGB('FFFFFF');
            }

            // Llenar datos (54 columnas)
            $row = 2;
            foreach ($equipos as $equipo) {
                $sheet->setCellValue('A' . $row, $equipo->id);
                $sheet->setCellValue('B' . $row, $equipo->name);
                $sheet->setCellValue('C' . $row, $equipo->descripcion);
                $sheet->setCellValue('D' . $row, $equipo->marca);
                $sheet->setCellValue('E' . $row, $equipo->modelo);
                $sheet->setCellValue('F' . $row, $equipo->serial);
                $sheet->setCellValue('G' . $row, $equipo->code);
                $sheet->setCellValue('H' . $row, $equipo->codigo_antiguo);
                $sheet->setCellValue('I' . $row, null);
                $sheet->setCellValue('J' . $row, $equipo->estado_equipo);
                $sheet->setCellValue('K' . $row, $equipo->fecha_ad);
                $sheet->setCellValue('L' . $row, $equipo->fecha_instalacion);
                $sheet->setCellValue('M' . $row, $equipo->fecha_baja);
                $sheet->setCellValue('N' . $row, $equipo->servicio);
                $sheet->setCellValue('O' . $row, $equipo->area);
                $sheet->setCellValue('P' . $row, $equipo->sede);
                $sheet->setCellValue('Q' . $row, $equipo->localizacion_actual);
                $sheet->setCellValue('R' . $row, $equipo->ultimo_mantenimiento);
                $sheet->setCellValue('S' . $row, $equipo->frecuencia);
                $sheet->setCellValue('T' . $row, $equipo->frecuencia_utilizada);
                $sheet->setCellValue('U' . $row, $equipo->ultimo_anio_programado);
                $sheet->setCellValue('V' . $row, $equipo->proveedor_mantenimiento);
                $sheet->setCellValue('W' . $row, $equipo->cuenta_preventivos);
                $sheet->setCellValue('X' . $row, $equipo->estadom);
                $sheet->setCellValue('Y' . $row, $equipo->ultima_calibracion);
                $sheet->setCellValue('Z' . $row, $equipo->cuenta_calibraciones);
                $sheet->setCellValue('AA' . $row, $equipo->costo);
                $sheet->setCellValue('AB' . $row, $equipo->orden_compra);
                $sheet->setCellValue('AC' . $row, $equipo->tipo_compra);
                $sheet->setCellValue('AD' . $row, $equipo->proveedor);
                $sheet->setCellValue('AE' . $row, $equipo->garantia);
                $sheet->setCellValue('AF' . $row, $equipo->fecha_vencimiento_garantia);
                $sheet->setCellValue('AG' . $row, $equipo->fuente_alimentacion);
                $sheet->setCellValue('AH' . $row, $equipo->tecnologia_principal);
                $sheet->setCellValue('AI' . $row, $equipo->clasificacion_biomedica);
                $sheet->setCellValue('AJ' . $row, $equipo->clasificacion_riesgo);
                $sheet->setCellValue('AK' . $row, $equipo->tipo_adquisicion);
                $sheet->setCellValue('AL' . $row, $equipo->propietario);
                $sheet->setCellValue('AM' . $row, $equipo->otros);
                $sheet->setCellValue('AN' . $row, $equipo->ultimo_correctivo);
                $sheet->setCellValue('AO' . $row, $equipo->descripcion_correctivo);
                $sheet->setCellValue('AP' . $row, $equipo->cuenta_correctivos);
                $sheet->setCellValue('AQ' . $row, $equipo->cuenta_tickets);
                $sheet->setCellValue('AR' . $row, $equipo->zona);
                $sheet->setCellValue('AS' . $row, $equipo->informacion_contacto);
                $sheet->setCellValue('AT' . $row, $equipo->file);
                $sheet->setCellValue('AU' . $row, $equipo->repuesto_pendiente);
                $sheet->setCellValue('AV' . $row, $equipo->vida_util);
                $sheet->setCellValue('AW' . $row, $equipo->tiene_guia);
                $sheet->setCellValue('AX' . $row, $equipo->manual_url);
                $row++;
            }

            // Ajustar ancho de columnas
            foreach (range('A', 'Z') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            foreach (range('A', 'X') as $letter) {
                $sheet->getColumnDimension('A' . $letter)->setAutoSize(true);
            }

            // Crear el writer
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $filename = 'EquiposHUV.xlsx';

            // Configurar headers para descarga usando un StreamedResponse
            // Esto permite que el middleware global de CORS maneje correctamente la respuesta
            $response = response()->stream(
                function () use ($writer) {
                    $writer->save('php://output');
                },
                200,
                [
                    'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                    'Cache-Control' => 'max-age=0',
                ]
            );

            return $response;

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar equipos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper function para obtener estados de equipo con opción por defecto
     * Si la tabla estadoequipos está vacía, retorna opción "No disponible"
     */
    private function getEstadosEquipoWithDefault()
    {
        try {
            $estados = DB::table('estadoequipos')
                ->where('status', 1) // Solo estados activos
                ->get(['id', 'name'])
                ->toArray();

            // Si la tabla está vacía, retornar opción por defecto
            if (empty($estados)) {
                return [
                    (object) [
                        'id' => 1,
                        'name' => 'No disponible'
                    ]
                ];
            }

            return $estados;

        } catch (\Exception $e) {
            // En caso de error, retornar opción por defecto
            \Log::warning('Error obteniendo estados de equipo: ' . $e->getMessage());
            return [
                (object) [
                    'id' => 1,
                    'name' => 'No disponible'
                ]
            ];
        }
    }

    /**
     * Procesar manuales y planos JSON de forma robusta
     * Garantiza que los datos se procesen correctamente independientemente del formato de entrada
     */
    private function processManualesAndPlanos($request, &$equipoData)
    {
        \Log::info('DEBUG: processManualesAndPlanos called', [
            'filled_manuales' => $request->filled('manuales'),
            'filled_planos' => $request->filled('planos')
        ]);

        // Procesar MANUALES
        if ($request->filled('manuales')) {
            $manualesInput = $request->input('manuales');
            \Log::info('DEBUG: Processing manuales', [
                'input' => $manualesInput,
                'type' => gettype($manualesInput)
            ]);

            // Si es string JSON válido, usarlo directamente
            if (is_string($manualesInput)) {
                $decoded = json_decode($manualesInput, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $equipoData['manual'] = $manualesInput;
                    \Log::info('DEBUG: Manuales set as JSON string', ['manual' => $equipoData['manual']]);
                } else {
                    // Si no es JSON válido, intentar crear estructura válida
                    $equipoData['manual'] = json_encode([
                        'operacion' => false,
                        'mantenimiento' => false,
                        'partes' => false,
                        'otros' => false
                    ]);
                    \Log::info('DEBUG: Manuales set as default structure', ['manual' => $equipoData['manual']]);
                }
            }
            // Si es array, convertir a JSON
            elseif (is_array($manualesInput)) {
                $equipoData['manual'] = json_encode($manualesInput);
                \Log::info('DEBUG: Manuales converted from array', ['manual' => $equipoData['manual']]);
            }
        } else {
            \Log::info('DEBUG: No manuales to process');
        }

        // Procesar PLANOS
        if ($request->filled('planos')) {
            $planosInput = $request->input('planos');

            // Si es string JSON válido, usarlo directamente
            if (is_string($planosInput)) {
                $decoded = json_decode($planosInput, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $equipoData['plano'] = $planosInput;
                } else {
                    // Si no es JSON válido, intentar crear estructura válida
                    $equipoData['plano'] = json_encode([
                        'electrico' => false,
                        'electronico' => false,
                        'neumatico' => false,
                        'mecanico' => false
                    ]);
                }
            }
            // Si es array, convertir a JSON
            elseif (is_array($planosInput)) {
                $equipoData['plano'] = json_encode($planosInput);
            }
        }

        // Limpiar campos que no deben ir a la base de datos
        unset($equipoData['manuales'], $equipoData['planos']);
    }

    /**
     * Obtener calibraciones de un equipo específico
     */
    public function calibraciones($equipoId)
    {
        try {
            // Verificar que el equipo existe
            $equipo = DB::table('equipos')->where('id', $equipoId)->first();
            if (!$equipo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }

            // Obtener calibraciones del equipo con información de archivos
            $calibraciones = DB::table('calibracion')
                ->where('calibracion.equipo_id', $equipoId)
                ->select([
                    'calibracion.id',
                    'calibracion.fecha_calibracion',
                    'calibracion.descripcion',
                    'calibracion.observaciones',
                    'calibracion.file',
                    'calibracion.created_at'
                ])
                ->orderBy('calibracion.fecha_calibracion', 'desc')
                ->get();

            return response()->json($calibraciones);

        } catch (\Exception $e) {
            \Log::error('Error al obtener calibraciones del equipo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener calibraciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener historial completo de cambios de hoja de vida de un equipo
     * Tabla: cambios_hdv
     */
    public function getCambiosHdv($id)
    {
        try {
            // Verificar que el equipo existe
            $equipo = DB::table('equipos')->where('id', $id)->first();
            
            if (!$equipo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipo no encontrado'
                ], 404);
            }

            $historialFormateado = $this->historialDeCambios($id);

            return response()->json([
                'success' => true,
                'message' => 'Historial de cambios obtenido exitosamente',
                'data' => $historialFormateado,
                'total' => count($historialFormateado)
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getCambiosHdv: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener historial de cambios: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Historial de la hoja de vida: los cambios registrados en `cambios_hdv` más los
     * traslados guardados en `cambios_ubicaciones` (servicio, área y sede), en una sola
     * línea de tiempo ordenada de lo más reciente a lo más antiguo.
     */
    private function historialDeCambios($id): array
    {
        $formatear = function ($fila, string $prefijo, string $descripcion) {
            return [
                'id' => $prefijo . $fila->id,
                'descripcion' => $descripcion,
                'usuario_id' => $fila->usuario_id,
                'usuario_nombre' => $fila->usuario_nombre ?? 'Sistema',
                'usuario_apellido' => $fila->usuario_apellido ?? '',
                'usuario_username' => $fila->usuario_username ?? '',
                'responsable_nombre' => trim((string) ($fila->responsable_nombre ?? '')) ?: 'Sistema',
                'fecha' => $fila->created_at,
                'fecha_formateada' => $fila->created_at
                    ? \Carbon\Carbon::parse($fila->created_at)->format('d/m/Y H:i:s')
                    : 'Sin fecha',
            ];
        };

        $datosUsuario = [
            'usuarios.nombre as usuario_nombre',
            'usuarios.apellido as usuario_apellido',
            'usuarios.username as usuario_username',
            DB::raw("CONCAT(COALESCE(usuarios.nombre, 'Sistema'), ' ', COALESCE(usuarios.apellido, '')) as responsable_nombre"),
        ];

        $cambios = DB::table('cambios_hdv')
            ->leftJoin('usuarios', 'cambios_hdv.usuario_id', '=', 'usuarios.id')
            ->where('cambios_hdv.equipo_id', $id)
            ->select(array_merge([
                'cambios_hdv.id',
                'cambios_hdv.descripcion',
                'cambios_hdv.usuario_id',
                'cambios_hdv.created_at',
            ], $datosUsuario))
            ->get()
            ->map(fn ($fila) => $formatear($fila, 'hdv-', $fila->descripcion))
            ->all();

        $traslados = DB::table('cambios_ubicaciones as cu')
            ->leftJoin('usuarios', 'cu.usuario_id', '=', 'usuarios.id')
            ->leftJoin('servicios as so', 'so.id', '=', 'cu.servicio_origen_id')
            ->leftJoin('servicios as sd', 'sd.id', '=', 'cu.servicio_destino_id')
            ->leftJoin('areas as ao', 'ao.id', '=', 'cu.area_origen_id')
            ->leftJoin('areas as ad', 'ad.id', '=', 'cu.area_destino_id')
            ->leftJoin('sedes as seo', 'seo.id', '=', 'cu.sede_origen_id')
            ->leftJoin('sedes as sed', 'sed.id', '=', 'cu.sede_destino_id')
            ->where('cu.equipo_id', $id)
            ->select(array_merge([
                'cu.id',
                'cu.usuario_id',
                'cu.created_at',
                'cu.servicio_origen_id',
                'cu.servicio_destino_id',
                'cu.area_origen_id',
                'cu.area_destino_id',
                'cu.sede_origen_id',
                'cu.sede_destino_id',
                'so.name as servicio_origen',
                'sd.name as servicio_destino',
                'ao.name as area_origen',
                'ad.name as area_destino',
                'seo.name as sede_origen',
                'sed.name as sede_destino',
            ], $datosUsuario))
            ->get()
            ->map(function ($fila) use ($formatear) {
                $texto = \App\Support\HistorialEquipo::textoTraslado($fila);

                // Filas antiguas que no describen ningún movimiento real: no se muestran
                return $texto === '' ? null : $formatear($fila, 'ubi-', $texto);
            })
            ->filter()
            ->all();

        $historial = array_merge($cambios, $traslados);
        // Lo más reciente primero; ante la misma fecha, desempata el id para que el orden no varíe
        usort($historial, function ($a, $b) {
            return strcmp((string) $b['fecha'], (string) $a['fecha'])
                ?: strcmp((string) $b['id'], (string) $a['id']);
        });

        return $historial;
    }
}
