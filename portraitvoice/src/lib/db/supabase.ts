import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AiUsageEvent,
  EntryPatch,
  NewEntry,
  NewUsageEvent,
  TestimonialEntry,
} from "../types";
import type { EntryRepository } from "./repository";

export class SupabaseRepository implements EntryRepository {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createEntry(entry: NewEntry): Promise<TestimonialEntry> {
    const { data, error } = await this.client
      .from("testimonial_entries")
      .insert(entry)
      .select()
      .single();
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return data as TestimonialEntry;
  }

  async getEntry(id: string): Promise<TestimonialEntry | null> {
    const { data, error } = await this.client
      .from("testimonial_entries")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    return (data as TestimonialEntry | null) ?? null;
  }

  async updateEntry(id: string, patch: EntryPatch): Promise<TestimonialEntry> {
    const { data, error } = await this.client
      .from("testimonial_entries")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return data as TestimonialEntry;
  }

  async listEntries(limit = 200, offset = 0): Promise<TestimonialEntry[]> {
    const { data, error } = await this.client
      .from("testimonial_entries")
      .select()
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    return (data ?? []) as TestimonialEntry[];
  }

  async listCompletedEntries(
    limit = 100,
    offset = 0,
  ): Promise<TestimonialEntry[]> {
    const { data, error } = await this.client
      .from("testimonial_entries")
      .select()
      .eq("status", "completed")
      .not("video_url", "is", null)
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    return (data ?? []) as TestimonialEntry[];
  }

  async insertUsage(event: NewUsageEvent): Promise<AiUsageEvent> {
    const { data, error } = await this.client
      .from("ai_usage_events")
      .insert(event)
      .select()
      .single();
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return data as AiUsageEvent;
  }

  async listUsage(limit = 2000, offset = 0): Promise<AiUsageEvent[]> {
    const { data, error } = await this.client
      .from("ai_usage_events")
      .select()
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    return (data ?? []) as AiUsageEvent[];
  }
}
