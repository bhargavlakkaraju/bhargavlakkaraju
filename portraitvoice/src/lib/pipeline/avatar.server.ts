import { flagEnv } from "../env.server";
import { getEntry, markFailed, recordUsage, updateEntry } from "../services/entries.server";
import { mirrorRemote } from "../services/storage.server";
import { LIPSYNC_MODEL, pollLipsync, startLipsync } from "../services/sync.server";
import { pollVideo, startExtension, startImageToVideo, XAI_VIDEO_MODEL } from "../services/xai.server";
import { GROK_CLIP_SECONDS, GROK_EXTENSION_SECONDS, MAX_AUDIO_SECONDS, PipelineError, type JobCheck } from "../types";

/**
 * Stage 3 is a chain of provider jobs encoded in the job id so polling stays stateless:
 *   xai:<request>:<target>:<have>   Grok clip (or extension) rendering; `have` = seconds rendered when done
 *   sync:<id>:<target>:<have>       sync.so lip-sync of the finished Grok clip to the testimonial audio
 */
interface AvatarJob {
  provider: "xai" | "sync";
  id: string;
  target: number;
  have: number;
}

function encode(job: AvatarJob): string {
  return `${job.provider}:${job.id}:${job.target}:${job.have}`;
}

function decode(jobId: string): AvatarJob {
  const [provider, id, target, have] = jobId.split(":");
  if ((provider !== "xai" && provider !== "sync") || !id) throw new PipelineError("Unknown video job.");
  return { provider, id, target: Number(target ?? 0), have: Number(have ?? 0) };
}

export async function startAvatarStage(entryId: string, audioSeconds: number): Promise<string> {
  const entry = await getEntry(entryId);
  if (!entry.portrait_url) throw new PipelineError("The portrait stage has not finished yet.");
  if (!entry.audio_url) throw new PipelineError("The voice stage has not finished yet.");
  const target = Math.min(MAX_AUDIO_SECONDS, Math.max(2, Math.ceil(audioSeconds)));
  const first = Math.min(GROK_CLIP_SECONDS, target);
  const useReferenceAudio = flagEnv("XAI_REFERENCE_AUDIO") && target <= GROK_CLIP_SECONDS;
  const requestId = await startImageToVideo(entry.portrait_url, first, useReferenceAudio ? entry.audio_url : undefined);
  const jobId = encode({ provider: "xai", id: requestId, target, have: first });
  await updateEntry(entryId, { current_stage: "avatar", status: "processing", audio_seconds: audioSeconds, current_job_id: jobId, error_message: null });
  return jobId;
}

async function finish(entryId: string, jobId: string, remoteVideoUrl: string): Promise<JobCheck> {
  const hosted = await mirrorRemote(`videos/${entryId}`, remoteVideoUrl, "video/mp4");
  await updateEntry(entryId, {
    video_url: hosted,
    status: "completed",
    completed_at: new Date().toISOString(),
    current_job_id: null,
  });
  return { status: "completed", jobId, url: hosted };
}

export async function checkAvatarStage(entryId: string, jobId: string): Promise<JobCheck> {
  const entry = await getEntry(entryId);
  if (entry.video_url) return { status: "completed", jobId, url: entry.video_url };
  const job = decode(jobId);

  if (job.provider === "xai") {
    const poll = await pollVideo(job.id);
    if (poll.state === "pending") {
      const label = job.have > GROK_CLIP_SECONDS ? `Extending the clip (${job.have}s of ${job.target}s)` : "Animating the portrait";
      return { status: "processing", jobId, progress: poll.progress, label };
    }
    if (poll.state === "failed") {
      await markFailed(entryId, poll.message);
      return { status: "failed", jobId, error: poll.message };
    }
    // Every finished Grok render bills its own seconds.
    const renderedNow = job.have > GROK_CLIP_SECONDS ? Math.min(GROK_EXTENSION_SECONDS, job.have - Math.max(GROK_CLIP_SECONDS, job.have - GROK_EXTENSION_SECONDS)) : job.have;
    await recordUsage(entryId, "avatar", renderedNow, XAI_VIDEO_MODEL());
    if (job.have + 1 < job.target) {
      const more = Math.min(GROK_EXTENSION_SECONDS, job.target - job.have);
      const next = encode({ provider: "xai", id: await startExtension(poll.videoUrl, more), target: job.target, have: job.have + more });
      await updateEntry(entryId, { current_job_id: next });
      return { status: "processing", jobId: next, progress: null, label: `Extending the clip (${job.have}s of ${job.target}s)` };
    }
    if (flagEnv("XAI_REFERENCE_AUDIO") && job.target <= GROK_CLIP_SECONDS) {
      return finish(entryId, jobId, poll.videoUrl);
    }
    if (!entry.audio_url) throw new PipelineError("The voice stage has not finished yet.");
    const next = encode({ provider: "sync", id: await startLipsync(poll.videoUrl, entry.audio_url), target: job.target, have: job.have });
    await updateEntry(entryId, { current_job_id: next });
    return { status: "processing", jobId: next, progress: null, label: "Syncing the lips to the voice" };
  }

  const poll = await pollLipsync(job.id);
  if (poll.state === "pending") return { status: "processing", jobId, progress: null, label: "Syncing the lips to the voice" };
  if (poll.state === "failed") {
    await markFailed(entryId, poll.message);
    return { status: "failed", jobId, error: poll.message };
  }
  await recordUsage(entryId, "lipsync", job.target, LIPSYNC_MODEL());
  return finish(entryId, jobId, poll.videoUrl);
}
