UPDATE "Curso"
SET "codigo" = 'CUR-' || "id"
WHERE "codigo" IS NULL OR btrim("codigo") = '';

WITH grouped AS (
  SELECT
    "codigo",
    min("id") AS keep_id,
    max("horasTeoria") AS horas_teoria,
    max("horasPractica") AS horas_practica,
    max("horasLaboratorio") AS horas_laboratorio
  FROM "Curso"
  GROUP BY "codigo"
),
duplicates AS (
  SELECT curso."id" AS duplicate_id, grouped.keep_id
  FROM "Curso" AS curso
  JOIN grouped ON grouped."codigo" = curso."codigo"
  WHERE curso."id" <> grouped.keep_id
)
UPDATE "Horario" AS horario
SET "cursoId" = duplicates.keep_id
FROM duplicates
WHERE horario."cursoId" = duplicates.duplicate_id;

WITH grouped AS (
  SELECT "codigo", min("id") AS keep_id
  FROM "Curso"
  GROUP BY "codigo"
),
duplicates AS (
  SELECT curso."id" AS duplicate_id, grouped.keep_id
  FROM "Curso" AS curso
  JOIN grouped ON grouped."codigo" = curso."codigo"
  WHERE curso."id" <> grouped.keep_id
)
INSERT INTO "_DocenteCursos" ("A", "B")
SELECT duplicates.keep_id, relaciones."B"
FROM "_DocenteCursos" AS relaciones
JOIN duplicates ON relaciones."A" = duplicates.duplicate_id
ON CONFLICT DO NOTHING;

WITH grouped AS (
  SELECT "codigo", min("id") AS keep_id
  FROM "Curso"
  GROUP BY "codigo"
),
duplicates AS (
  SELECT curso."id" AS duplicate_id, grouped.keep_id
  FROM "Curso" AS curso
  JOIN grouped ON grouped."codigo" = curso."codigo"
  WHERE curso."id" <> grouped.keep_id
)
DELETE FROM "_DocenteCursos" AS relaciones
USING duplicates
WHERE relaciones."A" = duplicates.duplicate_id;

WITH grouped AS (
  SELECT
    "codigo",
    min("id") AS keep_id,
    max("horasTeoria") AS horas_teoria,
    max("horasPractica") AS horas_practica,
    max("horasLaboratorio") AS horas_laboratorio
  FROM "Curso"
  GROUP BY "codigo"
)
UPDATE "Curso" AS curso
SET
  "horasTeoria" = grouped.horas_teoria,
  "horasPractica" = grouped.horas_practica,
  "horasLaboratorio" = grouped.horas_laboratorio
FROM grouped
WHERE curso."id" = grouped.keep_id;

WITH grouped AS (
  SELECT "codigo", min("id") AS keep_id
  FROM "Curso"
  GROUP BY "codigo"
)
DELETE FROM "Curso" AS curso
USING grouped
WHERE curso."codigo" = grouped."codigo"
  AND curso."id" <> grouped.keep_id;

UPDATE "Curso"
SET "tipo" = CASE
  WHEN ("horasTeoria" > 0 OR "horasPractica" > 0) AND "horasLaboratorio" > 0
    THEN 'ambos'::"TipoCurso"
  WHEN "horasLaboratorio" > 0
    THEN 'laboratorio'::"TipoCurso"
  ELSE 'teoria'::"TipoCurso"
END;

DROP INDEX IF EXISTS "Curso_planAnio_idx";

ALTER TABLE "Curso"
DROP COLUMN "escuela",
DROP COLUMN "planAnio";

CREATE UNIQUE INDEX "Curso_codigo_key" ON "Curso"("codigo");
