"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  SlackIdea,
  SlackIdeaInsert,
  SlackIdeaUpdate,
  IdeaStatus,
  IdeaSourceType,
  IdeaCluster,
} from "@/lib/types";

// Query key factory for ideas
export const ideaKeys = {
  all: ["ideas"] as const,
  lists: () => [...ideaKeys.all, "list"] as const,
  list: (filters: IdeaFilters) => [...ideaKeys.lists(), filters] as const,
  details: () => [...ideaKeys.all, "detail"] as const,
  detail: (id: string) => [...ideaKeys.details(), id] as const,
  search: (query: string) => [...ideaKeys.all, "search", query] as const,
};

// Filter options for ideas list
export interface IdeaFilters {
  status?: IdeaStatus;
  clusterId?: string;
  sourceType?: IdeaSourceType;
  search?: string;
  limit?: number;
}

// Extended idea type with cluster relation (allows null from DB)
export interface SlackIdeaWithCluster extends Omit<SlackIdea, "cluster"> {
  cluster?: IdeaCluster | null;
}

/**
 * Fetch ideas with optional filters
 */
export function useIdeas(filters?: IdeaFilters) {
  return useQuery({
    queryKey: ideaKeys.list(filters ?? {}),
    queryFn: async (): Promise<SlackIdeaWithCluster[]> => {
      const supabase = createClient();

      let query = supabase
        .from("slack_ideas")
        .select(
          `
          *,
          cluster:idea_clusters (
            id,
            name,
            description,
            idea_count,
            is_active
          )
        `
        )
        .order("captured_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.clusterId) {
        query = query.eq("cluster_id", filters.clusterId);
      }

      if (filters?.sourceType) {
        query = query.eq("source_type", filters.sourceType);
      }

      if (filters?.search) {
        // Full-text search on raw_content
        query = query.textSearch("raw_content", filters.search, {
          config: "english",
          type: "websearch",
        });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SlackIdeaWithCluster[];
    },
  });
}

/**
 * Fetch a single idea by ID
 */
export function useIdea(id: string | null) {
  return useQuery({
    queryKey: ideaKeys.detail(id ?? ""),
    queryFn: async (): Promise<SlackIdeaWithCluster | null> => {
      if (!id) return null;

      const supabase = createClient();

      const { data, error } = await supabase
        .from("slack_ideas")
        .select(
          `
          *,
          cluster:idea_clusters (
            id,
            name,
            description,
            idea_count,
            is_active
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data as SlackIdeaWithCluster;
    },
    enabled: !!id,
  });
}

/**
 * Fetch ideas by status (convenience hook)
 */
export function useBacklogIdeas() {
  return useIdeas({ status: "backlog" });
}

export function useInProgressIdeas() {
  return useIdeas({ status: "in_progress" });
}

/**
 * Create a new idea
 */
export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idea: SlackIdeaInsert): Promise<SlackIdea> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("slack_ideas")
        .insert(idea)
        .select()
        .single();

      if (error) throw error;
      return data as SlackIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
    },
  });
}

/**
 * Update an existing idea
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: SlackIdeaUpdate;
    }): Promise<SlackIdea> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("slack_ideas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SlackIdea;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ideaKeys.detail(data.id) });
    },
  });
}

/**
 * Delete an idea
 */
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("slack_ideas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
    },
  });
}

/**
 * Archive an idea (set status to 'archived')
 */
export function useArchiveIdea() {
  const updateIdea = useUpdateIdea();

  return useMutation({
    mutationFn: async (id: string): Promise<SlackIdea> => {
      return updateIdea.mutateAsync({
        id,
        updates: { status: "archived" },
      });
    },
  });
}

/**
 * Update idea status
 */
export function useUpdateIdeaStatus() {
  const updateIdea = useUpdateIdea();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: IdeaStatus;
    }): Promise<SlackIdea> => {
      return updateIdea.mutateAsync({
        id,
        updates: { status },
      });
    },
  });
}

/**
 * Bulk update ideas (for multi-select operations)
 */
export function useBulkUpdateIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: {
      ids: string[];
      updates: SlackIdeaUpdate;
    }): Promise<void> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("slack_ideas")
        .update(updates)
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ideaKeys.all });
    },
  });
}

/**
 * Bulk archive ideas
 */
export function useBulkArchiveIdeas() {
  const bulkUpdate = useBulkUpdateIdeas();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      return bulkUpdate.mutateAsync({
        ids,
        updates: { status: "archived" },
      });
    },
  });
}

/**
 * Get idea counts by status
 */
export function useIdeaCounts() {
  return useQuery({
    queryKey: [...ideaKeys.all, "counts"],
    queryFn: async () => {
      const supabase = createClient();

      // Get counts for each status
      const { data, error } = await supabase
        .from("slack_ideas")
        .select("status")
        .order("status");

      if (error) throw error;

      // Count by status
      const counts = {
        backlog: 0,
        in_progress: 0,
        drafted: 0,
        archived: 0,
        total: 0,
      };

      for (const row of data || []) {
        const status = row.status as IdeaStatus;
        if (status in counts) {
          counts[status]++;
        }
        counts.total++;
      }

      return counts;
    },
  });
}
