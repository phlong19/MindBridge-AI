import { Voice } from "@/types";

export const subjects = [
  "maths",
  "language",
  "science",
  "history",
  "coding",
  "economics",
];

export const subjectsColors = {
  science: "#E5D0FF",
  maths: "#FFDA6E",
  language: "#BDE7FF",
  coding: "#FFC8E4",
  history: "#FFECC8",
  economics: "#C8FFDF",
};

export const voices = {
  male: { casual: "2BJW5coyhAzSr8STdHbE", formal: "c6SfcYrb2t09NHXiT80T" },
  female: { casual: "ZIlrSGI4jZqobxRKprJz", formal: "sarah" },
};

export const recentSessions = [
  {
    id: "1",
    subject: "science",
    name: "Neura the Brainy Explorer",
    topic: "Neural Network of the Brain",
    duration: 45,
    color: "#E5D0FF",
    bookmarked: false,
  },
  {
    id: "2",
    subject: "maths",
    name: "Countsy the Number Wizard",
    topic: "Derivatives & Integrals",
    duration: 30,
    color: "#FFDA6E",
    bookmarked: false,
  },
  {
    id: "3",
    subject: "language",
    name: "Verba the Vocabulary Builder",
    topic: "English Literature",
    duration: 30,
    color: "#BDE7FF",
    bookmarked: false,
  },
  {
    id: "4",
    subject: "coding",
    name: "Codey the Logic Hacker",
    topic: "Intro to If-Else Statements",
    duration: 45,
    color: "#FFC8E4",
    bookmarked: false,
  },
  {
    id: "5",
    subject: "history",
    name: "Memo, the Memory Keeper",
    topic: "World Wars: Causes & Consequences",
    duration: 15,
    color: "#FFECC8",
    bookmarked: false,
  },
  {
    id: "6",
    subject: "economics",
    name: "The Market Maestro",
    topic: "The Basics of Supply & Demand",
    duration: 10,
    color: "#C8FFDF",
    bookmarked: false,
  },
];

export const fakeVoices: Voice[] = [
  {
    id: "849bf79c-1d04-4791-bc0b-fea6416762dc",
    provider: "11labs",
    providerId: "bIHbv24MWmeRgasZH58o",
    slug: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    gender: "male",
    accent: "",
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3",
    createdAt: "2024-07-19T18:40:36.040Z",
    updatedAt: "2024-07-19T18:40:36.040Z",
    description: "",
    isPublic: true,
    isDeleted: false,
    orgId: "aa4c36ba-db21-4ce0-9c6e-bb55a8d2b188",
  },
  {
    id: "f794a0d7-b5b8-4afd-845e-ecfffc113b85",
    provider: "11labs",
    providerId: "rECOLXj3kZIXXxR3SBqN",
    slug: "rECOLXj3kZIXXxR3SBqN",
    name: "Charlie",
    gender: "male",
    accent: "australian",
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/UwDtqCF44YaL77wxb8DVQlHT5Gp1/voices/muKelCm8QfG9CxzKVjMX/df47951e-da7b-4a7a-a330-c1e9eccb95b9.mp3",
    createdAt: "2025-01-17T23:37:08.163Z",
    updatedAt: "2025-01-17T23:37:08.163Z",
    description: "A full and deep voice. Good for news.",
    isPublic: false,
    isDeleted: false,
    orgId: "aa4c36ba-db21-4ce0-9c6e-bb55a8d2b188",
  },
  {
    id: "44e6d34b-ead5-4a6f-a144-833834fa0c09",
    provider: "11labs",
    providerId: "8N2ng9i2uiUWqstgmWlH",
    slug: "8N2ng9i2uiUWqstgmWlH",
    name: "Beth - gentle and nurturing",
    gender: "female",
    accent: "british",
    previewUrl:
      "https://storage.googleapis.com/eleven-public-prod/custom/voices/8N2ng9i2uiUWqstgmWlH/7TvK7CWmBACPLKdPclE6.mp3",
    createdAt: "2024-07-27T18:18:57.837Z",
    updatedAt: "2024-07-27T18:18:57.837Z",
    description:
      "A warm, comforting, motherly British English woman's voice, clear and easy to understand. Brilliant for use with children's stories and nursery rhymes. It's like having your very own Mary Poppins to read you bedtime books! It's beautiful for teaching, audiobook narration and social media such as YouTube, Tiktok, Reels and Stories. This studio-produced audio is also great for high-quality video dubbing, advertising and reading anything that will help you or your kids relax and unwind.",
    isPublic: false,
    isDeleted: false,
    orgId: "aa4c36ba-db21-4ce0-9c6e-bb55a8d2b188",
  },
];
