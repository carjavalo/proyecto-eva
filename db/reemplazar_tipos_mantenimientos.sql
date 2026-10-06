-- =====================================================================
-- Reemplazo completo de la tabla `tipos_mantenimientos` en PRODUCCIÓN
-- Origen: respaldo JetBackup del 2026-10-04 (volcado completo verificado)
-- Filas: 42  (5 categorías + 37 subcategorías)
--
-- IMPORTANTE: este script BORRA la tabla actual y la deja igual que el
-- respaldo. Toda categoría creada DESPUÉS del 4 de octubre se pierde, por eso
-- el primer paso guarda una copia de lo que haya hoy.
--
-- La tabla se crea ya con las tres columnas nuevas (aplica_industrial,
-- aplica_infraestructura y activo), así que NO hace falta correr el ALTER aparte.
-- =====================================================================

-- 1) Copia de seguridad de lo que hay ahora mismo (por si acaso)
CREATE TABLE IF NOT EXISTS `tipos_mantenimientos_respaldo_20261006`
  AS SELECT * FROM `tipos_mantenimientos`;

-- 2) Reemplazo de la tabla
DROP TABLE IF EXISTS `tipos_mantenimientos`;

CREATE TABLE `tipos_mantenimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(100) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `aplica_industrial` tinyint(1) NOT NULL DEFAULT 1,
  `aplica_infraestructura` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `id_padre` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_padre` (`id_padre`)
) ENGINE=MyISAM AUTO_INCREMENT=98 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 3) Datos del respaldo (las tres columnas nuevas quedan en 1 = activa y para ambas líneas)
INSERT INTO `tipos_mantenimientos` (`id`, `codigo`, `nombre`, `id_padre`) VALUES
  (1,'TM-4067','MECANICO',NULL),
  (14,'TM-3070','EBANISTERIA',NULL),
  (5,'TM-4175-DAC3','DDD',4),
  (6,'TM-4175-DE96','DDD',4),
  (8,'TM-7825','LOCATIVO',NULL),
  (40,'TM-7825-192A','HIDRAULICO',8),
  (11,'TM-2374','ELECTRICO',NULL),
  (12,'TM-1371','REFRIGERACION',NULL),
  (39,'TM-7825-175E','HIDROSANITARIO',8),
  (33,'TM-4067-E23B','CAMAS',1),
  (32,'TM-4067-DF77','GASES MEDICINALES',1),
  (31,'TM-4067-DC15','MOBILIARIO',1),
  (71,'TM-2374-469C','EQUIPOS',11),
  (38,'TM-7825-152D','OBRA BLANCA',8),
  (34,'TM-4067-E50B','CAMILLAS',1),
  (35,'TM-4067-E72E','CUNAS',1),
  (36,'TM-4067-E975','SILLA DE RUEDAS',1),
  (37,'TM-4067-EB7D','CALDERA',1),
  (41,'TM-7825-1AC0','OBRA NEGRA',8),
  (42,'TM-7825-1C42','TRASLADO',8),
  (80,'TM-3070-9ED6','DESINSTALACION',14),
  (79,'TM-3070-9C6C','INSTALACION',14),
  (78,'TM-3070-99D6','CHAPAS Y CERRADURAS',14),
  (77,'TM-3070-974A','PUESTOS DE TRABAJO',14),
  (76,'TM-3070-94A5','VENTANAS',14),
  (75,'TM-3070-90CE','PUERTAS',14),
  (72,'TM-2374-4A57','REDES ELECTRICAS',11),
  (70,'TM-2374-42CC','INTERRUPTORES Y TOMAS',11),
  (69,'TM-2374-3ED9','CAMAS',11),
  (68,'TM-2374-3A28','ILUMINACION',11),
  (95,'TM-1371-E4CA','CUARTO FRIO',12),
  (94,'TM-1371-E1F5','NEVERA',12),
  (93,'TM-1371-DF48','EQUIPO CENTRAL',12),
  (92,'TM-1371-DC5F','CASSETTE',12),
  (73,'TM-2374-4E36','ACOMETIDAS',11),
  (74,'TM-2374-51AA','CONEXIONES Y EXTENSIONES',11),
  (81,'TM-3070-A178','TRASLADO',14),
  (82,'TM-3070-A3CA','PINTURA',14),
  (83,'TM-3070-A655','MOBILIARIO',14),
  (91,'TM-1371-D8DC','MINI-SPLIT',12),
  (96,'TM-1371-E720','CONGELADOR',12),
  (97,'TM-1371-E990','AIRE ACONDICIONADO PORTATIL',12);

-- =====================================================================
-- 4) VERIFICACIÓN: ¿quedan tickets apuntando a categorías que no existen?
--    Debe devolver 0 filas. Si devuelve alguna, son categorías creadas y
--    borradas DESPUÉS del 4 de octubre: no están en este respaldo y habría
--    que recrearlas a mano con ese mismo id.
-- =====================================================================
-- SELECT o.tipo_mantenimiento_id AS id_que_falta, COUNT(*) AS tickets
-- FROM ordenes o LEFT JOIN tipos_mantenimientos t ON t.id = o.tipo_mantenimiento_id
-- WHERE o.tipo_mantenimiento_id > 0 AND t.id IS NULL GROUP BY 1
-- UNION ALL
-- SELECT o.subcategoria_mantenimiento_id, COUNT(*)
-- FROM ordenes o LEFT JOIN tipos_mantenimientos t ON t.id = o.subcategoria_mantenimiento_id
-- WHERE o.subcategoria_mantenimiento_id > 0 AND t.id IS NULL GROUP BY 1;
