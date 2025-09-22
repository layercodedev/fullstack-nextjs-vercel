import { Dispatch, SetStateAction } from 'react';

export type ConversationEntry = {
  role: string;
  text: string;
  ts: number;
  turnId?: string;
};

type UpdateMessagesArgs = {
  role: 'user' | 'assistant';
  turnId?: string;
  text: string;
  replace?: boolean;
  setMessages: Dispatch<SetStateAction<ConversationEntry[]>>;
};

export function updateMessages({ role, turnId, text, replace, setMessages }: UpdateMessagesArgs) {
  if (!turnId) {
    setMessages((prev) => [...prev, { role, text, ts: Date.now() }]);
    return;
  }

  setMessages((prev) => {
    const existingIndex = prev.findIndex((entry) => entry.turnId === turnId && entry.role === role);

    if (existingIndex === -1) {
      return [...prev, { role, text, ts: Date.now(), turnId }];
    }

    const copy = prev.slice();
    const current = copy[existingIndex];

    copy[existingIndex] = {
      ...current,
      text: replace ? text : current.text + text
    };

    return copy;
  });
}
