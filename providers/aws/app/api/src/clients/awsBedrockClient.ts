import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { BedrockClient } from "./bedrockClient.js";
import { HttpError } from "../lib/errors.js";
import type { ChatRequest, ChatResponse } from "../types.js";

export type BedrockConverseInput = {
  modelId: string;
  messages: Array<{
    role: "user";
    content: Array<{ text: string }>;
  }>;
  inferenceConfig: {
    maxTokens: number;
    temperature: number;
  };
};

export type BedrockConverseOutput = {
  output?: {
    message?: {
      content?: Array<{ text?: string }>;
    };
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export interface BedrockRuntimeInvoker {
  converse(input: BedrockConverseInput): Promise<BedrockConverseOutput>;
}

export type AwsBedrockClientOptions = {
  modelId: string;
  invoker: BedrockRuntimeInvoker;
};

export class AwsBedrockClient implements BedrockClient {
  constructor(private readonly options: AwsBedrockClientOptions) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (request.modelName !== this.options.modelId) {
      throw new HttpError(400, "modelName is not supported by the configured Bedrock provider.", "unsupported_model");
    }

    const input: BedrockConverseInput = {
      modelId: this.options.modelId,
      messages: [{ role: "user", content: [{ text: request.prompt }] }],
      inferenceConfig: { maxTokens: 8, temperature: 0 }
    };

    let output: BedrockConverseOutput;
    try {
      output = await this.options.invoker.converse(input);
    } catch {
      throw new HttpError(503, "Bedrock provider is currently unavailable.", "bedrock_unavailable");
    }

    const response = readResponseText(output);
    const usage = readUsage(output);

    return {
      response,
      metadata: {
        requestId: randomUUID(),
        modelName: this.options.modelId,
        usage: {
          source: "provider-reported",
          ...usage
        },
        timestamp: new Date().toISOString()
      }
    };
  }
}

export function createBedrockRuntimeInvoker(region: string): BedrockRuntimeInvoker {
  const client = new BedrockRuntimeClient({ region, maxAttempts: 1 });

  return {
    async converse(input: BedrockConverseInput): Promise<BedrockConverseOutput> {
      return client.send(new ConverseCommand(input));
    }
  };
}

function readResponseText(output: BedrockConverseOutput): string {
  const content = output.output?.message?.content ?? [];
  const text = content.find((item) => typeof item.text === "string")?.text?.trim();
  if (!text) {
    throw new HttpError(502, "Bedrock provider returned an invalid response.", "bedrock_response_invalid");
  }
  return text;
}

function readUsage(output: BedrockConverseOutput): { inputTokens: number; outputTokens: number } {
  const inputTokens = output.usage?.inputTokens;
  const outputTokens = output.usage?.outputTokens;
  if (!isTokenCount(inputTokens) || !isTokenCount(outputTokens)) {
    throw new HttpError(502, "Bedrock provider returned an invalid response.", "bedrock_response_invalid");
  }
  return { inputTokens, outputTokens };
}

function isTokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
