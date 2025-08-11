// type User = {
//   name: string;
//   email: string;
//   image?: string;
//   accountId: string;
// };

import { JSX } from "react";
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
  slug: string;
}

interface GetAllCompanions {
  limit?: number;
  page?: number;
  subject?: string | string[];
  topic?: string | string[];
  authorized?: boolean;
  authenticated?: boolean;
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

type Companion = Database["public"]["Tables"]["companions"]["Row"] & {
  slug?: string;
  color: string;
};

interface CompanionComponentProps extends CompanionRow {
  companionId: string;
  userName: string;
  userImage: string;
  fetchedMessages: string | null;
  userId: string;
  sessionId: number;
}

interface VoiceGroup {
  male: Voice[];
  female: Voice[];
}

type VoiceRow = Database["public"]["Tables"]["voices"]["Row"];
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Voice extends VoiceRow {}

type Plans = "starter" | "pro" | "ultimate";

interface NavLink {
  label: string;
  href: string;
  icon: JSX.Element;
  admin?: boolean;
  exact?: boolean;
  children?: NavLink[];
}
