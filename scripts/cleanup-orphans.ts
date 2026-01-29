#!/usr/bin/env npx tsx

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  // Delete all projects (we'll re-import)
  const { data, error } = await supabase
    .from("nate_content_projects")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id, title");

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Deleted", data?.length || 0, "projects:");
    data?.forEach(p => console.log(`  - ${p.title}`));
  }
}

cleanup();
