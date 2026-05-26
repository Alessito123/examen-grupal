-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('principal', 'asociado', 'auxiliar', 'jefe_practica', 'contratado');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'DOCENTE');

-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('teoria', 'laboratorio');

-- CreateEnum
CREATE TYPE "Dia" AS ENUM ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes');

-- CreateTable
CREATE TABLE "Docente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "antiguedad" INTEGER NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "rol" "Rol" NOT NULL DEFAULT 'DOCENTE',

    CONSTRAINT "Docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCurso" NOT NULL,
    "creditos" INTEGER NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCurso" NOT NULL,
    "capacidad" INTEGER NOT NULL,

    CONSTRAINT "Aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" SERIAL NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "aulaId" INTEGER NOT NULL,
    "dia" "Dia" NOT NULL,
    "horaInicio" TIMESTAMP(3) NOT NULL,
    "horaFin" TIMESTAMP(3) NOT NULL,
    "tipoCurso" "TipoCurso" NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaAsignacion" (
    "id" SERIAL NOT NULL,
    "prioridadCategoria" JSONB NOT NULL,
    "duracionCurso" INTEGER NOT NULL,

    CONSTRAINT "ReglaAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Docente_email_key" ON "Docente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Docente_resetToken_key" ON "Docente"("resetToken");

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Docente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
