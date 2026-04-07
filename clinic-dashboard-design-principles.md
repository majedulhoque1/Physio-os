# Clinic Dashboard Design Principles

Use these principles when building any screen for the clinic management system. Every component, layout decision, and interaction pattern must trace back to the role it serves.

---

## Universal rules (all roles)

- **Single-surface design.** One screen per role. No sidebar, no tabs, no hamburger menu, no navigation drawer. Everything lives on one vertically scrollable surface. Navigation splits attention — attention costs patients.
- **Time-as-spine.** The vertical axis is the day's timeline. Past fades (opacity 0.45), present is bright, future is muted. A pulsing "NOW" indicator anchors the user's eye. No one should read a clock to know where they are in the day.
- **Status over data.** Never show raw fields when a color or badge communicates faster. A colored card with "Khan — 2:30 — Waiting (4 min)" beats a 6-field row. Color = status. Size = urgency. Words = last resort.
- **Smart defaults kill forms.** Every form pre-fills: today's date, next available slot, most common service, default payment = pending. The user confirms with one tap or edits only what's wrong. A "New Walk-in" flow should require typing exactly one field: the name.
- **No confirmation modals for routine actions.** Use undo toasts (5-second window) instead. Modals punish correct behavior to protect against rare mistakes.
- **Mobile-first density.** Design for a 375px-wide phone screen first. If it works there, it works on tablet and desktop. Receptionists use phones. Physios glance at wall-mounted tablets. Admins use laptops. All three must work.

---

## 1. Receptionist dashboard

### Who they are
Interrupt-driven. Standing up, sitting down, phone ringing, patient walking in. They don't "use" software — they survive between interruptions. Every tap beyond one is friction during a phone call.

### Design mode
**Reactive queue manager.** The screen is a to-do list that moves by itself.

### Three mental modes to design for

1. **Glance mode (60% of time)** — "Is Dr. X free?" "How many waiting?" Zero-tap answers. Sticky stat bar at top: waiting count, in-room count, remaining today, avg wait time. Doctor availability chips with green/red dots. These zones never scroll off screen.

2. **Action mode (30% of time)** — Check-in, payment, reschedule. Swipe-to-act on patient cards: swipe right = check in, swipe left = mark no-show. Sticky bottom bar with 3 buttons: "+ Walk-in" (primary), "Reschedule", "Payment". These cover 80% of all actions.

3. **Queue mode (10% of time)** — Who's here, who's next, who's been waiting too long. The timeline spine handles this automatically. Wait-time badges turn orange > red as time grows. The receptionist can proactively address long waits before complaints.

### Key metrics (always visible, never scrolled past)
- Patients waiting (red if > 3)
- Patients in room
- Remaining today
- Average wait time (red if > 15 min)
- Doctor availability (green dot = free, red dot = busy)

### Interaction rules
- Maximum 1 tap for any routine action (check-in, no-show)
- Maximum 2 taps for semi-routine actions (walk-in registration, payment)
- Maximum 3 taps for rare actions (reschedule, cancel)
- No modals. No multi-step forms. No dropdowns with more than 5 items.
- Type minimum 16px on mobile — receptionist reads while talking on phone

### Card anatomy (patient card in timeline)
```
[Time] [Name]                    [Wait badge] [Status badge]
       [Service · Doctor name]
```
- Past cards: opacity 0.45, non-interactive
- Active cards: full opacity, swipeable
- Future cards: slightly muted, tap to expand

---

## 2. Physiotherapist dashboard

### Who they are
Session-locked. With a patient for 20-45 minutes, then 2-3 minute gap before next. Hands are often busy (stretching, manipulating, demonstrating). Must work hands-free at a glance from 3 feet away.

### Design mode
**Auto-rotating patient briefing.** The screen is a dossier that flips to the next patient when a session ends.

### Two mental modes to design for

1. **In-session mode (85% of time)** — Current patient dominates the entire screen. Large patient name (22px+). Session timer with progress bar. Condition tags (red for alerts like disc herniation, neutral for general info). Last session notes with prescribed exercises. This card must be readable from across the room on a tablet mounted to the wall.

2. **Between-session mode (15% of time)** — 2-3 minute gap. "Who's next? What's their story? Am I running late?" Next patient preview appears below the current patient card with their history summary, session number, and check-in status. A "Complete session" button is the single most important action — it must be the largest, most prominent interactive element.

### Key metrics (inside current session card)
- Session timer (large, 28px+, countdown or count-up)
- Session progress (visual bar: X of Y minutes)
- Session number (e.g., "Session 6 of 10")
- Patient condition tags (color-coded severity)
- Last session summary (2-3 lines max)
- Prescribed exercises (pill badges)

