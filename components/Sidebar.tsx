import React from 'react';
import { Home, MessageSquare, Settings, Sprout, Youtube, Leaf, Wind, Droplets, TrendingUp, Calendar, Beaker, Map, Zap, Mic } from 'lucide-react';
import { t, type MessageKey } from '../lib/i18n';
import { Language, ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  language: Language;
  onViewChange: (view: ViewState) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, language, onViewChange, isOpen, onClose }) => {
  const navItems: Array<{ view: ViewState; label: MessageKey; icon: typeof Mic; color: string }> = [
    { view: 'voice', label: 'nav_talk', icon: Mic, color: 'agri' },
    { view: 'dashboard', label: 'nav_dashboard', icon: Home, color: 'agri' },
    { view: 'disease', label: 'nav_disease', icon: Leaf, color: 'red' },
    { view: 'soil', label: 'nav_soil', icon: Sprout, color: 'green' },
    { view: 'irrigation', label: 'nav_irrigation', icon: Droplets, color: 'blue' },
    { view: 'market', label: 'nav_market', icon: TrendingUp, color: 'purple' },
    { view: 'alerts', label: 'nav_alerts', icon: Wind, color: 'orange' },
    { view: 'calendar', label: 'nav_calendar', icon: Calendar, color: 'indigo' },
    { view: 'fertilizer', label: 'nav_fertilizer', icon: Beaker, color: 'lime' },
    { view: 'locations', label: 'nav_locations', icon: Map, color: 'emerald' },
    { view: 'yield', label: 'nav_yield', icon: Zap, color: 'yellow' },
    { view: 'video', label: 'nav_video', icon: Youtube, color: 'rose' },
    { view: 'chat', label: 'nav_chat', icon: MessageSquare, color: 'agri' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-700 dark:bg-slate-900 md:static md:h-screen md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-lg bg-agri-700 p-2">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">AgriInsight</p>
              <p className="text-xs text-slate-500">AI</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => { onViewChange(item.view); onClose(); }}
                  className={`flex min-h-11 w-full items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri-700 ${
                    isActive
                      ? 'bg-agri-50 font-semibold text-agri-900 dark:bg-agri-900/40 dark:text-agri-100'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4 shrink-0" />
                  <span className="truncate">{t(language, item.label)}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => { onViewChange('settings'); onClose(); }}
              className={`mt-3 flex min-h-11 w-full items-center rounded-lg border-t border-slate-100 px-3 pt-3 text-sm dark:border-slate-800 ${
                currentView === 'settings'
                  ? 'bg-agri-50 font-semibold text-agri-900 dark:bg-agri-900/40 dark:text-agri-100'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="mr-3 h-4 w-4 shrink-0" />
              <span>{t(language, 'nav_settings')}</span>
            </button>
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-slate-400">
            <p>AgriInsight AI</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;