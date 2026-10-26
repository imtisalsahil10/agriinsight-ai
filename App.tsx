import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Menu, Languages } from 'lucide-react';
import { generateResponse, streamResponse, analyzeDiseaseFromImage } from './services/geminiService';
import { Message, LoadingState, Language, ViewState } from './types';
import { WELCOME_MESSAGE, APP_NAME } from './constants';
import { buildMorningBriefing } from './lib/briefing';
import { dueReminders, loadFarm, markReminderNotified, rememberSummary, syncFarm, updateFarm } from './lib/farm/store';
import { loadFieldPrefs, saveFieldPrefs, type FieldPrefs } from './lib/field/prefs';
import { t } from './lib/i18n';
import { detectLanguageSwitch } from './lib/i18n/detect';
import { downscaleImage } from './lib/image/downscale';
import { diagnoseCropDisease } from './lib/tools/disease';
import { rememberLeafImage } from './lib/tools/registry';
import type { ToolResult } from './lib/tools/types';
import { VOICE_PROMPT_HINT } from './lib/voice/copy';
import { createVoiceProvider } from './lib/voice/createProvider';
import { isLeafRequest } from './lib/voice/leaf';
import { createVoiceSession } from './lib/voice/session';
import { initialState } from './lib/voice/sessionMachine';
import type { SessionState, VoiceSession } from './lib/voice/types';
import ChatBubble from './components/ChatBubble';
import Sidebar from './components/Sidebar';
import LeafCapture from './components/voice/LeafCapture';
import VoiceHome from './components/voice/VoiceHome';
import Dashboard from './components/Dashboard';
import VideoAnalysis from './components/VideoAnalysis';
import Settings from './components/Settings';
import DiseaseDetection from './components/DiseaseDetection';
import SoilAnalysis from './components/SoilAnalysis';
import IrrigationScheduleView from './components/IrrigationSchedule';
import MarketPrices from './components/MarketPrices';
import WeatherAlerts from './components/WeatherAlerts';
import CropCalendar from './components/CropCalendar';
import FertilizerGuide from './components/FertilizerGuide';
import MultiLocations from './components/MultiLocations';
import YieldPrediction from './components/YieldPrediction';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

function cacheAdvice(text: string): void {
  try {
    localStorage.setItem('agriinsight_last_advice', text);
  } catch {
    // private mode
  }
  if (typeof caches === 'undefined') return;
  void caches.open('agriinsight-advice').then((cache) => cache.put(
    '/advice.json',
    new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } }),
  ));
}

