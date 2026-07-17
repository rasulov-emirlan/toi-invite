/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module — keep it external to the server bundle
  // so the .node binary is required at runtime rather than traced/bundled.
  serverExternalPackages: ["better-sqlite3"],
  // Organizer links carry capability tokens in the query string — never leak
  // them via Referer, even to same-site subdomains.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Referrer-Policy", value: "same-origin" }],
      },
    ];
  },
};

export default nextConfig;
