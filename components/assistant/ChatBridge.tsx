import React from 'react';
import { usePageAssistant } from './context';
import { explainView } from '../../lib/assistant/copy';
import type { Language } from '../../types';

const ChatBridge: React.FC<{ language: Language; latest: string }> = ({ language, latest }) => {
  usePageAssistant({
    view: 'chat',
    language,
    explain: () => explainView('chat', language),
    read: () => (latest.trim() ? latest : null),
    apply: () => undefined,
    missing: () => [],
    run: async () => ({
      ok: false,
      summary: language === 'hi-IN'
        ? 'चैट सवालों का जवाब देती है। फॉर्म चलाने के लिए उस टूल का पेज खोलें।'
        : 'Chat answers questions. Ask me to open a tool when you want a form filled and run.',
    }),
  });
  return null;
};

export default ChatBridge;
