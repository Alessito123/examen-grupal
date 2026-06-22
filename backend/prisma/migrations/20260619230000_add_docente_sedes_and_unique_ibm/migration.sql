ALTER TABLE "Docente"
  ADD COLUMN "sedes" "Sede"[] NOT NULL DEFAULT ARRAY['TRUJILLO']::"Sede"[];

UPDATE "Docente"
SET "sedes" = ARRAY["sede"]::"Sede"[];

ALTER TABLE "Docente"
  DROP COLUMN "sede";

CREATE UNIQUE INDEX "Docente_codigoIBM_key" ON "Docente"("codigoIBM");
