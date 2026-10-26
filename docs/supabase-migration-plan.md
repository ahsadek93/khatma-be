# Supabase to Khatma BE migration plan

The React Native app currently uses Supabase as its data backend. Rebuild the
backend in `khatma-be` against the existing RN Supabase behavior. During Phase
A, implement each service and create or update its Postman collection. Run the
end-to-end verification when the RN app is migrated to the new APIs in Phase
B. Auth and profile are implemented in BE; Khatmas, Quran, Zikr, and realtime
modules have been implemented; Phase B integration and verification remain.

## Migration order

## Phase A: Build Khatma BE services and their Postman collections

### 0. Authentication — implemented and manually verified

- [x] Email OTP sign-in, token verification/refresh, and sign-out in Khatma BE.
- [x] JWT guard and authenticated user identity for protected endpoints.
- [x] Manually verify OTP request sends email and OTP verification logs the user
  in and returns access and refresh tokens.
- [x] Add auth requests to the Postman collection for repeatable verification.
- [x] Manually verify refresh and sign-out endpoints through Postman.
- [x] Keep the auth Postman collection current as its API changes.

### 1. User profile

- [x] Move profile read and display-name update from Supabase `profiles` to the
  BE users API.
- [x] Preserve current-user scoping and the profile's email/display-name shape.
- [x] Create or update the users Postman collection for profile read/update.

### 2. Shared Khatma lifecycle and membership

- [x] Create Quran Khatmas and persist owner, name, invite code, and active
  status.
- [x] Join by invite code for either Khatma type; enforce membership
  uniqueness and return the resolved type.
- [x] List the current user's active and completed Khatmas, filtered by type.
- [x] Read member list, member count, and invite code with existing owner/member
  access rules.
- [x] Preserve completion timestamp and shared identity for Quran and Zikr.
- [x] Create or update the Khatmas Postman collection for lifecycle and
  membership endpoints.

### 3. Quran Khatma progress

- [x] Read the 30 Juz states and current user's selected Juz.
- [x] Claim, release, and complete a Juz with atomic conflict handling so one
  Juz cannot be claimed by multiple members.
- [x] Update Khatma completion when all Juz are completed, preserving current
  lifecycle behavior.
- [x] Create or update the Quran Postman collection for progress endpoints.

### 4. Zikr Khatma progress

- [x] Create Zikr Khatma with phrase and positive goal in one atomic operation.
- [x] Read phrase, goal, completed/pending totals, and current user's pending
  amount.
- [x] Set/edit, release, and complete a member's pending amount atomically;
  prevent over-claim under concurrent requests.
- [x] Allow owner phrase correction and goal increase while active; reject goal
  decreases and edits after completion.
- [x] Complete the shared Khatma only when completed count reaches the goal.
- [x] Create or update the Zikr Postman collection for progress and settings
  endpoints.

### 5. Realtime updates

- [x] Replace Supabase Realtime subscriptions with BE-backed events for Quran
  progress, Zikr progress/configuration, member changes, and completion.
- [x] Create or update the realtime Postman collection with the steps needed
  to connect and observe service events.

Each service collection lives in that module's `postman/` directory and
documents endpoint paths, request/response shapes, auth headers, representative
errors, and variables for the base URL and test inputs. Keep collections current
when service APIs change; do not commit real secrets.

## Phase B: Integrate RN and cut over from Supabase

- [x] Update RN data adapters to match the verified API collection, keeping the
  existing app behavior and shared contracts where possible.
- [ ] Run the service Postman collections against the integrated app/backend
  setup; update collections if integration reveals contract differences.
- [ ] Verify auth, profile, create/join, Quran, Zikr, membership, and live
  update flows end to end through the migrated RN app.
- [ ] Verify authorization, lifecycle rules, concurrent Quran claims, Zikr
  over-claim prevention, and completion rules during this final verification.
- [ ] Run the BE and RN automated checks after RN integration is complete.
- [ ] Confirm no runtime Supabase data/auth/realtime dependency remains.
- [ ] Decide whether existing Supabase records need a one-time export/import
  into the BE database; verify record counts and ownership before any cutover.
- [ ] Remove Supabase packages, configuration, and migrations only after the
  app no longer depends on them and any required data has been migrated.

## Feature inventory

| Supabase-backed capability | Reference in RN | BE destination |
| --- | --- | --- |
| Email OTP auth and session | `src/data/supabase/adapters/auth.ts` | `src/auth/` (done) |
| Profile read/update | `src/data/supabase/adapters/profile.ts` | `src/users/` |
| Khatma create/join/list/members/invite | `src/data/supabase/adapters/khatma.ts` | `src/khatmas/` |
| Quran Juz state and actions | `src/data/supabase/adapters/quran.ts` | `src/quran/` |
| Zikr goals, claims, totals, settings | `src/data/supabase/adapters/zikr.ts` | `src/zikr/` |
| Khatma change notifications | `src/data/supabase/adapters/realtime.ts` | `src/realtime/` |

The current RN app is already wired through shared backend contracts. Do not
change RN adapters during Phase A. Use the Postman collection as the reviewed
contract for Phase B, and keep the shared contracts stable unless BE behavior
requires a deliberate contract change.
