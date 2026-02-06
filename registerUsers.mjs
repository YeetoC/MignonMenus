import fs from "fs";
import path from "path";
import { ConvexHttpClient } from "convex/browser";

const argv = process.argv.slice(2);

let url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
let filePath = "users.local.json";

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
}

if (!url) {
  throw new Error(
    "Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) or pass --url <url>.",
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

const client = new ConvexHttpClient(url);

for (const user of users) {
  const email = user?.email;
  const password = user?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error(
      "Each user must be an object like { \"email\": string, \"password\": string }",
    );
  }

  try {
    await client.action("auth:signIn", {
      provider: "password",
      params: {
        email,
        password,
        flow: "signUp",
      },
      calledBy: "registerUsers.mjs",
    });

    process.stdout.write(`Registered: ${email}\n`);
  } catch (error) {
    process.stderr.write(`Failed: ${email}\n`);
    process.stderr.write(`${error?.message ?? String(error)}\n`);
  }
}
