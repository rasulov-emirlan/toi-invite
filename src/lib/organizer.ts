import { getInvite } from "./db";
import { isValidSlug } from "./slug";
import { tokensMatch } from "./token";
import type { InviteRecord } from "./types";

export function requireOrganizer(slug: unknown, token: unknown): InviteRecord | null {
  if (!isValidSlug(slug)) return null;
  const invite = getInvite(slug);
  return invite && tokensMatch(token, invite.organizer_token) ? invite : null;
}
