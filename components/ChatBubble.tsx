import React, { useState } from 'react';
import { Message } from '../types';
import { Bot, User, ExternalLink, Volume2, Square } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    
    // Simple language detection based on character ranges for Devanagari
    const hasHindi = /[\u0900-\u097F]/.test(message.content);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
    
    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes(utterance.lang));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mx-2 ${isUser ? 'bg-blue-600' : 'bg-agri-600'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col p-4 rounded-2xl shadow-sm relative group transition-colors ${
          isUser 
            ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-800 dark:text-gray-100 rounded-tr-none' 
            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-tl-none'
        }`}>
          
          {/* TTS Button (Only for model messages) */}
          {!isUser && (
            <button 
              onClick={handleSpeak}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-agri-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-all opacity-0 group-hover:opacity-100"
              title="Read Aloud"
            >
              {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {/* Attached Image */}
          {message.image && (
            <div className="mb-3">
              <img 
                src={message.image} 
                alt="Uploaded by user" 
                className="max-h-60 rounded-lg object-cover border border-gray-200 dark:border-slate-700"
              />
            </div>
          )}

          {/* Content */}
          <div className="text-sm md:text-base pr-4">
            <MarkdownRenderer content={message.content} />
          </div>

          {/* Sources / Grounding */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    <span className="truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Timestamp */}
          <div className="text-[10px] text-gray-400 dark:text-gray-400 mt-2 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;