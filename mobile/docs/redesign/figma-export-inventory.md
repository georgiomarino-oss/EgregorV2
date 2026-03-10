# Figma Export Inventory

Scope: canonical active app screens, flows, states, and content dependencies only.

## 1) Active Screen List

Total exported active screens/surfaces: 20

| Route/Screen | Purpose | Canonical status | Key child components | Key states to export | Motion/art/background opportunities | Key content dependencies | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SoloHome | Primary solo home with category-filtered prayer rails. | active | SoloHero, SoloCategoryChips, SoloSection, PrayerCard | loading prayers, error, filtered empty | hero settle, prayer card stagger, ambient cosmic background | prayer_library_items runtime data, cinematic solo hero/card assets | mobile/src/screens/SoloScreen.tsx |
| PrayerLibrary | Full prayer library list and single selection launch. | active | SoloHero, library list rows, Start selected prayer action panel | loading, error, no public prayers | list settle, action panel emphasis | prayer_library_items runtime data | mobile/src/screens/PrayerLibraryScreen.tsx |
| SoloSetup | Pre-live setup confirmation before entering solo room. | active | SoloSetupHero, SetupSummaryPanel, Start session panel | loading setup, setup error | action settle animation | user preferences, solo stats, setup route params | mobile/src/screens/SoloSetupScreen.tsx |
| SoloLive | Canonical solo live room experience. | active | RoomAtmosphereBackdrop, SoloAuraField, RoomScriptPanel, RoomTransportControls | loading script/audio, shared host, shared participant, playback error | aura breathe, sync overlays, layered room backdrop | prayer script variants, audio artifacts, shared session state | mobile/src/screens/SoloLiveScreen.tsx |
| CommunityHome | Circles landing with canonical My/Shared/Pending segments. | active | CirclesHeroPanel, SegmentedTabs, CircleSummaryCard, CirclePendingInviteCard | loading, no circles, no shared circles, no invites, error/retry | hero settle, segment transitions | my/shared/pending circles APIs | mobile/src/screens/CommunityScreen.tsx |
| CircleDetails | Circle governance, member management, and invite tracking. | active | PremiumHeroPanel, CircleDetailMemberRow, CircleInviteRecordRow, ModalSheet | loading, no active members, no invites, toast updates, error/retry | hero media, management modal | circle members, invite records, role permissions | mobile/src/screens/CircleDetailsScreen.tsx |
| CircleInviteComposer | Compose in-app or external circle invites. | active | SegmentedTabs, TextField, search result rows, ModalSheet invite link | searching, no users found, invite success, invite error | panel transitions, success notice card | invitable users search, invite creation API, role grants | mobile/src/screens/CircleInviteComposerScreen.tsx |
| InviteDecision | Accept/decline/report invite with full status lifecycle. | active | PremiumHeroPanel, StatusChip, action buttons, RetryPanel | loading, pending, accepted, declined, revoked, expired, invalid | hero media, status chip emphasis | invite token preview API, invite status mapping | mobile/src/screens/InviteDecisionScreen.tsx |
| EventsHome | Live tab home for occurrences and Global Pulse. | active | EventsHeader, EmbeddedGlobeCard, OccurrenceList, AlertBanner | loading feed, feed error, empty live feed, reminder syncing | hero settle, globe pulse animations, occurrence card stagger | canonical event feed, active presence feed, reminder subscriptions | mobile/src/screens/EventsScreen.tsx |
| EventsHome#GlobalPulseInline | Inline Global Pulse card in Live home. | active | EmbeddedGlobeCard inline mode, legend chips, fullscreen trigger | mapbox ready, globe fallback, no pulses, selection inactive | pulse ripples, cluster scaling, legend transitions | occurrence geo points, live/waiting/upcoming/news/flagship clusters | mobile/src/features/events/components/EmbeddedGlobeCard.tsx |
| EventsHome#GlobalPulseFullscreen | Expanded Global Pulse experience with actionable selection panel. | active | EmbeddedGlobeCard fullscreen mode, selection preview panel, spotlight list | fullscreen open, selection active, selection empty with spotlights | fullscreen settle, selection reveal, pulse state highlighting | selected pulse occurrence details, point insight metadata | mobile/src/features/events/components/EmbeddedGlobeCard.tsx |
| EventDetails | Occurrence detail, reminder, report, and room entry decisions. | active | EventDetailsHero, EventDetailsMeta, ReminderStatusNotice, action button stack | loading, target unavailable, reminder saved/removed, permission blocked | hero settle, status chip shifts by state | get_event_occurrence_by_join_target, reminder prefs, notification permission | mobile/src/screens/EventDetailsScreen.tsx |
| EventRoom | Canonical live event room with presence and transport controls. | active | RoomAtmosphereBackdrop, CollectiveEnergyField, RoomScriptPanel, RoomTransportControls | waiting room, live now, ended, loading room details, playback error | collective pulse field, live chip pulse, room atmosphere layers | event room snapshot, room presence heartbeat, occurrence reminder prefs, script/audio | mobile/src/screens/EventRoomScreen.tsx |
| ProfileHome | Profile overview for trust/progress and journal. | active | TrustHero, TrustMetricsPanel, JournalPanel, settings summary card | loading profile, journal sync issue, profile snapshot pending | journal page turn, hero settle | profile summary, journal entries, deletion status | mobile/src/screens/ProfileScreen.tsx |
| ProfileSettings | Dedicated settings surfaces from profile cog entry. | active | NotificationSettingsPanel, PrivacyPresencePanel, SafetySupportPanel, account/deletion panels | settings loading, permission denied, updating toggles, deletion request active | panel reveal/settle, status badge updates | notification prefs, privacy settings, blocked users, deletion workflow | mobile/src/screens/ProfileScreen.tsx |
| ProfileSettings#Notifications | Notifications section in settings. | active | NotificationSettingsPanel rows, permission card, reminder card | permission granted, permission undetermined, permission denied, permission unsupported | status chip transitions, row loading states | notification permission state, notification category prefs, reminder state summary | mobile/src/features/profile/components/NotificationSettingsPanel.tsx |
| ProfileSettings#PrivacyPresence | Privacy and presence section in settings. | active | PrivacyPresencePanel segmented controls, invite toggle cards | member visibility variants, presence visibility variants, invite request on/off | segmented control transitions | privacy settings API, privacy summary mapping | mobile/src/features/profile/components/PrivacyPresencePanel.tsx |
| ProfileSettings#SafetySupport | Safety and support section in settings. | active | SafetySupportPanel blocked rows, support action row | loading blocked users, no blocked users, unblocking, error/info message | list updates, button loading states | blocked users list, support/privacy links | mobile/src/features/profile/components/SafetySupportPanel.tsx |
| ProfileSettings#AccountDeletion | Account/deletion controls section in settings. | active | deletion badge, request deletion action, policy/support actions | no request, requested, acknowledged, in review, completed, cancelled, rejected | badge state transitions | account deletion status API, deletion request API | mobile/src/screens/ProfileScreen.tsx |
| ProfileHome#JournalTrustProgress | Journal, trust, and progress surfaces. | active | JournalPanel, TrustHero, TrustMetricsPanel | saved, saving, unsaved, entry history empty/draft | page turn animation, save pulse | journal entries API, profile summary metrics | mobile/src/features/profile/components/JournalPanel.tsx |

