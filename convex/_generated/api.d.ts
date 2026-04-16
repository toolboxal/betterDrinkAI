/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiHandler from "../aiHandler.js";
import type * as auth from "../auth.js";
import type * as authTriggers from "../authTriggers.js";
import type * as dashboardAnalysis from "../dashboardAnalysis.js";
import type * as drinkAnalysis from "../drinkAnalysis.js";
import type * as drinks from "../drinks.js";
import type * as gemini from "../gemini.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as openai from "../openai.js";
import type * as rooms from "../rooms.js";
import type * as seedRooms from "../seedRooms.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiHandler: typeof aiHandler;
  auth: typeof auth;
  authTriggers: typeof authTriggers;
  dashboardAnalysis: typeof dashboardAnalysis;
  drinkAnalysis: typeof drinkAnalysis;
  drinks: typeof drinks;
  gemini: typeof gemini;
  http: typeof http;
  images: typeof images;
  openai: typeof openai;
  rooms: typeof rooms;
  seedRooms: typeof seedRooms;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
