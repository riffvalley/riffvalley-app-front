/** Stable in-memory key for user/disc state shared by Community consumers. */
export function communityRelationKey(userId: string, discId: string): string {
  return JSON.stringify([userId, discId]);
}