## 2) Active Flows

- **Solo prayer start**
  Steps: SoloHome -> PrayerCard or PrayerLibrary selection -> SoloLive
  States: library loading, library error, no filtered prayers, audio and script prefetch
- **Solo setup to live**
  Steps: SoloSetup -> SoloLive
  States: setup loading, setup error, start action
- **Circles browse and governance**
  Steps: CommunityHome -> CircleDetails -> CircleInviteComposer -> InviteDecision
  States: my/shared/invites segments, empty segment variants, invite lifecycle, member governance actions, error and retry
- **Live feed to room**
  Steps: EventsHome -> Global Pulse inline -> Global Pulse fullscreen -> EventDetails -> EventRoom
  States: live now, waiting room, upcoming, ended, reminder saved, permission denied
- **Profile and settings**
  Steps: ProfileHome -> ProfileSettings -> Notifications -> Privacy and Presence -> Safety and Support -> Account Deletion
  States: profile loading, journal saved/saving/unsaved, notification permission states, deletion lifecycle states

## 3) Key Component Families

- **Navigation and shell**
  Members: RootNavigator, MainTabs, BottomTabs, Screen
  Used by: All active screens
- **Hero surfaces**
  Members: SoloHero, SoloSetupHero, CirclesHeroPanel, EventsHeader, EventDetailsHero, TrustHero
  Used by: Solo, Circles, Live, Profile
- **Card families**
  Members: PrayerCard, OccurrenceCard, CircleSummaryCard, CirclePendingInviteCard, CircleDetailMemberRow, CircleInviteRecordRow
  Used by: Solo, Circles, Live
- **State and feedback**
  Members: LoadingStateCard, InlineErrorCard, RetryPanel, EmptyStateCard, StatusChip, ToastCard, AlertBanner
  Used by: All active screens
