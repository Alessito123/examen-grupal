ALTER TABLE "CargaNoLectiva"
ADD COLUMN IF NOT EXISTS "detallesGobierno" TEXT,
ADD COLUMN IF NOT EXISTS "detallesAdministracion" TEXT;
