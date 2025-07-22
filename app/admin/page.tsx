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

export default function Page() {
  return (
    <div className="w-full p-5 md:p-10">
      <Link href="/admin/sync-voices">
        <Card className="group max-w-lg">
          <CardHeader>
            <CardTitle>Sync Voices</CardTitle>
            <CardDescription>/admin/sync-voices</CardDescription>
          </CardHeader>
          <CardContent>
            Update voices from 11labs, data collected from Vapi API
          </CardContent>
          <CardFooter>
            <Button variant="link">
              View{" "}
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-2" />
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
}
