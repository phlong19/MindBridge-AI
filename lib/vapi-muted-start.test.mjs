import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

test("the microphone is disabled in Daily join options before a call can connect", async () => {
  const { installMutedStartup } = await import("./vapi-muted-start.ts");
  const calls = [];
  const daily = {
    setLocalAudio: () => {},
    join: async (options) => {
      calls.push(options);
      return "joined";
    },
  };
  const client = new EventEmitter();
  client.setMuted = () => {};
  client.getDailyCallObject = () => daily;
  installMutedStartup(client);
  client.emit("call-start-progress", {
    stage: "daily-call-object-creation",
    status: "completed",
  });
  assert.equal(
    await daily.join({
      url: "test-room",
      subscribeToTracksAutomatically: false,
    }),
    "joined",
  );
  assert.equal(calls[0].startAudioOff, true);
  assert.equal(calls[0].url, "test-room");
  assert.equal(calls[0].subscribeToTracksAutomatically, false);
});

test("SDK audio recovery preserves the latest explicit microphone choice", async () => {
  const { installMutedStartup } = await import("./vapi-muted-start.ts");
  let audioEnabled = false;
  const daily = {
    join: async () => {},
    setLocalAudio: (enabled) => {
      audioEnabled = enabled;
    },
  };
  const client = new EventEmitter();
  client.getDailyCallObject = () => daily;
  client.setMuted = (muted) => daily.setLocalAudio(!muted);
  installMutedStartup(client);
  client.emit("call-start-progress", {
    stage: "daily-call-object-creation",
    status: "completed",
  });
  // The SDK asynchronously enables audio after recovering its processor.
  const recoverAudio = () =>
    Promise.resolve().then(() => daily.setLocalAudio(true));
  await recoverAudio();
  assert.equal(audioEnabled, false);
  client.setMuted(false);
  await recoverAudio();
  assert.equal(audioEnabled, true);
  const pendingRecovery = recoverAudio();
  client.setMuted(true);
  await pendingRecovery;
  assert.equal(audioEnabled, false);
  client.setMuted(false);
  let nextAudioEnabled = false;
  const nextDaily = {
    join: async () => {},
    setLocalAudio: (enabled) => {
      nextAudioEnabled = enabled;
    },
  };
  client.getDailyCallObject = () => nextDaily;
  client.emit("call-start-progress", {
    stage: "daily-call-object-creation",
    status: "completed",
  });
  await Promise.resolve().then(() => nextDaily.setLocalAudio(true));
  assert.equal(nextAudioEnabled, false);
});
