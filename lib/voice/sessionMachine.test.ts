import { describe, expect, it } from 'vitest';
import { initialState, transition } from './sessionMachine';

describe('voice session machine', () => {
  it('walks a push-to-talk turn from idle back to idle', () => {
    let state = initialState('push-to-talk');
    state = transition(state, { type: 'start' }).state;
    expect(state.phase).toBe('listening');
    state = transition(state, { type: 'partial', text: 'hel' }).state;
    state = transition(state, { type: 'heard', text: 'hello' }).state;
    expect(state.phase).toBe('thinking');
    expect(state.finalTranscript).toBe('hello');
    state = transition(state, { type: 'assistant', text: 'Rain tonight.' }).state;
    state = transition(state, { type: 'first-audio' }).state;
    expect(state.phase).toBe('speaking');
    state = transition(state, { type: 'spoken-done' }).state;
    expect(state.phase).toBe('idle');
  });

  it('returns to listening after speech in hands-free mode', () => {
    let state = initialState('hands-free');
    state = transition(state, { type: 'start' }).state;
    state = transition(state, { type: 'heard', text: 'hello' }).state;
    state = transition(state, { type: 'first-audio' }).state;
    state = transition(state, { type: 'spoken-done' }).state;
    expect(state.phase).toBe('listening');
  });

  it('barge-in from thinking or speaking starts listening again', () => {
    let state = initialState();
    state = transition(state, { type: 'start' }).state;
    state = transition(state, { type: 'heard', text: 'hello' }).state;
    const interrupted = transition(state, { type: 'barge-in' });
    expect(interrupted.accepted).toBe(true);
    expect(interrupted.state.phase).toBe('listening');
    expect(interrupted.state.assistantText).toBe('');
  });

  it('rejects illegal transitions', () => {
    const idle = initialState();
    expect(transition(idle, { type: 'heard', text: 'hello' }).accepted).toBe(false);
    expect(transition(idle, { type: 'barge-in' }).accepted).toBe(false);
    expect(transition(idle, { type: 'spoken-done' }).accepted).toBe(false);
    expect(transition(idle, { type: 'start' }).state.phase).toBe('listening');
    const listening = transition(idle, { type: 'start' }).state;
    expect(transition(listening, { type: 'start' }).accepted).toBe(false);
    expect(transition(listening, { type: 'heard', text: '   ' }).accepted).toBe(false);
  });

  it('speaks a silence error and then goes idle, including in hands-free', () => {
    let state = initialState('hands-free');
    state = transition(state, { type: 'start' }).state;
    state = transition(state, { type: 'silence', message: "I couldn't hear you. Please try again." }).state;
    expect(state.phase).toBe('speaking');
    expect(state.announcingError).toBe(true);
    state = transition(state, { type: 'spoken-done' }).state;
    expect(state.phase).toBe('idle');
    expect(state.assistantText).toBe('');
    expect(state.error).toBe("I couldn't hear you. Please try again.");
  });
});
