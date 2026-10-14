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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { error as errorMessage, successMessage } from "@/constants/message";
import { fetchVoicesAndSync } from "@/lib/services/voices";
import { toast } from "sonner";
import VoiceTable from "@/components/custom/VoiceTable";
import { Voice } from "@/types";
import { getToastStyle } from "@/lib/utils";
import GoBackButton from "@/components/custom/GoBackButton";

const formSchema = z.object({
  key: z.coerce.string().min(1, { message: "Invalid key." }),
});

export default function Page() {
  const [keyInformation, setKeyInformation] = useState<JwtPayload>({});
  const [voiceData, setVoiceData] = useState<Voice[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { key: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const voices = await fetchVoicesAndSync("11labs", values.key);

      if (Array.isArray(voices) && voices.length > 0) {
        setVoiceData(voices);
        toast.success(successMessage.syncComplete, getToastStyle("success"));
      } else if (!Array.isArray(voices)) {
        toast.error(voices.error, {
          ...getToastStyle("error"),
          description: voices.errorDescription,
        });
      } else {
        toast.error(errorMessage.fetchFail, getToastStyle("error"));
      }
    } catch {
      toast.error(errorMessage.serverError, getToastStyle("error"));
    } finally {
      form.reset({ key: "" });
      setKeyInformation({});
    }
  }

  function setFormError(message: string, type?: string) {
    form.setError("key", { message, type }, { shouldFocus: true });
    return false;
  }

  function validateKey(value: string) {
    const key = value.trim().replace(/^Bearer\s+/i, "");
    if (!key || /\s/.test(key)) {
      setKeyInformation({});
      return setFormError(errorMessage.invalidToken);
    }

    try {
      const decode = jwtDecode(key);
      const currentTime = Math.floor(Date.now() / 1000);

      // 1. check for iss is from the right source
      // 2. check if the key expired yet
      const { iss, exp } = decode;

      if (iss === "https://api.workos.com" && exp && exp > currentTime) {
        setKeyInformation({ ...decode });
        return form.clearErrors();
      } else throw new Error();
    } catch {
      setKeyInformation({});
      return setFormError(errorMessage.invalidToken);
    }
  }

  return (
    <div className="w-full p-5 md:p-10">
      <GoBackButton />
      <div className="flex flex-col gap-5 pt-5">
        <Form {...form}>
          <form
            inert={form.formState.isSubmitting}
            className="mx-auto w-full md:w-lg lg:w-2/3 xl:w-1/2"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="pb-2">
                    Vapi dashboard authorization value
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      onBlur={(e) => {
                        const { value } = e.target;
                        if (value.length >= 1) {
                          validateKey(value);
                          field.onBlur();
                        } else setKeyInformation({});
                      }}
                      placeholder="Paste a current JWT or the full Bearer value"
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

        {/* {voiceData.length > 0 && <VoiceTable data={voiceData} />} */}
        {<VoiceTable data={voiceData} />}
      </div>
    </div>
  );
}
