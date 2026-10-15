/**
 * Supabase connection diagnostic.
 * Uses the same configured client as the application.
 */
import { supabase } from "@/integrations/supabase/client";

let _ran = false;

export async function diagnoseSupabase(): Promise<void> {
  if (_ran) return;
  _ran = true;

  const isLocal = import.meta.env.VITE_USE_LOCAL_SERVER === "true";
  const url = isLocal
    ? import.meta.env.VITE_LOCAL_SERVER_URL || "http://localhost:3001"
    : import.meta.env.VITE_SUPABASE_URL || "";

  console.group("[E-Mtaa] Connection Diagnostic");
  console.log("Mode:", isLocal ? "LOCAL SERVER" : "SUPABASE CLOUD");
  console.log("URL:", url);
  console.log("Online:", navigator.onLine);

  if (!isLocal && !url) {
    console.error("Supabase URL is not configured.");
    console.groupEnd();
    return;
  }

  try {
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error("Supabase Auth:", error.message);
    } else {
      console.log("Supabase client initialized successfully.");
    }
  } catch (e) {
    console.error(
      "Supabase diagnostic failed:",
      e instanceof Error ? e.message : "Unknown error",
    );
  }

  console.groupEnd();
}
