import type { ComponentProps } from "react";
import { betterAuth } from "better-auth";
import {
  adminClient,
  customSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { customSession } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";
import { expectTypeOf, it } from "vitest";
import { convexClient, crossDomainClient } from "../client/plugins/index.js";
import type { AuthBoundary, ConvexBetterAuthProvider } from "./index.js";
import type { AuthClient } from "./index.js";

type ProviderClient = ComponentProps<
  typeof ConvexBetterAuthProvider
>["authClient"];
type BoundaryClient = ComponentProps<typeof AuthBoundary>["authClient"];

const storage = {
  getItem: () => null,
  setItem: () => undefined,
};

it("accepts a client with the Convex plugin", () => {
  const client = createAuthClient({ plugins: [convexClient()] });

  expectTypeOf(client).toExtend<AuthClient>();
  expectTypeOf(client).toExtend<ProviderClient>();
  expectTypeOf(client).toExtend<BoundaryClient>();
  type SessionData = ReturnType<AuthClient["useSession"]>["data"];
  expectTypeOf<NonNullable<SessionData>>().not.toBeNever();
  expectTypeOf<null>().toExtend<SessionData>();
  expectTypeOf<AuthClient>().toHaveProperty("signIn");
  expectTypeOf<AuthClient>().toHaveProperty("signOut");
  expectTypeOf<AuthClient>().toHaveProperty("$Infer");
});

it("accepts cross-domain clients in either plugin order", () => {
  const client = createAuthClient({
    plugins: [convexClient(), crossDomainClient({ storage })],
  });
  const reversedClient = createAuthClient({
    plugins: [crossDomainClient({ storage }), convexClient()],
  });

  expectTypeOf(client).toExtend<ProviderClient>();
  expectTypeOf(client).toExtend<BoundaryClient>();
  expectTypeOf(reversedClient).toExtend<ProviderClient>();
  expectTypeOf(reversedClient).toExtend<BoundaryClient>();
});

it("accepts additional plugins and preserves inferred session fields", () => {
  const fields = inferAdditionalFields({
    user: { department: { type: "string", required: true } },
    session: { workspaceId: { type: "string", required: true } },
  });
  const client = createAuthClient({
    plugins: [convexClient(), adminClient(), fields],
  });
  const crossDomain = createAuthClient({
    plugins: [
      convexClient(),
      crossDomainClient({ storage }),
      adminClient(),
      fields,
    ],
  });

  expectTypeOf(client).toExtend<ProviderClient>();
  expectTypeOf(client).toExtend<BoundaryClient>();
  expectTypeOf(crossDomain).toExtend<ProviderClient>();
  expectTypeOf(crossDomain).toExtend<BoundaryClient>();
  expectTypeOf(client.$Infer.Session.user.department).toEqualTypeOf<string>();
  expectTypeOf(
    client.$Infer.Session.session.workspaceId
  ).toEqualTypeOf<string>();
});

it("accepts a custom session that extends the standard session", () => {
  const _auth = betterAuth({
    plugins: [
      customSession(async ({ user, session }) => ({
        user,
        session,
        permissions: ["read"],
      })),
    ],
  });
  const client = createAuthClient({
    plugins: [convexClient(), customSessionClient<typeof _auth>()],
  });
  const crossDomain = createAuthClient({
    plugins: [
      convexClient(),
      crossDomainClient({ storage }),
      customSessionClient<typeof _auth>(),
    ],
  });

  expectTypeOf(client).toExtend<ProviderClient>();
  expectTypeOf(client).toExtend<BoundaryClient>();
  expectTypeOf(crossDomain).toExtend<ProviderClient>();
  expectTypeOf(crossDomain).toExtend<BoundaryClient>();
  expectTypeOf(client.$Infer.Session.permissions).toEqualTypeOf<string[]>();
});

it("requires the Convex plugin", () => {
  const plainClient = createAuthClient();
  const crossDomainOnly = createAuthClient({
    plugins: [crossDomainClient({ storage })],
  });

  expectTypeOf(plainClient).not.toExtend<ProviderClient>();
  expectTypeOf(plainClient).not.toExtend<BoundaryClient>();
  expectTypeOf(crossDomainOnly).not.toExtend<ProviderClient>();
  expectTypeOf(crossDomainOnly).not.toExtend<BoundaryClient>();
});
