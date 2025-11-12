export const dynamic = "force-dynamic";

import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  Tool,
  convertToModelMessages,
  AssistantModelMessage,
} from "ai";
import { streamResponse, verifySignature } from "@layercode/node-server-sdk";
import config from "@/layercode.config.json";

type LayercodeMetadata = {
  conversation_id: string;
};

type LayercodePart = {
  content: string;
};

type MyTools = {
  someTool: Tool<any, any>;
};

type LayercodeUIMessage = UIMessage<LayercodeMetadata, LayercodePart, MyTools>;

type WebhookRequest = {
  conversation_id: string;
  text: string;
  turn_id: string;
  type: "message" | "session.start" | "session.end" | "session.update";
};

const SYSTEM_PROMPT = config.prompt;
const WELCOME_MESSAGE = config.welcome_message;

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const conversations = {} as Record<string, LayercodeUIMessage[]>;

export const POST = async (request: Request) => {
  const requestBody = (await request.json()) as WebhookRequest;
  console.log("Webhook received from Layercode", requestBody);

  // Verify webhook signature
  const signature = request.headers.get("layercode-signature") || "";
  const secret = process.env.LAYERCODE_WEBHOOK_SECRET || "";
  const isValid = verifySignature({
    payload: JSON.stringify(requestBody),
    signature,
    secret,
  });
  if (!isValid)
    return new Response("Invalid layercode-signature", { status: 401 });

  const { conversation_id, text: userText, turn_id, type } = requestBody;

  if (!conversations[conversation_id]) conversations[conversation_id] = [];

  const userMessage: LayercodeUIMessage = {
    id: turn_id,
    role: "user",
    metadata: { conversation_id },
    parts: [{ type: "text", text: userText }],
  };
  conversations[conversation_id].push(userMessage);

  switch (type) {
    case "session.start":
      const message: LayercodeUIMessage = {
        id: turn_id,
        role: "assistant",
        metadata: { conversation_id },
        parts: [{ type: "text", text: WELCOME_MESSAGE }],
      };

      return streamResponse(requestBody, async ({ stream }) => {
        conversations[conversation_id].push(message);
        stream.tts(WELCOME_MESSAGE);
        stream.end();
      });

    case "message":
      return streamResponse(requestBody, async ({ stream }) => {
        const { textStream } = streamText({
          model: openai("gpt-4o-mini"),
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(conversations[conversation_id]),
          onFinish: async ({ response }) => {
            const generatedMessages: LayercodeUIMessage[] = response.messages
              .filter(
                (message): message is AssistantModelMessage =>
                  message.role === "assistant"
              )
              .map((message) => ({
                id: crypto.randomUUID(),
                role: "assistant", // now the type matches your UI message union
                metadata: { conversation_id },
                parts: Array.isArray(message.content)
                  ? message.content
                      .filter(
                        (part): part is { type: "text"; text: string } =>
                          part.type === "text"
                      )
                      .map((part) => ({ type: "text", text: part.text }))
                  : [{ type: "text", text: message.content }],
              }));

            conversations[conversation_id].push(...generatedMessages);
            stream.end();
          },
        });

        await stream.ttsTextStream(textStream);
      });

    case "session.end":
    case "session.update":
      return new Response("OK", { status: 200 });
  }
};
