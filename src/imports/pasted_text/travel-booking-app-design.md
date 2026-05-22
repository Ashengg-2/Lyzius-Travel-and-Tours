1. Context and user
Design a web application for a single-operator travel & tours agency (one person). The user creates client-facing booking confirmations that look like professional airline + hotel packages. The app must work well on MacBook Safari, and iPhone/iPad Safari in a pinch.

Primary job-to-be-done: Enter structured booking data quickly → review a faithful print preview → export a PDF that matches the agency’s brand.

Tone: Trustworthy, premium, calm, “travel concierge,” not startup-gamified.

2. Information architecture (what exists in the product)
The product has no multi-user collaboration in v1. Include only:

A library/list of saved itineraries (searchable).
An itinerary editor with live document preview.
Actions: New, Duplicate, Save draft, Mark as ready (optional), Export PDF, Download (same as export), Print (optional secondary).
Do not design social features, chat, or complex analytics.

3. Screens (minimum set)
A) Itineraries list (home)

Page title + subtitle (“Drafts stay private on this device” style microcopy is optional).
Search field: placeholder “Search client name, destination, dates…”.
Filters as simple chips: All / Draft / Ready (or similar).
Primary button: New itinerary (top right).
Table or card list:
Columns: Client / lead passenger, Destination, Travel start, Travel end, Status, Last updated.
Row actions: Open, overflow menu with Duplicate, Delete (destructive).
Include empty state: illustration or simple icon, headline, CTA Create first itinerary.

Include no results state after search.

B) Itinerary editor (main canvas)

Default layout desktop ≥1280px:

Left: form (scrollable), max readable width (~720–840px).
Right: fixed/sticky Preview panel showing the two-page confirmation at reduced scale with zoom controls (50% / 75% / 100%) and a subtle “A4” frame.
Tablet: split stacks: preview below editor, or tabbed editor/preview.

Mobile: two tabs — Edit and Preview with a sticky primary Export PDF button.

Top app bar (editor):

Back to list.
Itinerary title (editable inline).
Status pill: Draft vs Ready (definitions in annotations).
Secondary actions: Save (if explicit save is shown), Duplicate.
Primary: Export PDF (most prominent).
Optional right metadata column (desktop only): “Last edited” timestamp, “Internal notes exist” indicator (does not show on PDF).

4. Form structure — required sections and fields
Use clear section headers and optional collapse/expand per section. Show required field indicators sparingly (only truly required for PDF completeness: passenger name + travel dates + at least one flight segment OR explicit user override—design as “Completeness meter” optional).

1. Agency & brand

Agency display name (text).
Logo upload control (dropzone + file picker), with preview thumbnail.
Optional tagline/sub-brand line under logo area in preview.
Default footer disclaimer text (multi-line).
2. Document headings

Main H1 for page 1 (“Flight Details” in reference doc—make it configurable text field).
Page 2 header area fields: contact block (see below).
3. Outbound flight

Route label (e.g., “Manila (MNL) → Osaka (KIX)”).
Airline name.
Flight number.
Departure airport name + terminal.
Departure date-time (single field or split date/time—design both compact).
Arrival airport name + terminal.
Arrival date-time.
Duration.
Baggage policy line (free text + optional structured chips: carry-on kg, checked kg).
4. Return flight (same fields as outbound).

5. Hotel

Hotel name.
Full address (multi-line).
Phone (international format).
Check-in date.
Check-out date.
Room description (e.g., room type, occupancy “1 adult / 0 child”, sqm).
Inclusions (comma-separated or chips): e.g., “Free Wi‑Fi”.
6. Supplements / fees

Repeatable table rows:

Description (e.g., “City tax”).
Amount + currency (e.g., “0.00 JPY”).
Charge type (e.g., “Pay at hotel” / “Prepaid”) — use select.
Include Add row / Remove row.

7. Cancellation & policies

Table for cancellation tiers:

Rule label (e.g., “Until 25-Oct-2026”).
Charge (amount or percent) — support “0.00 PHP” and “100.00%” visually.
Separate fields:

No-show charges line.
Long text: Rates & conditions (early checkout, late arrival notice, check-in/out times, minimum age, pets policy—show as scrollable textarea in form; rendered as paragraph blocks in preview).
8. Agency contact (prints on page 2 header)

Contact person name.
Phone.
Email.
9. Passenger

