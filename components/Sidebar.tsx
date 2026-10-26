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

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      agri: { bg: 'bg-agri-50 dark:bg-agri-900/30', text: 'text-agri-700 dark:text-agri-400' },
      red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
      lime: { bg: 'bg-lime-50 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-400' },
      emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      rose: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400' },
    };
    return colorMap[color] || colorMap.agri;
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={onClose} />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center space-x-2 px-6 py-5 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
            <div className="bg-agri-600 p-2 rounded-lg">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 dark:text-white">AgriInsight</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              const colors = getColorClasses(item.color);
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => { onViewChange(item.view); onClose(); }}
                  className={`flex items-center w-full px-4 min-h-14 rounded-lg transition-colors text-sm ${
                    isActive
                      ? `${colors.bg} ${colors.text}`
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="font-medium truncate">{t(language, item.label)}</span>
                </button>
              );
            })}
            <button
              onClick={() => { onViewChange('settings'); onClose(); }}
              className={`flex items-center w-full px-4 min-h-14 rounded-lg transition-colors text-sm mt-4 border-t border-gray-100 dark:border-slate-700 ${
                currentView === 'settings'
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="font-medium">{t(language, 'nav_settings')}</span>
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