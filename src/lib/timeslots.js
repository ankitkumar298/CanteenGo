/**
 * Utility for generating and validating campus canteen pickup time slots.
 * Each slot represents a 15-minute collection window (e.g. "12:15 PM - 12:30 PM").
 */

function getHoursMinutesInTimeZone(date, timeZone = "Asia/Kolkata") {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    }).formatToParts(date);
    let hours = Number(parts.find((p) => p.type === "hour")?.value);
    const minutes = Number(parts.find((p) => p.type === "minute")?.value);
    if (hours === 24) hours = 0;
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return { hours, minutes };
    }
  } catch {
    // Fallback to runtime local time if timeZone is invalid
  }
  return { hours: date.getHours(), minutes: date.getMinutes() };
}

/**
 * Formats a Date object to "hh:mm AM/PM" string in the target timezone (e.g. "12:15 PM")
 */
function formatTime12H(date, timeZone = "Asia/Kolkata") {
  let { hours, minutes } = getHoursMinutesInTimeZone(date, timeZone);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  const hourStr = hours < 10 ? `0${hours}` : hours;
  return `${hourStr}:${minStr} ${ampm}`;
}

/**
 * Generates an array of realistic, available pickup time slots starting from
 * ~15 minutes after the current time, rounded up to the next 15-minute mark.
 *
 * @param {string} canteenId - ID of the canteen (optional)
 * @param {Date} [baseDate] - Reference date (defaults to now)
 * @param {number} [slotCount=12] - Number of slots to generate
 * @param {string} [timeZone="Asia/Kolkata"] - IANA timezone for formatting slots
 * @returns {Array<{ id: string, label: string, start: string, end: string, isEarliest: boolean, badge: string }>}
 */
export function generateTimeSlots(
  canteenId = "foodcourt-34",
  baseDate = new Date(),
  slotCount = 12,
  timeZone = "Asia/Kolkata"
) {
  const slots = [];
  // Add 15 minutes preparation lead time and truncate seconds/ms
  let startMs = Math.floor((baseDate.getTime() + 15 * 60 * 1000) / 60000) * 60000;
  const { minutes } = getHoursMinutesInTimeZone(new Date(startMs), timeZone);

  // Round up to the next 15-minute mark (0, 15, 30, 45) in target timezone
  const remainder = minutes % 15;
  if (remainder !== 0) {
    startMs += (15 - remainder) * 60 * 1000;
  }

  for (let i = 0; i < slotCount; i++) {
    const slotStart = new Date(startMs + i * 15 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);

    const startFormatted = formatTime12H(slotStart, timeZone);
    const endFormatted = formatTime12H(slotEnd, timeZone);
    const label = `${startFormatted} - ${endFormatted}`;

    slots.push({
      id: `slot-${i}`,
      label,
      start: startFormatted,
      end: endFormatted,
      isEarliest: i === 0,
      badge: i === 0 ? "⚡ Earliest Available" : i === 1 ? "Recommended" : ""
    });
  }

  return slots;
}

/**
 * Validates whether a provided string matches a valid pickup time slot format
 */
export function isValidTimeSlot(slot) {
  if (!slot || typeof slot !== "string") return false;
  const trimmed = slot.trim();
  if (trimmed.length < 10) return false;
  // Matches e.g. "12:15 PM - 12:30 PM" or "01:00 PM - 01:15 PM"
  return /\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(trimmed);
}

