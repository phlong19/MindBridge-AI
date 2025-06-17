import { error } from "@/constants/message";
import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = process.env.NEXT_VAPI_PUBLIC_KEY;

if (!VAPI_PUBLIC_KEY) {
  throw new Error(error.missingEnvVariables);
}

export const vapi = new Vapi(VAPI_PUBLIC_KEY);
