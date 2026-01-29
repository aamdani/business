"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  IdeaCluster,
  IdeaClusterInsert,
  IdeaClusterUpdate,
} from "@/lib/types";
import { ideaKeys } from "./use-ideas";

// Query key factory for clusters
export const clusterKeys = {
  all: ["clusters"] as const,
  lists: () => [...clusterKeys.all, "list"] as const,
  list: (filters: ClusterFilters) => [...clusterKeys.lists(), filters] as const,
  details: () => [...clusterKeys.all, "detail"] as const,
  detail: (id: string) => [...clusterKeys.details(), id] as const,
};

// Filter options for clusters
export interface ClusterFilters {
  isActive?: boolean;
  minIdeaCount?: number;
}

// Cluster with idea count from query
export interface IdeaClusterWithCount extends IdeaCluster {
  _count?: {
    ideas: number;
  };
}

/**
 * Fetch all clusters with optional filters
 */
export function useClusters(filters?: ClusterFilters) {
  return useQuery({
    queryKey: clusterKeys.list(filters ?? {}),
    queryFn: async (): Promise<IdeaCluster[]> => {
      const supabase = createClient();

      let query = supabase
        .from("idea_clusters")
        .select("*")
        .order("idea_count", { ascending: false });

      // Apply filters
      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      if (filters?.minIdeaCount !== undefined) {
        query = query.gte("idea_count", filters.minIdeaCount);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as IdeaCluster[];
    },
  });
}

/**
 * Fetch active clusters only (convenience hook)
 */
export function useActiveClusters() {
  return useClusters({ isActive: true });
}

/**
 * Fetch a single cluster by ID
 */
export function useCluster(id: string | null) {
  return useQuery({
    queryKey: clusterKeys.detail(id ?? ""),
    queryFn: async (): Promise<IdeaCluster | null> => {
      if (!id) return null;

      const supabase = createClient();

      const { data, error } = await supabase
        .from("idea_clusters")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data as IdeaCluster;
    },
    enabled: !!id,
  });
}

/**
 * Create a new cluster
 */
export function useCreateCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cluster: IdeaClusterInsert): Promise<IdeaCluster> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("idea_clusters")
        .insert(cluster)
        .select()
        .single();

      if (error) throw error;
      return data as IdeaCluster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
    },
  });
}

/**
 * Update a cluster
 */
export function useUpdateCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: IdeaClusterUpdate;
    }): Promise<IdeaCluster> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("idea_clusters")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as IdeaCluster;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clusterKeys.detail(data.id) });
    },
  });
}

/**
 * Delete a cluster
 */
export function useDeleteCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("idea_clusters")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
      // Also invalidate ideas since they reference clusters
      queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
    },
  });
}

/**
 * Deactivate a cluster (soft delete)
 */
export function useDeactivateCluster() {
  const updateCluster = useUpdateCluster();

  return useMutation({
    mutationFn: async (id: string): Promise<IdeaCluster> => {
      return updateCluster.mutateAsync({
        id,
        updates: { is_active: false },
      });
    },
  });
}

/**
 * Increment cluster idea count
 * (Used when assigning an idea to a cluster)
 */
export function useIncrementClusterCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clusterId: string): Promise<void> => {
      const supabase = createClient();

      // Use RPC for atomic increment
      const { error } = await supabase.rpc("increment_cluster_idea_count", {
        cluster_id: clusterId,
      });

      // Fallback if RPC doesn't exist - do a fetch-update
      if (error?.code === "42883") {
        // Function does not exist
        const { data: cluster } = await supabase
          .from("idea_clusters")
          .select("idea_count")
          .eq("id", clusterId)
          .single();

        if (cluster) {
          await supabase
            .from("idea_clusters")
            .update({ idea_count: (cluster.idea_count || 0) + 1 })
            .eq("id", clusterId);
        }
      } else if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
    },
  });
}

/**
 * Decrement cluster idea count
 * (Used when removing an idea from a cluster)
 */
export function useDecrementClusterCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clusterId: string): Promise<void> => {
      const supabase = createClient();

      // Use RPC for atomic decrement
      const { error } = await supabase.rpc("decrement_cluster_idea_count", {
        cluster_id: clusterId,
      });

      // Fallback if RPC doesn't exist
      if (error?.code === "42883") {
        const { data: cluster } = await supabase
          .from("idea_clusters")
          .select("idea_count")
          .eq("id", clusterId)
          .single();

        if (cluster && cluster.idea_count > 0) {
          await supabase
            .from("idea_clusters")
            .update({ idea_count: cluster.idea_count - 1 })
            .eq("id", clusterId);
        }
      } else if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
    },
  });
}

/**
 * Get cluster with its ideas
 */
export function useClusterWithIdeas(clusterId: string | null) {
  return useQuery({
    queryKey: [...clusterKeys.detail(clusterId ?? ""), "with-ideas"],
    queryFn: async () => {
      if (!clusterId) return null;

      const supabase = createClient();

      // Fetch cluster
      const { data: cluster, error: clusterError } = await supabase
        .from("idea_clusters")
        .select("*")
        .eq("id", clusterId)
        .single();

      if (clusterError) {
        if (clusterError.code === "PGRST116") return null;
        throw clusterError;
      }

      // Fetch ideas in this cluster
      const { data: ideas, error: ideasError } = await supabase
        .from("slack_ideas")
        .select("*")
        .eq("cluster_id", clusterId)
        .order("captured_at", { ascending: false });

      if (ideasError) throw ideasError;

      return {
        cluster: cluster as IdeaCluster,
        ideas: ideas || [],
      };
    },
    enabled: !!clusterId,
  });
}
