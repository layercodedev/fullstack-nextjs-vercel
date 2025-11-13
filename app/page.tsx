'use client';

import { Mic, MicOff, PhoneCall, PhoneOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

type Role = 'user' | 'assistant' | 'system';

type TranscriptChunk = {
  counter: number;
  text: string;
};

type TurnChunkMap = Map<string, Map<number, string>>;

type Message = {
  role: Role;
  text: string;
  turnId?: string;
  chunks?: TranscriptChunk[];
};

type AgentEvent = {
  type?: string;
  turn_id?: string | number;
  delta_counter?: number | string;
  content?: string;
};

const Page = dynamic(
  async () => {
    const { useLayercodeAgent } = await import('@layercode/react-sdk');

    function VoiceAgentDemo() {
      const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID ?? '';

      const [messages, setMessages] = useState<Message[]>([]);
      const [isSessionActive, setIsSessionActive] = useState(false);

      // Keeps track of partial user transcripts per turn
      const userChunksByTurn = useRef<TurnChunkMap>(new Map());

      const listRef = useRef<HTMLDivElement | null>(null);

      const appendSystemMessage = useCallback((text: string) => {
        setMessages((prev) => [...prev, { role: 'system', text }]);
      }, []);

      const upsertMessage = useCallback((next: Message, opts: { replace?: boolean } = {}) => {
        setMessages((prev) => {
          if (!next.turnId) return [...prev, next];

          const index = prev.findIndex((msg) => msg.turnId === next.turnId && msg.role === next.role);

          if (index === -1) return [...prev, next];

          const copy = prev.slice();
          const current = copy[index];

          copy[index] = {
            ...current,
            text: opts.replace ? next.text : current.text + next.text,
            chunks: next.chunks ?? current.chunks
          };

          return copy;
        });
      }, []);

      const clearTurn = useCallback((turnId: string) => {
        userChunksByTurn.current.delete(turnId);
      }, []);

      const updateUserTranscript = useCallback(
        (event: AgentEvent) => {
          const turnId = event.turn_id != null ? String(event.turn_id) : undefined;
          const rawCounter = event.delta_counter;
          const content = typeof event.content === 'string' ? event.content : '';

          const counter = typeof rawCounter === 'number' ? rawCounter : rawCounter != null ? Number(rawCounter) : undefined;

          // If we don't have a counter, just treat this as a whole message
          if (!turnId || counter === undefined) {
            if (turnId) clearTurn(turnId);

            upsertMessage(
              {
                role: 'user',
                turnId,
                text: content,
                chunks: []
              },
              { replace: true }
            );

            return;
          }

          const existingTurnMap = userChunksByTurn.current.get(turnId) ?? new Map<number, string>();

          existingTurnMap.set(counter, content);
          userChunksByTurn.current.set(turnId, existingTurnMap);

          const chunks: TranscriptChunk[] = [...existingTurnMap.entries()].sort(([a], [b]) => a - b).map(([c, text]) => ({ counter: c, text }));

          const aggregatedText = chunks.map((c) => c.text).join('');

          upsertMessage(
            {
              role: 'user',
              turnId,
              text: aggregatedText,
              chunks
            },
            { replace: true }
          );
        },
        [clearTurn, upsertMessage]
      );

      const appendAssistantMessage = useCallback(
        (event: AgentEvent) => {
          const text = typeof event.content === 'string' ? event.content : '';

          upsertMessage({
            role: 'assistant',
            turnId: event.turn_id != null ? String(event.turn_id) : undefined,
            text
          });
        },
        [upsertMessage]
      );

      const handleAgentMessage = useCallback(
        (evt: AgentEvent) => {
          const type = evt.type;
          if (!type) return;

          if (type === 'turn.end' && evt.turn_id != null) {
            clearTurn(String(evt.turn_id));
            return;
          }

          if (type === 'user.transcript.delta' || type === 'user.transcript.interim_delta') {
            updateUserTranscript(evt);
            return;
          }

          if (type === 'response.text') {
            appendAssistantMessage(evt);
          }
        },
        [appendAssistantMessage, clearTurn, updateUserTranscript]
      );

      const { status, connect, disconnect, mute, unmute, isMuted } = useLayercodeAgent({
        agentId,
        authorizeSessionEndpoint: '/api/authorize',
        enableAmplitudeMonitoring: false,

        onConnect: () => {
          setIsSessionActive(true);
          appendSystemMessage('Connected');
        },

        onDisconnect: () => {
          setIsSessionActive(false);
          userChunksByTurn.current.clear();
          appendSystemMessage('Disconnected');
        },

        onMessage: handleAgentMessage
      });

      // Cleanup on unmount
      useEffect(() => {
        return () => {
          void disconnect();
        };
      }, [disconnect]);

      // Auto-scroll to bottom when messages change
      useEffect(() => {
        const el = listRef.current;
        if (!el) return;

        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth'
        });
      }, [messages]);

      const isConnecting = status === 'connecting';
      const canConnect = !isSessionActive && !isConnecting;
      const connectLabel = isConnecting ? 'Connecting…' : 'Connect';

      const handleConnectClick = async () => {
        if (!canConnect) return;

        userChunksByTurn.current.clear();
        setMessages([]);

        try {
          await connect();
        } catch {
          setMessages([{ role: 'system', text: 'Failed to connect' }]);
        }
      };

      const handleMicClick = () => {
        if (!isSessionActive) return;
        isMuted ? unmute() : mute();
      };

      const getRoleLabel = (role: Role) => {
        switch (role) {
          case 'assistant':
            return 'Agent';
          case 'user':
            return 'You';
          default:
            return 'System';
        }
      };

      return (
        <div className="mx-auto max-w-2xl space-y-4 p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={isSessionActive ? disconnect : handleConnectClick}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSessionActive ? (
                <>
                  <PhoneOff className="h-4 w-4 text-rose-400" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4 text-emerald-400" />
                  <span>{connectLabel}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleMicClick}
              disabled={!isSessionActive}
              className="flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isMuted ? (
                <>
                  <MicOff className="h-4 w-4 text-rose-400" />
                  <span>Mic muted</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-emerald-400" />
                  <span>Mic on</span>
                </>
              )}
            </button>
          </div>

          <div className="text-sm text-neutral-300">Status: {status}</div>

          <div ref={listRef} className="h-72 w-full overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-sm">
            {messages.length === 0 ? (
              <div className="text-neutral-500">No messages yet.</div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="mb-2">
                  <span className="text-neutral-400">{getRoleLabel(message.role)}:</span>{' '}
                  <span className="whitespace-pre-wrap text-neutral-100">
                    {message.role === 'user' && message.chunks?.length ? message.chunks.map((chunk) => <span key={chunk.counter}>{chunk.text}</span>) : message.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return VoiceAgentDemo;
  },
  { ssr: false }
);

export default Page;
