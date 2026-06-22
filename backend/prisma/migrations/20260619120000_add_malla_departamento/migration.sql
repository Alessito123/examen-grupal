ALTER TABLE "MallaCurricular"
ADD COLUMN "departamento" TEXT;

UPDATE "MallaCurricular"
SET "departamento" = "escuela"
WHERE "departamento" IS NULL;
