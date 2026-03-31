import { authComponent } from "./auth";

// Expose the trigger functions for the component to call.
// These match the internal functions that Better Auth expects.
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
