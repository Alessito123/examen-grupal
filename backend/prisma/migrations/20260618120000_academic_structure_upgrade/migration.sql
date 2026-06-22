ALTER TABLE "Docente" ALTER COLUMN "condicion" DROP DEFAULT;
ALTER TABLE "Docente" ALTER COLUMN "dedicacion" DROP DEFAULT;

ALTER TYPE "Condicion" RENAME TO "Condicion_old";
CREATE TYPE "Condicion" AS ENUM ('ORDINARIO', 'EXTRAORDINARIO', 'CONTRATADO');
ALTER TABLE "Docente"
  ALTER COLUMN "condicion" TYPE "Condicion"
  USING (
    CASE WHEN "condicion"::text = 'NOMBRADO' THEN 'ORDINARIO' ELSE "condicion"::text END
  )::"Condicion";
DROP TYPE "Condicion_old";
ALTER TABLE "Docente" ALTER COLUMN "condicion" SET DEFAULT 'ORDINARIO';

ALTER TYPE "Dedicacion" RENAME TO "Dedicacion_old";
CREATE TYPE "Dedicacion" AS ENUM (
  'TC_40H', 'DE_EXCLUSIVA', 'DOCENTE_INVESTIGADOR', 'TP_20H',
  'TP_4H', 'TP_8H', 'TP_10H', 'TP_12H', 'TP_16H'
);
ALTER TABLE "Docente"
  ALTER COLUMN "dedicacion" TYPE "Dedicacion"
  USING (
    CASE WHEN "dedicacion"::text = 'TP' THEN 'TP_20H' ELSE "dedicacion"::text END
  )::"Dedicacion";
DROP TYPE "Dedicacion_old";
ALTER TABLE "Docente" ALTER COLUMN "dedicacion" SET DEFAULT 'TC_40H';

ALTER TYPE "Categoria" RENAME TO "Categoria_old";
CREATE TYPE "Categoria" AS ENUM (
  'principal', 'asociado', 'auxiliar', 'jefe_practica',
  'tipo_a1', 'tipo_a2', 'tipo_a3', 'tipo_b1', 'tipo_b2', 'tipo_b3',
  'cesante', 'experto', 'emerito', 'invitado_especial'
);
ALTER TABLE "Docente"
  ALTER COLUMN "categoria" TYPE "Categoria"
  USING (
    CASE
      WHEN "categoria"::text IN ('profesor', 'alumno') AND "condicion"::text = 'CONTRATADO' AND "dedicacion"::text = 'TP_16H' THEN 'tipo_a2'
      WHEN "categoria"::text IN ('profesor', 'alumno') AND "condicion"::text = 'CONTRATADO' AND "dedicacion"::text = 'TP_8H' THEN 'tipo_a3'
      WHEN "categoria"::text IN ('profesor', 'alumno') AND "condicion"::text = 'CONTRATADO' THEN 'tipo_a1'
      WHEN "categoria"::text IN ('profesor', 'alumno') THEN 'auxiliar'
      ELSE "categoria"::text
    END
  )::"Categoria";
DROP TYPE "Categoria_old";

CREATE TYPE "Sede" AS ENUM ('TRUJILLO', 'VALLE_JEQUETEPEQUE', 'HUAMACHUCO', 'SANTIAGO_DE_CHUCO');
ALTER TABLE "Docente" ADD COLUMN "sede" "Sede" NOT NULL DEFAULT 'TRUJILLO';

WITH email_candidates AS (
  SELECT
    "id",
    translate(
      lower(
        CASE
          WHEN position(',' in "nombre") > 0 THEN split_part(trim(split_part("nombre", ',', 1)), ' ', 1)
          WHEN "nombre" = upper("nombre") THEN split_part(trim("nombre"), ' ', 1)
          ELSE regexp_replace(trim("nombre"), '^.*\s', '')
        END
      ),
      'áéíóúüñ',
      'aeiouun'
    ) AS local_part,
    row_number() OVER (
      PARTITION BY translate(
        lower(
          CASE
            WHEN position(',' in "nombre") > 0 THEN split_part(trim(split_part("nombre", ',', 1)), ' ', 1)
            WHEN "nombre" = upper("nombre") THEN split_part(trim("nombre"), ' ', 1)
            ELSE regexp_replace(trim("nombre"), '^.*\s', '')
          END
        ),
        'áéíóúüñ',
        'aeiouun'
      )
      ORDER BY "id"
    ) AS duplicate_number
  FROM "Docente"
  WHERE "rol" = 'DOCENTE'
)
UPDATE "Docente" AS docente
SET "email" = email_candidates.local_part
  || CASE WHEN email_candidates.duplicate_number > 1 THEN email_candidates.duplicate_number::text ELSE '' END
  || '@unitru.edu.pe'
FROM email_candidates
WHERE docente."id" = email_candidates."id";

CREATE TYPE "TipoPeriodoAcademico" AS ENUM ('SEMESTRAL', 'ANUAL_MEDICINA', 'NIVELACION');
ALTER TABLE "SemestreAcademico"
  ADD COLUMN "tipoPeriodo" "TipoPeriodoAcademico" NOT NULL DEFAULT 'SEMESTRAL',
  ADD COLUMN "facultad" TEXT;

CREATE TYPE "TipoMalla" AS ENUM ('SEMESTRAL', 'ANUAL');
CREATE TABLE "MallaCurricular" (
  "id" SERIAL NOT NULL,
  "anio" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "facultad" TEXT NOT NULL,
  "escuela" TEXT NOT NULL,
  "tipoPeriodo" "TipoMalla" NOT NULL DEFAULT 'SEMESTRAL',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MallaCurricular_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MallaCurricular_anio_escuela_key" ON "MallaCurricular"("anio", "escuela");
CREATE INDEX "MallaCurricular_anio_idx" ON "MallaCurricular"("anio");

INSERT INTO "MallaCurricular" ("anio", "nombre", "facultad", "escuela", "tipoPeriodo", "activo", "updatedAt")
SELECT DISTINCT "planAnio", 'Malla Curricular ' || "planAnio", 'Ingenieria',
  COALESCE(NULLIF("escuela", ''), 'Ingenieria de Sistemas'), 'SEMESTRAL'::"TipoMalla", true, CURRENT_TIMESTAMP
FROM "Curso"
ON CONFLICT ("anio", "escuela") DO NOTHING;

ALTER TABLE "Curso"
  ADD COLUMN "nivelPlan" TEXT NOT NULL DEFAULT '01 C',
  ADD COLUMN "seccion" TEXT NOT NULL DEFAULT 'U',
  ADD COLUMN "cantidadAlumnos" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lugares" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "otraAsignacion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mallaId" INTEGER;

UPDATE "Curso" SET "nivelPlan" = lpad(COALESCE("ciclo", 1)::text, 2, '0') || ' C';

UPDATE "Curso" AS curso
SET "mallaId" = malla."id"
FROM "MallaCurricular" AS malla
WHERE malla."anio" = curso."planAnio" AND malla."escuela" = curso."escuela";

ALTER TABLE "Curso"
  ADD CONSTRAINT "Curso_mallaId_fkey"
  FOREIGN KEY ("mallaId") REFERENCES "MallaCurricular"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Curso_mallaId_idx" ON "Curso"("mallaId");
