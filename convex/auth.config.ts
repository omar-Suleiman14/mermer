import { AuthConfig } from "convex/server";

const domain = process.env.CLERK_JWT_ISSUER_DOMAIN || "https://deep-mustang-12.clerk.accounts.dev";

export default {
  providers: [
    {
      domain: domain.endsWith('/') ? domain : `${domain}/`,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
