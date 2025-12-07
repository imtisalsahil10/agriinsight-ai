import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Menu, Mic, MicOff, Languages, AlertCircle } from 'lucide-react';
import { generateResponse } from './services/geminiService';
import { Message, LoadingState, Language, ViewState, UserProfile } from './types';
import { WELCOME_MESSAGE, APP_NAME } from './constants';
import ChatBubble from './components/ChatBubble';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import VideoAnalysis from './components/VideoAnalysis';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);

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
  const [view, setView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en-US');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Stop recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Handle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Handlers
  const handleLogin = () => {
    setUser({
      name: 'Farmer John',
      type: 'user',
      email: 'farmer@example.com'
    });
  };

  const handleGuestLogin = () => {
    setUser({
      name: 'Guest Farmer',
      type: 'guest'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
    setIsSidebarOpen(false);
  };

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

  const startListening = () => {
    // 1. Browser Support Check
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechError("Voice input is not supported in this browser.");
      return;
    }

    // 2. Security Check (Web Speech API requires HTTPS)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setSpeechError("Voice input requires a secure HTTPS connection.");
      return;
    }

    // 3. Connectivity Check
    if (!navigator.onLine) {
      setSpeechError("You are offline. Voice input requires an internet connection.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language; // Set language immediately on creation

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = (event: any) => {
        // Filter out routine errors
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListening(false);
          return;
        }

        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMsg = "Voice input failed.";
        if (event.error === 'network') {
          errorMsg = "Network error: Browser speech service unreachable. Check connection or privacy settings.";
        } else if (event.error === 'not-allowed') {
          errorMsg = "Microphone blocked. Please allow permission in browser settings.";
        } else if (event.error === 'service-not-allowed') {
          errorMsg = "Speech service not allowed by this browser.";
        }
        
        setSpeechError(errorMsg);
        // Clear error after 5 seconds
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      console.error("Failed to initialize recognition", e);
      setSpeechError("Could not initialize voice input.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setSelectedImage(null);
    setLoadingState('loading');
    setSpeechError(null);
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    try {
      const { text: aiText, sources } = await generateResponse(
        newUserMessage.content,
        messages, 
        newUserMessage.image,
        language
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiText,
        sources: sources,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
      setLoadingState('idle');
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: language === 'hi-IN' 
          ? "क्षमा करें, आपके अनुरोध को संसाधित करते समय एक त्रुटि हुई। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।"
          : "I'm sorry, I encountered an error while processing your request. Please check your connection and try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      setLoadingState('error');
      
      setTimeout(() => setLoadingState('idle'), 2000);
    }
  }, [inputText, selectedImage, loadingState, messages, view, language]);

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
    if (!user) return null;

    switch (view) {
      case 'dashboard':
        return (
          <Dashboard 
            onQuickAction={(prompt) => sendMessage(prompt)} 
            language={language}
          />
        );
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
            user={user}
            onLogout={handleLogout}
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
                    {language === 'hi-IN' ? "विश्लेषण कर रहा है..." : "Analyzing data..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        );
    }
  };

  if (!user) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onGuestLogin={handleGuestLogin} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden transition-colors duration-200">
      
      {/* Sidebar */}
      <Sidebar 
        currentView={view} 
        onViewChange={setView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0 transition-colors">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mr-3 text-slate-500 dark:text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white hidden md:block">
              {view === 'dashboard' ? 'Dashboard' : 
               view === 'video' ? 'Video Analysis' : 
               view === 'settings' ? 'Settings' : 
               'Chat Assistant'}
            </h1>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white md:hidden">{APP_NAME}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleLanguage}
              className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                language === 'hi-IN' 
                  ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              {language === 'hi-IN' ? 'हिन्दी' : 'English'}
            </button>
            <div className="hidden md:block">
              <span className="text-xs bg-agri-100 text-agri-800 dark:bg-agri-900 dark:text-agri-300 px-2 py-1 rounded-full font-medium">
                Gemini 2.5
              </span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative">
          {renderContent()}
        </main>

        {/* Input Area - Only show in Chat view */}
        <div className={`bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 z-20 transition-all ${view !== 'chat' ? 'hidden' : 'block'}`}>
          <div className="max-w-3xl mx-auto">
            
            {/* Error Message */}
            {speechError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl flex items-center text-xs text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{speechError}</span>
                <button onClick={() => setSpeechError(null)} className="ml-auto text-red-400 hover:text-red-700 dark:hover:text-red-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`relative flex items-end bg-slate-100 dark:bg-slate-900 rounded-2xl border transition-all p-2 ${
                isListening ? 'border-red-400 ring-2 ring-red-100' : 'border-transparent focus-within:border-agri-400 focus-within:ring-2 focus-within:ring-agri-100 dark:focus-within:ring-agri-900'
              }`}>
              
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
                className="p-3 text-slate-500 dark:text-slate-400 hover:text-agri-600 dark:hover:text-agri-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Upload image"
              >
                <ImageIcon className="w-6 h-6" />
              </button>

              {/* Voice Button */}
              <button
                onClick={toggleListening}
                className={`p-3 rounded-xl transition-all mr-1 ${
                  isListening 
                    ? 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-agri-600 dark:hover:text-agri-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* Text Area */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening 
                    ? (language === 'hi-IN' ? "सुन रहा हूँ..." : "Listening...")
                    : (language === 'hi-IN' ? "फसल, कीट या मौसम के बारे में पूछें..." : "Ask about crops, pests, or weather...")
                }
                className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none py-3 px-2 leading-relaxed"
                rows={1}
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage()}
                disabled={(!inputText.trim() && !selectedImage) || loadingState !== 'idle'}
                className={`p-3 rounded-xl transition-all ${
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