/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointments from "../appointments.js";
import type * as authHelper from "../authHelper.js";
import type * as chronicConditions from "../chronicConditions.js";
import type * as doctors from "../doctors.js";
import type * as feedback from "../feedback.js";
import type * as feedbackActions from "../feedbackActions.js";
import type * as files from "../files.js";
import type * as followUps from "../followUps.js";
import type * as installments from "../installments.js";
import type * as messageTemplates from "../messageTemplates.js";
import type * as patients from "../patients.js";
import type * as queue from "../queue.js";
import type * as users from "../users.js";
import type * as visits from "../visits.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  authHelper: typeof authHelper;
  chronicConditions: typeof chronicConditions;
  doctors: typeof doctors;
  feedback: typeof feedback;
  feedbackActions: typeof feedbackActions;
  files: typeof files;
  followUps: typeof followUps;
  installments: typeof installments;
  messageTemplates: typeof messageTemplates;
  patients: typeof patients;
  queue: typeof queue;
  users: typeof users;
  visits: typeof visits;
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

export declare const components: {};
