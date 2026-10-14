import type Vapi from "@vapi-ai/web";

export function installMutedStartup(client: Vapi) {
  let muted = true;
  const setMuted = client.setMuted.bind(client);
  client.setMuted = (value) => {
    muted = value;
    setMuted(value);
  };
  client.on("call-start-progress", (event) => {
    if (
      event.stage !== "daily-call-object-creation" ||
      event.status !== "completed"
    )
      return;
    const daily = client.getDailyCallObject();
    if (!daily) return;
    muted = true;
    const join = daily.join.bind(daily);
    // This SDK version drops startAudioOff during Daily object creation.
    // Daily also accepts it in join options: apply it before any audio joins.
    daily.join = (options) => join({ ...options, startAudioOff: true });
    const setLocalAudio = daily.setLocalAudio.bind(daily);
    // SDK processor recovery enables audio automatically. Only an explicit
    // app unmute may enable it, including when recovery finishes later.
    daily.setLocalAudio = (enabled, options) =>
      setLocalAudio(enabled && !muted, options);
  });
}
