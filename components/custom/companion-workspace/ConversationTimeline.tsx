import type { CompanionRow, SavedMessage } from "@/types";
import { cn } from "@/lib/utils";
import CompanionAvatar from "./CompanionAvatar";
import CopyResponse from "./CopyResponse";

export type ConversationSection = {
  key: string;
  id: number;
  createdAt: string;
  mode: string;
  isDemo: boolean;
  messages: SavedMessage[];
};

export default function ConversationTimeline({
  sections,
  companion,
  userName,
  selectedSessionId,
}: {
  sections: ConversationSection[];
  companion: CompanionRow;
  userName: string;
  selectedSessionId: number | null;
}) {
  return sections.map((section) => (
    <section
      key={section.key}
      id={`conversation-${section.key}`}
      aria-label={section.isDemo ? "Demo conversation" : "Saved conversation"}
      className={cn(
        "flex flex-col gap-5 rounded-xl",
        selectedSessionId === section.id && "scroll-mt-4",
      )}
    >
      <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-center text-[11px]">
        <time dateTime={section.createdAt}>
          {new Date(section.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </time>
        <span>· {section.mode === "text" ? "Text" : "Chat / voice"}</span>
        {section.isDemo && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
            Demo conversation
          </span>
        )}
      </p>
      {section.messages.map((message, index) => (
        <div
          key={`${index}-${message.role}`}
          className={cn(
            "flex items-start gap-3",
            message.role === "user" && "justify-end",
          )}
        >
          {message.role === "assistant" && (
            <CompanionAvatar
              companion={companion}
              className="mt-1 size-8 rounded-lg"
            />
          )}
          <div className="flex max-w-[88%] flex-col sm:max-w-[85%]">
            <div
              className={cn(
                "overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user" ? "bg-[#ffede4]" : "bg-muted/70",
              )}
            >
              <span className="sr-only">
                {message.role === "user" ? userName : companion.name}:{" "}
              </span>
              <p className="[overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
            {message.role === "assistant" && (
              <CopyResponse content={message.content} />
            )}
          </div>
        </div>
      ))}
    </section>
  ));
}
