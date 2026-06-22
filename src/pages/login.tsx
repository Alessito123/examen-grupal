import React, { useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, ArrowRight, Loader2, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LoginBackgroundFallback = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-[#06060f] via-[#0d0722] to-[#040817]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-40" />
    <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[110px]" />
  </div>
);

const LoginBackground = dynamic(() => import('../components/LoginBackground'), {
  ssr: false,
  loading: LoginBackgroundFallback,
});
const CustomCursor = dynamic(() => import('../components/CustomCursor'), {
  ssr: false,
});

const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Focus and Pulse effects using GSAP
  const handleInputFocus = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) {
      gsap.to(inputRef.current, {
        borderColor: '#a855f7',
        boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)',
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const handleInputBlur = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) {
      gsap.to(inputRef.current, {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: 'none',
        scale: 1.0,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  // Shake effect for empty submissions
  const triggerShakeAnimation = () => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { x: 0 },
        {
          x: 10,
          duration: 0.05,
          repeat: 5,
          yoyo: true,
          ease: 'power1.inOut',
          onComplete: () => {
            gsap.set(formRef.current, { x: 0 });
          },
        }
      );
    }
  };

  // Click wave ripple effect on button
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('premium-ripple');

    const ripple = button.getElementsByClassName('premium-ripple')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      triggerShakeAnimation();
      setErrorToast('Por favor, completa todos los campos.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      triggerShakeAnimation();
      const errorMsg = err.response?.data?.message || 'Error al iniciar sesión';
      setErrorToast(errorMsg);
      setTimeout(() => setErrorToast(null), 4000);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Interactive Three.js Background */}
      <LoginBackground />

      {/* Futuristic Custom Cursor */}
      <CustomCursor />

      {/* Floating Error Toast Notification */}
      {errorToast && (
        <div className="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-red-500/90 dark:bg-red-950/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl border border-red-500/50 shadow-2xl animate-fade-in">
          <AlertCircle size={20} className="text-white shrink-0 animate-bounce" />
          <span className="text-sm font-semibold tracking-wide">{errorToast}</span>
        </div>
      )}

      {/* Loading overlay with futuristic spinner */}
      {loading && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="relative flex flex-col items-center gap-6">
            <div className="premium-spinner" />
            <h3 className="text-xl font-bold text-white tracking-widest uppercase animate-pulse">
              Verificando credenciales...
            </h3>
            <p className="text-xs text-purple-400 font-mono tracking-wider">
              Cifrando canal de autenticación
            </p>
          </div>
        </div>
      )}

      <AuthLayout>
        <div className="mb-8 select-none">
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            ¡Bienvenido de nuevo!
            <Sparkles className="text-purple-400 animate-pulse" size={24} />
          </h2>
          <p className="text-gray-400 mt-1.5 text-sm font-medium">Ingresa tus credenciales para acceder</p>
        </div>

        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="flex flex-col gap-6"
          noValidate
        >
          <div className="space-y-4">
            {/* Email Input */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
              <input
                ref={emailInputRef}
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => handleInputFocus(emailInputRef)}
                onBlur={() => handleInputBlur(emailInputRef)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => handleInputFocus(passwordInputRef)}
                onBlur={() => handleInputBlur(passwordInputRef)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:outline-none transition-all"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition-colors hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500/50" />
              <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none">Recordarme</label>
            </div>
            <Link href="/" className="text-xs text-purple-400 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>

          {/* Submit Button */}
          <button
            ref={submitButtonRef}
            type="submit"
            onClick={handleButtonClick}
            className="group relative w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:active:scale-100 overflow-hidden"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-2 select-none">
                Iniciar Sesión
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center select-none">
          <p className="text-sm text-gray-500 font-medium">
            ¿Eres nuevo? <Link href="/" className="text-white hover:underline font-semibold">Contacta con el administrador</Link>
          </p>
        </div>
      </AuthLayout>
    </div>
  );
};

export default LoginPage;
