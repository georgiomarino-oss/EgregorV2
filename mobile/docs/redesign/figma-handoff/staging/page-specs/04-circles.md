# Circles - Figma Page Spec

## Canonical scope
- Objective: Stage canonical circles browse/governance/invite flow.
- Canonical routes included: `CommunityHome`, `CircleDetails`, `CircleInviteComposer`, `InviteDecision`.
- Legacy excluded: retired PrayerCircle/EventsCircle split surfaces and adapter-only routes.

## Source-of-truth files
- `mobile/docs/redesign/figma-handoff/staging/data/active-screen-blueprints.json`
- `mobile/docs/redesign/figma-handoff/staging/data/copy-state-library.json`
- `mobile/docs/redesign/figma-handoff/staging/data/asset-mapping.json`
- `mobile/src/screens/CommunityScreen.tsx`
- `mobile/src/screens/CircleDetailsScreen.tsx`
- `mobile/src/screens/CircleInviteComposerScreen.tsx`
- `mobile/src/screens/InviteDecisionScreen.tsx`

## Frame list
| Route | Frame set | Required state frames | Key child components |
| --- | --- | --- | --- |
| `CommunityHome` | `Screen/CommunityHome/Default` | `loading`, `no_circles`, `no_shared_circles`, `no_invites`, `error_retry` | CirclesHeroPanel, SegmentedTabs, CircleSummaryCard, CirclePendingInviteCard |
| `CircleDetails` | `Screen/CircleDetails/Default` | `loading`, `no_active_members`, `no_invites`, `toast_updates`, `error_retry` | PremiumHeroPanel, CircleDetailMemberRow, CircleInviteRecordRow, ModalSheet |
| `CircleInviteComposer` | `Screen/CircleInviteComposer/Default` | `searching`, `no_users_found`, `invite_success`, `invite_error` | SegmentedTabs, TextField, search result rows, ModalSheet invite link |
| `InviteDecision` | `Screen/InviteDecision/Default` | `loading`, `pending`, `accepted`, `declined`, `revoked`, `expired`, `invalid` | PremiumHeroPanel, StatusChip, action buttons, RetryPanel |

## Component list
- CirclesHeroPanel
- SegmentedTabs
- CircleSummaryCard
- CirclePendingInviteCard
- CircleDetailMemberRow
- CircleInviteRecordRow
- StatusChip
- RetryPanel
- ModalSheet

## Text/content assignment (editable)
- Use canonical segment labels: `My Circles`, `Shared With Me`, `Pending Invites`.
- Bind invite lifecycle labels from `copy-state-library.json:inviteStatuses`.
- Bind role labels from `copy-state-library.json:roleLabels`.
- Keep decision status labels editable for pending/accepted/declined/revoked/expired/invalid states.

## Asset placement instructions
- Use rows filtered to page `Circles` in `asset-placement-index.csv`.
- Required slots:
- `circles.hero.home`
- `circles.hero.governance`
- `circles.hero.inviteDecision`
- `circles.card.default`
- `ambient.lottie.cosmic`

## Motion-layer notes
- Preserve segment transition intent (My/Shared/Pending).
- Preserve hero settle motion and status chip emphasis transitions.
- Reduced motion: immediate state switch with no semantic changes.
