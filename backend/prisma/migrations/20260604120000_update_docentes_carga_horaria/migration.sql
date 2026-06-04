-- Create enums safely for existing production databases.
DO $$
BEGIN
  CREATE TYPE "Condicion" AS ENUM ('NOMBRADO', 'CONTRATADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "Dedicacion" AS ENUM ('TC_40H', 'DE_EXCLUSIVA', 'TP_20H', 'TP', 'TP_8H', 'TP_10H', 'TP_12H', 'TP_16H');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TipoActividad" AS ENUM ('LECTIVA', 'NO_LECTIVA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "Dia" ADD VALUE IF NOT EXISTS 'Sabado';

-- Add new columns before changing Categoria so existing "contratado" rows can be normalized.
ALTER TABLE "Docente"
  ADD COLUMN IF NOT EXISTS "antiguedad" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "codigoIBM" TEXT,
  ADD COLUMN IF NOT EXISTS "condicion" "Condicion" NOT NULL DEFAULT 'NOMBRADO',
  ADD COLUMN IF NOT EXISTS "dedicacion" "Dedicacion" NOT NULL DEFAULT 'TC_40H',
  ADD COLUMN IF NOT EXISTS "departamento" TEXT NOT NULL DEFAULT 'Departamento de Ingeniería de Sistemas',
  ADD COLUMN IF NOT EXISTS "disponibilidad" TEXT,
  ADD COLUMN IF NOT EXISTS "dni" TEXT,
  ADD COLUMN IF NOT EXISTS "escuela" TEXT NOT NULL DEFAULT 'Ingeniería de Sistemas',
  ADD COLUMN IF NOT EXISTS "facultad" TEXT NOT NULL DEFAULT 'Ingeniería',
  ADD COLUMN IF NOT EXISTS "fechaContrato" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fechaNombramiento" TIMESTAMP(3);

ALTER TABLE "Docente" ALTER COLUMN "antiguedad" SET DEFAULT 0;

UPDATE "Docente"
SET "condicion" = 'CONTRATADO'
WHERE "categoria"::text = 'contratado';

-- Replace Categoria enum only when the legacy value still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'Categoria'
      AND e.enumlabel = 'contratado'
  ) THEN
    CREATE TYPE "Categoria_new" AS ENUM ('principal', 'asociado', 'auxiliar', 'jefe_practica', 'profesor', 'alumno');
    ALTER TABLE "Docente"
      ALTER COLUMN "categoria" TYPE "Categoria_new"
      USING (
        CASE
          WHEN "categoria"::text = 'contratado' THEN 'profesor'
          ELSE "categoria"::text
        END::"Categoria_new"
      );
    ALTER TYPE "Categoria" RENAME TO "Categoria_old";
    ALTER TYPE "Categoria_new" RENAME TO "Categoria";
    DROP TYPE "Categoria_old";
  END IF;
END $$;

ALTER TABLE "Aula"
  ADD COLUMN IF NOT EXISTS "ubicacion" TEXT DEFAULT 'Pabellón de Sistemas';

ALTER TABLE "Curso"
  ADD COLUMN IF NOT EXISTS "ciclo" INTEGER,
  ADD COLUMN IF NOT EXISTS "codigo" TEXT,
  ADD COLUMN IF NOT EXISTS "horasLaboratorio" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "horasPractica" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "horasTeoria" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Curso" ALTER COLUMN "tipo" SET DEFAULT 'teoria';

ALTER TABLE "Horario" DROP CONSTRAINT IF EXISTS "Horario_aulaId_fkey";
ALTER TABLE "Horario" DROP CONSTRAINT IF EXISTS "Horario_cursoId_fkey";

ALTER TABLE "Horario"
  ADD COLUMN IF NOT EXISTS "actividadNoLectiva" TEXT,
  ADD COLUMN IF NOT EXISTS "grupo" TEXT,
  ADD COLUMN IF NOT EXISTS "semestre" TEXT NOT NULL DEFAULT '2026-I',
  ADD COLUMN IF NOT EXISTS "tipoActividad" "TipoActividad" NOT NULL DEFAULT 'LECTIVA',
  ALTER COLUMN "cursoId" DROP NOT NULL,
  ALTER COLUMN "aulaId" DROP NOT NULL,
  ALTER COLUMN "tipoCurso" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "Notificacion" (
  "id" SERIAL NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "docenteId" INTEGER,
  "visto" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DisponibilidadDocente" (
  "id" SERIAL NOT NULL,
  "docenteId" INTEGER NOT NULL,
  "semestre" TEXT NOT NULL,
  "bloques" TEXT NOT NULL,
  CONSTRAINT "DisponibilidadDocente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CargaNoLectiva" (
  "id" SERIAL NOT NULL,
  "docenteId" INTEGER NOT NULL,
  "semestre" TEXT NOT NULL,
  "preparacionEvaluacion" INTEGER NOT NULL DEFAULT 0,
  "consejeria" INTEGER NOT NULL DEFAULT 0,
  "investigacion" INTEGER NOT NULL DEFAULT 0,
  "capacitacion" INTEGER NOT NULL DEFAULT 0,
  "gobierno" INTEGER NOT NULL DEFAULT 0,
  "administracion" INTEGER NOT NULL DEFAULT 0,
  "asesoriaTesis" INTEGER NOT NULL DEFAULT 0,
  "responsabilidadSocial" INTEGER NOT NULL DEFAULT 0,
  "comisiones" INTEGER NOT NULL DEFAULT 0,
  "otros" INTEGER NOT NULL DEFAULT 0,
  "detallesConsejeria" TEXT,
  "detallesInvestigacion" TEXT,
  "detallesAsesoria" TEXT,
  "detallesResponsabilidad" TEXT,
  "detallesComisiones" TEXT,
  CONSTRAINT "CargaNoLectiva_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_DocenteCursos" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "DisponibilidadDocente_docenteId_semestre_key" ON "DisponibilidadDocente"("docenteId", "semestre");
CREATE UNIQUE INDEX IF NOT EXISTS "CargaNoLectiva_docenteId_semestre_key" ON "CargaNoLectiva"("docenteId", "semestre");
CREATE UNIQUE INDEX IF NOT EXISTS "_DocenteCursos_AB_unique" ON "_DocenteCursos"("A", "B");
CREATE INDEX IF NOT EXISTS "_DocenteCursos_B_index" ON "_DocenteCursos"("B");
CREATE UNIQUE INDEX IF NOT EXISTS "Docente_dni_key" ON "Docente"("dni");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Horario_aulaId_fkey') THEN
    ALTER TABLE "Horario" ADD CONSTRAINT "Horario_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Horario_cursoId_fkey') THEN
    ALTER TABLE "Horario" ADD CONSTRAINT "Horario_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DisponibilidadDocente_docenteId_fkey') THEN
    ALTER TABLE "DisponibilidadDocente" ADD CONSTRAINT "DisponibilidadDocente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CargaNoLectiva_docenteId_fkey') THEN
    ALTER TABLE "CargaNoLectiva" ADD CONSTRAINT "CargaNoLectiva_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_DocenteCursos_A_fkey') THEN
    ALTER TABLE "_DocenteCursos" ADD CONSTRAINT "_DocenteCursos_A_fkey" FOREIGN KEY ("A") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_DocenteCursos_B_fkey') THEN
    ALTER TABLE "_DocenteCursos" ADD CONSTRAINT "_DocenteCursos_B_fkey" FOREIGN KEY ("B") REFERENCES "Docente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
