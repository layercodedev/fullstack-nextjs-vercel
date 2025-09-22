'use client';

import { useLayercodeAgent } from '@layercode/react-sdk';
import { useEffect, useState } from 'react';
import { usePlayNotify } from '../utils/usePlayNotify';
import { updateMessages, type ConversationEntry } from '../utils/updateMessages';
import TranscriptConsole from './TranscriptConsole';
import PromptPane from './PromptPane';
import { HeaderBar } from './HeaderBar';
import SpectrumVisualizer from './SpectrumVisualizer';
import { MicrophoneButton } from './MicrophoneButton';

type VoiceAgentProps = {
  onDisconnect?: () => void;
};

export default function VoiceAgent({ onDisconnect }: VoiceAgentProps = {}) {
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
  return <VoiceAgentInner agentId={agentId} onDisconnect={onDisconnect} />;
}

function VoiceAgentInner({ agentId, onDisconnect }: { agentId: string; onDisconnect?: () => void }) {
  // Transcript and signal state
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [turn, setTurn] = useState<'idle' | 'user' | 'assistant'>('idle');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const playNotify = usePlayNotify('/notify1.wav', { volume: 0.8 });

  const { userAudioAmplitude, agentAudioAmplitude, status, mute, unmute, isMuted } = useLayercodeAgent({
    agentId,
    authorizeSessionEndpoint: '/api/authorize',
    onMuteStateChange(isMuted) {
      setMessages((prev) => [...prev, { role: 'data', text: `MIC → ${isMuted ? 'muted' : 'unmuted'}`, ts: Date.now() }]);
    },
    onMessage: (data: any) => {
      console.log(data);
      switch (data?.type) {
        case 'turn.start': {
          setTurn(data.role);
          if (data.role == 'assistant') {
            playNotify();
          }
          // Optional: log turn change as a data entry for visibility
          // setMessages((prev) => [...prev, { role: 'data', text: `TURN → ${data.role}`, ts: Date.now() }]);
          break;
        }
        case 'vad_events': {
          setUserSpeaking(data.event == 'vad_start');
          break;
        }
        case 'user.transcript.delta': {
          updateMessages({
            role: 'user',
            turnId: data.turn_id,
            text: data.content ?? '',
            setMessages
          });
          break;
        }
        case 'response.text': {
          updateMessages({
            role: 'assistant',
            turnId: data.turn_id,
            text: data.content ?? '',
            setMessages
          });
          break;
        }
        // default: {
        //   // Fallback: log unknown events as data entries for visibility
        //   if (data) {
        //     try {
        //       const summary = typeof data === 'string' ? data : JSON.stringify(data);
        //       setMessages((prev) => [...prev, { role: 'data', text: summary, ts: Date.now() }]);
        //     } catch {
        //       setMessages((prev) => [...prev, { role: 'data', text: '[unserializable event]', ts: Date.now() }]);
        //     }
        //   }
        //   break;
        // }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <HeaderBar
        agentId={agentId}
        status={status}
        turn={turn}
        actionSlot={
          onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3 py-1.5 rounded border border-gray-700/70 bg-gray-900/20 text-[11px] uppercase tracking-wider text-gray-200 hover:text-white hover:border-gray-500 transition-colors"
            >
              End Session
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
        <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
          <SpectrumVisualizer label="User" amplitude={userAudioAmplitude * 2} accent="#C4B5FD" />
          {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 8000 Hz • Mono</p> */}
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <MicrophoneButton
              isMuted={isMuted}
              userSpeaking={userSpeaking}
              onToggle={() => {
                if (isMuted) unmute();
                else mute();
              }}
            />
            <div className={`text-[11px] uppercase tracking-wider ${isMuted ? 'text-red-300' : 'text-neutral-400'}`}>{isMuted ? 'Muted' : 'Live'}</div>
          </div>
        </div>
        <div className="hidden md:block rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
          <SpectrumVisualizer label="Agent" amplitude={agentAudioAmplitude} accent="#67E8F9" />
          {/* <p className="mt-2 text-[11px] leading-5 text-neutral-400">16-bit PCM audio data • 16000 Hz • Mono</p> */}
        </div>
      </div>

      <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
        <TranscriptConsole entries={messages} />
      </div>

      <div className="rounded-md border border-neutral-800 overflow-hidden w-full max-w-full min-w-0">
        <PromptPane />
      </div>
    </div>
  );
}
