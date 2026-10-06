<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TipoMantenimiento;
use App\Helpers\ResponseFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class TipoMantenimientoController extends Controller
{
    /**
     * Líneas de una subcategoría. Si no vienen, hereda las de su categoría, y nunca puede
     * aplicar a una línea que la categoría no tenga.
     */
    private static function lineasSubcategoria($sub, bool $padreIndustrial, bool $padreInfraestructura): array
    {
        $pedido = fn ($clave, $porDefecto) => is_array($sub) && array_key_exists($clave, $sub)
            ? (bool) $sub[$clave]
            : $porDefecto;

        return [
            $pedido('aplica_industrial', $padreIndustrial) && $padreIndustrial,
            $pedido('aplica_infraestructura', $padreInfraestructura) && $padreInfraestructura,
        ];
    }

    /** Cuántos tickets (tabla ordenes) tienen registrada esta categoría o subcategoría. */
    private static function ticketsQueUsan($ids): int
    {
        $ids = array_filter((array) $ids);
        if (empty($ids)) {
            return 0;
        }

        return DB::table('ordenes')
            ->whereIn('tipo_mantenimiento_id', $ids)
            ->orWhereIn('subcategoria_mantenimiento_id', $ids)
            ->count();
    }

    public function index(Request $request): JsonResponse
    {
        try {
            // Las categorías retiradas (activo = 0) se conservan para no romper el historial
            // de tickets, pero solo se listan si el CRUD las pide con ?incluir_inactivas=1.
            $incluirInactivas = $request->boolean('incluir_inactivas');

            $linea = $request->get('linea');

            $query = TipoMantenimiento::query()
                ->whereNull('id_padre')
                ->with(['subcategories' => function ($q) use ($incluirInactivas, $linea) {
                    if (!$incluirInactivas) {
                        $q->where('activo', 1);
                    }
                    // Cada subcategoría tiene sus propias líneas: una categoría puede servir a
                    // industrial y a infraestructura con subcategorías distintas en cada una.
                    if ($linea === 'industrial') {
                        $q->where('aplica_industrial', 1);
                    } elseif ($linea === 'infraestructura') {
                        $q->where('aplica_infraestructura', 1);
                    }
                }]);

            if (!$incluirInactivas) {
                $query->where('activo', 1);
            }

            // ?linea=industrial|infraestructura: solo las categorías marcadas para esa línea.
            // Sin el parámetro se devuelven todas (es lo que necesita el CRUD).
            if ($linea === 'industrial') {
                $query->where('aplica_industrial', 1);
            } elseif ($linea === 'infraestructura') {
                $query->where('aplica_infraestructura', 1);
            }

            if ($request->search) {
                $query->where(function($q) use ($request) {
                    $q->where('nombre', 'LIKE', "%{$request->search}%")
                      ->orWhere('codigo', 'LIKE', "%{$request->search}%");
                });
            }

            $types = $query->orderBy('id', 'desc')->get();

            return ResponseFormatter::success($types, 'Tipos de mantenimiento obtenidos');
        } catch (Exception $e) {
            Log::error('Error en TipoMantenimientoController::index: ' . $e->getMessage());
            return ResponseFormatter::error(null, 'Error al obtener los tipos de mantenimiento', 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $request->validate([
                'codigo' => 'required|string|max:100|unique:tipos_mantenimientos,codigo',
                'nombre' => 'required|string|max:100',
                'aplica_industrial' => 'nullable|boolean',
                'aplica_infraestructura' => 'nullable|boolean',
                'subcategories' => 'nullable|array'
            ]);

            // Al menos una línea; si no viene nada, la categoría sirve para las dos
            $aplicaIndustrial = $request->boolean('aplica_industrial', true);
            $aplicaInfraestructura = $request->boolean('aplica_infraestructura', true);
            if (!$aplicaIndustrial && !$aplicaInfraestructura) {
                DB::rollBack();
                return ResponseFormatter::error(null, 'La categoría debe aplicar al menos a una línea: industrial o infraestructura', 422);
            }

            $mainType = TipoMantenimiento::create([
                'codigo' => $request->codigo,
                'nombre' => $request->nombre,
                'aplica_industrial' => $aplicaIndustrial,
                'aplica_infraestructura' => $aplicaInfraestructura,
                'id_padre' => null
            ]);

            if ($request->has('subcategories') && is_array($request->subcategories)) {
                foreach ($request->subcategories as $sub) {
                    // El formulario manda objetos {id, nombre, activo}; se acepta también
                    // el formato antiguo, que era solo el nombre como texto.
                    $nombre = is_array($sub) ? trim((string) ($sub['nombre'] ?? '')) : trim((string) $sub);
                    if ($nombre === '') {
                        continue;
                    }

                    [$subInd, $subInf] = self::lineasSubcategoria($sub, $aplicaIndustrial, $aplicaInfraestructura);
                    if (!$subInd && !$subInf) {
                        DB::rollBack();
                        return ResponseFormatter::error(null, "La subcategoria {$nombre} debe aplicar al menos a una linea de las que tiene su categoria", 422);
                    }

                    TipoMantenimiento::create([
                        'codigo' => $mainType->codigo . '-' . strtoupper(substr(uniqid(), -4)),
                        'nombre' => $nombre,
                        'activo' => is_array($sub) && array_key_exists('activo', $sub) ? (bool) $sub['activo'] : true,
                        'aplica_industrial' => $subInd,
                        'aplica_infraestructura' => $subInf,
                        'id_padre' => $mainType->id
                    ]);
                }
            }

            DB::commit();
            return ResponseFormatter::success($mainType->load('subcategories'), 'Tipo de mantenimiento creado correctamente', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Sin esto el catch general convertía los errores de validación en un 500 sin detalle
            DB::rollBack();
            return ResponseFormatter::error($e->errors(), 'Revisa los datos del formulario', 422);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error en TipoMantenimientoController::store: ' . $e->getMessage());
            return ResponseFormatter::error(null, 'Error al crear el tipo de mantenimiento', 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $mainType = TipoMantenimiento::findOrFail($id);

            $request->validate([
                'nombre' => 'required|string|max:100',
                'aplica_industrial' => 'nullable|boolean',
                'aplica_infraestructura' => 'nullable|boolean',
                'activo' => 'nullable|boolean',
                'subcategories' => 'nullable|array'
            ]);

            $aplicaIndustrial = $request->boolean('aplica_industrial', (bool) $mainType->aplica_industrial);
            $aplicaInfraestructura = $request->boolean('aplica_infraestructura', (bool) $mainType->aplica_infraestructura);
            if (!$aplicaIndustrial && !$aplicaInfraestructura) {
                DB::rollBack();
                return ResponseFormatter::error(null, 'La categoría debe aplicar al menos a una línea: industrial o infraestructura', 422);
            }

            $mainType->update([
                'nombre' => $request->nombre,
                'aplica_industrial' => $aplicaIndustrial,
                'aplica_infraestructura' => $aplicaInfraestructura,
                // activo = 0 la retira: deja de ofrecerse al crear tickets, pero sigue
                // existiendo para los tickets que ya la tienen registrada.
                'activo' => $request->boolean('activo', (bool) $mainType->activo)
            ]);

            if ($request->has('subcategories') && is_array($request->subcategories)) {
                // Las subcategorías NO se borran y se vuelven a crear: eso les cambiaría el id y
                // los tickets ya guardados quedarían apuntando a la nada. Se actualizan por id,
                // se crean las nuevas y las que el usuario quitó se retiran (o se borran solo si
                // ningún ticket las usó).
                $recibidas = collect($request->subcategories)->map(function ($sub) {
                    // Acepta tanto ['Nombre', ...] como [['id' => 1, 'nombre' => 'Nombre'], ...]
                    return is_array($sub)
                        ? [
                            'id' => $sub['id'] ?? null,
                            'nombre' => trim((string) ($sub['nombre'] ?? '')),
                            'activo' => array_key_exists('activo', $sub) ? (bool) $sub['activo'] : true,
                            'lineas' => $sub,
                        ]
                        : ['id' => null, 'nombre' => trim((string) $sub), 'activo' => true, 'lineas' => null];
                })->filter(fn ($sub) => $sub['nombre'] !== '');

                $existentes = $mainType->subcategories()->get()->keyBy('id');
                $conservados = [];

                foreach ($recibidas as $sub) {
                    $actual = $sub['id'] ? $existentes->get($sub['id']) : null;

                    // Si no llegó el id (formulario antiguo), se busca por nombre para no duplicar
                    if (!$actual) {
                        $actual = $existentes->first(fn ($e) => mb_strtolower($e->nombre) === mb_strtolower($sub['nombre']));
                    }

                    if ($actual) {
                        [$subInd, $subInf] = self::lineasSubcategoria(
                            $sub['lineas'] ?? ['aplica_industrial' => $actual->aplica_industrial, 'aplica_infraestructura' => $actual->aplica_infraestructura],
                            $aplicaIndustrial,
                            $aplicaInfraestructura
                        );
                        if (!$subInd && !$subInf) {
                            DB::rollBack();
                            return ResponseFormatter::error(null, "La subcategoria {$sub['nombre']} debe aplicar al menos a una linea de las que tiene su categoria", 422);
                        }

                        $actual->update([
                            'nombre' => $sub['nombre'],
                            'activo' => $sub['activo'],
                            'aplica_industrial' => $subInd,
                            'aplica_infraestructura' => $subInf,
                        ]);
                        $conservados[] = $actual->id;
                    } else {
                        [$subInd, $subInf] = self::lineasSubcategoria($sub['lineas'], $aplicaIndustrial, $aplicaInfraestructura);
                        if (!$subInd && !$subInf) {
                            DB::rollBack();
                            return ResponseFormatter::error(null, "La subcategoria {$sub['nombre']} debe aplicar al menos a una linea de las que tiene su categoria", 422);
                        }

                        $nueva = TipoMantenimiento::create([
                            'codigo' => $mainType->codigo . '-' . strtoupper(substr(uniqid(), -4)),
                            'nombre' => $sub['nombre'],
                            'activo' => $sub['activo'],
                            'aplica_industrial' => $subInd,
                            'aplica_infraestructura' => $subInf,
                            'id_padre' => $mainType->id
                        ]);
                        $conservados[] = $nueva->id;
                    }
                }

                foreach ($existentes as $sobrante) {
                    if (in_array($sobrante->id, $conservados, true)) {
                        continue;
                    }
                    if (self::ticketsQueUsan($sobrante->id) > 0) {
                        $sobrante->update(['activo' => 0]); // se conserva para el historial
                    } else {
                        $sobrante->delete();
                    }
                }
            }

            DB::commit();
            return ResponseFormatter::success($mainType->load('subcategories'), 'Tipo de mantenimiento actualizado correctamente');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Sin esto el catch general convertía los errores de validación en un 500 sin detalle
            DB::rollBack();
            return ResponseFormatter::error($e->errors(), 'Revisa los datos del formulario', 422);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error en TipoMantenimientoController::update: ' . $e->getMessage());
            return ResponseFormatter::error(null, 'Error al actualizar el tipo de mantenimiento', 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $mainType = TipoMantenimiento::findOrFail($id);

            // Si algún ticket la usa, se retira en lugar de borrarla: los tickets guardados
            // deben seguir mostrando su categoría en las consultas y en los informes.
            $ids = $mainType->subcategories()->pluck('id')->push($mainType->id)->all();
            $enUso = self::ticketsQueUsan($ids);

            if ($enUso > 0) {
                TipoMantenimiento::whereIn('id', $ids)->update(['activo' => 0]);

                return ResponseFormatter::success(null, "La categoría se retiró y ya no aparecerá al crear tickets. No se eliminó porque {$enUso} ticket(s) la tienen registrada.");
            }

            $mainType->delete();

            return ResponseFormatter::success(null, 'Tipo de mantenimiento eliminado correctamente');
        } catch (Exception $e) {
            Log::error('Error en TipoMantenimientoController::destroy: ' . $e->getMessage());
            return ResponseFormatter::error(null, 'Error al eliminar el tipo de mantenimiento', 500);
        }
    }
}
