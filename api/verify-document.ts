import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface RequestBody {
  applicationNumber?: unknown;
}

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

const maskName = (firstName?: string | null, lastName?: string | null) => {
  const mask = (name?: string | null) => (name ? `${name.trim().charAt(0).toUpperCase()}***` : "");
  return [mask(firstName), mask(lastName)].filter(Boolean).join(" ") || "Applicant";
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader?.("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "Document verification is not configured." });
  }

  const body = (req.body || {}) as RequestBody;
  const applicationNumber =
    typeof body.applicationNumber === "string"
      ? body.applicationNumber.trim().replace(/\s+/g, "").toUpperCase()
      : "";

  if (!/^TZ-[A-Z0-9][A-Z0-9-]{2,60}$/.test(applicationNumber)) {
    return res.status(400).json({ error: "Enter a valid application reference." });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("applications")
    .select(
      "application_number,service_name,status,created_at,issued_at,users:user_id(first_name,last_name),services(name,name_en)",
    )
    .ilike("application_number", applicationNumber)
    .maybeSingle();

  if (error) {
    console.error("Document verification lookup failed:", error.message);
    return res.status(500).json({ error: "Document verification could not be completed." });
  }

  if (!data) {
    return res.status(200).json({ found: false });
  }

  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  const service = Array.isArray(data.services) ? data.services[0] : data.services;
  const status = String(data.status || "").toLowerCase();

  return res.status(200).json({
    found: true,
    issued: status === "issued",
    document: {
      applicationNumber: data.application_number,
      serviceName: service?.name_en || service?.name || data.service_name || "E-Mtaa service",
      applicantMasked: maskName(user?.first_name, user?.last_name),
      status: data.status,
      createdAt: data.created_at,
      issuedAt: data.issued_at,
    },
  });
}
