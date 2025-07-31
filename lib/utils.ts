import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors } from "@/constants";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { ToasterProps } from "sonner";
// import { VoiceGroup } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSubjectColor = (subject: string) => {
  return subjectsColors[subject as keyof typeof subjectsColors];
};

export const configureAssistant = (voiceId: string) => {
  const assistant: CreateAssistantDTO = {
    name: "Companion",
    firstMessage:
      "Hello, let's start the session. Today we'll be talking about {{topic}}.",
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
    },
    voice: {
      provider: "11labs",
      voiceId,
      stability: 0.4,
      similarityBoost: 0.8,
      speed: 0.9,
      style: 0.5,
      useSpeakerBoost: true,
    },
    model: {
      provider: "openai",
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a highly knowledgeable tutor teaching a real-time voice session with a student. Your goal is to teach the student about the topic and subject.

                    Tutor Guidelines:
                    Stick to the given topic - {{ topic }} and subject - {{ subject }} and teach the student about it.
                    Keep the conversation flowing smoothly while maintaining control.
                    From time to time make sure that the student is following you and understands you.
                    Break down the topic into smaller parts and teach the student one part at a time.
                    Keep your style of conversation {{ style }}.
                    Keep your responses short, like in a real voice conversation.
                    Do not include any special characters in your responses - this is a voice conversation.
                    If there are any particularly difficult or technical terms, ask the student if they need an explanation at the end of your response, and then proceed based on their reply.
                  `,
        },
      ],
    },
  };

  return assistant;
};

type ToastTypes =
  | "normal"
  | "action"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "loading"
  | "default";

export function getToastStyle(type: ToastTypes): ToasterProps["toastOptions"] {
  const baseStyle = "!text-white !shadow-md";

  const styles: Record<ToastTypes, string> = {
    success: `!bg-green-600 ${baseStyle}`,
    info: `!bg-blue-500 ${baseStyle}`,
    warning: `!bg-yellow-400 !text-black !shadow-md`,
    error: `!bg-red-600 ${baseStyle}`,
    loading: `!bg-gray-600 ${baseStyle}`,
    action: `!bg-purple-500 ${baseStyle}`,
    default: `!bg-blue-600 ${baseStyle}`,
    normal: `bg-gray-200 text-black shadow-sm`,
  };

  return {
    className: styles[type] || styles.normal,
  };
}
