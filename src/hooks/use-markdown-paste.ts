"use client";

import TurndownService from "turndown";
import type { ClipboardEvent as ReactClipboardEvent } from "react";

// Configure Turndown for clean Markdown output
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx", // # style headings
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // Remove empty links
  turndown.addRule("removeEmptyLinks", {
    filter: (node) =>
      node.nodeName === "A" && !node.textContent?.trim(),
    replacement: () => "",
  });

  // Clean up Google Docs span styling (convert to plain text)
  turndown.addRule("cleanGoogleDocsSpans", {
    filter: (node) => {
      if (node.nodeName !== "SPAN") return false;
      const style = node.getAttribute("style");
      return style !== null && style.includes("font-");
    },
    replacement: (_content, node) => {
      return (node as HTMLElement).textContent || "";
    },
  });

  return turndown;
}

// Singleton turndown instance
let turndownInstance: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService();
  }
  return turndownInstance;
}

/**
 * Convert HTML string to clean Markdown
 */
export function htmlToMarkdown(html: string): string {
  const turndown = getTurndown();
  let markdown = turndown.turndown(html);

  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .trim();

  return markdown;
}

/**
 * Create an onPaste handler for controlled textareas that converts HTML to Markdown.
 *
 * @param currentValue - Current textarea value
 * @param onChange - Callback to update the value
 * @returns Paste event handler
 *
 * @example
 * ```tsx
 * <Textarea
 *   value={content}
 *   onChange={(e) => setContent(e.target.value)}
 *   onPaste={createMarkdownPasteHandler(content, setContent)}
 * />
 * ```
 */
export function createMarkdownPasteHandler(
  currentValue: string,
  onChange: (newValue: string) => void
) {
  return (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // No HTML, let default paste handle it

    // Prevent default paste
    e.preventDefault();

    // Convert HTML to Markdown
    const markdown = htmlToMarkdown(html);

    // Get cursor position from the target element
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;

    // Insert markdown at cursor position
    const newValue =
      currentValue.substring(0, start) +
      markdown +
      currentValue.substring(end);

    onChange(newValue);

    // Set cursor position after inserted text (needs to happen after React updates)
    requestAnimationFrame(() => {
      const newCursorPos = start + markdown.length;
      target.setSelectionRange(newCursorPos, newCursorPos);
    });
  };
}
