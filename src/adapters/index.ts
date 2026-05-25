import { ColesAdapter } from "./coles.js";
import type { RetailerAdapter } from "./retailerAdapter.js";
import { WoolworthsAdapter } from "./woolworths.js";

export function createAdapters(): Record<RetailerAdapter["name"], RetailerAdapter> {
  return {
    woolworths: new WoolworthsAdapter(),
    coles: new ColesAdapter(),
  };
}
