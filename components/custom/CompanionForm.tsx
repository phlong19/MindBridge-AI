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
  FormDescription,
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
import { toast } from "sonner";
import Switch from "../ui/Switch";

const formSchema = z.object({
  name: z.string().min(1, { message: "Please enter your companion's name" }),
  subject: z.string().min(1, { message: "Subject is required" }),
  topic: z.string().min(1, { message: "Topic is required" }),
  gender: z.coerce.boolean(),
  voiceId: z.string().min(1, { message: "Please select a voice model" }),
  style: z.coerce.boolean(),
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
      gender: false,
      style: false,
      duration: 15,
      voiceId: "",
    },
  });

  function onOpenSelect(name: string) {
    setIsOpen((prev) => (prev === name ? "" : name));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { companion, error } = await createCompanion(values);

    if (companion) {
      redirect(`/companions/${companion.id}`);
    } else {
      // show toast instead of redirect, which is bad UX
      toast(error);
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
                  placeholder={`Don't hold back even when have to say stuff like "explain like I’m five’" 😄🖐️`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="flex items-center gap-8">
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <Switch
                  leftLabel="Female"
                  rightLabel="Male"
                  onCheckedChange={field.onChange}
                  checked={field.value}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem className="flex items-center gap-8">
              <FormLabel>Style</FormLabel>
              <FormControl>
                <Switch
                  leftLabel="Casual"
                  rightLabel="Formal"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="voiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voice</FormLabel>
              <FormDescription>Based on Gender and Style</FormDescription>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  onOpenChange={() => onOpenSelect(field.name)}
                  value={field.value}
                >
                  <SelectTrigger isOpen={isOpen === field.name}>
                    <SelectValue placeholder="Select voice model" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log(2);
                          }}
                        >
                          x
                        </Button>
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
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => form.reset()} type="reset">
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
  );
};

export default CompanionForm;
