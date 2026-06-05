CREATE TABLE IF NOT EXISTS "SemestreAcademico" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "ciclo" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SemestreAcademico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SemestreAcademico_codigo_key" ON "SemestreAcademico"("codigo");
CREATE INDEX IF NOT EXISTS "SemestreAcademico_activo_idx" ON "SemestreAcademico"("activo");
CREATE INDEX IF NOT EXISTS "SemestreAcademico_anio_ciclo_idx" ON "SemestreAcademico"("anio", "ciclo");
