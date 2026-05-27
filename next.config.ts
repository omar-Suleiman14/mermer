import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
    // Image optimization settings for performance
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },

  // Enable compression for smaller payloads
  compress: true,

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header (security)

  // Security & performance headers
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      [
        "script-src",
        "'self'",
        "'unsafe-inline'",
        !isProduction ? "'unsafe-eval'" : "",
        "https://clerk.mermereg.com",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://challenges.cloudflare.com",
      ].filter(Boolean).join(" "),
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://*.convex.cloud https://img.clerk.com",
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://clerk.mermereg.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "frame-src 'self' https://clerk.mermereg.com https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://clerk.mermereg.com https://*.clerk.accounts.dev https://*.clerk.com",
      "frame-ancestors 'none'",
      isProduction ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Security headers
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // FIX #11: Content Security Policy for healthcare data protection
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/dashboard/appointments",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },

  // React Compiler optimization
  reactCompiler: true,

  // Experimental performance features
  experimental: {
    // Enable optimized package imports for large libraries
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
