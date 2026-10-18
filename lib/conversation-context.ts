import type { SavedMessage } from "@/types";

const MAX_CONTEXT_MESSAGES = 30;
const MAX_CONTEXT_CHARACTERS = 12_000;

/** Keep recent whole turns in chronological order, excluding stored instructions. */
export function buildConversationContext(
  messages: SavedMessage[],
): SavedMessage[] {
  const context: SavedMessage[] = [];
  let characters = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    )
      continue;
    if (
      context.length === MAX_CONTEXT_MESSAGES ||
      characters + message.content.length > MAX_CONTEXT_CHARACTERS
    )
      break;
    context.push({ role: message.role, content: message.content });
    characters += message.content.length;
  }
  return context.reverse();
}
