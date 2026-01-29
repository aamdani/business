#!/usr/bin/env npx tsx

/**
 * Migration Script for Content Calendar
 *
 * Imports existing content from migration folder into the new project system.
 *
 * Usage:
 *   npx tsx scripts/migrate-content.ts --dry-run     # Preview changes
 *   npx tsx scripts/migrate-content.ts               # Run migration
 *   npx tsx scripts/migrate-content.ts --user-id <uuid>  # Specify user
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: ".env.local" });

// Configuration
const MIGRATION_SOURCE =
  "/Users/jonathanedwards/AUTOMATION/Clients/nate work/Migration to new database/";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const userIdIndex = args.indexOf("--user-id");
const providedUserId = userIdIndex !== -1 ? args[userIdIndex + 1] : null;

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Types
interface ParsedContent {
  filename: string;
  title: string;
  publishDate: string | null;
  status: "draft" | "scheduled" | "published";
  type: "dated" | "additional" | "prompt_kit" | "overview";
  googleDocUrl: string | null;
  notionUrl: string | null;
  notes: string;
  rawContent: string;
}

interface MigrationResult {
  success: boolean;
  filename: string;
  projectId?: string;
  error?: string;
}

// Parse a markdown file
function parseMarkdownFile(filepath: string): ParsedContent | null {
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const filename = path.basename(filepath);

    // Determine type from filename
    let type: ParsedContent["type"] = "dated";
    if (filename.startsWith("ADDITIONAL")) {
      type = "additional";
    } else if (filename.startsWith("PROMPT KIT")) {
      type = "prompt_kit";
    } else if (filename.includes("Overview")) {
      type = "overview";
    }

    // Extract title (first H1)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename.replace(".md", "");

    // Extract publish date
    const dateMatch = content.match(
      /\*\*Publish Date:\*\*\s*(.+)/i
    );
    let publishDate: string | null = null;
    if (dateMatch) {
      // Try to parse the date
      const dateStr = dateMatch[1].trim();
      try {
        // Handle format like "Friday, January 30, 2026"
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          publishDate = parsed.toISOString().split("T")[0];
        }
      } catch {
        // Try extracting from filename (format: 2026-01-29)
        const filenameDate = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        if (filenameDate) {
          publishDate = filenameDate[1];
        }
      }
    } else {
      // Extract from filename
      const filenameDate = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      if (filenameDate) {
        publishDate = filenameDate[1];
      }
    }

    // Extract Google Doc URL
    const googleDocMatch = content.match(
      /\[.+?\]\((https:\/\/docs\.google\.com\/document\/[^\)]+)\)/
    );
    const googleDocUrl = googleDocMatch ? googleDocMatch[1] : null;

    // Extract Notion URL
    const notionMatch = content.match(
      /\[.+?\]\((https:\/\/www\.notion\.so\/[^\)]+)\)/
    );
    const notionUrl = notionMatch ? notionMatch[1] : null;

    // Determine status
    let status: ParsedContent["status"] = "draft";
    if (googleDocUrl || notionUrl) {
      status = "scheduled";
    }
    if (content.includes("published") || content.includes("Published")) {
      status = "published";
    }

    // Extract notes section
    const notesMatch = content.match(/## Notes from Slack([\s\S]*?)(?=\n---|\n##|$)/i);
    const notes = notesMatch ? notesMatch[1].trim() : "";

    return {
      filename,
      title,
      publishDate,
      status,
      type,
      googleDocUrl,
      notionUrl,
      notes,
      rawContent: content,
    };
  } catch (error) {
    console.error(`Error parsing ${filepath}:`, error);
    return null;
  }
}

// Generate project ID in yyyymmdd_xxx format
function generateProjectId(dateStr: string | null): string {
  let datePart: string;
  if (dateStr) {
    // Use the date string directly (format: 2026-01-29)
    datePart = dateStr.replace(/-/g, "");
  } else {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    datePart = `${year}${month}${day}`;
  }
  const random = Math.random().toString(36).substring(2, 5);
  return `${datePart}_${random}`;
}

// Determine asset type from content
function getAssetType(
  parsed: ParsedContent
): "script" | "outline" | "supporting" | "article" | "social" {
  if (parsed.type === "prompt_kit") {
    return "supporting";
  }
  if (parsed.googleDocUrl) {
    // Could be article or script based on content
    if (parsed.rawContent.toLowerCase().includes("video")) {
      return "script";
    }
    return "article";
  }
  if (parsed.type === "additional") {
    return "supporting";
  }
  return "outline";
}

// Main migration function
async function migrate(): Promise<void> {
  console.log("\n📦 Content Calendar Migration");
  console.log("================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE MIGRATION"}`);
  console.log(`Source: ${MIGRATION_SOURCE}`);

  // Check source directory
  if (!fs.existsSync(MIGRATION_SOURCE)) {
    console.error(`\n❌ Migration source not found: ${MIGRATION_SOURCE}`);
    process.exit(1);
  }

  // Get Supabase client
  let supabase;
  if (!isDryRun) {
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      console.error(`\n❌ ${error}`);
      process.exit(1);
    }
  }

  // Get user ID
  let userId = providedUserId;
  if (!isDryRun && !userId) {
    // Try to get a user from the database
    const { data: users } = await supabase!
      .from("profiles")
      .select("id")
      .limit(1);
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log(`\n📌 Using user ID: ${userId}`);
    } else {
      console.error("\n❌ No user found. Please specify --user-id");
      process.exit(1);
    }
  }

  // Read all markdown files
  const files = fs.readdirSync(MIGRATION_SOURCE).filter((f) => f.endsWith(".md"));
  console.log(`\n📄 Found ${files.length} files to process\n`);

  const results: MigrationResult[] = [];

  // Process each file
  for (const file of files) {
    const filepath = path.join(MIGRATION_SOURCE, file);
    const parsed = parseMarkdownFile(filepath);

    if (!parsed) {
      results.push({
        success: false,
        filename: file,
        error: "Failed to parse file",
      });
      continue;
    }

    // Skip overview file (it's not a project)
    if (parsed.type === "overview") {
      console.log(`⏭️  Skipping: ${file} (overview document)`);
      continue;
    }

    const projectId = generateProjectId(parsed.publishDate);

    console.log(`\n📁 Processing: ${file}`);
    console.log(`   Title: ${parsed.title}`);
    console.log(`   Date: ${parsed.publishDate || "Unscheduled"}`);
    console.log(`   Status: ${parsed.status}`);
    console.log(`   Type: ${parsed.type}`);
    console.log(`   Project ID: ${projectId}`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would create project and assets`);
      results.push({
        success: true,
        filename: file,
        projectId,
      });
      continue;
    }

    try {
      // Create project
      const { data: project, error: projectError } = await supabase!
        .from("nate_content_projects")
        .insert({
          project_id: projectId,
          title: parsed.title,
          scheduled_date: parsed.publishDate,
          status: parsed.status,
          target_platforms: parsed.googleDocUrl
            ? ["youtube", "substack"]
            : ["linkedin"],
          notes: parsed.notes,
          created_by: userId,
        })
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }

      console.log(`   ✅ Created project: ${project.id}`);

      // Create main asset (no created_by - ownership inherited from project)
      const assetType = getAssetType(parsed);
      const { data: asset, error: assetError } = await supabase!
        .from("nate_project_assets")
        .insert({
          project_id: project.id,
          asset_type: assetType,
          title: parsed.title,
          content: parsed.rawContent,
          external_url: parsed.googleDocUrl || parsed.notionUrl,
          status: parsed.googleDocUrl ? "ready" : "draft",
          current_version: 1,
        })
        .select()
        .single();

      if (assetError) {
        throw assetError;
      }

      console.log(`   ✅ Created asset: ${asset.id} (${assetType})`);

      // Create initial version
      const { error: versionError } = await supabase!
        .from("nate_asset_versions")
        .insert({
          asset_id: asset.id,
          version_number: 1,
          content: parsed.rawContent,
          created_by: userId,
        });

      if (versionError) {
        throw versionError;
      }

      console.log(`   ✅ Created version 1`);

      results.push({
        success: true,
        filename: file,
        projectId: project.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : JSON.stringify(error, null, 2);
      console.log(`   ❌ Error: ${errorMessage}`);
      results.push({
        success: false,
        filename: file,
        error: errorMessage,
      });
    }
  }

  // Summary
  console.log("\n================================");
  console.log("📊 Migration Summary");
  console.log("================================");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed files:");
    failed.forEach((r) => {
      console.log(`  - ${r.filename}: ${r.error}`);
    });
  }

  if (isDryRun) {
    console.log("\n🔍 This was a dry run. No changes were made.");
    console.log("   Run without --dry-run to perform actual migration.");
  } else {
    console.log("\n🎉 Migration complete!");
    console.log("   View your content at /calendar");
  }
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
