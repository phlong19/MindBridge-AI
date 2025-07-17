"use client";

import React from "react";
import { useForm } from "react-hook-form";
import {
  FormDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Textarea } from "@/components/ui/Textarea";

export default function Page() {
  const form = useForm();
  return (
    <div className="mx-auto max-w-md p-10">
      <Form {...form}>
        <FormField
          control={form.control}
          name="..."
          render={() => (
            <FormItem>
              <FormLabel>label</FormLabel>
              <FormControl>
                <Textarea placeholder="author key" />
              </FormControl>
              <FormDescription>des</FormDescription>
              <FormMessage>message</FormMessage>
            </FormItem>
          )}
        />
      </Form>
    </div>
  );
}
