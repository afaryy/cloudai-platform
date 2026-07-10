export type MockPolicyProfile = {
  id: string;
  description: string;
  defaultModelName: string;
  allowedModelNames: readonly string[];
  maxPromptCharacters: number;
  maxInputTokens: number;
};

export const DEFAULT_POLICY_PROFILE: MockPolicyProfile = {
  id: "default-mock-governed",
  description: "Default local mock policy profile for governed model access examples.",
  defaultModelName: "mock-bedrock-claude",
  allowedModelNames: ["mock-bedrock-claude", "mock-bedrock-titan"],
  maxPromptCharacters: 4000,
  maxInputTokens: 80
};

export function isModelAllowed(modelName: string, profile: MockPolicyProfile = DEFAULT_POLICY_PROFILE): boolean {
  return profile.allowedModelNames.includes(modelName);
}
