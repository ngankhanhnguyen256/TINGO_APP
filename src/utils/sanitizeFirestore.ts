/**
 * Deep sanitization utility for Firestore payloads
 * Strips all `undefined` values recursively because Firestore throws runtime errors on `undefined` fields.
 */
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(obj));
}
