/**
 * CalendarDayColumn renders one column of the staff week grid. It owns
 * the visual contract for a single day's card: the head (delegated to
 * `CalendarWeekdayHeader`), the body's empty / filled / overflow
 * states, and the wiring that turns each `Item` (reservation or block)
 * into the right `StaffBookingBlock` props.
 *
 * The component caps the visible blocks per day at `MAX_VISIBLE_BLOCKS`
 * (4) and, when more items exist, appends a single `.staff-day-overflow`
 * tile so the remaining items reach staff via the per-day drawer.
 *
 * Key contracts (Properties 1, 8, 9 / Requirements 1.1, 4.1–4.6,
 * 5.1–5.4):
 *   - The day-card always renders exactly one `.staff-day-head-num`
 *     (delegated to `CalendarWeekdayHeader`), regardless of state.
 *   - When `items.length === 0` the body renders `<CalendarEmptyDay />`
 *     and zero booking blocks.
 *   - When `items.length >= 1` the body renders the first
 *     `Math.min(items.length, MAX_VISIBLE_BLOCKS)` items as
 *     `<StaffBookingBlock />` elements.
 *   - When `items.length > MAX_VISIBLE_BLOCKS` the body appends one
 *     `<button className="staff-day-overflow">+ N more</button>` whose
 *     accessible name reads `"+ N more bookings on {Day}, {Long date}"`.
 *   - Saturdays and Sundays carry `data-weekend="true"` on the article
 *     so the CSS weekend-equality guards apply (Req. 10.1–10.3).
 */

import { formatReferenceNo } from "../../api/referenceNo.js";
import { getStatusDisplay } from "../../api/statusDisplay.js";
import { CalendarEmptyDay } from "./CalendarEmptyDay.jsx";
import { CalendarWeekdayHeader } from "./CalendarWeekdayHeader.jsx";
import { StaffBookingBlock } from "./StaffBookingBlock.jsx";
import {
  displayRange,
  formatLongDate,
  humanizeBlockType
} from "./calendarHelpers.js";

/**
 * Maximum number of `.staff-booking-block` elements rendered per day
 * before the overflow tile takes over. Exported so the Property 8 test
 * in task 6.6 can import the same constant the component reads from.
 */
export const MAX_VISIBLE_BLOCKS = 4;

export function CalendarDayColumn({
  day,
  items,
  isToday,
  isAdmin,
  onOpenReservation,
  onDeactivateBlock,
  onOpenDay
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const isWeekend = day && (day.name === "Sat" || day.name === "Sun");
  const dayNumber = parseDayNumber(day && day.date);
  const visible = safeItems.slice(0, MAX_VISIBLE_BLOCKS);
  const hidden = Math.max(0, safeItems.length - MAX_VISIBLE_BLOCKS);

  return (
    <article
      className="staff-day-card"
      data-weekend={isWeekend ? "true" : undefined}
    >
      <CalendarWeekdayHeader
        name={day ? day.name : ""}
        dayNumber={dayNumber}
        isToday={Boolean(isToday)}
      />
      <div className="staff-day-body">
        {safeItems.length === 0 ? (
          <CalendarEmptyDay />
        ) : (
          <>
            {visible.map((item, index) => renderBlock({
              item,
              index,
              day,
              isAdmin,
              onOpenReservation,
              onDeactivateBlock
            }))}
            {hidden > 0 ? (
              <button
                type="button"
                className="staff-day-overflow"
                aria-label={`+ ${hidden} more bookings on ${day.name}, ${formatLongDate(day.date)}`}
                onClick={() => {
                  if (typeof onOpenDay === "function") {
                    onOpenDay(day, safeItems);
                  }
                }}
              >
                + {hidden} more
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function renderBlock({ item, index, day, isAdmin, onOpenReservation, onDeactivateBlock }) {
  const status = getStatusDisplay(item.statusCode, item.statusName);
  const range = displayRange(item.startTime, item.endTime);

  if (item.kind === "reservation") {
    const reservation = item.reservation || {};
    return (
      <StaffBookingBlock
        key={`${day.date}-r-${item.id ?? index}`}
        kind="reservation"
        range={range}
        name={reservation.representativeName || "Reserved booking"}
        purpose={reservation.purpose || "No purpose recorded"}
        statusCode={item.statusCode}
        statusLabel={status.label}
        statusClassName={status.className}
        referenceLabel={formatReferenceNo(reservation.referenceNo)}
        onActivate={() => {
          if (typeof onOpenReservation === "function") {
            onOpenReservation(reservation);
          }
        }}
      />
    );
  }

  // kind === "block"
  const block = item.block || {};
  const blockTypeLabel = humanizeBlockType(block.blockType || block.type);
  const adminAction = isAdmin
    ? {
        label: "Deactivate block",
        onClick: () => {
          if (typeof onDeactivateBlock === "function") {
            onDeactivateBlock(block);
          }
        }
      }
    : undefined;

  return (
    <StaffBookingBlock
      key={`${day.date}-b-${item.id ?? index}`}
      kind="block"
      range={range}
      name={blockTypeLabel || "Schedule block"}
      purpose={block.reason || "No reason recorded"}
      statusCode={item.statusCode}
      statusLabel={status.label}
      statusClassName={status.className}
      referenceLabel=""
      onActivate={undefined}
      adminAction={adminAction}
    />
  );
}

function parseDayNumber(date) {
  if (typeof date !== "string" || date.length < 10) return "";
  const parsed = parseInt(date.slice(8, 10), 10);
  if (Number.isNaN(parsed)) return "";
  return parsed;
}
