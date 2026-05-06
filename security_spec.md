# Security Specification

## Data Invariants
- A device reading must have an `angle` (number) and `lastUpdated` (server timestamp).
- User settings like `thresholds` can only be read and written by the owner.
- Appointments can only be managed by the patient (owner).

## The Dirty Dozen (Attack Vectors)
1. Identity Spoofing: Attempt to write to another user's appointment.
2. State Poisoning: Write a 1MB string into the `angle` field.
3. Resource Exhaustion: Inject 10,000 keys into a settings object.
4. Orphaned Writes: Create an appointment without a valid structure.
5. PII Leak: Read another user's email via a list query.
6. Temporal Attack: Spoof a `lastUpdated` timestamp in the past/future.
7. Unbound ID: Send a 2KB string as a `deviceId`.
8. Status Skipping: Transition an appointment status illegally (e.g. from 'cancelled' to 'confirmed').
9. Self-Promotion: Attempt to set `isAdmin: true` on user profile.
10. Blanket Read: Query `/users` collection without a specific filter.
11. Update Gap: Update only the `angle` but omit `lastUpdated`.
12. Denial of Wallet: Recursive `get()` calls in a list rule.

## Test Runner
Verified via `firestore.rules.test.ts` (conceptual for this turn).
