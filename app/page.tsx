"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type TranscriptChunk = { counter: number; text: string };
type TurnChunkMap = Map<string, Map<number, string>>;

type Message = {
  role: Role;
  text: string;
  turnId?: string;
  chunks?: TranscriptChunk[];
};

const Page = dynamic(
  async () => {
    const { useLayercodeAgent } = await import("@layercode/react-sdk");

    function VoiceAgentDemo() {
      const agentId = process.env.NEXT_PUBLIC_LAYERCODE_AGENT_ID ?? "";

      const [messages, setMessages] = useState<Message[]>([]);
      const [isSessionActive, setIsSessionActive] = useState(false);

      const userChunksByTurn = useRef<TurnChunkMap>(new Map());

      const { status, connect, disconnect, mute, unmute, isMuted } =
        useLayercodeAgent({
          agentId,
          authorizeSessionEndpoint: "/api/authorize",
          enableAmplitudeMonitoring: false,

          onConnect: () => {
            setIsSessionActive(true);
            setMessages((prev) => [
              ...prev,
              { role: "system", text: "Connected" },
            ]);
          },

          onDisconnect: () => {
            setIsSessionActive(false);
            userChunksByTurn.current.clear();
            setMessages((prev) => [
              ...prev,
              { role: "system", text: "Disconnected" },
            ]);
          },

          onMessage: (evt: any) => {
            const type = evt?.type as string | undefined;
            if (!type) return;

            if (type === "turn.end" && evt.turn_id) {
              userChunksByTurn.current.delete(String(evt.turn_id));
              return;
            }

            if (
              type === "user.transcript.delta" ||
              type === "user.transcript.interim_delta"
            ) {
              handleUserTranscript(evt);
              return;
            }

            if (type === "response.text") {
              appendAssistantChunk(evt);
              return;
            }
          },
        });

      useEffect(() => {
        return () => {
          void disconnect();
        };
      }, [disconnect]);

      const listRef = useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, [messages]);

      const canConnect = status !== "connecting" && status !== "connected";
      const connectLabel = status === "connecting" ? "Connecting…" : "Connect";

      async function handleConnect() {
        if (!canConnect) return;
        userChunksByTurn.current.clear();
        setMessages([]);
        try {
          await connect();
        } catch {
          setMessages([{ role: "system", text: "Failed to connect" }]);
        }
      }

      function handleUserTranscript(m: any) {
        const turnId = m.turn_id ? String(m.turn_id) : undefined;
        const raw = m.delta_counter;
        const counter =
          typeof raw === "number" ? raw : raw != null ? Number(raw) : undefined;
        const content = typeof m.content === "string" ? m.content : "";

        if (!turnId || counter === undefined) {
          if (turnId) userChunksByTurn.current.delete(turnId);
          upsertMessage(
            { role: "user", turnId, text: content, chunks: [] },
            { replace: true }
          );
          return;
        }

        const turnMap =
          userChunksByTurn.current.get(turnId) ?? new Map<number, string>();
        turnMap.set(counter, content);
        userChunksByTurn.current.set(turnId, turnMap);

        const chunks: TranscriptChunk[] = [...turnMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([c, text]) => ({ counter: c, text }));
        const aggregated = chunks.map((c) => c.text).join("");

        upsertMessage(
          { role: "user", turnId, text: aggregated, chunks },
          { replace: true }
        );
      }

      function appendAssistantChunk(m: any) {
        upsertMessage({
          role: "assistant",
          turnId: m.turn_id ? String(m.turn_id) : undefined,
          text: typeof m.content === "string" ? m.content : "",
        });
      }

      function upsertMessage(next: Message, opts: { replace?: boolean } = {}) {
        setMessages((prev) => {
          if (!next.turnId) return [...prev, next];
          const i = prev.findIndex(
            (e) => e.turnId === next.turnId && e.role === next.role
          );
          if (i === -1) return [...prev, next];

          const copy = prev.slice();
          const current = copy[i];
          copy[i] = {
            ...current,
            text: opts.replace ? next.text : current.text + next.text,
            chunks: next.chunks ?? current.chunks,
          };
          return copy;
        });
      }

      return (
        <div className="mx-auto max-w-2xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={!canConnect}
              className="rounded-md border border-neutral-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {connectLabel}
            </button>
            <button
              type="button"
              onClick={() => isSessionActive && disconnect()}
              disabled={!isSessionActive}
              className="rounded-md border border-neutral-700 px-4 py-2 text-white disabled:opacity-50"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => (isMuted ? unmute() : mute())}
              disabled={!isSessionActive}
              className="rounded-md border border-neutral-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {isMuted ? "Unmute mic" : "Mute mic"}
            </button>
          </div>

          <div className="text-sm text-neutral-300">Status: {status}</div>

          <div
            ref={listRef}
            className="h-72 w-full overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-sm"
          >
            {messages.length === 0 ? (
              <div className="text-neutral-500">No messages yet.</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="mb-2">
                  <span className="text-neutral-400">
                    {m.role === "assistant"
                      ? "Agent"
                      : m.role === "user"
                      ? "You"
                      : "System"}
                    :
                  </span>{" "}
                  <span className="whitespace-pre-wrap text-neutral-100">
                    {m.role === "user" && m.chunks?.length
                      ? m.chunks.map((c) => (
                          <span key={c.counter}>{c.text}</span>
                        ))
                      : m.text}
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