const App: React.FC = () => {
  // App State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: WELCOME_MESSAGE,
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [view, setView] = useState<ViewState>('voice');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en-US');
  const [voiceState, setVoiceState] = useState<SessionState>(initialState());
  const [toolCards, setToolCards] = useState<ToolResult[]>([]);
  const [leafOpen, setLeafOpen] = useState(false);
  const [field, setField] = useState<FieldPrefs>(() => loadFieldPrefs());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [lastAdvice, setLastAdvice] = useState('');
  const [reminderText, setReminderText] = useState<string | null>(null);
  
  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<VoiceSession | null>(null);
  const languageRef = useRef(language);
  const messagesRef = useRef(messages);
  const viewRef = useRef(view);
  languageRef.current = language;
  viewRef.current = view;

  const remember = useCallback((message: Message) => {
    const next = [...messagesRef.current, message];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  useEffect(() => {
    const session = createVoiceSession({
      provider: createVoiceProvider({
        language: () => languageRef.current,
        lowBandwidth: () => loadFieldPrefs().lowBandwidth,
      }),
      language: () => languageRef.current,
      history: () => messagesRef.current
        .filter((message) => message.id !== 'welcome' && message.content.trim().length > 0)
        .slice(-20)
        .map((message) => ({ role: message.role, content: message.content })),
      reply: (request) => streamResponse(
        `${VOICE_PROMPT_HINT}\n\n${request.prompt}`,
        request.history,
        request.language,
        request.onDelta,
        request.signal,
      ),
      onUser: (text) => {
        const nextLanguage = detectLanguageSwitch(text);
        if (nextLanguage) setLanguage(nextLanguage);
        if (isLeafRequest(text)) setLeafOpen(true);
        remember({
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
      },
      onAssistant: (result) => {
        rememberSummary(result.text);
        cacheAdvice(result.text);
        setLastAdvice(result.text);
        remember({
          id: crypto.randomUUID(),
          role: 'model',
          content: result.text,
          sources: result.sources,
          timestamp: Date.now(),
        });
      },
      onTool: (result) => {
        setToolCards((cards) => [result, ...cards].slice(0, 4));
        cacheAdvice(result.summary);
        setLastAdvice(result.summary);
      },
    });
    sessionRef.current = session;
    const unsubscribe = session.subscribe(setVoiceState);
    return () => {
      unsubscribe();
      session.dispose();
      sessionRef.current = null;
    };
  }, [remember]);

  // Handle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', field.highContrast);
    document.documentElement.classList.toggle('large-text', field.largeText);
  }, [field.highContrast, field.largeText]);

  useEffect(() => {
    const stored = localStorage.getItem('agriinsight_last_advice');
    if (stored) setLastAdvice(stored);
    const onStatus = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncFarm();
    };
    window.addEventListener('online', onStatus);
    window.addEventListener('offline', onStatus);
    return () => {
      window.removeEventListener('online', onStatus);
      window.removeEventListener('offline', onStatus);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const due = dueReminders();
      const next = due[0];
      if (!next) return;
      markReminderNotified(next.id);
      setReminderText(next.text);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AgriInsight', { body: next.text });
      }
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleWeatherAlerts = async () => {
    if (!weatherAlerts) {
      // Request permission
      if (!('Notification' in window)) {
        alert("This browser does not support desktop notification");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setWeatherAlerts(true);
        new Notification("AgriInsight AI", { body: "Weather alerts enabled! We'll notify you of storms." });
      }
    } else {
      setWeatherAlerts(false);
    }
  };

  useEffect(() => {
    if (viewRef.current !== 'voice') {
      sessionRef.current?.stop();
    }
  }, [view]);

  const playBriefing = async () => {
    const farm = loadFarm();
    if (typeof farm.latitude !== 'number' && navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition((position) => {
          updateFarm({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location: farm.location || 'This device',
          });
          resolve();
        }, () => resolve(), { timeout: 8000 });
      });
    }
    const briefing = await buildMorningBriefing();
    setToolCards(briefing.cards.slice(0, 4));
    rememberSummary(briefing.script);
    cacheAdvice(briefing.script);
    setLastAdvice(briefing.script);
    remember({
      id: crypto.randomUUID(),
      role: 'model',
      content: briefing.script,
      timestamp: Date.now(),
    });
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(briefing.script);
      utterance.lang = languageRef.current;
      utterance.rate = loadFieldPrefs().speechRate;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const onLeaf = async (dataUrl: string) => {
    setLeafOpen(false);
    const prefs = loadFieldPrefs();
    const image = await downscaleImage(dataUrl, prefs.lowBandwidth ? 512 : 768, prefs.lowBandwidth ? 0.5 : 0.7);
    rememberLeafImage(image);
    const result = await diagnoseCropDisease(image, analyzeDiseaseFromImage);
    setToolCards((cards) => [result, ...cards].slice(0, 4));
    cacheAdvice(result.summary);
    setLastAdvice(result.summary);
    remember({
      id: crypto.randomUUID(),
      role: 'user',
      content: languageRef.current === 'hi-IN' ? 'पत्ती की फोटो' : 'Leaf photo',
      image,
      timestamp: Date.now(),
    });
    remember({
      id: crypto.randomUUID(),
      role: 'model',
      content: result.summary,
      timestamp: Date.now(),
    });
    sessionRef.current?.inject(result.summary);
  };

  const onMic = () => {
    const session = sessionRef.current;
    if (!session) return;
    const phase = session.getState().phase;
    if (phase === 'thinking' || phase === 'speaking') {
      session.bargeIn();
      return;
    }
    if (phase === 'listening') {
      session.release();
      return;
    }
    void session.start();
  };

  // Auto-scroll to bottom in chat view
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingState, view]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Handlers
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
        setView('chat'); // Switch to chat when image selected
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const sendMessage = useCallback(async (text: string = inputText) => {
    if ((!text.trim() && !selectedImage) || loadingState !== 'idle') return;

    // Switch to chat view if sending from dashboard
    if (view === 'dashboard' || view === 'video' || view === 'settings') {
      setView('chat');
    }

    const userMessageId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: text,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    const prior = messagesRef.current;
    remember(newUserMessage);
    setInputText('');
    setSelectedImage(null);
    setLoadingState('loading');
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
      const { text: aiText, sources } = await generateResponse(
        newUserMessage.content,
        prior,
        newUserMessage.image,
        language
      );

      remember({
        id: crypto.randomUUID(),
        role: 'model',
        content: aiText,
        sources: sources,
        timestamp: Date.now()
      });
      setLoadingState('idle');
    } catch (error) {
      console.error(error);
      remember({
        id: crypto.randomUUID(),
        role: 'model',
        content: t(language, 'chat_error'),
        timestamp: Date.now()
      });
      setLoadingState('error');
      
      setTimeout(() => setLoadingState('idle'), 2000);
    }
  }, [inputText, selectedImage, loadingState, view, language, remember]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en-US' ? 'hi-IN' : 'en-US');
  };

  // Render content based on current view
  const renderContent = () => {
    switch (view) {
      case 'voice':
        return (
          <VoiceHome
            language={language}
            messages={messages}
            state={voiceState}
            tools={toolCards}
            onMic={onMic}
            onMode={(mode) => sessionRef.current?.setMode(mode)}
            onOpenDashboard={() => setView('dashboard')}
            onBriefing={() => { void playBriefing(); }}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            onQuickAction={(prompt) => sendMessage(prompt)}
            onNavigate={(viewId) => setView(viewId as ViewState)}
            language={language}
          />
        );
      case 'disease':
        return <DiseaseDetection language={language} onAnalyze={analyzeDiseaseFromImage} />;
      case 'soil':
        return <SoilAnalysis language={language} />;
      case 'irrigation':
        return <IrrigationScheduleView language={language} />;
      case 'market':
        return <MarketPrices language={language} />;
      case 'alerts':
        return <WeatherAlerts language={language} />;
      case 'calendar':
        return <CropCalendar language={language} />;
      case 'fertilizer':
        return <FertilizerGuide language={language} />;
      case 'locations':
        return <MultiLocations language={language} />;
      case 'yield':
        return <YieldPrediction language={language} />;
      case 'video':
        return (
          <VideoAnalysis 
            language={language}
          />
        );
      case 'settings':
        return (
          <Settings 
            language={language}
            onToggleLanguage={toggleLanguage}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            weatherAlerts={weatherAlerts}
            onToggleWeatherAlerts={toggleWeatherAlerts}
            field={field}
            onField={(prefs) => setField(saveFieldPrefs(prefs))}
          />
        );
      case 'chat':
      default:
        return (
          <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {loadingState === 'loading' && (
              <div className="flex justify-start mb-6">
                <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                  <Loader2 className="w-5 h-5 text-agri-600 animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t(language, 'chat_analyzing')}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden transition-colors duration-200">
      
      {/* Sidebar */}
      <Sidebar 
        currentView={view}
        language={language}
        onViewChange={setView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0 transition-colors">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t(language, 'menu_open')}
              className="md:hidden mr-3 min-h-14 min-w-14 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white hidden md:block">
              {view === 'voice' ? t(language, 'header_talk') :
               view === 'dashboard' ? t(language, 'header_dashboard') :
               view === 'video' ? t(language, 'header_video') :
               view === 'settings' ? t(language, 'header_settings') :
               view === 'chat' ? t(language, 'header_chat') :
               t(language, 'header_app')}
            </h1>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white md:hidden">{APP_NAME}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleLanguage}
              className={`flex items-center min-h-14 px-4 rounded-full text-xs font-bold transition-all border ${
                language === 'hi-IN' 
                  ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              {language === 'hi-IN' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </header>

        {/* View Content */}
        {!online && (
          <div role="status" className="bg-amber-100 text-amber-950 px-4 py-3 text-sm">
            <p className="font-semibold">{t(language, 'offline')}</p>
            {lastAdvice && <p className="mt-1">{t(language, 'last_advice')}: {lastAdvice}</p>}
          </div>
        )}
        {reminderText && (
          <div role="status" className="bg-agri-50 text-agri-900 px-4 py-3 text-sm flex items-center justify-between gap-3">
            <p>{reminderText}</p>
            <button type="button" className="min-h-14 font-semibold" onClick={() => setReminderText(null)}>{t(language, 'voice_close')}</button>
          </div>
        )}
        <main className={`flex-1 relative min-h-0 ${view === 'voice' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto scroll-smooth'}`}>
          {renderContent()}
        </main>
        {leafOpen && <LeafCapture language={language} onClose={() => setLeafOpen(false)} onCapture={(dataUrl) => { void onLeaf(dataUrl); }} />}

        {/* Input Area - Only show in Chat view */}
        <div className={`bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 z-20 transition-all ${view !== 'chat' ? 'hidden' : 'block'}`}>
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end bg-slate-100 dark:bg-slate-900 rounded-2xl border border-transparent focus-within:border-agri-400 focus-within:ring-2 focus-within:ring-agri-100 dark:focus-within:ring-agri-900 transition-all p-2">
              
              {/* Image Preview */}
              {selectedImage && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                  <div className="relative">
                    <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                    <button 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="min-h-14 min-w-14 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-agri-600 dark:hover:text-agri-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
                title={t(language, 'chat_upload')}
                aria-label={t(language, 'chat_upload')}
              >
                <ImageIcon className="w-6 h-6" />
              </button>

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(language, 'chat_placeholder')}
                className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none py-3 px-2 leading-relaxed"
                rows={1}
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage()}
                disabled={(!inputText.trim() && !selectedImage) || loadingState !== 'idle'}
                aria-label={t(language, 'chat_send')}
                className={`min-h-14 min-w-14 inline-flex items-center justify-center rounded-xl transition-all ${
                  (!inputText.trim() && !selectedImage) || loadingState !== 'idle'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-agri-600 text-white hover:bg-agri-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;