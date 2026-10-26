import React, { useState, useEffect, useRef } from 'react';
import { Languages, Shield, Info, Bell, Moon, ChevronRight, X } from 'lucide-react';
import type { FieldPrefs } from '../lib/field/prefs';
import { t } from '../lib/i18n';

interface SettingsProps {
  language: 'en-US' | 'hi-IN';
  onToggleLanguage: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  weatherAlerts: boolean;
  onToggleWeatherAlerts: () => void;
  field: FieldPrefs;
  onField: (prefs: FieldPrefs) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  language, 
  onToggleLanguage, 
  darkMode, 
  onToggleDarkMode,
  weatherAlerts,
  onToggleWeatherAlerts,
  field,
  onField,
}) => {
  const isHindi = language === 'hi-IN';
  const [showPrivacy, setShowPrivacy] = useState(false);
  const privacyTriggerRef = useRef<HTMLButtonElement>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  // Handle focus management for modal
  useEffect(() => {
    if (showPrivacy) {
      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
      
      // Set focus to close button initially
      // Timeout ensures the element is rendered in DOM
      setTimeout(() => {
        modalCloseRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowPrivacy(false);
        }
        // Basic focus trap
        if (e.key === 'Tab') {
            const modal = document.getElementById('privacy-modal-content');
            if (modal) {
                const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                const first = focusable[0] as HTMLElement;
                const last = focusable[focusable.length - 1] as HTMLElement;
                
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        // Return focus to trigger
        if (privacyTriggerRef.current) {
            privacyTriggerRef.current.focus();
        }
      };
    }
  }, [showPrivacy]);

  const sections = [
    {
      title: isHindi ? "सामान्य" : "General",
      items: [
        {
          icon: <Languages className="w-5 h-5 text-blue-500" />,
          label: isHindi ? "भाषा (Language)" : "Language",
          value: isHindi ? "हिन्दी" : "English",
          action: onToggleLanguage,
          type: "toggle",
          active: isHindi
        },
        {
          icon: <Moon className="w-5 h-5 text-indigo-500" />,
          label: isHindi ? "डार्क मोड" : "Dark Mode",
          value: darkMode ? "On" : "Off",
          action: onToggleDarkMode,
          type: "switch",
          active: darkMode
        }
      ]
    },
    {
      title: isHindi ? "सूचनाएं" : "Notifications",
      items: [
        {
          icon: <Bell className="w-5 h-5 text-amber-500" />,
          label: isHindi ? "मौसम अलर्ट" : "Weather Alerts",
          value: weatherAlerts ? "On" : "Off",
          action: onToggleWeatherAlerts,
          type: "switch",
          active: weatherAlerts
        }
      ]
    },
    {
      title: isHindi ? "जानकारी" : "About",
      items: [
        {
          icon: <Shield className="w-5 h-5 text-emerald-500" />,
          label: isHindi ? "गोपनीयता नीति" : "Privacy Policy",
          action: () => setShowPrivacy(true),
          type: "link",
          active: false
        },
        {
          icon: <Info className="w-5 h-5 text-gray-500" />,
          label: isHindi ? "संस्करण" : "Version",
          value: "1.0.0",
          action: () => {},
          type: "info",
          active: false
        }
      ]
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
        {isHindi ? "सेटिंग्स" : "Settings"}
      </h1>

      <div className="space-y-6">

        {/* Settings Sections */}
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors" role="region" aria-label={section.title}>
            <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {section.items.map((item, itemIdx) => {
                const isPrivacyLink = item.type === 'link' && (item.label === "Privacy Policy" || item.label === "गोपनीयता नीति");
                return (
                  <button
                    key={itemIdx}
                    ref={isPrivacyLink ? privacyTriggerRef : null}
                    onClick={item.action}
                    role={item.type === 'switch' ? 'switch' : 'button'}
                    aria-checked={item.type === 'switch' ? item.active : undefined}
                    className="w-full flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-slate-700 focus:ring-2 focus:ring-inset focus:ring-agri-500 transition-all text-left group"
                  >
                    <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-lg mr-4 transition-colors group-hover:bg-white dark:group-hover:bg-slate-600 group-focus:bg-white dark:group-focus:bg-slate-600" aria-hidden="true">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-gray-200">{item.label}</p>
                    </div>
                    <div className="flex items-center text-slate-500 dark:text-slate-400">
                      {item.type === 'switch' && (
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors mr-3 ${item.active ? 'bg-agri-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.active ? 'translate-x-4' : ''}`} />
                        </div>
                      )}
                      {item.type !== 'switch' && (
                        <span className="text-sm mr-2">{item.value}</span>
                      )}
                      {(item.type === 'link' || item.type === 'toggle') && (
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t(language, 'field_title')}</h3>
        {([
          ['lowBandwidth', 'field_low'],
          ['highContrast', 'field_contrast'],
          ['largeText', 'field_text'],
          ['wakeWord', 'field_wake'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={field[key]}
            onClick={() => onField({ ...field, [key]: !field[key] })}
            className="w-full min-h-14 flex items-center justify-between text-left"
          >
            <span className="font-medium text-slate-800 dark:text-gray-200">{t(language, label)}</span>
            <span className={`w-10 h-6 rounded-full p-1 ${field[key] ? 'bg-agri-500' : 'bg-gray-300'}`}>
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${field[key] ? 'translate-x-4' : ''}`} />
            </span>
          </button>
        ))}
        <p className="text-xs text-slate-500">{t(language, 'field_wake_help')}</p>
        <label className="block">
          <span className="font-medium text-slate-800 dark:text-gray-200">{t(language, 'field_rate')} ({field.speechRate.toFixed(1)})</span>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.1}
            value={field.speechRate}
            onChange={(event) => onField({ ...field, speechRate: Number(event.target.value) })}
            className="w-full min-h-14"
          />
          <span className="text-xs text-slate-500">{t(language, 'field_rate_help')}</span>
        </label>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            id="privacy-modal-content"
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h2 id="modal-title" className="text-xl font-bold text-slate-800 dark:text-white">
                {isHindi ? "गोपनीयता नीति" : "Privacy Policy"}
              </h2>
              <button 
                ref={modalCloseRef}
                onClick={() => setShowPrivacy(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-agri-500"
                aria-label={isHindi ? "बंद करें" : "Close"}
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-slate-600 dark:text-slate-300 space-y-4" tabIndex={0}>
              <p>Last updated: October 2023</p>
              <p>
                At AgriInsight AI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you use our mobile application and website.
              </p>
              <h3 className="font-bold text-slate-800 dark:text-white">1. Data Collection</h3>
              <p>
                We collect personal information that you voluntarily provide to us when registering at the application, specifically your name and farm location for weather services. We use Google Gemini API to process your queries.
              </p>
              <h3 className="font-bold text-slate-800 dark:text-white">2. Use of Your Information</h3>
              <p>
                Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we use information collected about you via the Application to:
              </p>
              <ul className="list-disc ml-5 mt-2">
                <li>Generate a personal profile about you.</li>
                <li>Provide location-based weather forecasts.</li>
                <li>Analyze crop images to detect diseases.</li>
              </ul>
              <h3 className="font-bold text-slate-800 dark:text-white">3. Third-Party Tools</h3>
              <p>
                We use Google's Generative AI services. Please refer to Google's Privacy Policy for details on how they handle data processed through their APIs.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full py-3 bg-agri-600 hover:bg-agri-700 text-white font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-500"
              >
                {isHindi ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;