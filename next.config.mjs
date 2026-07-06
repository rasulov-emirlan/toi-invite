/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module — keep it external to the server bundle
  // so the .node binary is required at runtime rather than traced/bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
