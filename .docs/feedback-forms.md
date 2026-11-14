# Undistracted Me — Feedback Forms Specification

> Ready-to-use spec for creating two Google Forms by hand.
> Paste each string verbatim, add the questions in order, apply the settings, and share.

---

## ⚠️ Before you start — where the URLs go

The live feedback form is hosted at Google Forms:

- **Feedback form URL:** `https://forms.gle/7vf4VGrB9Loz8hB76`

This single URL is currently wired into both the landing site footer ("Report a bug" / "Suggest a feature") and the README. Wire it into the **Extension Support dialog** too:

1. **Landing site footer** — already points at `https://forms.gle/7vf4VGrB9Loz8hB76` (`landing/index.html`).
2. **Extension Support dialog** — `src/components/SupportDialog.jsx` currently links to "Buy Me a Momo" and GitHub. Add `https://forms.gle/7vf4VGrB9Loz8hB76` as a "Send feedback" link (or "Report a bug" + "Request a feature", both pointing here until a separate feature form exists).

---

## How to use this spec (≈5 minutes per form)

1. Go to [forms.google.com](https://forms.google.com) → **Blank form**.
2. Paste the **form title** and **description** from the "Copy-paste kit".
3. Add each question in order from the table (field type, options, required toggle).
4. Open **Settings** (⚙️) and apply the recommended settings.
5. **Send** → copy the shareable link → paste it into the two locations above.

> **One important Google Forms caveat:** any form that includes a **File upload** question forces respondents to **sign in with a Google account** (it's a Google limitation — uploads can't be anonymous). That's acceptable here, but it means the "screenshot" question in the Bug Report form technically breaks full anonymity. See the notes in that question's row.

---

# Form 1 — Bug Report

## Title & description

**Title:**
> Undistracted Me — Bug Report

**Description:**
> Found something broken? Tell us what happened and we'll do our best to fix it. Undistracted Me is a free, open-source project maintained by one person, so fixes can take a little while — please be patient, and no spam. If you leave your email, I can follow up with questions or let you know when it's fixed.

## Questions (add in this exact order)

| # | Question text | Google Forms field type | Options (if applicable) | Required? | Why this field / notes |
|---|---|---|---|---|---|
| 1 | Your email (optional, for follow-up) | Short answer | — | **No** | Ask this as an optional question **instead of** enabling "Collect email addresses" in Settings. That keeps submissions mostly anonymous. Optional: add *Response validation → Email* so mistyped addresses are caught. |
| 2 | Which platform are you using? | Multiple choice | Chrome extension / Firefox extension / Website (app.undistracted.me) / Other | **Yes** | The app runs as an extension *and* on the web, and behavior differs. "Other" catches anything unexpected. |
| 3 | What kind of issue is this? | Multiple choice | Something is broken / Crash or freeze / Visual glitch / Performance is slow / Data or sync issue / Security or privacy concern / Other | **Yes** | Security/privacy reports get routed with priority; "Other" is the escape hatch. |
| 4 | What were you trying to do? | Paragraph | — | **Yes** | Captures intent. Knowing the goal separates a true bug from a missing feature. |
| 5 | What happened instead? | Paragraph | — | **Yes** | The observed behavior — the core of a bug report. |
| 6 | Steps to reproduce | Paragraph | — | **Yes** | Numbered steps let a one-person team reproduce without back-and-forth. **Add this helper text in the question's "Description" field:** `e.g. 1. Open a new tab → 2. Click the widget → 3. …` |
| 7 | How severe is it? | Multiple choice | Critical (can't use the extension) / Major (feature unusable) / Minor (annoying) / Cosmetic | **Yes** | Used to triage and prioritize the backlog. |
| 8 | Screenshot or screen recording (optional) | File upload | — | **No** | ⚠️ *A File upload question forces respondents to sign in to a Google account (Google Forms limitation) — responses with attachments can't be anonymous.* That's fine here. Set allowed file types to **images and video only**, and cap the size (e.g. 50 MB) to keep Drive tidy. |
| 9 | Anything else we should know? | Paragraph | — | **No** | Catch-all for device, OS, browser/extension version, or extra context. |

## Recommended Google Forms settings

| Setting | Value | Why |
|---|---|---|
| Collect email addresses | **OFF** | Already asked as an optional question (#1); keeps submissions mostly anonymous. |
| Limit to 1 response | **OFF** | Users may hit several bugs over time — allow multiple reports. |
| Response receipts | **ON** | Lets users confirm their report went through, which builds trust. |
| Show progress bar | **OFF** | Short form (9 questions) — a progress bar adds noise. |
| Shuffle question order | **OFF** | The question flow is deliberate (platform → issue → details). |
| Show link to submit another response | **ON** | Pairs with "Limit to 1 response: OFF" so a user can file a second bug right away. |
| Allow respondents to edit after submit | **OFF** | Bug reports are point-in-time; a new report is clearer than an edit. |
| Confirmation message | Custom (see kit) | Friendly sign-off + expectation-setting. |
| See summary charts and text responses | **ON** (default) | You'll want the auto-generated chart of "issue type" / "severity". |

## Copy-paste kit — Bug Report

**Title:**
```
Undistracted Me — Bug Report
```

**Description:**
```
Found something broken? Tell us what happened and we'll do our best to fix it. Undistracted Me is a free, open-source project maintained by one person, so fixes can take a little while — please be patient, and no spam. If you leave your email, I can follow up with questions or let you know when it's fixed.
```

**Confirmation message** (Settings → Presentation → Confirmation message):
```
Thanks for the report! I read every one, and I'll reach out if I need more detail. Since it's just me maintaining Undistracted Me, fixes may take a little time — but this genuinely helps.
```

---

# Form 2 — Feature Request / Suggestion

## Title & description

**Title:**
> Undistracted Me — Feature Request

**Description:**
> Have an idea to make Undistracted Me better? I'd love to hear it. This is a free, open-source project built by one person, so I can't promise every idea ships — but every suggestion gets read and considered. The more specific you are, the more likely your idea becomes a real feature.

## Questions (add in this exact order)

| # | Question text | Google Forms field type | Options (if applicable) | Required? | Why this field / notes |
|---|---|---|---|---|---|
| 1 | Your email (optional, for follow-up) | Short answer | — | **No** | Same as the bug form — optional question instead of "Collect email addresses". Add *Response validation → Email* if you want clean data. |
| 2 | One-line summary of your idea | Short answer | — | **Yes** | This becomes the row title in the responses spreadsheet — encourage users to write a good "subject line." |
| 3 | Describe the feature | Paragraph | — | **Yes** | The "what." |
| 4 | What problem would it solve for you? | Paragraph | — | **Yes** | The "why." Separating problem from feature helps judge value vs. effort. |
| 5 | How would you use it day-to-day? | Paragraph | — | **No** | Shows real-world fit and helps scope the MVP. |
| 6 | How important is this to you? | Multiple choice | Must have / Important / Nice to have | **Yes** | A simple prioritization signal for the roadmap. |
| 7 | Any mockups, links, or references? | Paragraph *(recommended)* — or File upload | — | **No** | Recommended: keep it as **Paragraph** and ask users to paste links (Figma, screenshots, similar features) — simpler and stays anonymous. *(If you'd rather accept image attachments, switch to **File upload**, but note that forces Google sign-in.)* |
| 8 | Anything else? | Paragraph | — | **No** | Catch-all for context, related ideas, or caveats. |

## Recommended Google Forms settings

| Setting | Value | Why |
|---|---|---|
| Collect email addresses | **OFF** | Already asked as an optional question (#1). |
| Limit to 1 response | **OFF** | Users often have more than one idea — allow multiple. |
| Response receipts | **ON** | Confirms the idea was received. |
| Show progress bar | **OFF** | Short form (8 questions). |
| Shuffle question order | **OFF** | Logical flow from idea → problem → priority. |
| Show link to submit another response | **ON** | Lets someone submit a second idea immediately. |
| Allow respondents to edit after submit | **OFF** | Keep submissions clean; a new entry is fine. |
| Confirmation message | Custom (see kit) | Friendly + honest about scope. |
| See summary charts and text responses | **ON** (default) | The "importance" chart is a useful signal. |

## Copy-paste kit — Feature Request

**Title:**
```
Undistracted Me — Feature Request
```

**Description:**
```
Have an idea to make Undistracted Me better? I'd love to hear it. This is a free, open-source project built by one person, so I can't promise every idea ships — but every suggestion gets read and considered. The more specific you are, the more likely your idea becomes a real feature.
```

**Confirmation message** (Settings → Presentation → Confirmation message):
```
Thanks for the idea! I read every suggestion, though I can't promise every one will ship. If it's a good fit, you might see it in a future update.
```

---

## Quick consistency checklist

- [ ] Both forms use the same wording for the optional email question.
- [ ] Both forms have "Collect email addresses" turned **OFF**.
- [ ] The Bug Report form's screenshot field uses **File upload** (and you've noted the sign-in tradeoff).
- [ ] The Feature Request form's "mockups/links" field is **Paragraph** unless you consciously chose File upload.
- [ ] Both confirmation messages are pasted in.
- [ ] The live URL `https://forms.gle/7vf4VGrB9Loz8hB76` is wired into the landing site footer, README, and the Support dialog.
