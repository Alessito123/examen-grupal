ALTER TABLE "Curso" ALTER COLUMN "tipoPlan" SET DEFAULT 'O';

UPDATE "Curso"
SET "tipoPlan" = CASE
  WHEN "tipoPlan" = 'S' THEN 'EP'
  WHEN "tipoPlan" = 'OB' THEN 'O'
  WHEN "tipoPlan" IN ('OP', 'EL') THEN 'E'
  ELSE "tipoPlan"
END;

UPDATE "Curso"
SET "lugares" = ARRAY['F11']::TEXT[]
WHERE cardinality("lugares") = 0;

UPDATE "Docente"
SET
  "facultad" = 'Ingenieria',
  "departamento" = regexp_replace(
    replace(replace("departamento", 'Ingeniería', 'Ingenieria'), 'Departamento de ', ''),
    '^\s+|\s+$',
    '',
    'g'
  ),
  "escuela" = replace("escuela", 'Ingeniería', 'Ingenieria')
WHERE "facultad" IN ('Ingenieria', 'Ingeniería');

UPDATE "MallaCurricular"
SET
  "facultad" = replace("facultad", 'Ingeniería', 'Ingenieria'),
  "escuela" = replace("escuela", 'Ingeniería', 'Ingenieria');
