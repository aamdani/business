"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LockBanner } from "./lock-banner";
import { VersionHistory } from "./version-history";
import {
  useAsset,
  useCheckLock,
  useAcquireLock,
  useReleaseLock,
  useRefreshLock,
} from "@/hooks/use-assets";
import { useCreateVersion } from "@/hooks/use-asset-versions";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProjectAsset, LockStatus } from "@/lib/types";

interface AssetEditorProps {
  assetId: string;
  projectId: string;
  onNavigateAway?: () => void;
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LOCK_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Inner component that receives initialized data
function AssetEditorInner({
  asset,
  lockStatus,
  assetId,
  onNavigateAway,
}: {
  asset: ProjectAsset;
  lockStatus: LockStatus;
  assetId: string;
  onNavigateAway?: () => void;
}) {
  const acquireLock = useAcquireLock();
  const releaseLock = useReleaseLock();
  const refreshLock = useRefreshLock();
  const createVersion = useCreateVersion();

  // Initialize content with asset data (only runs once on mount)
  const [content, setContent] = useState(asset.content || "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showInactivityDialog, setShowInactivityDialog] = useState(false);
  const [currentLockStatus, setCurrentLockStatus] = useState(lockStatus);

  // Keep lock status in sync
  const { data: refreshedLockStatus } = useCheckLock(assetId);
  if (refreshedLockStatus && refreshedLockStatus !== currentLockStatus) {
    setCurrentLockStatus(refreshedLockStatus);
  }

  const lastActivityRef = useRef<number>(0);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize lastActivityRef on mount
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setSaveStatus("idle");
    lastActivityRef.current = Date.now();

    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityDialog(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  // Acquire lock
  const handleAcquireLock = async () => {
    const success = await acquireLock.mutateAsync(assetId);
    if (success) {
      // Start lock refresh timer
      lockRefreshTimerRef.current = setInterval(() => {
        refreshLock.mutate(assetId);
      }, LOCK_REFRESH_INTERVAL_MS);

      // Start inactivity timer
      inactivityTimerRef.current = setTimeout(() => {
        setShowInactivityDialog(true);
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  // Release lock
  const handleReleaseLock = async () => {
    // Clear timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (lockRefreshTimerRef.current) {
      clearInterval(lockRefreshTimerRef.current);
    }

    // Save if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSave();
    }

    await releaseLock.mutateAsync(assetId);
    onNavigateAway?.();
  };

  // Save content
  const handleSave = async () => {
    if (!currentLockStatus?.isLockedByCurrentUser) return;

    setSaveStatus("saving");
    try {
      await createVersion.mutateAsync({
        assetId,
        content,
      });
      setHasUnsavedChanges(false);
      setSaveStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveStatus("error");
    }
  };

  // Handle inactivity dialog response
  const handleStillEditing = () => {
    setShowInactivityDialog(false);
    lastActivityRef.current = Date.now();

    // Reset inactivity timer
    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityDialog(true);
    }, INACTIVITY_TIMEOUT_MS);

    // Refresh lock
    refreshLock.mutate(assetId);
  };

  const handleDoneEditing = async () => {
    setShowInactivityDialog(false);
    await handleReleaseLock();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (lockRefreshTimerRef.current) {
        clearInterval(lockRefreshTimerRef.current);
      }
    };
  }, []);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || currentLockStatus?.isLockedByCurrentUser) {
        e.preventDefault();
        // Release lock on unload
        if (currentLockStatus?.isLockedByCurrentUser) {
          releaseLock.mutate(assetId);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, currentLockStatus, assetId, releaseLock]);

  const canEdit = currentLockStatus.isLockedByCurrentUser;
  const isReadOnly = currentLockStatus.isLocked && !currentLockStatus.isLockedByCurrentUser;

  return (
    <div className="space-y-4">
      {/* Lock Banner */}
      <LockBanner
        lockStatus={currentLockStatus}
        onAcquireLock={handleAcquireLock}
        onReleaseLock={handleReleaseLock}
        isAcquiring={acquireLock.isPending}
        isReleasing={releaseLock.isPending}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Content</CardTitle>
                <div className="flex items-center gap-2">
                  {saveStatus === "saving" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      Save failed
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!canEdit || !hasUnsavedChanges || createVersion.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                disabled={!canEdit}
                placeholder={
                  isReadOnly
                    ? "This asset is being edited by another user..."
                    : canEdit
                    ? "Start writing your content..."
                    : "Click 'Start Editing' to begin..."
                }
                className="min-h-[400px] font-mono text-sm resize-none"
              />
              {hasUnsavedChanges && canEdit && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  You have unsaved changes
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Version History */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <VersionHistory
                assetId={assetId}
                currentVersion={asset.current_version}
                disabled={!canEdit}
                onRestore={(version) => {
                  setContent(version.content);
                  setHasUnsavedChanges(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inactivity Dialog */}
      <AlertDialog open={showInactivityDialog} onOpenChange={setShowInactivityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you still there?</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t made any changes in a while. Would you like to continue
              editing or release the lock?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDoneEditing}>
              Done Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStillEditing}>
              Continue Editing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AssetEditor({
  assetId,
  projectId: _projectId,
  onNavigateAway,
}: AssetEditorProps) {
  // projectId available for future use (e.g., breadcrumbs, navigation)
  void _projectId;

  const { data: asset, isLoading: assetLoading } = useAsset(assetId);
  const { data: lockStatus, isLoading: lockLoading } = useCheckLock(assetId);

  if (assetLoading || lockLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset || !lockStatus) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Asset not found</p>
      </div>
    );
  }

  // Render inner component with key to reset state when asset changes
  return (
    <AssetEditorInner
      key={assetId}
      asset={asset}
      lockStatus={lockStatus}
      assetId={assetId}
      onNavigateAway={onNavigateAway}
    />
  );
}
