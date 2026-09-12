import { PipelineError } from "./types";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function requireEnv(name: string, friendly: string): string {
  const v = read(name);
  if (!v) throw new PipelineError(`${friendly} is not configured yet. Ask the administrator to set ${name}.`, undefined, "config");
  return v;
}

export function optionalEnv(name: string, fallback: string): string {
  return read(name) ?? fallback;
}

export function flagEnv(name: string): boolean {
  return /^(1|true|yes)$/i.test(read(name) ?? "");
}
