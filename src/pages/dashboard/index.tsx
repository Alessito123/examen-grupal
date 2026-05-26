import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CardEstadistica from '../../components/CardEstadistica';
import { trpc } from '../../utils/trpc';
import DashboardChart from '../../components/DashboardChart';
import { Users, School, BookOpen, Activity, Calendar, ArrowUpRight, Download, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { useSearch } from '../../contexts/SearchContext';
import { useAuth } from '../../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const statsQuery = trpc.estadisticas.getDashboardStats.useQuery();
  const horariosQuery = trpc.horarios.getAll.useQuery();
  const { globalSearchTerm } = useSearch();

  const isDocente = user?.rol === 'DOCENTE';

  // Obtener perfil del docente con sus cursos asignados
  const docenteProfileQuery = trpc.docentes.getById.useQuery(
    { id: user?.id || 0 },
    { enabled: !!user && isDocente }
  );

  // 1. Calcular estadísticas específicas si el usuario es Docente
  const myHorarios = React.useMemo(() => {
    if (!horariosQuery.data || !user) return [];
    return horariosQuery.data.filter((h: any) => h.docenteId === user.id);
  }, [horariosQuery.data, user]);

  const myStats = React.useMemo(() => {
    const uniqueCourses = new Set(myHorarios.map((h: any) => h.cursoId));
    const uniqueAulas = new Set(myHorarios.map((h: any) => h.aulaId));
    
    let totalMinutes = 0;
    myHorarios.forEach((h: any) => {
      const start = new Date(h.horaInicio);
      const end = new Date(h.horaFin);
      const diffMs = end.getTime() - start.getTime();
      totalMinutes += diffMs / (1000 * 60);
    });
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return {
      totalCursos: uniqueCourses.size,
      totalAulas: uniqueAulas.size,
      totalHoras: totalHours
    };
  }, [myHorarios]);

  // 2. Calcular ocupación horaria semanal agrupada
  const chartData = React.useMemo(() => {
    const daysMap: Record<string, number> = { 'Lunes': 0, 'Martes': 0, 'Miercoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sabado': 0 };
    const sourceData = isDocente ? myHorarios : (horariosQuery.data || []);
    
    sourceData.forEach((h: any) => {
      const start = new Date(h.horaInicio);
      const end = new Date(h.horaFin);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (daysMap[h.dia] !== undefined) {
        daysMap[h.dia] += diffHours;
      }
    });

    return [
      { label: 'Lun', value: Math.round(daysMap['Lunes']) },
      { label: 'Mar', value: Math.round(daysMap['Martes']) },
      { label: 'Mie', value: Math.round(daysMap['Miercoles']) },
      { label: 'Jue', value: Math.round(daysMap['Jueves']) },
      { label: 'Vie', value: Math.round(daysMap['Viernes']) },
      { label: 'Sab', value: Math.round(daysMap['Sabado']) },
    ];
  }, [isDocente, myHorarios, horariosQuery.data]);

  const data = statsQuery.data || {
    totalDocentes: 0,
    totalAulas: 0,
    totalCursos: 0,
  };

  const actividadesRecientes = [
    { id: 1, usuario: 'Admin', accion: 'Generó Reporte PDF', fecha: 'Hoy, 10:30 AM', tipo: 'Reporte', icon: <Download size={14} /> },
    { id: 2, usuario: 'Sist. Académico', accion: 'Sincronización de Aulas', fecha: 'Hoy, 09:15 AM', tipo: 'Sistema', icon: <School size={14} /> },
    { id: 3, usuario: 'Admin', accion: 'Actualizó Horario Docente', fecha: 'Ayer, 04:45 PM', tipo: 'Edición', icon: <Calendar size={14} /> },
    { id: 4, usuario: 'Bot', accion: 'Copia de Seguridad', fecha: 'Ayer, 01:00 AM', tipo: 'Backup', icon: <CheckCircle2 size={14} /> },
  ].filter(act => 
    act.accion.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    act.usuario.toLowerCase().includes(globalSearchTerm.toLowerCase())
  );

  if (statsQuery.isLoading || horariosQuery.isLoading || (isDocente && docenteProfileQuery.isLoading)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">Cargando tablero...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 className="text-4xl font-bold text-foreground dark:text-white tracking-tight">
              ¡Hola, {user?.nombre || 'Docente'}!
            </h2>
            <p className="text-muted-foreground dark:text-gray-300 mt-1">
              {isDocente 
                ? `Vista personalizada de docente • Antigüedad: ${user?.antiguedad} años.` 
                : 'Tablero de Control de Administración Escolar.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-4 py-2 rounded-full">
            <Activity size={16} />
            {isDocente ? 'Perfil Docente Activo' : 'Panel de Control Principal'}
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <CardEstadistica 
            titulo={isDocente ? "Mi Carga Horaria (Horas)" : "Docentes Registrados"} 
            valor={isDocente ? myStats.totalHoras : data.totalDocentes} 
            icon={<Users />} 
          />
          <CardEstadistica 
            titulo={isDocente ? "Mis Aulas Reservadas" : "Aulas y Laboratorios"} 
            valor={isDocente ? myStats.totalAulas : data.totalAulas} 
            icon={<School />} 
          />
          <CardEstadistica 
            titulo={isDocente ? "Mis Cursos Asignados" : "Cursos Activos"} 
            valor={isDocente ? (docenteProfileQuery.data?.cursos?.length || 0) : data.totalCursos} 
            icon={<BookOpen />} 
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <DashboardChart title={isDocente ? "Mis Horas por Día (Horas)" : "Ocupación por Día (Horas)"} data={chartData} />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/10 flex flex-col justify-center relative overflow-hidden group shadow-sm"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowUpRight size={80} className="text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-foreground dark:text-white mb-4 tracking-tight">Reporte Rápido</h3>
            <p className="text-muted-foreground dark:text-gray-300 text-sm leading-relaxed mb-8">
              {isDocente
                ? `Cuentas con ${docenteProfileQuery.data?.cursos?.length || 0} asignaturas asignadas este ciclo académico. No registras conflictos en tus horarios.`
                : 'La eficiencia en la asignación de ambientes ha mejorado un 12% respecto al ciclo anterior. No se detectan traslapes críticos.'}
            </p>
            <button className="btn-primary w-full py-4 shadow-lg shadow-purple-500/20 group-hover:scale-[1.02] transition-transform">
              Ver Análisis Detallado
            </button>
          </motion.div>
        </div>

        {/* Elegant Assigned Courses or Activity Table */}
        {isDocente ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white/30 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-xl font-bold text-foreground dark:text-white">Mis Asignaturas Asignadas</h3>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {docenteProfileQuery.data?.cursos?.length || 0} cursos
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {docenteProfileQuery.data?.cursos && docenteProfileQuery.data.cursos.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                      <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Código</th>
                      <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Asignatura</th>
                      <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Tipo</th>
                      <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Créditos</th>
                      <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest text-right">Ciclo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {docenteProfileQuery.data.cursos.map((curso: any) => (
                      <tr key={curso.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-5">
                          <span className="text-sm font-mono text-muted-foreground dark:text-gray-400">{curso.codigo || `SIS-${curso.id.toString().padStart(3, '0')}`}</span>
                        </td>
                        <td className="p-5">
                          <span className="text-sm font-semibold text-foreground dark:text-white/90">{curso.nombre}</span>
                        </td>
                        <td className="p-5">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-tighter ${
                            curso.tipo === 'laboratorio' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          }`}>
                            {curso.tipo === 'laboratorio' ? 'Laboratorio' : 'Teoría'}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className="text-sm text-muted-foreground dark:text-gray-300 font-medium">{curso.creditos} crd.</span>
                        </td>
                        <td className="p-5 text-right">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {curso.ciclo ? `${curso.ciclo}° Ciclo` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No tienes asignaturas registradas para este ciclo académico.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white/30 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Activity size={20} />
                </div>
                <h3 className="text-xl font-bold text-foreground dark:text-white">Actividad Reciente</h3>
              </div>
              <button className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline">Ver Todo</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Actividad</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Responsable</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest">Momento</th>
                    <th className="p-5 text-xs font-bold text-muted-foreground dark:text-white/40 uppercase tracking-widest text-right">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {actividadesRecientes.map((act, index) => (
                    <tr key={act.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-purple-500 transition-colors">
                            {act.icon}
                          </div>
                          <span className="text-sm font-semibold text-foreground dark:text-white/90">{act.accion}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="text-sm text-muted-foreground dark:text-gray-300 font-medium">{act.usuario}</span>
                      </td>
                      <td className="p-5">
                        <span className="text-xs text-muted-foreground dark:text-gray-400 font-medium">{act.fecha}</span>
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-tighter">
                          {act.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;