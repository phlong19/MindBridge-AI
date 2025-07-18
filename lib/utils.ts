import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors } from "@/constants";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getSubjectColor = (subject: string) => {
  return subjectsColors[subject as keyof typeof subjectsColors];
};

export const configureAssistant = (voices:VoiceGroup, voice: string, style: string) => {
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
      voiceId: voice,
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

// import fetch from 'node-fetch'; // for server use
// import { jwtDecode } from 'jwt-decode';
// const AUTH_TOKEN = 'Bearer TOKEN'; // put somewhere configurable, saved in db
// // require to execute immediately to make sure the token still valid

// const PROVIDERS = ['11labs', 'openai', 'playht', 'azure'];

// async function fetchVoices(provider: string, token: string) {
// // in case the input includes `Bearer` keyword 
//   const [prefix, formattedToken] = token.split(' '); // ['Bearer', 'token']    
//   const decoded = jwtDecode(formattedToken);
//   if(decoded) {
//      const { exp } = decoded;
//      const currentTime = Math.floor(Date.now() / 1000);
//      setIsExpired(exp < currentTime)
//   }
//   const res = await fetch(`https://api.vapi.ai/voice-library/${provider}?limit=100`, {
//     headers: {
//       Authorization: token,
//       'Content-Type': 'application/json'
//     }
//   });

//   if (!res.ok) {
//     console.error(`Failed to fetch for ${provider}:`, await res.text());
//     return [];
//   }

//   const data = await res.json();
//   return Array.isArray(data) ? data : [data];
// }
