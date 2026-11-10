export default function StatusBadge({ status, type = "order" }) {
  let badgeClass = "badge";

  if (type === "order") {
    if (status === "Pending") badgeClass += " badge-pending";
    else if (status === "Preparing") badgeClass += " badge-preparing";
    else if (status === "Ready") badgeClass += " badge-ready";
    else if (status === "Completed") badgeClass += " badge-completed";
    else if (status === "Missed Pickup") badgeClass += " badge-missed";
    else if (status === "Cancelled") badgeClass += " badge-cancelled";

    return (
      <span className={badgeClass} title={`Kitchen Order Status: ${status}`}>
        <span className="badge-dot"></span>
        <span className="badge-category-prefix">Order: </span>
        <span className="badge-value-text">{status}</span>
      </span>
    );
  }

  if (type === "payment") {
    const isPaid = status === "Paid";
    if (isPaid) badgeClass += " badge-paid";
    else badgeClass += " badge-unpaid";

    return (
      <span className={badgeClass} title={`Payment Status: ${status}`}>
        <span className="badge-payment-icon">{isPaid ? "✓" : "💳"}</span>
        <span className="badge-category-prefix">Payment: </span>
        <span className="badge-value-text">
          {isPaid ? "Paid" : "Due on Pickup"}
        </span>
      </span>
    );
  }

  if (type === "availability") {
    if (status) badgeClass += " badge-available";
    else badgeClass += " badge-unavailable";

    return (
      <span className={badgeClass}>
        <span className="badge-dot" style={{ backgroundColor: status ? "#16a34a" : "#dc2626" }}></span>
        {status ? "Available" : "Sold Out"}
      </span>
    );
  }

  return <span className={badgeClass}>{status}</span>;
}
