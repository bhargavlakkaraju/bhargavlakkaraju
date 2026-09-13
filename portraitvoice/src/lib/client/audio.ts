/** Measure the playable duration of a remote audio file in the browser. */
export function measureAudioDuration(
  url: string,
  timeoutMs = 15000,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out reading audio duration"));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("error", onError);
      audio.src = "";
    };
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const d = audio.duration;
        cleanup();
        resolve(d);
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not load audio"));
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("error", onError);
    audio.src = url;
    audio.load();
  });
}
