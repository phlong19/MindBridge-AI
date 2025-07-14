import { error } from "@/constants/message";
import Vapi from "@vapi-ai/web";

const key = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;

if (!key) {
  throw new Error(error.missingEnvVariables);
}

export const vapi = new Vapi(key);
