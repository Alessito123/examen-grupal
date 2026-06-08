import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Clipboard,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Volume2,
  X,
} from 'lucide-react';
import { trpc } from '../utils/trpc';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  restricted?: boolean;
  suggestions?: string[];
};

type ChatbotWidgetProps = {
  user: {
    id: number;
    nombre: string;
    rol: 'ADMIN' | 'DOCENTE';
  } | null;
};

const createMessage = (role: ChatRole, content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  ...extra,
});

const getInitialMessage = (rol?: string): ChatMessage => createMessage(
  'assistant',
  rol === 'ADMIN'
    ? 'Hola. Estoy operando como Admin y puedo consultar horarios, aulas, docentes y ocupación completa con datos reales.'
    : 'Hola. Estoy operando como Docente: puedo consultar tus horarios y aulas libres, respetando la privacidad de otros docentes.',
  {
    suggestions: [
      '¿Qué aulas están libres el martes a las 11?',
      '¿El aula 102 está ocupada el miércoles a las 15:30?',
      rol === 'ADMIN' ? '¿Qué docentes están disponibles el viernes a las 8?' : '¿Tengo clase hoy?',
    ],
  }
);

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = React.useState(false);
  const [volume, setVolume] = React.useState(0.85);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);

  const storageKey = user ? `horariospro-chatbot-${user.id}` : 'horariospro-chatbot';

  React.useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setMessages([getInitialMessage(user.rol)]);
  }, [storageKey, user]);

  React.useEffect(() => {
    if (!user || messages.length === 0) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
  }, [messages, storageKey, user]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  const askMutation = trpc.chatbot.ask.useMutation({
    onSuccess: (data: any) => {
      setMessages((current) => [
        ...current,
        createMessage('assistant', data.answer, {
          restricted: data.restricted,
          suggestions: data.suggestions || [],
        }),
      ]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        createMessage('assistant', `No pude completar la consulta: ${error.message}`, {
          restricted: true,
          suggestions: ['Intenta con día y hora específicos', 'Revisa si tu sesión sigue activa'],
        }),
      ]);
    },
  });

  const sendMessage = (text = input) => {
    const content = text.trim();
    if (!content || askMutation.isPending) return;

    const userMessage = createMessage('user', content);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    askMutation.mutate({
      message: content,
      history: messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((current) => [
        ...current,
        createMessage('assistant', 'Tu navegador no expone reconocimiento de voz. Puedes escribir la consulta en el chat.'),
      ]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setInput(transcript);
      if (event.results[event.results.length - 1]?.isFinal && transcript) {
        sendMessage(transcript);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const speak = (content: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/\n/g, '. '));
    utterance.lang = 'es-PE';
    utterance.volume = volume;
    utterance.rate = 0.98;
    window.speechSynthesis.speak(utterance);
  };

  const copyMessage = async (content: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(content);
  };

  const clearHistory = () => {
    const initial = getInitialMessage(user?.rol);
    setMessages([initial]);
    localStorage.setItem(storageKey, JSON.stringify([initial]));
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className="mb-4 w-[calc(100vw-2.5rem)] sm:w-[430px] h-[620px] max-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a] shadow-2xl flex flex-col"
          >
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/[0.02] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20 shrink-0">
                  <Bot size={23} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">Asistente de horarios</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      user.rol === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                    }`}>
                      <ShieldCheck size={11} />
                      {user.rol === 'ADMIN' ? 'Admin' : 'Docente'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 truncate">
                      {user.rol === 'ADMIN' ? 'Acceso total' : 'Privacidad activa'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-white transition-colors shrink-0"
                title="Cerrar chat"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-100 border border-gray-200 dark:border-white/5'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
                    {message.restricted && (
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                        Respuesta con restricciones de rol
                      </div>
                    )}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.slice(0, 3).map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => sendMessage(suggestion)}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                              message.role === 'user'
                                ? 'bg-white/15 hover:bg-white/25 text-white'
                                : 'bg-white dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-500/20'
                            }`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.role === 'assistant' && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => speak(message.content)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 border border-gray-200 dark:border-white/10 transition-colors"
                          title="Reproducir respuesta"
                        >
                          <Volume2 size={12} />
                          Reproducir
                        </button>
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 border border-gray-200 dark:border-white/10 transition-colors"
                          title="Copiar respuesta"
                        >
                          <Clipboard size={12} />
                          Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 text-sm bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-300 flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" />
                    Verificando datos reales...
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-white/5 p-4 space-y-3 bg-white dark:bg-[#0f0f1a]">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={clearHistory}
                  className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpiar historial
                </button>
                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                  <Volume2 size={13} />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    className="w-20 accent-purple-600"
                    title="Volumen"
                  />
                </label>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Pregunta por aulas, docentes u horarios..."
                  className="flex-1 resize-none rounded-2xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    isListening
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300'
                  }`}
                  title={isListening ? 'Detener micrófono' : 'Hablar'}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || askMutation.isPending}
                  className="h-11 w-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20 shrink-0"
                  title="Enviar"
                >
                  {askMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((value) => !value)}
        className="h-14 w-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-2xl shadow-purple-600/30 transition-all active:scale-95"
        title="Abrir asistente de horarios"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </div>
  );
};

export default ChatbotWidget;
