"use client";

import { useState, useEffect, useRef } from "react";
import { generateTimeSlots } from "@/lib/timeslots";
import { ClockIcon, CheckCircleIcon } from "./Icons";

export default function TimeSlotPicker({
  selectedSlot = "",
  onSelectSlot,
  canteen,
  error = "",
  disabled = false
}) {
  const canteenId = typeof canteen === "string" ? canteen : canteen?.id || canteen?.canteenId || "foodcourt-34";
  const canteenName = typeof canteen === "object" ? canteen?.name || "Campus Canteen" : "Campus Canteen";

  const getClientTimeZone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  };

  // Initialize immediately with local generator for zero latency
  const [slots, setSlots] = useState(() => generateTimeSlots(canteenId, new Date(), 12, getClientTimeZone()));
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isSubscribed = true;
    const tz = getClientTimeZone();
    // Refresh slots dynamically from API
    fetch(`/api/timeslots?canteenId=${encodeURIComponent(canteenId)}&tz=${encodeURIComponent(tz)}`, {
      cache: "no-store"
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isSubscribed && data?.success && Array.isArray(data.slots) && data.slots.length > 0) {
          setSlots(data.slots);
        }
      })
      .catch(() => {
        // Fallback to local generation if network drops
        if (isSubscribed) {
          setSlots(generateTimeSlots(canteenId, new Date(), 12, tz));
        }
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [canteenId]);

  const handleSlotClick = (e, slotLabel) => {
    if (!onSelectSlot || disabled) return;

    // Toggle logic: If user clicks the already selected slot, deselect it!
    if (selectedSlot === slotLabel) {
      onSelectSlot("");
    } else {
      onSelectSlot(slotLabel);
      try {
        e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } catch (_) {}
    }
  };

  return (
    <div className={`timeslot-picker-card ${error ? "has-error" : ""}`}>
      {/* Header Row */}
      <div className="timeslot-header-row">
        <div className="timeslot-title-wrap">
          <div className="timeslot-icon-box">
            <ClockIcon size={18} />
          </div>
          <div>
            <label className="timeslot-main-label" htmlFor="timeslot-grid-group">
              Pickup Time Slot
            </label>
            <div className="timeslot-canteen-hint">
              Fresh preparation at <strong>{canteenName}</strong>
            </div>
          </div>
        </div>

        {selectedSlot ? (
          <button
            type="button"
            className="timeslot-selected-pill active-slot"
            onClick={() => onSelectSlot && onSelectSlot("")}
            title="Click to deselect and switch to Immediate mode"
            aria-label="Deselect slot and switch to Immediate"
          >
            <CheckCircleIcon size={13} /> {selectedSlot}
            <span className="timeslot-deselect-x">✕</span>
          </button>
        ) : (
          <span className="timeslot-immediate-pill" title="Order will be queued immediately without scheduling ahead">
            ⚡ Immediate Pickup
          </span>
        )}
      </div>

      <p className="timeslot-subhint">
        {selectedSlot ? (
          <>
            Scheduled for <strong>{selectedSlot}</strong>. Tap the slot again (or ✕ above) to switch back to <strong>Immediate</strong> preparation.
          </>
        ) : (
          <>
            Order will be prepared <strong>Immediately (ASAP)</strong> upon kitchen acceptance. Tap any slot below to schedule for later.
          </>
        )}
      </p>

      {error && (
        <div className="timeslot-error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Grid on Desktop / Smooth Horizontal Carousel on Mobile */}
      <div
        id="timeslot-grid-group"
        className="timeslot-grid"
        ref={scrollRef}
        role="radiogroup"
        aria-label="Preferred pickup time slot"
      >
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.label;
          return (
            <button
              key={slot.id || slot.label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`timeslot-chip ${isSelected ? "selected" : ""} ${slot.isEarliest ? "earliest-chip" : ""}`}
              onClick={(e) => handleSlotClick(e, slot.label)}
              title={isSelected ? "Click again to deselect (Immediate Mode)" : `Select ${slot.label}`}
            >
              <div className="timeslot-chip-top">
                <span className="timeslot-time-text">{slot.label}</span>
                {isSelected && (
                  <span className="timeslot-radio-dot active" aria-hidden="true">
                    ✓
                  </span>
                )}
              </div>
              {slot.badge && (
                <span className={`timeslot-badge-tag ${slot.isEarliest ? "earliest" : "recommended"}`}>
                  {slot.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
