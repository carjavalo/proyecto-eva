<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Exception;

/**
 * Modelo Servicio - Gestión Empresarial Optimizada
 * 
 * Modelo empresarial optimizado para la tabla servicios
 * con funcionalidades avanzadas de seguridad, validación,
 * cacheo, auditoría y manejo de errores empresariales.
 * 
 * Características implementadas:
 * - Validaciones robustas de negocio
 * - Sistema de cacheo inteligente
 * - Scopes empresariales para consultas optimizadas
 * - Métodos de utilidad específicos del dominio
 * - Auditoría completa de operaciones
 * - Manejo de errores empresarial
 * - Constantes para valores enum y estados
 * - Relaciones Eloquent optimizadas
 * 
 * @package App\Models
 * @author Sistema EVA
 * @version 2.0.0
 * @since 2024-01-01
 */
class Servicio extends Model
{
    use HasFactory;

    // ==========================================
    // CONFIGURACIÓN BÁSICA DEL MODELO
    // ==========================================
    
    protected $table = 'servicios';
    protected $primaryKey = 'id';
    public $timestamps = true;
    const UPDATED_AT = null;

    /**
     * Campos que pueden ser asignados masivamente
     * Configurados con máxima seguridad empresarial
     */
    protected $fillable = [
        'code',
        'name',
        'description',
        'is_active',
        'piso_id',
        'status',
        'zona_id',
        'centro_id',
        'sede_id',
        'grupo_habilitacion',
        'criticidad'
    ];

    /**
     * Campos protegidos que no pueden ser asignados masivamente
     */
    protected $guarded = [
        'id',
        'created_at',
        'updated_at'
    ];

