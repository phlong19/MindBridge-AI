import { NavLink, Plans } from "@/types";
import {
  AudioLines,
  CircleDollarSign,
  FolderKanban,
  Handshake,
  House,
  UserRoundPlus,
  Waypoints,
} from "lucide-react";
export const plans: Plans[] = ["starter", "pro", "ultimate"];

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
