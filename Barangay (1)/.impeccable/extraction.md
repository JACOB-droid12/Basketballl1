# Impeccable Extraction Notes

Source: `C:\Users\Emmy Lou\Downloads\Barangay (1)`

## Extracted Product Context

- Product register: `product`
- Core audience: barangay personnel operating an offline office computer
- Secondary beneficiaries: residents, youth groups, sports groups, barangay officials
- Primary job: check basketball court availability, encode reservations, approve or decline requests, manage missed bookings, and summarize usage
- Scope boundary: staff-mediated offline system, not remote resident self-service

## Extracted Design Tokens

The staff-friendly visual system is the preferred source because it directly targets the real office workflow:

- `staff-styles.css`: largest and plainest staff variant, with 17px base text and high contrast.
- `styles-staff.css`: refined staff-friendly variant with bilingual labels, Instrument Serif headings, Inter body text, warm paper surfaces, and civic blue primary actions.
- `styles.css`: earlier dense dashboard variant with OKLCH tokens, compact density, dark-mode support, and mono-heavy metadata.

The generated `DESIGN.md` uses the staff-friendly light palette from `styles-staff.css` as the normative system because it best matches the proposal's offline barangay office context.

## Reusable Patterns

- Persistent sidebar with large labeled navigation rows.
- Topbar with barangay identity, clock/date context, and current user.
- Primary and large primary buttons for major staff actions.
- Status pills for pending, approved, completed, missed, warning, danger, and success.
- Cards with warm paper backgrounds, 14px radius, and bordered structure.
- Forms with large inputs, plain section titles, helper text, and confirmation dialog before save.
- Reservation detail dialogs with action-specific confirmation.
- Calendar blocks and list rows that expose time, purpose, requester, and status without opening details first.

## Extraction Decision

No code refactor was performed. This pass extracted the product strategy and visual design system into `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` so future Impeccable commands can reuse the actual Barangay UI direction.
