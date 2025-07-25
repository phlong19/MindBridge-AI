"use client";

import { jwtDecode, JwtPayload } from "jwt-decode";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { error as errorMessage } from "@/constants/message";

const formSchema = z.object({
  key: z.coerce.string().min(1, { message: "Invalid key." }),
});

export default function Page() {
  const [keyInformation, setKeyInformation] = useState<JwtPayload>({});
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { key: "" },
  });
  const router = useRouter();

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (form.formState.isValid) {
      console.log(values);
    }
  }

  function setFormError(message: string, type?: string) {
    form.setError("key", { message, type }, { shouldFocus: true });
    return false;
  }

  function validateKey(key: string) {
    // force remove bearer keyword, or simple check includes space
    if (key.includes(" ")) {
      setKeyInformation({});
      return setFormError(errorMessage.invalidTokenContainSpace);
    }

    try {
      const decode = jwtDecode(key);
      const currentTime = Math.floor(Date.now() / 1000);

      // 1. check for iss is from the right source
      // 2. check if the key expired yet
      const { iss, exp } = decode;

      if (iss?.includes("api.vapi.ai") && exp && exp > currentTime) {
        setKeyInformation({ ...decode });
        return form.clearErrors();
      } else throw new Error();
    } catch {
      setKeyInformation({});
      return setFormError(errorMessage.invalidToken);
    }
  }

  return (
    <div className="mx-auto max-w-md p-10 md:max-w-lg lg:max-w-2/3 xl:max-w-1/2">
      <Button onClick={() => router.back()} variant="link">
        <ArrowLeft />
        Go back
      </Button>
      <div className="pt-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="pb-2">Authorization key</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      onBlur={(e) => {
                        const { value } = e.target;
                        if (value.length >= 1) {
                          validateKey(value);
                        }
                      }}
                      placeholder="Paste your key here"
                      className="min-h-40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-3">
              <div className="text-muted-foreground text-sm">
                <ul>
                  {keyInformation.iss && <li>Issue: {keyInformation.iss}</li>}
                  {keyInformation.exp && (
                    <li>
                      Expire at:{" "}
                      {new Date(keyInformation.exp * 1000).toLocaleString(
                        "en-GB",
                      )}
                    </li>
                  )}
                </ul>
              </div>
              <Button disabled={form.formState.isSubmitting} type="submit">
                Start
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
