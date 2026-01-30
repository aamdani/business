"use client";

import { useEffect } from "react";
import { useSidebar } from "@/contexts/sidebar-context";

/**
 * Component that auto-collapses the sidebar when mounted.
 * Use this on pages that need more horizontal space (e.g., project details, asset editor).
 */
export function SidebarAutoCollapse() {
  const { setCollapsed } = useSidebar();

  useEffect(() => {
    setCollapsed(true);
    // Don't restore on unmount - let user control it
  }, [setCollapsed]);

  return null;
}
