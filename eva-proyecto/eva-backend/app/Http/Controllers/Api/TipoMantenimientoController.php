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
    public function index(Request $request): JsonResponse
    {
        try {
            $query = TipoMantenimiento::query()
                ->whereNull('id_padre')
                ->with('subcategories');

            // ?linea=industrial|infraestructura: solo las categorías marcadas para esa línea.
            // Sin el parámetro se devuelven todas (es lo que necesita el CRUD).
            $linea = $request->get('linea');
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
                foreach ($request->subcategories as $subName) {
                    TipoMantenimiento::create([
                        'codigo' => $mainType->codigo . '-' . strtoupper(substr(uniqid(), -4)),
                        'nombre' => $subName,
                        // La subcategoría hereda las líneas de su categoría
                        'aplica_industrial' => $mainType->aplica_industrial,
                        'aplica_infraestructura' => $mainType->aplica_infraestructura,
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
                'aplica_infraestructura' => $aplicaInfraestructura
            ]);

            if ($request->has('subcategories') && is_array($request->subcategories)) {
                $mainType->subcategories()->delete();
                foreach ($request->subcategories as $subName) {
                    TipoMantenimiento::create([
                        'codigo' => $mainType->codigo . '-' . strtoupper(substr(uniqid(), -4)),
                        'nombre' => $subName,
                        // La subcategoría hereda las líneas de su categoría
                        'aplica_industrial' => $mainType->aplica_industrial,
                        'aplica_infraestructura' => $mainType->aplica_infraestructura,
                        'id_padre' => $mainType->id
                    ]);
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
            $mainType->delete();

            return ResponseFormatter::success(null, 'Tipo de mantenimiento eliminado correctamente');
        } catch (Exception $e) {
            Log::error('Error en TipoMantenimientoController::destroy: ' . $e->getMessage());
            return ResponseFormatter::error(null, 'Error al eliminar el tipo de mantenimiento', 500);
        }
    }
}
