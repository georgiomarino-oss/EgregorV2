# Information Architecture And Canonical User Journeys

Date: 2026-03-08

## 1) IA Decisions

## 1.1 Naming and structure

1. `Community` is renamed to `Circles`.
2. `Events` is renamed to `Live` and remains its own destination.
3. `Solo` becomes a core mode surfaced in Home and Live actions, rather than standing alone as the product identity.

## 1.2 Bottom navigation (target)

1. Home
2. Circles
3. Live
4. Profile

Incremental compatibility:

- Keep current route keys (`SoloTab`, `CommunityTab`, `EventsTab`, `ProfileTab`) initially in `mobile/src/app/navigation/RootNavigator.tsx` and `types.ts`.
- Change labels and destination screen composition first, then migrate route keys in a later stabilization release.

## 1.3 Home (default screen)

Home becomes the retention and orientation hub:

1. Next spiritual moment card (nearest joinable occurrence, including 11:11 local).
2. Continue Solo CTA (reusing shared solo capability where needed).
3. Invite inbox preview (pending invites + accepted circles requiring first visit).
4. Circle pulse preview (recent circle activity and upcoming circle events).
5. Reminder status prompt (notification opt-in and quiet hours summary).

## 2) Navigation And Entry Principles

1. Every deep link must resolve to a canonical object (`circle_invitation`, `event_occurrence`, `room`, `profile`, `support`).
2. Auth-gated deep-link capture stays (`AuthGate` behavior) and is extended for new object types.
3. A room join action always checks room persistence before navigation.
4. "Shared with me" is a primary top-level affordance, not hidden in secondary lists.

## 3) Canonical Journeys

## 3.1 Onboarding

1. User signs up/signs in in `AuthScreen`.
2. First-run profile completion starts immediately after auth success.
3. User selects timezone, reminder baseline, and spiritual intent category.
4. Home opens with first recommended live moment and solo entry.

## 3.2 Profile creation

1. Mandatory: display name, timezone.
2. Optional: avatar, short bio, spiritual focus tags.
3. Persist to `profiles`.
4. Show privacy defaults for presence visibility and invitations.

## 3.3 Discovering circles

1. Circles tab has two primary segments: `My Circles` and `Discover`.
2. Discover feed includes curated and searchable discoverable circles.
3. Join path is request/invite-based depending on circle visibility.
4. Blocked-user constraints are applied before showing results.

## 3.4 Seeing circles you were added to

1. Home and Circles show a dedicated `Invites & Added To You` inbox.
2. Each item shows inviter, circle context, expiration, and quick actions.
3. Accept creates active circle membership; decline updates invitation state.

## 3.5 Inviting existing users by typing/searching names

1. In circle manage members flow, inviter types display name or username.
2. Backend search returns eligible users with block and abuse filters.
3. Sending invite creates `circle_invitations` with `target_user_id`.
4. Invite appears instantly in recipient inbox and optional push channel.

## 3.6 Inviting external users

1. Inviter enters email/phone or shares generated invite link.
2. System creates tokenized pending invitation (`target_contact_hash` + token).
3. Recipient opens deep link, authenticates/signs up, then sees accept/decline.
4. Accepted invite auto-links to user id and creates membership.

## 3.7 Accepting or declining invites

1. Invite detail screen shows circle purpose, role offered, expiration.
2. Accept:
   - mark invitation accepted
   - create membership
   - navigate to circle landing
3. Decline:
   - mark invitation declined
   - optional feedback reason for anti-abuse analytics

## 3.8 Joining a real live room

1. User taps Join from Live or Circle event card.
2. App resolves/creates canonical room for target occurrence.
3. Presence and participation are persisted in room participant tables.
4. Room UI opens only after persistence check succeeds.

## 3.9 Browsing upcoming recurring events

1. Live tab default is upcoming occurrences grouped by: Next 24h, Daily Rhythms, Global Moments, Circle Events.
2. All items are backed by persisted `event_occurrences`.
3. User can subscribe/unsubscribe per series/category.

## 3.10 Joining 11:11 and other recurring spiritual events

1. Home always shows next 11:11 local event if within relevant window.
2. Live highlights daily 11:11 and nearest global moment.
3. Join behavior follows standard occurrence -> room flow.

## 3.11 Enabling reminders

1. Prompt at onboarding and first live interaction.
2. User configures category-level reminders and lead times.
3. Preferences saved in canonical notification subscriptions.
4. Quiet hours and timezone are respected by scheduler.

## 3.12 Journaling and re-engagement

1. Post-room completion and end-of-day flows prompt a short journal entry.
2. Journal persists in `user_journal_entries` (existing continuity preserved).
3. Re-engagement cards use journal sentiment/streak context + next event recommendations.

## 3.13 Reporting and blocking users/content

1. Every profile, circle, event, and room has a report action.
2. Blocking is available on user profile and room participant action sheet.
3. Blocking immediately removes visibility and invite eligibility.
4. Reports create moderation records with reason and evidence metadata.

## 3.14 Deleting account in-app

1. Profile -> Account -> Delete account.
2. User sees consequences, data-retention policy, and confirmation friction.
3. Deletion request status is persisted and acknowledged in-app/email.
4. Flow aligns with `web/app/account-deletion/page.tsx` messaging.

## 4) Screen Mapping (Current -> Target)

| Current Screen | Target Role |
|---|---|
| `CommunityScreen.tsx` | Circles index with My/Discover/Invites segmentation |
| `PrayerCircleScreen.tsx` and `EventsCircleScreen.tsx` | Consolidated circle membership and invitation management flows |
| `EventsScreen.tsx` | Live occurrence browser (persisted occurrences only) |
| `EventDetailsScreen.tsx` | Occurrence detail + reminder controls |
| `EventRoomScreen.tsx` | Canonical room entry renderer (no non-persisted collaborative fallback) |
| `SoloLiveScreen.tsx` | Home quick entry and Live backup mode for solo/shared practice |
| `ProfileScreen.tsx` | Account, privacy, reminder controls, trust/safety, delete account |

## 5) Deep-Link Canonical Targets

1. `egregorv2://invite/:token` -> invitation detail.
2. `egregorv2://live/occurrence/:id` -> occurrence detail.
3. `egregorv2://room/:id` -> direct room entry (auth + access checks).
4. `egregorv2://circles/:id` -> circle landing.

Legacy links remain supported via resolver mapping until migration completes.
