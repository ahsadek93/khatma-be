# Supabase to Khatma BE migration plan

The React Native app currently uses Supabase as its data backend. Rebuild the
backend in `khatma-be` against the existing RN Supabase behavior, but develop
and verify it independently of the RN app. Once the API is stable, generate a
Postman collection for RN integration; only then replace the RN Supabase
adapters. Auth is implemented in BE; Khatmas, Quran, Zikr, and realtime modules
are currently empty.

## Migration order

## Phase A: Build and verify Khatma BE independently

### 0. Authentication — implemented and manually verified

- [x] Email OTP sign-in, token verification/refresh, and sign-out in Khatma BE.
- [x] JWT guard and authenticated user identity for protected endpoints.
- [x] Manually verify OTP request sends email and OTP verification logs the user
  in and returns access and refresh tokens.
- [x] Add auth requests to the Postman collection for repeatable verification.
- [x] Manually verify refresh and sign-out endpoints through Postman.

### 1. User profile

- [ ] Move profile read and display-name update from Supabase `profiles` to the
  BE users API.
- [ ] Preserve current-user scoping and the profile's email/display-name shape.
- [ ] Add independent endpoint and authorization tests.

### 2. Shared Khatma lifecycle and membership

- [ ] Create Quran Khatmas and persist owner, name, invite code, and active
  status.
- [ ] Join by invite code for either Khatma type; enforce membership
  uniqueness and return the resolved type.
- [ ] List the current user's active and completed Khatmas, filtered by type.
- [ ] Read member list, member count, and invite code with existing owner/member
  access rules.
- [ ] Preserve completion timestamp and shared identity for Quran and Zikr.
- [ ] Add independent endpoint, authorization, and lifecycle tests.

### 3. Quran Khatma progress

- [ ] Read the 30 Juz states and current user's selected Juz.
- [ ] Claim, release, and complete a Juz with atomic conflict handling so one
  Juz cannot be claimed by multiple members.
- [ ] Update Khatma completion when all Juz are completed, preserving current
  lifecycle behavior.
- [ ] Add independent tests, including conflicting concurrent Juz claims.

### 4. Zikr Khatma progress

- [ ] Create Zikr Khatma with phrase and positive goal in one atomic operation.
- [ ] Read phrase, goal, completed/pending totals, and current user's pending
  amount.
- [ ] Set/edit, release, and complete a member's pending amount atomically;
  prevent over-claim under concurrent requests.
- [ ] Allow owner phrase correction and goal increase while active; reject goal
  decreases and edits after completion.
- [ ] Complete the shared Khatma only when completed count reaches the goal.
- [ ] Add independent tests, including concurrent over-claim and completion
  rules.

### 5. Realtime updates

- [ ] Replace Supabase Realtime subscriptions with BE-backed events for Quran
  progress, Zikr progress/configuration, member changes, and completion.
- [ ] Verify event delivery independently with a BE-side test client.

### 6. Module-owned Postman collections

- [ ] Define and document endpoint paths, request/response schemas, auth
  headers, and representative error responses.
- [ ] Keep a Postman collection in each module's `postman/` directory (for
  example, `src/auth/postman/Auth.postman_collection.json`).
- [ ] Include requests for the module's endpoints and use collection variables
  for base URL, test inputs, and tokens; never commit real secrets.
- [ ] Run each collection against the independently verified BE and use these
  collections as the RN integration reference.

## Phase B: Integrate RN and cut over from Supabase

- [ ] Update RN data adapters to match the verified API collection, keeping the
  existing app behavior and shared contracts where possible.
- [ ] Verify RN flows against Khatma BE: auth, profile, create/join, Quran,
  Zikr, and live updates.
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
