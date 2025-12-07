import React from 'react';
import { QuickAction } from '../types';
import { QUICK_ACTIONS } from '../constants';

interface QuickActionsProps {
  onActionSelect: (prompt: string) => void;
  disabled: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionSelect, disabled }) => {
  return (
    <div className="flex flex-nowrap md:flex-wrap gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
      {QUICK_ACTIONS.map((action: QuickAction) => (
        <button
          key={action.id}
          onClick={() => onActionSelect(action.prompt)}
          disabled={disabled}
          className={`flex-shrink-0 flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
        >
          <span className="mr-2 opacity-75">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;