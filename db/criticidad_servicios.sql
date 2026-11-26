-- Sistema de prioridad de tickets por criticidad del servicio.
-- Matriz: plantillas/Matriz_Criticidad_Servicios_Biomedica_Infraestructura.xlsx
-- Niveles: 1 Muy alta (<10 min) | 2 Alta (<1 h) | 3 Media (<8 h) | 4 Baja (<24 h)
-- El plazo es de PRIMERA RESPUESTA y se cuenta a tiempo corrido.
--
-- Los tres servicios que el Excel deja en #N/A (N/R, N/R NORTE, CLINICA AL ALBA)
-- quedan en nivel 4 y sin grupo de habilitacion.
--
-- Ejecutar una sola vez: los ALTER fallan si las columnas ya existen.

SET SESSION sql_mode = '';

ALTER TABLE servicios
  ADD COLUMN criticidad TINYINT NOT NULL DEFAULT 4
  COMMENT '1 muy alta, 2 alta, 3 media, 4 baja (matriz de criticidad)'
  AFTER sede_id;

ALTER TABLE servicios
  ADD COLUMN grupo_habilitacion VARCHAR(80) NULL DEFAULT NULL
  COMMENT 'Grupo de habilitacion (Resolucion 3100) del que sale la criticidad'
  AFTER criticidad;

-- NULL = ticket anterior a la puesta en marcha: no se le exige plazo.
ALTER TABLE ordenes
  ADD COLUMN criticidad TINYINT NULL DEFAULT NULL
  COMMENT 'Nivel heredado del servicio al crear el ticket. NULL = sin plazo'
  AFTER prioridad;
ALTER TABLE ordenes ADD INDEX idx_ordenes_criticidad (criticidad);

-- ===================== Nivel por servicio =====================

-- Nivel 1 (93 servicios)
UPDATE servicios SET criticidad = 1 WHERE id IN (2,13,14,15,16,31,32,33,40,72,77,81,83,84,85,86,87,88,89,90,91,92,93,94,95);
UPDATE servicios SET criticidad = 1 WHERE id IN (96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,112,115,117,118,119,121,122,123,132,133);
UPDATE servicios SET criticidad = 1 WHERE id IN (134,136,137,138,139,140,141,142,144,145,149,151,153,157,165,167,175,176,182,185,187,212,215,220,221);
UPDATE servicios SET criticidad = 1 WHERE id IN (222,228,229,238,239,250,266,271,272,274,281,287,289,291,293,295,296,298);

-- Nivel 2 (94 servicios)
UPDATE servicios SET criticidad = 2 WHERE id IN (1,3,4,5,6,7,8,9,10,11,12,17,18,19,34,37,38,39,42,43,45,46,47,48,49);
UPDATE servicios SET criticidad = 2 WHERE id IN (50,51,52,53,56,57,58,60,63,64,65,70,73,74,75,79,80,111,116,120,124,126,127,129,131);
UPDATE servicios SET criticidad = 2 WHERE id IN (143,154,156,158,160,161,162,163,164,166,172,173,180,181,184,186,188,189,190,192,202,203,204,208,209);
UPDATE servicios SET criticidad = 2 WHERE id IN (210,216,219,223,226,227,237,265,268,273,282,284,285,286,290,294,297,299,303);

-- Nivel 3 (19 servicios)
UPDATE servicios SET criticidad = 3 WHERE id IN (20,36,44,59,67,68,69,71,78,146,150,159,194,195,196,205,230,267,288);

-- Nivel 4 (67 servicios)
UPDATE servicios SET criticidad = 4 WHERE id IN (35,54,55,66,76,128,130,148,152,168,169,170,171,174,177,178,179,183,191,197,198,199,200,201,206);
UPDATE servicios SET criticidad = 4 WHERE id IN (207,211,213,217,218,224,240,241,242,243,244,245,246,248,249,251,252,253,254,255,256,257,258,259,260);
UPDATE servicios SET criticidad = 4 WHERE id IN (261,262,263,264,269,270,275,276,277,278,279,280,283,292,300,301,302);

-- ============== Grupo de habilitacion por servicio ==============

-- Apoyo diagnóstico y complementación terapeutica (57 servicios)
UPDATE servicios SET grupo_habilitacion = 'Apoyo diagnóstico y complementación terapeutica' WHERE id IN (1,4,8,10,11,12,34,37,38,39,42,43,47,48,51,52,53,60,65,73,80,111,116,120,124);
UPDATE servicios SET grupo_habilitacion = 'Apoyo diagnóstico y complementación terapeutica' WHERE id IN (126,129,131,154,156,158,160,161,162,163,164,172,186,192,202,203,204,208,209,210,216,223,226,237,268);
UPDATE servicios SET grupo_habilitacion = 'Apoyo diagnóstico y complementación terapeutica' WHERE id IN (273,282,290,294,297,299,303);

-- Atención Inmediata Obstetricia (4 servicios)
UPDATE servicios SET grupo_habilitacion = 'Atención Inmediata Obstetricia' WHERE id IN (72,212,295,296);

-- Atención Inmediata Urgencias (22 servicios)
UPDATE servicios SET grupo_habilitacion = 'Atención Inmediata Urgencias' WHERE id IN (2,32,33,77,112,117,119,121,122,123,132,133,134,144,145,175,185,222,229,250,287,298);

-- Consulta Externa (19 servicios)
UPDATE servicios SET grupo_habilitacion = 'Consulta Externa' WHERE id IN (20,36,44,59,67,68,69,71,78,146,150,159,194,195,196,205,230,267,288);

-- Internación Cuidado Intensivo (21 servicios)
UPDATE servicios SET grupo_habilitacion = 'Internación Cuidado Intensivo' WHERE id IN (13,14,15,136,137,138,139,140,141,142,149,165,167,182,187,215,220,221,238,239,291);

-- Internación Hospitalización (37 servicios)
UPDATE servicios SET grupo_habilitacion = 'Internación Hospitalización' WHERE id IN (3,5,6,7,9,17,18,19,45,46,49,50,56,57,58,63,64,70,74,75,79,127,143,166,173);
UPDATE servicios SET grupo_habilitacion = 'Internación Hospitalización' WHERE id IN (180,181,184,188,189,190,219,227,265,284,285,286);

-- Procesos Administrativos y apoyo (64 servicios)
UPDATE servicios SET grupo_habilitacion = 'Procesos Administrativos y apoyo' WHERE id IN (35,54,55,66,76,128,130,152,168,169,170,171,174,177,178,179,183,191,197,198,199,200,201,206,207);
UPDATE servicios SET grupo_habilitacion = 'Procesos Administrativos y apoyo' WHERE id IN (213,217,218,224,240,242,243,244,245,246,248,249,251,252,253,254,255,256,257,258,259,260,261,262,263);
UPDATE servicios SET grupo_habilitacion = 'Procesos Administrativos y apoyo' WHERE id IN (264,269,270,275,276,277,278,279,280,283,292,300,301,302);

-- Quirurgico (46 servicios)
UPDATE servicios SET grupo_habilitacion = 'Quirurgico' WHERE id IN (16,31,40,81,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103);
UPDATE servicios SET grupo_habilitacion = 'Quirurgico' WHERE id IN (104,105,106,107,108,109,110,115,118,151,153,157,176,228,266,271,272,274,281,289,293);

-- ========================= Comprobacion =========================
SELECT criticidad, grupo_habilitacion, COUNT(*) AS servicios
  FROM servicios GROUP BY criticidad, grupo_habilitacion ORDER BY criticidad, servicios DESC;
