import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { 
  Calendar, Users, Layout, Shield, BarChart3, Download, 
  ArrowRight, CheckCircle2, Globe, Star, Zap, Sparkles
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const LandingBackgroundFallback = () => (
  <div className="h-full w-full bg-[radial-gradient(circle_at_18%_22%,rgba(168,85,247,0.18)_0,transparent_2px),radial-gradient(circle_at_76%_30%,rgba(96,165,250,0.14)_0,transparent_1.5px),radial-gradient(circle_at_54%_72%,rgba(216,180,254,0.16)_0,transparent_2px)] bg-[length:180px_180px,230px_230px,280px_280px] opacity-60" />
);

const LandingHeroFallback = () => (
  <div className="h-full w-full">
    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/15 bg-purple-500/5 shadow-[0_0_100px_rgba(168,85,247,0.18)] blur-[1px]" />
    <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/10 blur-3xl" />
  </div>
);

const LandingBackground3D = dynamic(
  () => import('../components/LandingVisuals').then((module) => module.LandingBackground3D),
  { ssr: false, loading: () => null }
);
const LandingHero3D = dynamic(
  () => import('../components/LandingVisuals').then((module) => module.LandingHero3D),
  { ssr: false, loading: () => null }
);

// ==========================================
// Custom Cursor
// ==========================================

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let rafId: number;

    const updateCursor = () => {
      // Lerp for smooth trailing effect on the outer ring, instant for the inner dot is better
      // But user wants NO lag. We'll do instant movement for the whole thing to feel 100% responsive.
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
      rafId = requestAnimationFrame(updateCursor);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' || 
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('interactive-hover')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver);
    rafId = requestAnimationFrame(updateCursor);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(rafId);
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div 
      ref={cursorRef} 
      className={`fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform custom-cursor
        ${isHovered ? 'hovered' : ''}`}
      style={{ mixBlendMode: 'screen' }}
    >
      <div className="dot" />
    </div>
  );
};

// ==========================================
// Main Landing Page Component
// ==========================================

const LandingPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Initialize GSAP ScrollTriggers
    const sections = gsap.utils.toArray('.gsap-reveal');
    sections.forEach((section: any) => {
      gsap.fromTo(section, 
        { opacity: 0, y: 50 },
        { 
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
          },
          opacity: 1, 
          y: 0, 
          duration: 1,
          ease: 'power3.out'
        }
      );
    });

    // Parallax elements
    const parallaxElements = gsap.utils.toArray('.gsap-parallax');
    parallaxElements.forEach((el: any) => {
      const speed = el.dataset.speed || 1;
      gsap.to(el, {
        y: () => -50 * speed,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    });

  }, [mounted]);

  return (
    <div className="min-h-screen bg-[#05050A] text-white overflow-x-hidden selection:bg-purple-500 selection:text-white font-sans relative">
      <Head>
        <title>Examen Grupal | Gestión de Horarios Inteligente</title>
        <meta name="description" content="Plataforma moderna y futurista para la gestión de horarios académicos" />
      </Head>

      {/* Global Custom CSS injected directly to satisfy requirements */}
      <style jsx global>{`
        /* Futuristic Hardware-Accelerated Custom Cursor */
        .custom-cursor {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #a855f7;
          margin-top: -16px;
          margin-left: -16px;
          transition: width 0.2s ease-out, 
                      height 0.2s ease-out, 
                      background-color 0.2s ease-out, 
                      border-color 0.2s ease-out, 
                      margin-top 0.2s ease-out, 
                      margin-left 0.2s ease-out;
        }
        
        .custom-cursor.hovered {
          width: 80px;
          height: 80px;
          margin-top: -40px;
          margin-left: -40px;
          background-color: rgba(168, 85, 247, 0.15);
          backdrop-filter: blur(2px);
          border-color: #c084fc;
        }

        .custom-cursor .dot {
          width: 4px;
          height: 4px;
          background-color: #c084fc;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: opacity 0.2s ease;
        }

        .custom-cursor.hovered .dot {
          opacity: 0;
        }

        /* Hide scrollbar for a cleaner look */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #05050A;
        }
        ::-webkit-scrollbar-thumb {
          background: #3b0764;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6b21a8;
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        
        .text-gradient-futuristic {
          background: linear-gradient(135deg, #e879f9 0%, #c084fc 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .animate-spin-reverse {
          animation: spin-reverse 2s linear infinite;
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .hero-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(0,0,0,0) 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {mounted && <CustomCursor />}

      {/* Global 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <LandingBackgroundFallback />
        <div className="absolute inset-0">
          <LandingBackground3D />
        </div>
      </div>

      {/* Futuristic Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 interactive-hover">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Calendar className="text-white w-5 h-5 relative z-10" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Horarios<span className="text-purple-500">Pro</span></span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors hidden md:block">
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="group relative flex items-center gap-1.5 overflow-hidden rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative z-10">Comenzar Ahora</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Immersive 3D Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="hero-glow" />
        
        {/* 3D Canvas Layer for Hero */}
        <div className="absolute inset-0 z-0 flex items-center justify-end pr-[10%] opacity-30 md:opacity-100 pointer-events-none md:pointer-events-auto">
          <div className="w-full h-full md:w-[600px] md:h-[600px] absolute right-0">
            <LandingHeroFallback />
            <div className="absolute inset-0">
              <LandingHero3D />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-purple-500/30 text-xs font-semibold text-purple-300 mb-8 w-fit shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Plataforma Académica v2.0</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
              Diseña el Futuro <br />
              <span className="text-gradient-futuristic">de tus Horarios</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-lg">
              Conecta docentes, cursos y aulas en un ecosistema inteligente. Resuelve conflictos automáticamente y genera reportes impecables en segundos.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/login" 
                className="group px-8 py-4 bg-purple-600/90 backdrop-blur-md border border-purple-500/50 text-white rounded-2xl font-bold text-lg hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2"
              >
                Acceder al Sistema
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features" 
                className="px-8 py-4 glass-panel text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center"
              >
                Explorar Funciones
              </a>
            </div>

            {/* Quick stats below hero */}
            <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <h4 className="text-3xl font-black text-white mb-1">+200</h4>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Docentes</p>
              </div>
              <div>
                <h4 className="text-3xl font-black text-white mb-1">99%</h4>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Precisión</p>
              </div>
              <div>
                <h4 className="text-3xl font-black text-white mb-1">10x</h4>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Más rápido</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 px-6 relative border-t border-white/5 bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 gsap-reveal">
            <h2 className="text-4xl md:text-5xl font-black mb-4">El Flujo <span className="text-purple-400">Perfecto</span></h2>
            <p className="text-gray-400">Tres pasos simples para el control total de tu institución</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-purple-900 via-purple-500 to-purple-900 -translate-y-1/2 opacity-30 z-0" />
            
            {[
              { icon: <Users />, title: "Ingresa Datos", desc: "Registra docentes, cursos y aulas con nuestra interfaz ultra rápida." },
              { icon: <Zap />, title: "Asignación IA", desc: "El motor valida antigüedades y previene cruces de horarios al instante." },
              { icon: <Download />, title: "Exporta & Listo", desc: "Genera reportes PDF profesionales para directivos y docentes." }
            ].map((step, i) => (
              <div key={i} className="gsap-reveal relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 rounded-full glass-panel border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                  {React.cloneElement(
                    step.icon as React.ReactElement<{ className?: string }>,
                    { className: 'w-8 h-8' }
                  )}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 gsap-reveal">
            <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Potencia <span className="text-purple-400">Arquitectónica</span></h2>
            <p className="text-gray-400">Construido para instituciones que exigen rendimiento y fiabilidad</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="gsap-reveal" data-speed="1.1">
              <FeatureCard 
                icon={<Shield className="w-6 h-6" />}
                title="Seguridad de Grado Bancario"
                description="Autenticación robusta con bcrypt y tokens JWT. Control de roles estricto entre Administradores y Docentes."
              />
            </div>
            <div className="gsap-reveal" data-speed="0.9">
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6" />}
                title="Dashboards Dinámicos"
                description="Visualiza en tiempo real estadísticas inmersivas. Los docentes ven exclusivamente su carga académica filtrada."
              />
            </div>
            <div className="gsap-reveal" data-speed="1.2">
              <FeatureCard 
                icon={<Globe className="w-6 h-6" />}
                title="Reglas Académicas"
                description="Motor integrado que valida intercambios de horarios basados estrictamente en la antigüedad y categoría docente."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 px-6 bg-purple-900/5 border-y border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full" />
          
          <div className="text-center mb-20 gsap-reveal">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Lo que dicen los <span className="text-purple-400">Directores</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Dr. Carlos Mendoza", role: "Decano de Ingeniería", quote: "HorariosPro transformó nuestro caos de planillas Excel en un ecosistema ordenado y libre de conflictos en solo semanas." },
              { name: "Dra. Elena Ramos", role: "Directora Académica", quote: "La regla de antigüedad automática para intercambios nos ha ahorrado incontables horas de mediación entre docentes." },
              { name: "Ing. Luis Alcantara", role: "Coordinador IT", quote: "La exportación a PDF y la interfaz futurista hacen que usar la plataforma sea un deleite visual y funcional." }
            ].map((t, i) => (
              <div key={i} className="gsap-reveal glass-panel p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-colors">
                <div className="flex gap-1 mb-6 text-yellow-500">
                  <Star fill="currentColor" className="w-4 h-4" /><Star fill="currentColor" className="w-4 h-4" /><Star fill="currentColor" className="w-4 h-4" /><Star fill="currentColor" className="w-4 h-4" /><Star fill="currentColor" className="w-4 h-4" />
                </div>
                <p className="text-gray-300 italic mb-8">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-lg">
                    {t.name.charAt(4)}
                  </div>
                  <div>
                    <h4 className="font-bold">{t.name}</h4>
                    <p className="text-xs text-purple-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 gsap-reveal">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Planes para tu <span className="text-purple-400">Escala</span></h2>
            <p className="text-gray-400">Invierte en la tranquilidad de tu gestión académica</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Basic */}
            <div className="gsap-reveal glass-panel p-8 rounded-3xl border border-white/5">
              <h3 className="text-xl font-bold text-gray-300 mb-2">Básico</h3>
              <div className="text-4xl font-black mb-6">Gratis</div>
              <ul className="space-y-4 mb-8 text-gray-400 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Hasta 50 Docentes</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Dashboard General</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Exportación básica</li>
              </ul>
              <button className="w-full py-3 rounded-xl glass-panel border border-white/10 hover:bg-white/5 transition-colors font-bold">Empezar</button>
            </div>

            {/* Pro (Highlighted) */}
            <div className="gsap-reveal bg-gradient-to-b from-purple-900/40 to-indigo-900/40 p-10 rounded-3xl border border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.2)] transform md:-translate-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold px-4 py-1 rounded-bl-xl">POPULAR</div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Profesional</h3>
              <div className="text-5xl font-black mb-6">$99<span className="text-lg text-gray-400 font-normal">/mes</span></div>
              <ul className="space-y-4 mb-8 text-gray-200 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Docentes Ilimitados</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Reglas de Antigüedad</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Reportes Premium PDF</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Soporte Prioritario</li>
              </ul>
              <Link href="/login" className="block text-center w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-colors font-bold">Probar Gratis</Link>
            </div>

            {/* Enterprise */}
            <div className="gsap-reveal glass-panel p-8 rounded-3xl border border-white/5">
              <h3 className="text-xl font-bold text-gray-300 mb-2">Empresa</h3>
              <div className="text-4xl font-black mb-6">A medida</div>
              <ul className="space-y-4 mb-8 text-gray-400 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Múltiples Facultades</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Integración API (ERP)</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-purple-500" /> SLA Garantizado</li>
              </ul>
              <button className="w-full py-3 rounded-xl glass-panel border border-white/10 hover:bg-white/5 transition-colors font-bold">Contactar Ventas</button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Teaser */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[300px]">
            <div className="gsap-reveal md:col-span-2 glass-panel p-10 rounded-[2.5rem] flex flex-col justify-end group hover:border-purple-500/30 transition-colors overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-0" />
              <div className="relative z-10">
                <Users className="w-12 h-12 text-purple-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-3xl font-bold mb-2">Gestión de Docentes</h3>
                <p className="text-gray-400">Asigna roles, categorías y controla la antigüedad fácilmente.</p>
              </div>
            </div>
            <div className="gsap-reveal md:col-span-2 bg-gradient-to-br from-purple-800 to-indigo-900 p-10 rounded-[2.5rem] flex flex-col justify-end shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[50px] group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <Layout className="w-12 h-12 text-pink-400 mb-6 group-hover:rotate-12 transition-transform" />
                <h3 className="text-3xl font-bold text-white mb-2">Editor Visual</h3>
                <p className="text-purple-200">Crea horarios complejos con una interfaz interactiva impecable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="pt-20 pb-10 px-6 border-t border-white/10 bg-[#020205] relative overflow-hidden">
        {/* Subtle footer glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-purple-900/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-16 border-b border-white/5 pb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="text-purple-500 w-6 h-6" />
                <span className="text-2xl font-bold text-white">HorariosPro</span>
              </div>
              <p className="text-gray-500 max-w-sm">
                Transformando la manera en que las instituciones educativas planifican, gestionan y distribuyen su carga académica mediante tecnología 3D e Inteligencia.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Producto</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-purple-400 transition-colors">Características</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Actualizaciones v2.0</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-purple-400 transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Términos de Servicio</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Contacto UNT</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-600 text-sm">
            <div>© 2026 HorariosPro. Desarrollado para la Escuela de Ingeniería de Sistemas - UNT.</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistemas Operativos (All green)
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass-panel p-10 rounded-[2rem] border border-white/5 hover:border-purple-500/40 transition-all duration-300 group h-full">
    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4 tracking-tight text-white group-hover:text-purple-200 transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
