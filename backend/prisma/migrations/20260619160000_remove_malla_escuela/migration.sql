UPDATE "MallaCurricular"
SET "departamento" = COALESCE(NULLIF("departamento", ''), "escuela");

ALTER TABLE "MallaCurricular"
ALTER COLUMN "departamento" SET NOT NULL;

DROP INDEX IF EXISTS "MallaCurricular_anio_escuela_key";

ALTER TABLE "MallaCurricular"
DROP COLUMN "escuela";

CREATE INDEX IF NOT EXISTS "MallaCurricular_anio_departamento_idx"
ON "MallaCurricular"("anio", "departamento");