### Interaction rules
- **Complete session** = 1 tap (opens quick-note overlay, not a full form)
- **Add note** = 1 tap (voice-to-text preferred, free text field)
- **Prescribe exercises** = searchable list with recent/frequent at top, 2 taps max
- No small buttons. Minimum tap target 48×48px. Physio's hands may be gloved or wet.
- Auto-advance: when session is marked complete, the dashboard automatically promotes "Next up" to "Current session" after a 5-second delay

### Card anatomy (current patient)
```
[CURRENT SESSION — large label]
[Patient name — 22px bold]
[Session X of Y · Treatment type · Referring doctor]

[===== Timer: 18:24 of 30 min =====]

[Condition tags: 🔴 Disc herniation L4-L5 | ⚪ Hypertension | ⚪ Age 52]

[Last session box:]
  [Date] Pain reduced 7→5. Tolerated prone press-ups.
  [Exercise pills: Press-ups ×15 | Bird-dog ×10 | Bridges ×12]

[COMPLETE SESSION]  [Prescribe]  [Add note]
```

### Next patient preview
```
[Time] [Name]         [Checked in ✓ / Not here yet ⚠]
       [Session X of Y · Treatment · Key flag]
```

---

## 3. Admin dashboard

### Who they are
Analytical. Check the dashboard 2-3 times per day, not continuously. Looking for patterns, revenue tracking, utilization gaps, and emerging problems. Comfortable with data density.

### Design mode
**Business health monitor.** The screen is a diagnostic panel for the clinic's daily operations.

### Three mental modes to design for

1. **Revenue check (first thing they look at)** — "Are we making money today?" Top-line revenue number with comparison to average for this weekday. Revenue breakdown by service type. Pending payments with patient names and amounts.

2. **Utilization scan** — "Is everyone productive?" Staff utilization bars showing percentage of available slots filled. Sessions completed vs scheduled. Identifies who's overbooked, who's underutilized, who's running behind.

3. **Problem detection** — "What's about to go wrong?" Smart alerts surface patterns: no-show clusters (same doctor, same time slot), schedule delays cascading, pending payments aging. These are the most valuable elements on the screen — they replace the admin having to hunt through data.

### Key metrics (top row, always visible)
- Today's revenue (with ↑↓ vs average for this weekday)
- Sessions completed / total (with % complete)
- No-shows today (red if above weekly average)
- Average wait time (red if above target threshold)

### Sections in order of vertical priority

1. **Metric cards** — 4 top-line numbers (revenue, sessions, no-shows, wait time)
2. **Staff utilization** — horizontal bar per staff member (green > 80%, yellow 50-80%, red < 50%) with sessions done/total
3. **Revenue breakdown** — cards by service type + pending payments card
4. **Hourly patient load** — bar chart showing completed (green), current hour (amber), scheduled (gray)
5. **Alerts** — red for critical (no-show patterns, payment issues), yellow for warnings (schedule delays), blue for informational (reminders, upcoming capacity issues)

### Interaction rules
- Tap any metric card to drill into weekly/monthly trend view
- Tap any staff row to see their individual schedule
- Tap any alert to see recommended action
- Density is acceptable — admin expects data-rich screens
- No animations or live updates needed — data refreshes on pull-to-refresh or every 5 minutes
- Font sizes can be smaller than receptionist/physio (13px body is fine)

### Alert anatomy
```
[!] [Color-coded severity] [Description with specific data]
    Red:    "2 no-shows today — both Dr. Haque 10 AM slots. Pattern forming on Tuesdays."
    Yellow: "Dr. Akter running 15 min behind. 3 patients waiting."
    Blue:   "৳4,000 pending — Fatima Begum (৳2,500) + Kamal Hossain (৳1,500)"
```

Alerts must be **specific and actionable**, not generic. "No-shows detected" is useless. "2 no-shows on Dr. Haque's Tuesday 10 AM — this happened 3 of last 4 Tuesdays" drives a decision.

---

## Implementation checklist

When building any screen, verify against these:

- [ ] Is it one screen with zero navigation?
- [ ] Can the primary user complete their most frequent action in ≤ 1 tap?
- [ ] Does the time-spine anchor the layout vertically?
- [ ] Are status badges used instead of raw data fields?
- [ ] Are forms pre-filled with smart defaults?
- [ ] Are routine actions swipe/tap with undo toast instead of confirm modal?
- [ ] Is the type size appropriate for the role's viewing distance?
- [ ] Does color encode urgency without needing to read numbers?
- [ ] Would removing all text labels still communicate the basic structure?
- [ ] Is every metric compared to a meaningful baseline (not just raw numbers)?