    /**
     * Conversión automática de tipos (Type Casting)
     */
    protected $casts = [
        'id' => 'integer',
        'activo' => 'boolean',
        'estado' => 'boolean',
        'status' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // ==========================================
    // CONSTANTES EMPRESARIALES
    // ==========================================
    
    const CACHE_TTL = 3600; // 1 hora
    const CACHE_PREFIX = 'servicios_';
    
    const ESTADO_ACTIVO = 'activo';
    const ESTADO_INACTIVO = 'inactivo';
    const ESTADO_PENDIENTE = 'pendiente';
    const ESTADO_COMPLETADO = 'completado';
    const ESTADO_CANCELADO = 'cancelado';

    /**
     * Obtener estados válidos
     */
    public static function getEstadosValidos(): array
    {
        return [
            self::ESTADO_ACTIVO,
            self::ESTADO_INACTIVO,
            self::ESTADO_PENDIENTE,
            self::ESTADO_COMPLETADO,
            self::ESTADO_CANCELADO
        ];
    }

    // ==========================================
    // RELACIONES ELOQUENT EMPRESARIALES
    // ==========================================
    
    /**
     * Relación genérica - personalizar según necesidades
     */
    /**
     * Relación con Sede
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    // ==========================================
    // SCOPES EMPRESARIALES
    // ==========================================
    
    /**
     * Scope para registros activos
     */
    public function scopeActivos(Builder $query): Builder
    {
        return $query->where(function($q) {
            $q->where('activo', true)
              ->orWhere('estado', 'activo')
              ->orWhere('status', 'activo')
              ->orWhere('estado', 1)
              ->orWhere('activo', 1);
        });
    }

    /**
     * Scope para registros inactivos
     */
    public function scopeInactivos(Builder $query): Builder
    {
        return $query->where(function($q) {
            $q->where('activo', false)
              ->orWhere('estado', 'inactivo')
              ->orWhere('status', 'inactivo')
              ->orWhere('estado', 0)
              ->orWhere('activo', 0);
        });
    }

    /**
     * Scope para búsqueda general
     */
    public function scopeBuscar(Builder $query, string $termino): Builder
    {
        return $query->where(function($q) use ($termino) {
            $q->where('name', 'LIKE', "%{$termino}%")
              ->orWhere('nombre', 'LIKE', "%{$termino}%")
              ->orWhere('descripcion', 'LIKE', "%{$termino}%")
              ->orWhere('codigo', 'LIKE', "%{$termino}%")
              ->orWhere('title', 'LIKE', "%{$termino}%");
        });
    }

    /**
     * Scope para registros recientes (últimos 30 días)
     */
    public function scopeRecientes(Builder $query): Builder
    {
        return $query->where('created_at', '>=', now()->subDays(30));
    }

    /**
     * Scope para registros ordenados por nombre
     */
    public function scopeOrdenadosPorNombre(Builder $query): Builder
    {
        return $query->orderBy('name')->orOrderBy('nombre')->orOrderBy('title');
    }

    // ==========================================
    // MÉTODOS DE NEGOCIO EMPRESARIALES
    // ==========================================
    
    /**
     * Obtener estadísticas del modelo
     */
    public function obtenerEstadisticas(): array
    {
        return Cache::remember(
            self::CACHE_PREFIX . "stats_{$this->id}",
            self::CACHE_TTL,
            function () {
                return [
                    'id' => $this->id,
                    'nombre' => $this->name ?? $this->nombre ?? $this->title ?? 'Sin nombre',
                    'descripcion' => $this->descripcion ?? $this->description ?? null,
                    'estado' => $this->activo ?? $this->estado ?? $this->status ?? null,
                    'created_at' => $this->created_at,
                    'updated_at' => $this->updated_at,
                    'dias_desde_creacion' => $this->created_at ? $this->created_at->diffInDays(now()) : null,
                    'ultima_actualizacion' => $this->updated_at ? $this->updated_at->diffForHumans() : null
                ];
            }
        );
    }

    /**
     * Validar integridad de datos empresariales
     */
    public function validarIntegridad(): array
    {
        $errores = [];
        
        // Validar campos requeridos básicos
        if (empty($this->name) && empty($this->nombre) && empty($this->title)) {
            $errores[] = 'El nombre es requerido';
        }
        
        // Validar longitud de campos
        if (($this->name && strlen($this->name) > 255) || 
            ($this->nombre && strlen($this->nombre) > 255) ||
            ($this->title && strlen($this->title) > 255)) {
            $errores[] = 'El nombre no puede exceder 255 caracteres';
        }
        
        // Validar descripción
        if ($this->descripcion && strlen($this->descripcion) > 1000) {
            $errores[] = 'La descripción no puede exceder 1000 caracteres';
        }
        
        // Validar fechas
        if ($this->created_at && $this->updated_at && $this->created_at > $this->updated_at) {
            $errores[] = 'La fecha de creación no puede ser posterior a la fecha de actualización';
        }
        
        return $errores;
    }

    /**
     * Limpiar cache relacionado con el modelo
     */
    public function limpiarCache(): void
    {
        Cache::forget(self::CACHE_PREFIX . "stats_{$this->id}");
        Cache::forget(self::CACHE_PREFIX . "list");
        Cache::forget(self::CACHE_PREFIX . "activos");
        Cache::forget(self::CACHE_PREFIX . "inactivos");
    }

    /**
     * Cambiar estado del registro
     */
    public function cambiarEstado(string $nuevoEstado, string $motivo = null): bool
    {
        if (!in_array($nuevoEstado, self::getEstadosValidos())) {
            return false;
        }

        $estadoAnterior = $this->estado ?? $this->activo ?? $this->status;
        
        // Actualizar según el campo disponible
        if ($this->hasAttribute('estado')) {
            $this->estado = $nuevoEstado;
        } elseif ($this->hasAttribute('activo')) {
            $this->activo = in_array($nuevoEstado, [self::ESTADO_ACTIVO, 'activo', '1', 1, true]);
        } elseif ($this->hasAttribute('status')) {
            $this->status = $nuevoEstado;
        }

        $resultado = $this->save();
        
        if ($resultado) {
            Log::info("Estado cambiado en modelo Servicio", [
                'id' => $this->id,
                'estado_anterior' => $estadoAnterior,
                'nuevo_estado' => $nuevoEstado,
                'motivo' => $motivo,
                'timestamp' => now()
            ]);
            
            $this->limpiarCache();
        }

        return $resultado;
    }

    /**
     * Generar código único automático
     */
    public static function generarCodigo(string $prefijo = null): string
    {
        $prefijo = $prefijo ?? strtoupper(substr('Servicio', 0, 3));
        $ultimo = static::where('codigo', 'LIKE', $prefijo . '%')
                        ->orderBy('codigo', 'desc')
                        ->first();
        
        if ($ultimo && preg_match('/(\d+)$/', $ultimo->codigo, $matches)) {
            $numero = intval($matches[1]) + 1;
        } else {
            $numero = 1;
        }
        
        return $prefijo . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Obtener resumen ejecutivo del modelo
     */
    public function getResumenEjecutivo(): array
    {
        return [
            'identificacion' => [
                'id' => $this->id,
                'nombre' => $this->name ?? $this->nombre ?? $this->title ?? 'Sin nombre',
                'codigo' => $this->codigo ?? null,
                'descripcion' => $this->descripcion ?? $this->description ?? null
            ],
            'estado' => [
                'activo' => $this->activo ?? $this->estado ?? $this->status ?? null,
                'fecha_creacion' => $this->created_at,
                'ultima_actualizacion' => $this->updated_at,
                'dias_activo' => $this->created_at ? $this->created_at->diffInDays(now()) : null
            ],
            'validacion' => [
                'errores_integridad' => $this->validarIntegridad(),
                'es_valido' => empty($this->validarIntegridad())
            ],
            'metadatos' => [
                'modelo' => get_class($this),
                'tabla' => $this->getTable(),
                'clave_primaria' => $this->getKeyName(),
                'timestamps' => $this->timestamps
            ]
        ];
    }

    // ==========================================
    // EVENTOS DEL MODELO
    // ==========================================
    
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            // Generar código automático si no existe
            if ($model->hasAttribute('codigo') && empty($model->codigo)) {
                $model->codigo = self::generarCodigo();
            }
            
            Log::info("Creando nuevo registro en servicios", [
                'modelo' => get_class($model),
                'data' => $model->toArray()
            ]);
        });
        
        static::updating(function ($model) {
            Log::info("Actualizando registro en servicios", [
                'id' => $model->id,
                'modelo' => get_class($model),
                'cambios' => $model->getDirty()
            ]);
            
            $model->limpiarCache();
        });
        
        static::deleting(function ($model) {
            Log::warning("Eliminando registro en servicios", [
                'id' => $model->id,
                'modelo' => get_class($model),
                'data' => $model->toArray()
            ]);
            
            $model->limpiarCache();
        });
    }
}
