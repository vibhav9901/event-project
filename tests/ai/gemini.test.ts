import { describe, expect, it } from 'vitest';
import { AiUnavailableError, createIdeasGenerator, type GeminiClient } from '../../src/ai/gemini';

type Params = Parameters<GeminiClient['models']['generateContent']>[0];
type Step = (params: Params) => Promise<{ text?: string }>;

const idea = (title: string) => ({ title, description: 'A fitting idea.', costLevel: 'low' });
const goodIdeas = { summary: 'A cosy garden party.', ideas: [idea('A'), idea('B'), idea('C')] };

const reply =
  (value: unknown): Step =>
  () =>
    Promise.resolve({ text: JSON.stringify(value) });
const rawText =
  (text: string): Step =>
  () =>
    Promise.resolve({ text });
const hangs: Step = () => new Promise(() => {});

function fakeClient(...steps: Step[]) {
  const calls: Params[] = [];
  const client: GeminiClient = {
    models: {
      generateContent: (params) => {
        calls.push(params);
        const step = steps[Math.min(calls.length - 1, steps.length - 1)];
        return step ? step(params) : Promise.reject(new Error('no step configured'));
      },
    },
  };
  return { client, calls };
}

const generator = (client: GeminiClient) =>
  createIdeasGenerator({
    client,
    model: 'test-model',
    timeoutMs: 20,
    backoffMs: 1,
    sleep: async () => {},
  });

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('createIdeasGenerator', () => {
  it('returns validated ideas and constrains the model output', async () => {
    const { client, calls } = fakeClient(reply(goodIdeas));
    expect(await generator(client).generate('{}')).toEqual(goodIdeas);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.model).toBe('test-model');
    expect(calls[0]?.config.responseMimeType).toBe('application/json');
    expect(calls[0]?.config.systemInstruction).toContain('untrusted');
  });

  it('retries once after malformed JSON', async () => {
    const { client, calls } = fakeClient(rawText('not json'), reply(goodIdeas));
    expect(await generator(client).generate('{}')).toEqual(goodIdeas);
    expect(calls).toHaveLength(2);
  });

  it('rejects output that violates the schema, then gives up', async () => {
    const tooFew = { summary: 's', ideas: [idea('A'), idea('B')] };
    const { client, calls } = fakeClient(reply(tooFew));
    expect(await rejectionOf(generator(client).generate('{}'))).toBeInstanceOf(AiUnavailableError);
    expect(calls).toHaveLength(2);
  });

  it('times out when the model never answers', async () => {
    const { client } = fakeClient(hangs);
    expect(await rejectionOf(generator(client).generate('{}'))).toBeInstanceOf(AiUnavailableError);
  });
});

describe('createIdeasGenerator safeguards', () => {
  it('rejects a response that leaks the per-request canary', async () => {
    const leak: Step = (params) =>
      Promise.resolve({
        text: JSON.stringify({
          ...goodIdeas,
          summary: params.config.systemInstruction.match(/CANARY_[a-f0-9]{32}/)?.[0] ?? 'no canary',
        }),
      });
    const { client } = fakeClient(leak);
    expect(await rejectionOf(generator(client).generate('{}'))).toBeInstanceOf(AiUnavailableError);
  });

  it('strips markup from model text before it reaches the UI', async () => {
    const dirty = {
      summary: '<b>Cosy</b> party',
      ideas: [idea('<img src=x onerror=alert(1)>Lanterns'), idea('B'), idea('C')],
    };
    const { client } = fakeClient(reply(dirty));
    const result = await generator(client).generate('{}');
    expect(result.summary).toBe('Cosy party');
    expect(result.ideas[0]?.title).toBe('Lanterns');
  });

  it('stops without retrying when the caller cancels', async () => {
    const controller = new AbortController();
    const { client, calls } = fakeClient(hangs);
    const pending = generator(client).generate('{}', controller.signal);
    controller.abort();
    expect(await rejectionOf(pending)).toBeInstanceOf(AiUnavailableError);
    expect(calls).toHaveLength(1);
  });
});
