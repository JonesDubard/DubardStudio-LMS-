const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A package-lock.json exists in the parent folder. Pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
  // Lets http://pilotschool.localhost:3000 reach the dev server.
  allowedDevOrigins: ["*.localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

module.exports = async () => {
  const imported = await import("@serwist/next");
  const withSerwistInit = imported.default;
  const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    // The dev server should not register a worker while the page is still a stub.
    disable: process.env.NODE_ENV === "development",
  });

  return withSerwist(nextConfig);
};
