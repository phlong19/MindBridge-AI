"use client";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pages: { title: string; desc: string; content: string }[] = [
  {
    title: "Sync Voices",
    desc: "/admin/sync-voices",
    content: "Update voices from 11labs, data collected from Vapi API",
  },
  // scalable
];

export default function Page() {
  return (
    <div className="grid w-full p-5 md:p-10">
      {pages.map(({ content, desc, title }) => (
        <Link href={desc} key={title}>
          <Card className="group max-w-lg">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>{content}</CardContent>
            <CardFooter>
              <Button variant="link">
                View{" "}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-2" />
              </Button>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}
