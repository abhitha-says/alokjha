/**
 * The complete schema, in one import for Drizzle and drizzle-kit.
 *
 * Split by domain rather than by table type: auth and newsletter identity,
 * the body of work, and money. A change to how access is priced touches one
 * file; a change to how an essay is stored touches another.
 */
export * from "./auth";
export * from "./content";
export * from "./commerce";
