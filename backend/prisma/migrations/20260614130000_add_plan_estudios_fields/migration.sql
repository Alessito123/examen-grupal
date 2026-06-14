ALTER TABLE "Curso"
ADD COLUMN "tipoPlan" TEXT NOT NULL DEFAULT 'S',
ADD COLUMN "escuela" TEXT NOT NULL DEFAULT 'Ingenieria de Sistemas',
ADD COLUMN "departamentoResponsable" TEXT NOT NULL DEFAULT 'INGENIERIA DE SISTEMAS',
ADD COLUMN "planAnio" INTEGER NOT NULL DEFAULT 2018,
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Curso_planAnio_idx" ON "Curso"("planAnio");
CREATE INDEX "Curso_ciclo_idx" ON "Curso"("ciclo");
CREATE INDEX "Curso_tipoPlan_idx" ON "Curso"("tipoPlan");
