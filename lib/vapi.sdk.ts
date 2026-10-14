import { error } from "@/constants/message";
import Vapi from "@vapi-ai/web";
import { installMutedStartup } from "./vapi-muted-start";

const key = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

if (!key) {
  throw new Error(error.missingEnvVariables);
}

export const vapi = new Vapi(key);

export const createVapiClient = (options?: { startAudioOff?: boolean }) => {
  const client = new Vapi(key!, undefined, undefined, options);
  if (options?.startAudioOff) installMutedStartup(client);
  return client;
};
