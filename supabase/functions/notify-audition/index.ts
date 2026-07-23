import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();
let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessTokenExpiresAt - 60 > now) return cachedAccessToken;

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsigned)
  ));
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`Google OAuth gagal: ${JSON.stringify(result)}`);
  }
  cachedAccessToken = result.access_token;
  cachedAccessTokenExpiresAt = now + Number(result.expires_in || 3600);
  return cachedAccessToken;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const webhookSecret = Deno.env.get("VAN_PUSH_WEBHOOK_SECRET") || "";
    const suppliedSecret = request.headers.get("x-van-push-secret") || "";
    if (!webhookSecret || suppliedSecret !== webhookSecret) {
      return json({ error: "Unauthorized webhook" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firebaseServiceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    const cmsUrl = (Deno.env.get("VAN_CMS_URL") || "").replace(/\/$/, "");
    if (!supabaseUrl || !serviceRoleKey || !firebaseServiceAccountRaw || !cmsUrl) {
      throw new Error("Secret Supabase/Firebase/VAN_CMS_URL belum lengkap.");
    }

    const payload = await request.json();
    const application = payload.record || payload.application || payload;
    const applicationId = application.id || payload.application_id;
    if (!applicationId) throw new Error("ID pendaftar tidak ditemukan pada payload webhook.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: fullApplication, error: appError } = await supabase
      .from("audition_applications")
      .select("id,registration_code,full_name,stage_name,category,country,program_id")
      .eq("id", applicationId)
      .single();
    if (appError) throw appError;

    let programTitle = "General Audition";
    if (fullApplication.program_id) {
      const { data: program } = await supabase
        .from("audition_programs")
        .select("title")
        .eq("id", fullApplication.program_id)
        .maybeSingle();
      if (program?.title) programTitle = program.title;
    }

    const { data: activeAdmins, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("is_active", true);
    if (adminError) throw adminError;
    const adminIds = (activeAdmins || []).map((row) => row.user_id);
    if (!adminIds.length) return json({ success: true, sent: 0, reason: "No active admins" });

    const { data: devices, error: deviceError } = await supabase
      .from("admin_push_devices")
      .select("id,firebase_fid,user_id")
      .eq("enabled", true)
      .in("user_id", adminIds);
    if (deviceError) throw deviceError;
    if (!devices?.length) return json({ success: true, sent: 0, reason: "No registered devices" });

    const serviceAccount = JSON.parse(firebaseServiceAccountRaw);
    const accessToken = await googleAccessToken(serviceAccount);
    const title = "Pendaftar audisi baru";
    const displayName = `${fullApplication.full_name}${fullApplication.stage_name ? ` (${fullApplication.stage_name})` : ""}`;
    const body = `${displayName} mendaftar ${fullApplication.category} · ${programTitle}`;
    const targetUrl = `${cmsUrl}/dashboard.html#applications`;

    let sent = 0;
    const failed: Array<{ id: string; error: string }> = [];
    for (const device of devices) {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: {
              token: device.firebase_fid,
              notification: { title, body },
              data: {
                application_id: String(fullApplication.id),
                registration_code: String(fullApplication.registration_code || ""),
                url: targetUrl
              },
              webpush: {
                headers: { Urgency: "high" },
                notification: {
                  icon: `${cmsUrl}/images/app-icons/icon-192.png`,
                  badge: `${cmsUrl}/images/app-icons/badge-96.png`,
                  tag: `audition-${fullApplication.id}`,
                  renotify: true,
                  data: { url: targetUrl }
                },
                fcm_options: { link: targetUrl }
              }
            }
          })
        }
      );
      const result = await response.json();
      if (response.ok) {
        sent += 1;
      } else {
        const errorText = JSON.stringify(result);
        failed.push({ id: device.id, error: errorText });
        const status = result?.error?.status || "";
        if (["NOT_FOUND", "UNREGISTERED"].includes(status) || response.status === 404) {
          await supabase.from("admin_push_devices").update({ enabled: false }).eq("id", device.id);
        }
      }
    }

    return json({ success: true, sent, failed });
  } catch (error) {
    console.error(error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
