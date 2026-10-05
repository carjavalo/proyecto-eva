<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoMantenimiento extends Model
{
    use HasFactory;

    protected $table = 'tipos_mantenimientos';
    protected $fillable = ['codigo', 'nombre', 'id_padre', 'aplica_industrial', 'aplica_infraestructura'];

    protected $casts = [
        'aplica_industrial' => 'boolean',
        'aplica_infraestructura' => 'boolean',
    ];
    public $timestamps = false;

    /**
     * Get the subcategories for the maintenance type.
     */
    public function subcategories(): HasMany
    {
        return $this->hasMany(TipoMantenimiento::class, 'id_padre');
    }

    /**
     * Get the parent maintenance type.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(TipoMantenimiento::class, 'id_padre');
    }
}
