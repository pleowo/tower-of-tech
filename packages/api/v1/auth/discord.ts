import { createDiscordOAuthConfig, createHelpers } from "jsr:@deno/kv-oauth";
import { HandlerForRoute } from "@/packages/api/v1/types.ts";
import { isLocal } from "@/packages/utils/envrionment.ts";

export const apiV1HandlerAuthDiscordOauthSignInRoute = "/api/v1/auth/discord/oauth/signin";
export const apiV1HandlerAuthDiscordOauthSignOutRoute = "/api/v1/auth/discord/oauth/signout";
export const apiV1HandlerAuthDiscordOauthCallbackRoute = "/api/v1/auth/discord/oauth/callback";

const oauthConfig = createDiscordOAuthConfig({
  redirectUri: isLocal()
    ? `http://localhost:8081${apiV1HandlerAuthDiscordOauthCallbackRoute}`
    : `https://towerofte.ch${apiV1HandlerAuthDiscordOauthCallbackRoute}`,
  scope: ["identify"],
});

const {
  signIn,
  handleCallback,
  // getSessionId,
  signOut,
} = createHelpers(oauthConfig, {
  cookieOptions: isLocal() ? {} : {
    domain: "towerofte.ch",
  },
});

export const apiV1HandlerAuthDiscordOauthSignIn: HandlerForRoute<
  typeof apiV1HandlerAuthDiscordOauthSignInRoute
> = async (req) => {
  const response = await signIn(req);
  return response;
};

export const apiV1HandlerAuthDiscordOauthSignOut: HandlerForRoute<
  typeof apiV1HandlerAuthDiscordOauthSignOutRoute
> = async (req) => {
  return await signOut(req);
};

export const apiV1HandlerAuthDiscordOauthCallback: HandlerForRoute<
  typeof apiV1HandlerAuthDiscordOauthCallbackRoute
> = async (req) => {
  const { response } = await handleCallback(req);
  return response;
};

// case "/protected-route":
//   return await getSessionId(request) === undefined
//     ? new Response("Unauthorized", { status: 401 })
//     : new Response("You are allowed");
