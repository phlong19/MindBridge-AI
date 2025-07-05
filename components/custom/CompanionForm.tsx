"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/Form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { subjects } from "@/constants";
import { Textarea } from "../ui/Textarea";
import { createCompanion } from "@/lib/services/companion";
import { redirect } from "next/navigation";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Please enter your companion's name" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  topic: z.string().min(1, { message: "Topic is required" }),
  voice: z.string().min(1, { message: "Voice is required" }),
  style: z.string().min(1, { message: "Style is required" }),
  duration: z.coerce.number().min(1, { message: "Duration is required" }),
});

const CompanionForm = () => {
  const [isOpen, setIsOpen] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      topic: "",
      voice: "",
      style: "",
      duration: 15,
    },
  });

  function onOpenSelect(name: string) {
    setIsOpen((prev) => (prev === name ? "" : name));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const companion = await createCompanion(values);

    if (companion) {
      redirect(`/companions/${companion.id}`);
    } else {
      redirect("/");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name of the companion</FormLabel>
              <FormControl>
                <Input placeholder="Devin the nerd" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select subject</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  onOpenChange={() => onOpenSelect(field.name)}
                  value={field.value}
                >
                  <SelectTrigger isOpen={isOpen === field.name}>
                    <SelectValue placeholder="subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                What kind of support should the companion offer?
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Don't hold back 😄 Say stuff like ‘explain integration like I’m five’"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="voice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voice</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  onOpenChange={() => onOpenSelect(field.name)}
                  value={field.value}
                >
                  <SelectTrigger isOpen={isOpen === field.name}>
                    <SelectValue placeholder="Choose your companion voice" />
                  </SelectTrigger>

                  <SelectContent>
                    {["male", "female"].map((gender) => (
                      <SelectItem
                        key={gender}
                        value={gender}
                        className="capitalize"
                      >
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Style</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  onOpenChange={() => setIsOpen(field.name)}
                  value={field.value}
                >
                  <SelectTrigger isOpen={isOpen === field.name}>
                    <SelectValue placeholder="style" />
                  </SelectTrigger>
                  <SelectContent>
                    {["formal", "casual"].map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Duration (mins)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

export default CompanionForm;
