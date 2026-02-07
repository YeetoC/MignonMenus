import fs from "fs";
import path from "path";

const argv = process.argv.slice(2);

let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
let filePath = "users.local.json";
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--url") {
    url = argv[i + 1];
    i++;
    continue;
  }
  if (arg === "--file") {
    filePath = argv[i + 1];
    i++;
    continue;
  }
  if (arg === "--service-role-key") {
    serviceRoleKey = argv[i + 1];
    i++;
    continue;
  }
}

if (!url) {
  throw new Error(
    "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or pass --url <url>.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY or pass --service-role-key <key>.",
  );
}

const resolvedFilePath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(resolvedFilePath)) {
  throw new Error(
    `Missing users file at ${resolvedFilePath}. Create it or pass --file <path>.`,
  );
}

const raw = fs.readFileSync(resolvedFilePath, "utf8");
const users = JSON.parse(raw);

if (!Array.isArray(users)) {
  throw new Error("Users file must be a JSON array.");
}

const adminUsersUrl = `${url.replace(/\/+$/, "")}/auth/v1/admin/users`;

for (const user of users) {
  const email = user?.email;
  const password = user?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error(
      "Each user must be an object like { \"email\": string, \"password\": string }",
    );
  }

  try {
    const result = await fetch(adminUsersUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    });

    if (!result.ok) {
      const text = await result.text();
      throw new Error(`${result.status} ${result.statusText}: ${text}`);
    }

    process.stdout.write(`Registered: ${email}\n`);
  } catch (error) {
    process.stderr.write(`Failed: ${email}\n`);
    process.stderr.write(`${error?.message ?? String(error)}\n`);
  }
}
