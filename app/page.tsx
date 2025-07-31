import React from "react";
import CompanionCard from "@/components/custom/CompanionCard";
import CompanionsList from "@/components/custom/CompanionsList";
import CTA from "@/components/custom/CTA";
import { recentSessions } from "@/constants";
import { Database } from "@/types/supabase";

type Companion = Database["public"]["Tables"]["companions"]["Row"] & {
  slug?: string;
  color: string;
};

const data: Companion[] = [
  {
    id: "1a7f2c90",
    name: "Intro to AI Ethics",
    slug: "intro-to-ai-ethics",
    topic: "Artificial Intelligence",
    subject: "Ethics",
    duration: 30,
    color: "#3B82F6",
    created_at: "",
    author: "",
    gender: false,
    style: true,
    voiceId: "",
    photoUrl: "",
  },
  {
    id: "5c2e9df1",
    name: "Conversational Spanish Basics",
    slug: "conversational-spanish-basics",
    topic: "Languages",
    subject: "Spanish",
    duration: 45,
    color: "#10B981",
    created_at: "",
    author: "",
    gender: false,
    style: true,
    voiceId: "",
    photoUrl: "",
  },
  {
    id: "e832a9bd",
    name: "Data Structures in JavaScript",
    slug: "data-structures-javascript",
    topic: "Programming",
    subject: "JavaScript",
    duration: 40,
    color: "#F59E0B",
    created_at: "",
    author: "",
    gender: false,
    style: true,
    voiceId: "",
    photoUrl: "",
  },
  {
    id: "6f3a9c28",
    name: "Climate Change Explained",
    slug: "climate-change-explained",
    topic: "Science",
    subject: "Environmental Studies",
    duration: 35,
    color: "#EF4444",
    created_at: "",
    author: "",
    gender: false,
    style: true,
    voiceId: "",
    photoUrl: "",
  },
  {
    id: "b72d41fa",
    name: "Startup Fundamentals",
    slug: "startup-fundamentals",
    topic: "Business",
    subject: "Entrepreneurship",
    duration: 50,
    color: "#8B5CF6",
    created_at: "",
    author: "",
    gender: false,
    style: true,
    voiceId: "",
    photoUrl: "",
  },
];

function Page() {
  return (
    <main>
      <h1 className="text-2xl underline">Popular Companions</h1>

      <section className="home-section items-stretch">
        {data.slice(0, 3).map((i) => (
          <CompanionCard key={i.id} {...i} />
        ))}
      </section>

      <section className="home-section">
        <CompanionsList
          title="Recent Completed Sessions"
          companions={recentSessions}
          className="w-full lg:w-2/3"
        />
        <CTA />
      </section>
    </main>
  );
}

export default Page;
