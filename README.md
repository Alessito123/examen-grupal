# Examen Grupal – Sistema de Horarios
**Proyecto:** Aplicación web para la creación de horarios de la Escuela de Ingeniería de Sistemas  
**Universidad:** Universidad Nacional de Trujillo  
**Curso/Proyecto:** Ingeniería de Sistemas – Examen Grupal  
**Autor:** Alexander – Desarrollo profesional  

---

## Descripción
Este proyecto es un sistema web para la **generación automática de horarios** considerando la categoría y antigüedad de los docentes, tipos de cursos (teoría/laboratorio) y disponibilidad de aulas. Incluye:

- Dashboard interactivo con estadísticas descriptivas.
- Validación de conflictos de horarios.
- Reportes PDF operacionales y de gestión.
- Consulta de horarios por docente y por aula/laboratorio.
- Escalabilidad y seguridad mediante roles (admin/docente).

---

## Stack Tecnológico

| Capa                  | Tecnología                                   | Justificación |
|-----------------------|---------------------------------------------|---------------|
| Frontend              | Next.js + React + TypeScript                | SSR/SSG, tipado seguro, dashboards complejos |
| UI / Componentes      | Tailwind CSS + Shadcn/ui                     | Estilización rápida y consistente, accesible |
| Backend / API         | Next.js API Routes + tRPC                    | Monolito moderno con tipado extremo a extremo |
| ORM                   | Prisma                                       | Relaciones complejas y migraciones declarativas |
| Base de Datos         | PostgreSQL + Docker                           | Consistencia, transacciones, restricciones |
| Reportes PDF          | Puppeteer + React                             | Renderizado controlado y exportable a PDF |
| Motor de Asignación   | Servicio backend dedicado                     | Algoritmo de asignación transaccional y seguro |

---

## Estructura del Proyecto

```text
/project-root
├─ frontend/            # Componentes, layouts, páginas y hooks
├─ backend/             # API Routes, Services, Middleware, Prisma
├─ docker/              # Docker-compose para PostgreSQL + app
├─ scripts/             # Seed de datos y utilidades
├─ tests/               # Unit & Integration tests
├─ public/              # Assets e imágenes
├─ .prettierrc.js       # Configuración Prettier
├─ .eslintrc.js         # Configuración ESLint
├─ jest.config.js       # Configuración Jest
├─ tsconfig.json        # Configuración TypeScript
├─ package.json         # Dependencias y scripts
└─ README.md            # Documentación del proyecto
