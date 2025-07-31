// type User = {
//   name: string;
//   email: string;
//   image?: string;
//   accountId: string;
// };

import { Database } from "./supabase";

enum Subject {
  maths = "maths",
  language = "language",
  science = "science",
  history = "history",
  coding = "coding",
  geography = "geography",
  economics = "economics",
  finance = "finance",
  business = "business",
}

type Companion = Models.DocumentList<Models.Document> & {
  id: string;
  $id: string;
  name: string;
  subject: Subject;
  topic: string;
  duration: number;
  bookmarked: boolean;
};

interface CreateCompanion {
  name: string;
  subject: string;
  topic: string;
  gender: boolean;
  style: boolean;
  duration: number;
  voiceId: string;
}

interface GetAllCompanions {
  limit?: number;
  page?: number;
  subject?: string | string[];
  topic?: string | string[];
}

interface BuildClient {
  key?: string;
  sessionToken?: string;
}

interface CreateUser {
  email: string;
  name: string;
  image?: string;
  accountId: string;
}

interface SearchParams {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface Avatar {
  userName: string;
  width: number;
  height: number;
  className?: string;
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

type CompanionRow = Database["public"]["Tables"]["companions"]["Row"];
interface CompanionComponentProps extends CompanionRow {
  companionId: string | null;
  userName: string | null;
  userImage: string | null;
}

interface VoiceGroup {
  male: Voice[];
  female: Voice[];
}

type VoiceRow = Database["public"]["Tables"]["voices"]["Row"];
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Voice extends VoiceRow {}

type Plans = "starter" | "pro" | "ultimate";
