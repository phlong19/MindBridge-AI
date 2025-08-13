import { NavLink, Plans } from "@/types";
import {
  AudioLines,
  Box,
  CircleDollarSign,
  FolderKanban,
  Handshake,
  House,
  Rss,
  UserRoundPlus,
  Waypoints,
} from "lucide-react";
export const plans: Plans[] = ["starter", "pro", "ultimate"];
export const plansGroup: Record<Plans, { plan: Plans }> = {
  ultimate: {
    plan: "ultimate",
  },
  pro: {
    plan: "pro",
  },
  starter: {
    plan: "starter",
  },
};

export const features = {
  starter: {
    Limit2Companions: "2_ai_companions",
    Monthly10Conversations: "10_conversations_month",
    BasicRecap: "basic_session_recaps",
  },
  pro: {
    Limit10Companions: "10_active_companions",
    UnlimitedConversations: "unlimited_conversations",
    CanSaveSessionsHistory: "save_sessions_history",
    InlineQuizzesAndRecaps: "inline_quizzes_recaps",
    MonthlyReports: "monthly_progress_reports",
  },
  ultimate: {
    UnlimitedCompanions: "unlimited_companions",
    DashboardSupport: "full_control_dashboard",
    DailyReminders: "daily_learning_reminders",
  },
};

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

export const defaultAvatar =
  "https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18yejBaUzMzRUpzMWtKeHRUMmxsSzF6V2FSd3kiLCJyaWQiOiJ1c2VyXzJ6UmxLeklCN1QzTzJ0SzdWWlVUSVNFYU82aiJ9?width=160";

// prettier-ignore
type Page = 'manage' | 'home' | 'voices' | 'companions' | 'newCompanion' | 'myJourney' | 'pricing';

export const navLinks: Record<Page, NavLink> = {
  manage: {
    href: "/admin",
    label: "Manage",
    icon: <FolderKanban size="20" />,
    admin: true,
  },
  home: { href: "/", label: "Home", icon: <House size="20" /> },
  voices: {
    href: "/voices",
    label: "Voices Library",
    icon: <AudioLines size="20" />,
  },
  companions: {
    label: "Companions",
    href: "/companions",
    icon: <Handshake size="20" />,
    exact: true,
    children: [
      {
        href: "/companions/community",
        label: "Community companions",
        icon: <Rss size={18} />,
        exact: true,
      },
      {
        href: "/companions",
        label: "Your companions",
        icon: <Box size={18} />,
        exact: true,
      },
    ],
  },
  newCompanion: {
    label: "New Companions",
    href: "/companions/new",
    icon: <UserRoundPlus size="20" />,
  },
  myJourney: {
    label: "My Journey",
    href: "/profile/my-journey",
    icon: <Waypoints size="20" />,
  },
  pricing: {
    label: "Subscription",
    href: "/subscription",
    icon: <CircleDollarSign size="20" />,
  },
};
