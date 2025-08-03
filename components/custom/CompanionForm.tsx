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
import { error as errorMessage, successMessage } from "@/constants/message";
import { Textarea } from "../ui/Textarea";
import { createCompanion } from "@/lib/services/companion";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Switch from "../ui/Switch";
import { Voice, VoiceGroup } from "@/types";
import { getToastStyle } from "@/lib/utils";
import { getVoicesList } from "@/lib/services/voices";
import FormSkeleton from "./FormSkeleton";

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
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<VoiceGroup>({ male: [], female: [] });
  // for real voiceId Vapi use to connect
  const [slug, setSlug] = useState("");

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

  const currentGender = form.getValues("gender") ? "male" : "female";
  const currentStyle = form.getValues("style") ? "formal" : "casual";
  const filteredVoices = voices[currentGender].filter(
    (voice) => voice.style === currentStyle,
  );

  function showFetchFailToast() {
    return toast.error(errorMessage.fetchFail, getToastStyle("error"));
  }

  useEffect(() => {
    async function getVoicesAndGroup() {
      try {
        setIsLoading(true);
        const res = await getVoicesList();

        if (res.data) {
          const group = res.data.reduce(
            (group: VoiceGroup, cur: Voice) => {
              const key = cur.gender as keyof VoiceGroup;

              if (key && !group[key]) {
                group[key] = [];
              }

              group[key].push(cur);

              return group;
            },
            { male: [], female: [] },
          );

          setVoices(group);
        }
      } catch (error) {
        if (error instanceof Error) {
          showFetchFailToast();
        }
      } finally {
        setIsLoading(false);
      }
    }

    getVoicesAndGroup();
  }, []);

  function onOpenSelect(name: string) {
    setIsOpen((prev) => (prev === name ? "" : name));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { companion, error, errorDescription } = await createCompanion({
      ...values,
      slug,
    });

    if (companion) {
      toast.success(successMessage.createSuccess, {
        ...getToastStyle("success"),
        description: errorDescription,
      });
      redirect(`/companions/${companion.id}`);
    } else {
      // show toast instead of redirect, which is bad UX
      toast.error(error, getToastStyle("error"));
    }
  }

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <Form {...form}>
      <form
        inert={form.formState.isSubmitting}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 pb-8"
      >
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
                  onCheckedChange={(val) => {
                    field.onChange(val);
                    form.resetField("voiceId");
                  }}
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
                  onCheckedChange={(val) => {
                    field.onChange(val);
                    form.resetField("voiceId");
                  }}
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
                  onValueChange={(val) => {
                    setSlug(
                      filteredVoices.find((i) => i.id === val)?.slug ?? "",
                    );
                    field.onChange(val);
                  }}
                  onOpenChange={() => onOpenSelect(field.name)}
                  value={field.value}
                >
                  <SelectTrigger isOpen={isOpen === field.name}>
                    <SelectValue placeholder="Select voice model" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVoices.map(({ name, id }) => (
                      <SelectItem key={id} value={id}>
                        {name}
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
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => form.reset()} type="reset">
            Reset
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CompanionForm;
