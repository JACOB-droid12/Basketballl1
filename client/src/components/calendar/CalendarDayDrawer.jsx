import { ModalShell } from "../ModalShell.jsx";
import { StaffBookingBlock } from "./StaffBookingBlock.jsx";
import { displayRange, humanizeBlockType, formatLongDate } from "./calendarHelpers.js";
import { formatReferenceNo } from "../../api/referenceNo.js";
import { getStatusDisplay } from "../../api/statusDisplay.js";

/**
 * CalendarDayDrawer — the per-day overflow drawer surfaced when a day
 * carries more than `MAX_VISIBLE_BLOCKS` (4) items and the staff
 * member activates the `+ N more` overflow tile (Req. 5.5).
 *
 * Chrome:
 *   - The drawer renders through the shared `<ModalShell>` so it
 *     inherits the existing focus-trap loop, Escape close, and
 *     backdrop dismissal that already power `ReservationDetailDrawer`.
 *     No custom focus trap lives in this file — the "existing
 *     focus-trap pattern from ReservationDetailDrawer.jsx" the task
 *     references is the shared shell.
 *   - The shell's `kicker` carries `day.name` and the `title` is the
 *     long-date form returned by `formatLongDate(day.date)`. The
 *     subtitle reads `${items.length} bookings` so the staff member
 *     reads the count before scanning the list.
 *   - The body renders every item — not just the overflow remainder —
 *     through `<StaffBookingBlock />` inside a `.staff-day-drawer-list`
 *     container so the day-drawer styling can diverge from the
 *     reservation drawer later without coupling.
 *
 * Focus return:
 *   - On every dismissal path (close button, Escape, backdrop) the
 *     drawer calls `handleClose()`, which forwards to the supplied
 *     `onClose` and then refocuses `triggerRef.current` so screen
 *     reader and keyboard users return to the overflow tile they
 *     activated. Activating an in-list reservation or admin action
 *     also routes through `handleClose()` so the focus return runs
 *     before the navigation/handler fires.
 *
 * Props:
 *   open               — boolean; the drawer is unmounted when false.
 *   day                — `{ date, name }` for the day being expanded;
 *                        `null` is treated as closed.
 *   items              — every Item for the day (sorted by start
 *                        time); the drawer does not re-sort.
 *   onClose            — invoked when the user dismisses the drawer.
 *   onOpenReservation  — invoked with the reservation object when the
 *                        staff member activates a reservation row.
 *   onDeactivateBlock  — invoked with the block payload when the
 *                        staff member activates the "Deactivate
 *                        block" admin action on a schedule block row.
 *   isAdmin            — gates the per-block "Deactivate block"
 *                        admin action.
 *   triggerRef         — ref pointing at the originating overflow
 *                        tile so focus returns there on close.
 *
 * Validates: Requirements 5.5
 */
export function CalendarDayDrawer({
  open,
  day,
  items,
  onClose,
  onOpenReservation,
  onDeactivateBlock,
  isAdmin,
  triggerRef
}) {
  if (!open || !day) return null;

  function handleClose() {
    onClose();
    // Return focus to the originating overflow tile after the close
    // hook fires so screen reader and keyboard users return to the
    // element they activated. The shell already restores focus to
    // whatever was focused before mount, but the staff overflow tile
    // can be replaced or re-rendered between open and close, so we
    // refocus the ref the parent captured at click time to be sure.
    if (triggerRef && triggerRef.current && typeof triggerRef.current.focus === "function") {
      triggerRef.current.focus();
    }
  }

  const list = Array.isArray(items) ? items : [];

  return (
    <ModalShell
      open
      onClose={handleClose}
      kicker={day.name}
      title={formatLongDate(day.date)}
      subtitle={`${list.length} bookings`}
      size="lg"
    >
      <div className="staff-day-drawer-list">
        {list.map((item, index) => {
          const status = getStatusDisplay(item.statusCode, item.statusName);
          const range = displayRange(item.startTime, item.endTime);

          if (item.kind === "reservation") {
            const reservation = item.reservation || {};
            return (
              <StaffBookingBlock
                key={`reservation-${reservation.reservationId ?? index}`}
                kind="reservation"
                range={range}
                name={reservation.representativeName || "Reserved booking"}
                purpose={reservation.purpose || "No purpose recorded"}
                statusCode={item.statusCode}
                statusLabel={status.label}
                statusClassName={status.className}
                referenceLabel={formatReferenceNo(reservation.referenceNo)}
                onActivate={() => {
                  handleClose();
                  onOpenReservation(reservation);
                }}
              />
            );
          }

          const block = item.block || {};
          const blockTypeLabel =
            humanizeBlockType(block.blockType || block.type) || "Schedule block";

          return (
            <StaffBookingBlock
              key={`block-${block.blockId ?? index}`}
              kind="block"
              range={range}
              name={blockTypeLabel}
              purpose={block.reason || "No reason recorded"}
              statusCode={item.statusCode}
              statusLabel={status.label}
              statusClassName={status.className}
              referenceLabel=""
              adminAction={
                isAdmin
                  ? {
                      label: "Deactivate block",
                      onClick: () => {
                        handleClose();
                        onDeactivateBlock(block);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </ModalShell>
  );
}
