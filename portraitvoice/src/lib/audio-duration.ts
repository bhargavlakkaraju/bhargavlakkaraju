/** Measures audio duration in the browser from a File or a hosted URL. */
export function measureAudioDuration(source: File | string): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const audio = new Audio();
    audio.preload = "metadata";
    if (typeof source === "string") audio.crossOrigin = "anonymous";
    const cleanup = () => {
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) reject(new Error("Could not read the recording length."));
      else resolve(d);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Could not read the recording. Please upload an MP3, WAV or M4A file."));
    };
    audio.src = url;
  });
}
