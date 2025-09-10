'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import SpectrumVisualizer from './SpectrumVisualizer';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { MicrophoneButton } from './MicrophoneButton';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { WebhookLogsLink } from './WebhookLogsLink';

type Entry = { role: string; text: string; ts: number; turnId?: string };

export default function VoiceAgent() {
  const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  if (!agentId) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm tracking-widest uppercase text-neutral-400">Layercode Voice Agent</span>
          </div>
        </div>
        <div className="rounded-md border border-red-900/50 bg-red-950/40 text-red-300 p-4">Error: NEXT_PUBLIC_LAYERCODE_AGENT_ID is not set.</div>
      </div>
    );
  }
  return <VoiceAgentInner agentId={agentId} />;
}

function VoiceAgentInner({ agentId }: { agentId: string }) {
  const { userAudioAmplitude, agentAudioAmplitude, status } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    _websocketUrl: 'wss://api-staging.layercode.com/v1/agents/web/websocket'
  });

  // Transcript state (placeholder until wired to messages)
  const [entries] = useState<Entry[]>([]);
  const [turn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [vadStatus] = useState<'idle' | 'speech' | 'silence' | 'failed'>('idle');
  const userTurnIndex = useRef<Record<string, number>>({});
  const assistantTurnIndex = useRef<Record<string, number>>({});
  void userTurnIndex;
  void assistantTurnIndex;

  const userAccent = useMemo(() => '#9B62FF', []);
  const assistantAccent = useMemo(() => '#9B62FF', []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm tracking-widest uppercase text-neutral-400">Layercode Voice Agent</span>
          <span className="text-neutral-700">/</span>
          <ConnectionStatusIndicator status={status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-neutral-400">Turn</span>
          <span
            className={`px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
              turn === 'assistant' ? 'border-cyan-700 text-cyan-300' : turn === 'user' ? 'border-emerald-700 text-emerald-300' : 'border-neutral-700 text-gray-400'
            }`}
          >
            {turn}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-950/60 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-neutral-800">
            <div className="px-4 py-2 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-400">Transcript</div>
            <TranscriptConsole entries={entries} />
          </div>

          <div className="col-span-3 border-r border-neutral-800">
            <div className="px-4 py-2 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-400">Signal</div>
            <div className="p-4 space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">VAD</div>
                <div
                  className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-[11px] uppercase tracking-wider ${
                    vadStatus === 'speech'
                      ? 'border-emerald-700 text-emerald-300'
                      : vadStatus === 'silence'
                        ? 'border-neutral-700 text-gray-400'
                        : vadStatus === 'failed'
                          ? 'border-red-700 text-red-300'
                          : 'border-neutral-800 text-gray-500'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      vadStatus === 'speech' ? 'bg-emerald-400' : vadStatus === 'silence' ? 'bg-gray-500' : vadStatus === 'failed' ? 'bg-red-500' : 'bg-gray-700'
                    }`}
                  />
                  {vadStatus}
                </div>
              </div>

              <div>
                <SpectrumVisualizer label="Mic Input" amplitude={userAudioAmplitude} accent={userAccent} />
                <ul className="mt-2 text-[11px] leading-5 text-neutral-400">
                  <li>16-bit PCM audio data</li>
                  <li>8000 Hz sample rate</li>
                  <li>Mono channel</li>
                </ul>
              </div>
              <div>
                <SpectrumVisualizer label="Assistant Output" amplitude={agentAudioAmplitude} accent={assistantAccent} />
                <ul className="mt-2 text-[11px] leading-5 text-neutral-400">
                  <li>16-bit PCM audio data</li>
                  <li>16000 Hz sample rate</li>
                  <li>Mono channel</li>
                </ul>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 blur-md rounded-full" style={{ boxShadow: '0 0 24px #9B62FF55' }} />
                    <div className="relative flex items-center gap-3 rounded-full border border-neutral-800/80 bg-neutral-950/50 px-4 py-2">
                      <span className="text-xs text-neutral-400 uppercase tracking-wider">Mic</span>
                      <div className="w-10 h-10 rounded-full bg-neutral-900 text-brand-purple flex items-center justify-center border border-neutral-800">
                        <MicrophoneButton />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <PromptPane />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <WebhookLogsLink status={status} agentId={agentId} />
      </div>
    </div>
  );
}
