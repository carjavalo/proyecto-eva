-- Restauración de las categorías de mantenimiento borradas en producción.
-- Origen: respaldo de JetBackup del 2026-10-04 (volcado completo verificado).
--
-- Usa INSERT IGNORE: solo inserta las filas cuyo id YA NO EXISTE. No modifica ni
-- pisa ninguna categoría que hayas creado después. Los tickets guardados vuelven a
-- mostrar su categoría porque conservan el mismo id.
--
-- 1) ANTES: ver cuántos tickets quedaron sin categoría (debe dar filas)
-- 2) Ejecutar este INSERT
-- 3) DESPUÉS: repetir la consulta del paso 1; debe devolver 0 filas

INSERT IGNORE INTO `tipos_mantenimientos` (`id`, `codigo`, `nombre`, `id_padre`) VALUES
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
