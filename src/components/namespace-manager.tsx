"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  PineconeNamespace,
  PineconeNamespaceInsert,
  NamespaceSourceType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface NamespaceManagerProps {
  className?: string;
}

const SOURCE_TYPES: { value: NamespaceSourceType; label: string }[] = [
  { value: "newsletter", label: "Newsletter" },
  { value: "documentation", label: "Documentation" },
  { value: "research", label: "Research" },
];

export function NamespaceManager({ className }: NamespaceManagerProps) {
  const [namespaces, setNamespaces] = useState<PineconeNamespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNamespace, setEditingNamespace] =
    useState<PineconeNamespace | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PineconeNamespaceInsert>({
    slug: "",
    display_name: "",
    description: "",
    source_type: "newsletter",
    is_active: true,
    is_searchable: true,
  });

  // Memoize supabase client to prevent useCallback/useEffect from re-running
  const supabase = useMemo(() => createClient(), []);

  const loadNamespaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("pinecone_namespaces")
        .select("*")
        .order("sort_order");

      if (fetchError) throw fetchError;
      setNamespaces(data || []);
    } catch (err) {
      console.error("Failed to load namespaces:", err);
      setError(err instanceof Error ? err.message : "Failed to load namespaces");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadNamespaces();
  }, [loadNamespaces]);

  const resetForm = () => {
    setFormData({
      slug: "",
      display_name: "",
      description: "",
      source_type: "newsletter",
      is_active: true,
      is_searchable: true,
    });
    setEditingNamespace(null);
  };

  const openEditDialog = (namespace: PineconeNamespace) => {
    setEditingNamespace(namespace);
    setFormData({
      slug: namespace.slug,
      display_name: namespace.display_name,
      description: namespace.description || "",
      source_type: namespace.source_type || "newsletter",
      is_active: namespace.is_active,
      is_searchable: namespace.is_searchable,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.display_name) {
      setError("Slug and display name are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingNamespace) {
        // Update existing
        const { error: updateError } = await supabase
          .from("pinecone_namespaces")
          .update({
            slug: formData.slug,
            display_name: formData.display_name,
            description: formData.description || null,
            source_type: formData.source_type,
            is_active: formData.is_active,
            is_searchable: formData.is_searchable,
          })
          .eq("id", editingNamespace.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const maxSortOrder = Math.max(0, ...namespaces.map((n) => n.sort_order));
        const { error: insertError } = await supabase
          .from("pinecone_namespaces")
          .insert({
            ...formData,
            sort_order: maxSortOrder + 1,
          });

        if (insertError) throw insertError;
      }

      setIsDialogOpen(false);
      resetForm();
      await loadNamespaces();
    } catch (err) {
      console.error("Failed to save namespace:", err);
      setError(err instanceof Error ? err.message : "Failed to save namespace");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (namespace: PineconeNamespace) => {
    if (
      !confirm(
        `Delete namespace "${namespace.display_name}"? This won't delete the vectors in Pinecone.`
      )
    ) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("pinecone_namespaces")
        .delete()
        .eq("id", namespace.id);

      if (deleteError) throw deleteError;
      await loadNamespaces();
    } catch (err) {
      console.error("Failed to delete namespace:", err);
      setError(err instanceof Error ? err.message : "Failed to delete namespace");
    }
  };

  const toggleActive = async (namespace: PineconeNamespace) => {
    try {
      const { error: updateError } = await supabase
        .from("pinecone_namespaces")
        .update({ is_active: !namespace.is_active })
        .eq("id", namespace.id);

      if (updateError) throw updateError;
      await loadNamespaces();
    } catch (err) {
      console.error("Failed to toggle active:", err);
    }
  };

  const toggleSearchable = async (namespace: PineconeNamespace) => {
    try {
      const { error: updateError } = await supabase
        .from("pinecone_namespaces")
        .update({ is_searchable: !namespace.is_searchable })
        .eq("id", namespace.id);

      if (updateError) throw updateError;
      await loadNamespaces();
    } catch (err) {
      console.error("Failed to toggle searchable:", err);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Pinecone Namespaces
            </CardTitle>
            <CardDescription>
              Manage vector database namespaces for semantic search
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Add Namespace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingNamespace ? "Edit Namespace" : "Add Namespace"}
                </DialogTitle>
                <DialogDescription>
                  {editingNamespace
                    ? "Update the namespace configuration."
                    : "Create a new namespace for organizing vectors."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    placeholder="e.g., my-docs"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    disabled={!!editingNamespace}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier used in Pinecone. Cannot be changed after
                    creation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="e.g., My Documentation"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source_type">Source Type</Label>
                  <Select
                    value={formData.source_type}
                    onValueChange={(value: NamespaceSourceType) =>
                      setFormData({ ...formData, source_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this namespace
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Searchable</Label>
                    <p className="text-xs text-muted-foreground">
                      Include in search results
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_searchable}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_searchable: checked })
                    }
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingNamespace ? "Save Changes" : "Create Namespace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {error && !isDialogOpen && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {namespaces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No namespaces configured</p>
            <p className="text-sm">
              Add a namespace to start organizing your vectors
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {namespaces.map((namespace) => (
              <div
                key={namespace.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  namespace.is_active
                    ? "bg-card"
                    : "bg-muted/50 opacity-60"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{namespace.display_name}</span>
                    <code className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {namespace.slug}
                    </code>
                    {namespace.source_type && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {namespace.source_type}
                      </span>
                    )}
                  </div>
                  {namespace.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {namespace.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleSearchable(namespace)}
                    title={namespace.is_searchable ? "Searchable" : "Not searchable"}
                  >
                    {namespace.is_searchable ? (
                      <Search className="h-4 w-4 text-primary" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleActive(namespace)}
                    title={namespace.is_active ? "Active" : "Inactive"}
                  >
                    {namespace.is_active ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(namespace)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(namespace)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
