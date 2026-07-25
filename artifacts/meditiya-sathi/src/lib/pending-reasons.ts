/**
 * Shared Pending Reasons configuration.
 * Used by both add-donation and festival-detail pages.
 */

export const PENDING_REASONS = [
  { value: "Will pay on Sunday", label: "Will pay on Sunday" },
  { value: "Will pay next week", label: "Will pay next week" },
  { value: "Will pay after salary", label: "Will pay after salary" },
  { value: "Resident not available", label: "Resident not available" },
  { value: "Requested to visit later", label: "Requested to visit later" },
  { value: "Will pay online later", label: "Will pay online later" },
  { value: "Committee follow-up required", label: "Committee follow-up required" },
  { value: "Other", label: "Other (custom reason)" },
] as const;

export type PendingReason = (typeof PENDING_REASONS)[number]["value"];