Full name with honorific/title handling (e.g., “MS.”) — design as prefix select + name fields or single line.
Passenger type: Adult/Child.
Birthdate.
Nationality (short code).
Passport number.
Passport valid until.
Issuing country.
Date issued.
(If you want future-proofing: “Add passenger” — optional; v1 can be single passenger, but design empty-add pattern.)

10. Payment / fare breakdown

Subsections with strong hierarchy:

Adult fare (qty):
Base fare
Other charges
Total adult fare
Total fare (if distinct)
Room rate (qty / room label):
Room rate
Taxes
Total rate
11. Summary totals (the “money story”)

Use a definitive summary card in the form (mirrors preview):

Original total (supports strikethrough styling in preview).
Bundle savings (negative amount; highlight as accent red in preview; neutral handling in form inputs).
Total due (largest typography on the page).
12. Internal notes (never on PDF)

Clearly separated panel:

Background tint + lock icon + helper text: “These notes do not appear on the exported PDF.”
Multi-line notes.
5. Preview pane — document design requirements
The preview must read as a client-facing PDF, not a web page.

Format: A4, two pages, with visible page boundary in the UI (subtle separator or “Page 1 / Page 2”).

Visual language (match reference style):

Dark charcoal page background (not pure black).
White or off-white text; avoid low-contrast gray body text.
Thin hairline borders around tables.
Plenty of padding inside bordered regions.
Page 1 content blocks (top to bottom):

Header row: logo lockup left, section title right (“Flight Details”).
Outbound flight block in a bordered info panel (table-like rows: labels left, values right).
Return flight block (same pattern).
Hotel block with address as multi-line, phone as prominent.
Supplements table.
Cancellation table.
Rates & conditions as readable paragraphs with subtle subheadings if needed.
Page 2 content blocks:

Header: logo + Contact information section (name/phone/email).
Passenger table panel.
Payment panels with aligned currency decimals.
Final summary table with:
Original total struck through
Savings in accent red
Total due emphasized
Footer disclaimer text (smaller size).
Certification line: “I hereby certify…” + signature line “Signature over printed name” with ruled lines.
Micro-typography rules to annotate:

Table header row slightly bolder.
Currency alignment: decimals line up (tabular numbers).
Avoid dense wall-of-text; use spacing and dividers.
Long policy text: comfortable line length (~65–75 characters if possible within A4 margins).
Zoom UX

Show a subtle “paper” shadow under the A4 frame.
Include a fit-to-panel toggle.
6. Design system guidance (tokens-level, not dev)
Color roles (name them in Figma variables):

App background, surface-raised, border-subtle, border-strong.
Text primary/secondary/tertiary.
Focus ring (keyboard).
Danger (delete), Success (optional “saved”).
PDF accent red for savings (only in preview, or mirrored lightly in form summary).
Typography:

App UI: use a modern sans (Inter / SF-like). Sizes: 12/13 body, 14 section headers, 16 page titles.
PDF preview: slightly different pairing acceptable (still sans), but tighter leading in tables; define H1/H2/body/caption for the document.
Spacing & grid:

8px base grid for UI.
Document margins: show safe print margins guides (e.g., 16–20mm) as layout guides on the A4 frame.
Elevation:

App uses subtle shadows only (cards, sticky bars). PDF uses flat styling.
Components to build as Figma components:

App buttons (primary/secondary/destructive/ghost).
Inputs: text, textarea, select, date (as unified field style).
Collapsible section.
Table row patterns (form tables vs PDF tables look different—make two table styles).
Status pills.
File upload dropzone.
Zoom control.
“Summary money card.”
A4 Page frame + Page chrome (optional watermark “PREVIEW” toggle for internal review—optional).
7. States and flows to visualize (annotations)
Draft with missing sections: show non-blocking checklist or completeness meter in sidebar (optional).
Exporting PDF: button loading state + toast “PDF downloaded”.
Export error (optional): toast with retry.
Delete itinerary: confirmation modal.
8. Accessibility notes (design-level)
Focus states visible on all interactive controls.
Tap targets ≥44px on mobile.
Don’t rely on red alone for meaning—include labels like “Savings”.
PDF text must remain high contrast (WCAG-ish intent for printed doc).
9. Deliverables checklist
Cover List, Editor desktop, Editor tablet, Editor mobile.
Component library page + PDF template page.
Prototype flow: New itinerary → fill minimal fields → preview updates → export.
Redlines note: margins, column widths for summary totals, and table column behavior when text wraps.