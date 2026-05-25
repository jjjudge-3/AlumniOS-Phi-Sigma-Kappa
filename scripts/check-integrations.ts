import { promises as dns } from "node:dns";
import fs from "node:fs";
import path from "node:path";

type EnvMap = Record<string, string | undefined>;

function readEnvFile(fileName: string) {
  const fullPath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(fullPath)) {
    return {} as EnvMap;
  }

  const values: EnvMap = {};
  const text = fs.readFileSync(fullPath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadLocalEnv() {
  return {
    ...readEnvFile(".env"),
    ...readEnvFile(".env.local"),
    ...process.env,
  };
}

function printSection(title: string) {
  console.log(`\n${title}`);
}

function printCheck(label: string, status: "ok" | "warn" | "fail", detail: string) {
  const prefix = status === "ok" ? "[ok]" : status === "warn" ? "[warn]" : "[fail]";
  console.log(`${prefix} ${label}: ${detail}`);
}

async function checkDns(hostname: string) {
  try {
    const result = await dns.lookup(hostname);
    return { ok: true, detail: `${result.address}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DNS lookup failed";
    return { ok: false, detail: message };
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { response, body: parsed };
}

async function checkSupabase(env: EnvMap) {
  printSection("Supabase");

  const runtimeKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;

  for (const key of runtimeKeys) {
    printCheck(key, env[key] ? "ok" : "fail", env[key] ? "set" : "missing");
  }

  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    printCheck("runtime access", "fail", "missing Supabase URL or service role key");
    return;
  }

  let hostname: string;
  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    printCheck("SUPABASE_URL format", "fail", "invalid URL");
    return;
  }

  const dnsResult = await checkDns(hostname);
  printCheck("project hostname", dnsResult.ok ? "ok" : "fail", dnsResult.detail);

  if (!dnsResult.ok) {
    return;
  }

  const relations = [
    "profiles",
    "active_brother_profiles",
    "alumni_user_profiles",
    "companies",
    "company_alumni_links",
    "company_job_postings",
    "company_recruiting_analysis",
    "alumni",
    "master alumni",
  ];

  for (const relation of relations) {
    const encodedRelation = encodeURIComponent(relation);
    try {
      const { response, body } = await fetchJson(`${supabaseUrl}/rest/v1/${encodedRelation}?select=id&limit=1`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (response.ok) {
        printCheck(`table ${relation}`, "ok", "reachable");
        continue;
      }

      const errorMessage =
        body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : `${response.status}`;

      const status: "warn" | "fail" =
        response.status === 404 || String(errorMessage).includes("does not exist") ? "warn" : "fail";
      printCheck(`table ${relation}`, status, errorMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "request failed";
      printCheck(`table ${relation}`, "fail", message);
    }
  }

  try {
    const { response, body } = await fetchJson(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok || !Array.isArray(body)) {
      const detail =
        body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : `${response.status}`;
      printCheck("storage buckets", "fail", detail);
      return;
    }

    const hasResumesBucket = body.some((item) => item && typeof item === "object" && item.name === "resumes");
    printCheck("storage bucket resumes", hasResumesBucket ? "ok" : "warn", hasResumesBucket ? "present" : "missing");
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    printCheck("storage buckets", "fail", message);
  }

  const managementToken = env["Management-API-Token"];
  if (!managementToken) {
    printCheck("auth redirect config", "warn", "Management-API-Token missing; cannot verify allow list");
    return;
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
    const { response, body } = await fetchJson(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      headers: {
        Authorization: `Bearer ${managementToken}`,
      },
    });

    if (!response.ok || !body || typeof body !== "object") {
      const detail =
        body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : `${response.status}`;
      printCheck("auth redirect config", "fail", detail);
      return;
    }

    const config = body as Record<string, unknown>;
    const siteUrl = typeof config.site_url === "string" ? config.site_url : "";
    const allowList = typeof config.uri_allow_list === "string" ? config.uri_allow_list : "";
    const hasLocalhost =
      siteUrl.includes("localhost") ||
      siteUrl.includes("127.0.0.1") ||
      allowList.includes("localhost") ||
      allowList.includes("127.0.0.1");

    printCheck("auth site_url", "ok", siteUrl || "not set");
    printCheck(
      "auth redirect allow list",
      hasLocalhost ? "ok" : "warn",
      hasLocalhost ? allowList || siteUrl : "localhost:3000 is not allowlisted",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    printCheck("auth redirect config", "fail", message);
  }
}

async function checkBrightData(env: EnvMap) {
  printSection("Bright Data");

  const apiKey = env.BRIGHTDATA_API_KEY;
  printCheck("BRIGHTDATA_API_KEY", apiKey ? "ok" : "fail", apiKey ? "set" : "missing");

  if (!apiKey) {
    return;
  }

  try {
    const { response, body } = await fetchJson(
      "https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: [{ url: "https://www.linkedin.com/in/chris-vincola-799454a2" }],
        }),
      },
    );

    if (response.ok) {
      printCheck("dataset scrape auth", "ok", "request accepted");
      return;
    }

    const detail =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : typeof body === "string"
          ? body
          : `${response.status}`;

    printCheck("dataset scrape auth", response.status === 401 ? "fail" : "warn", detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    printCheck("dataset scrape auth", "fail", message);
  }
}

function checkTrigger(env: EnvMap) {
  printSection("Trigger.dev");

  const triggerConfigPath = path.join(process.cwd(), "trigger.config.ts");
  const configText = fs.existsSync(triggerConfigPath) ? fs.readFileSync(triggerConfigPath, "utf8") : "";
  const projectMatch = configText.match(/project:\s*"([^"]+)"/);
  const taskIds = [...fs.readFileSync(path.join(process.cwd(), "src/trigger/test-supabase-connection.ts"), "utf8").matchAll(/id:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );

  printCheck("configured project", projectMatch?.[1] ? "ok" : "warn", projectMatch?.[1] ?? "not found");
  printCheck("local Trigger env", Object.keys(env).some((key) => key.includes("TRIGGER")) ? "ok" : "warn", Object.keys(env).some((key) => key.includes("TRIGGER")) ? "present" : "no TRIGGER_* vars found");
  printCheck("task surface", taskIds.length ? "ok" : "warn", taskIds.join(", ") || "no task ids found");
}

function checkNodeRuntime() {
  printSection("Runtime");
  const major = Number(process.versions.node.split(".")[0] ?? "0");
  const status: "ok" | "warn" = major === 20 ? "ok" : "warn";
  printCheck("node version", status, process.version);
  printCheck("npm runtime", "ok", process.env.npm_config_user_agent ?? "available");
}

async function main() {
  const env = loadLocalEnv();
  checkNodeRuntime();
  await checkSupabase(env);
  await checkBrightData(env);
  checkTrigger(env);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown integration check error";
  console.error(message);
  process.exitCode = 1;
});
