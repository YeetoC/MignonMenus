import type { NextConfig } from "next";

const supabaseHostname = (() => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).hostname;
    } catch {
      // ignore
    }
  }
  return "aqjvzzkllhktpzorbnsn.supabase.co";
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: supabaseHostname,
      },
    ],
  },
};

export default nextConfig;

