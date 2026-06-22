ALTER TYPE "TipoCurso" ADD VALUE IF NOT EXISTS 'ambos';

ALTER TABLE "MallaCurricular"
ADD COLUMN "anioFin" INTEGER;

UPDATE "MallaCurricular"
SET "anioFin" = "anio" + 4
WHERE "anioFin" IS NULL;

ALTER TABLE "MallaCurricular"
ALTER COLUMN "anioFin" SET NOT NULL;

ALTER TABLE "Curso"
RENAME COLUMN "otraAsignacion" TO "seDictaEnFilial";
