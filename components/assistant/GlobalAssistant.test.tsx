import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalAssistant from './GlobalAssistant';
import { ASSISTANT_VIEWS } from '../../lib/assistant/types';
import { initialState } from '../../lib/voice/sessionMachine';
import type { ViewState } from '../../types';

const EVERY_VIEW: ViewState[] = [
  'voice', 'dashboard', 'chat', 'video', 'disease', 'soil', 'irrigation', 'market',
  'alerts', 'calendar', 'fertilizer', 'locations', 'yield', 'settings',
];

describe('global assistant shell', () => {
  it('renders on the shared shell for every route', () => {
    expect([...ASSISTANT_VIEWS].sort()).toEqual([...EVERY_VIEW].sort());
    const html = renderToStaticMarkup(
      <GlobalAssistant
        language="en-US"
        state={initialState()}
        dock="page"
        onMic={() => undefined}
        onStop={() => undefined}
        onSubmit={async () => null}
      />,
    );
    expect(html).toContain('data-assistant-root');
    expect(html).toContain('Open voice assistant');
  });
});
