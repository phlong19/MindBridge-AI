enum MessageTypeEnum {
  TRANSCRIPT = "transcript",
  FUNCTION_CALL = "function-call",
  FUNCTION_CALL_RESULT = "function-call-result",
  ADD_MESSAGE = "add-message",
  SPEECH_UPDATE = "speech-update",
  STATUS_UPDATE = "status-update",
}

enum MessageRoleEnum {
  USER = "user",
  SYSTEM = "system",
  ASSISTANT = "assistant",
}

enum TranscriptMessageTypeEnum {
  PARTIAL = "partial",
  FINAL = "final",
}

interface BaseMessage {
  type: MessageTypeEnum;
}

interface TranscriptMessage extends BaseMessage {
  type: MessageTypeEnum.TRANSCRIPT;
  role: MessageRoleEnum;
  transcriptType: TranscriptMessageTypeEnum;
  transcript: string;
}

interface FunctionCallMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: unknown;
  };
}

interface FunctionCallResultMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL_RESULT;
  functionCallResult: {
    forwardToClientEnabled?: boolean;
    result: unknown;
    [a: string]: unknown;
  };
}

interface SpeechUpdateMessage extends BaseMessage {
  type: MessageTypeEnum.SPEECH_UPDATE;
  role: MessageRoleEnum;
  status: "started" | "stopped";
}

interface StatusUpdateMessage extends BaseMessage {
  type: MessageTypeEnum.STATUS_UPDATE;
  status: string;
  endedReason?: string;
}

type Message =
  | TranscriptMessage
  | FunctionCallMessage
  | FunctionCallResultMessage
  | SpeechUpdateMessage
  | StatusUpdateMessage;