- **Global Pulse surfaces**
  Members: EmbeddedGlobeCard, LegendChip, Fullscreen selection panel
  Used by: EventsHome
- **Room experience**
  Members: RoomAtmosphereBackdrop, SoloAuraField, CollectiveEnergyField, RoomScriptPanel, RoomTransportControls
  Used by: SoloLive, EventRoom
- **Settings surfaces**
  Members: NotificationSettingsPanel, PrivacyPresencePanel, SafetySupportPanel, JournalPanel, TrustMetricsPanel
  Used by: ProfileHome, ProfileSettings

## 4) Screen States To Export

- Shared base states: loading, error, success, empty.
- Circles segments: my, shared, invites.
- Circles invite statuses: pending, accepted, declined, revoked, expired, invalid.
- Live occurrence states: live, waiting_room, upcoming, ended.
- Live feed sections: live_now, next_24_hours, ritual_1111, my_circles, global_flagships, saved_reminded.
- Profile notification permission states: granted, undetermined, denied, unsupported.
- Profile deletion statuses: none, requested, acknowledged, in_review, completed, cancelled, rejected.
- Journal save states: saved, saving, unsaved.

## 5) Motion/Animation Surfaces To Represent

- **Solo live room atmosphere** (atmospheric)
  Role: Atmospheric background for solo room and shared solo sync mode.
  Layers: Background veil gradient -> Hero gradient -> Atmosphere art overlay (room.solo.overlay) -> SoloAuraField (core aura, veil, inner glow, sync overlay/host beacon) -> Readable script content layer -> Controls overlay
  Reduced motion: Switch to balanced/static quality; keep readability scrim and state labels.
- **Event live room atmosphere** (state-signaling)
  Role: Collective energy field signaling waiting/live/ended states.
  Layers: Background veil gradient -> Hero gradient -> Atmosphere art overlay (room.live.overlay) -> CollectiveEnergyField (primary/secondary pulses, depth, orbit ring, nodes) -> Live state chips and reminder banner -> Script and controls overlay
  Reduced motion: Disable pulse/orbit loops when reduced motion; preserve chip/state semantics.
- **Global Pulse globe** (state-signaling)
  Role: Global live-state map with inline and fullscreen interaction.
  Layers: Mapbox globe or fallback animation layer -> State pulse rings (live/waiting/upcoming/news) -> Accent rings (ritual_1111 and flagship) -> Legend chips and meta labels -> Fullscreen top bar and selection preview card -> Fullscreen spotlight list when nothing selected
  Reduced motion: Fallback rendering or reduced pulse intensity while keeping data hierarchy and labels.
- **Hero and card transitions** (decorative)
  Role: Introduce surfaces without changing semantics.
  Layers: Hero media -> Title/subtitle -> Metric and status chips -> Staggered card rails
  Reduced motion: Settle instantly with opacity-only or no transition.

## 6) Legacy Items Explicitly Excluded From Export

- `PrayerCircle` compatibility screen/route (removed).
- `EventsCircle` compatibility screen/route (removed).
- Deprecated deep-link path `egregorv2://events/room...` (rejected).
- Deprecated deep-link paths `egregorv2://community/events-circle` and `egregorv2://community/prayer-circle` (rejected).
- Legacy prayer/events-circle adapter methods removed from circles/data APIs.
- Community-era dead components listed in `mobile/docs/redesign/legacy-removal-pass.md`.
- Note: runtime legacy event-room backend fallbacks still exist only as migration safety nets and are not exported as canonical UX routes.

## 7) Content Collections Exported For Redesign Context

- Prayer content library: `mobile/docs/redesign/figma-handoff/content/prayer-content-library.json` and `.csv`.
- Event template content library: `mobile/docs/redesign/figma-handoff/content/event-content-library.json` and `.csv`.
- Canonical event/live series keys and metadata: `mobile/docs/redesign/figma-handoff/content/canonical-event-series.json` and `.csv`.
- Copy/state library (notifications/privacy/safety/deletion/invite/live labels): `mobile/docs/redesign/figma-handoff/content/copy-state-library.json`.
- Component/architecture/state blueprints: `mobile/docs/redesign/figma-handoff/architecture/*`.
- Motion layer annotations: `mobile/docs/redesign/figma-handoff/motion/motion-surfaces.json`.
- Design token reference: `mobile/docs/redesign/figma-handoff/design/design-token-reference.md`.
- Asset mapping: `mobile/docs/redesign/figma-handoff/assets/asset-mapping.json`.

