import React from 'react';
import { Home, MessageSquare, Settings, Sprout, Youtube } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Brand */}
          <div className="flex items-center space-x-2 px-6 py-5 border-b border-gray-100 dark:border-slate-700">
            <div className="bg-agri-600 p-2 rounded-lg">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 dark:text-white">AgriInsight</span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <button
              onClick={() => { onViewChange('dashboard'); onClose(); }}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                currentView === 'dashboard' 
                  ? 'bg-agri-50 dark:bg-agri-900/30 text-agri-700 dark:text-agri-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button
              onClick={() => { onViewChange('video'); onClose(); }}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                currentView === 'video' 
                  ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Youtube className="w-5 h-5 mr-3" />
              <span className="font-medium">Video Analysis</span>
            </button>

            <button
              onClick={() => { onViewChange('chat'); onClose(); }}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                currentView === 'chat' 
                  ? 'bg-agri-50 dark:bg-agri-900/30 text-agri-700 dark:text-agri-400' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5 mr-3" />
              <span className="font-medium">Recent Chat</span>
            </button>

            <button
              onClick={() => { onViewChange('settings'); onClose(); }}
              className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                currentView === 'settings' 
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              <span className="font-medium">Settings</span>
            </button>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-slate-400">
            <p>AgriInsight AI</p>
            <p className="text-xs mt-1">Powered by Gemini</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;