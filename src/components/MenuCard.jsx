import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { PlusIcon, MinusIcon, FoodPlaceholderIcon } from "./Icons";
import { getItemEstimateTime } from "../data/canteens";

export default function MenuCard({
  item,
  cartQuantity = 0,
  onAddToCart,
  onIncrease,
  onDecrease,
  onOpenCanteenModal,
  selectedCanteen
}) {
  const [imgError, setImgError] = useState(false);

  // Use image from database item, with clean fallback
  const displayImage = !imgError && item.image ? item.image : "/images/samosa.jpg";

  return (
    <div className={`menu-card ${!item.available ? "out-of-stock-card" : ""}`}>
      <div className="menu-card-img-wrap">
        {!imgError ? (
          <img
            src={displayImage}
            alt={item.name}
            className="menu-card-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="menu-card-img-placeholder">
            <FoodPlaceholderIcon size={44} />
          </div>
        )}

        <div className="menu-card-badge-pos">
          <StatusBadge status={item.available} type="availability" />
        </div>

        {item.category && (
          <span className="menu-card-category-tag">
            {item.category}
          </span>
        )}
      </div>

      <div className="menu-card-content">
        <div className="menu-card-header">
          <h4 className="menu-card-title">{item.name}</h4>
          <span className="veg-indicator" title="Pure Veg Snack">
            <span className="veg-dot"></span>
          </span>
        </div>

        {item.description && (
          <p className="menu-card-desc">
            {item.description}
          </p>
        )}

        {onOpenCanteenModal && (
          <button
            type="button"
            className="menu-card-canteen-link"
            onClick={() => onOpenCanteenModal(item)}
            title="Check availability & wait times across canteens"
          >
            <span>
              {selectedCanteen && selectedCanteen.id !== "all"
                ? `📍 ${selectedCanteen.shortName || selectedCanteen.name}`
                : Array.isArray(item.availableCanteens) && item.availableCanteens.length > 0 && !item.availableCanteens.includes("all")
                  ? item.availableCanteens.length === 1
                    ? `📍 Only at ${item.canteenName || "Selected Canteen"}`
                    : `📍 Available at ${item.availableCanteens.length} canteens`
                  : item.canteenId && item.canteenId !== "all"
                    ? `📍 Only at ${item.canteenName || "Selected Canteen"}`
                    : "📍 Available at 4 canteens"}
            </span>
            <span className="canteen-arrow">›</span>
          </button>
        )}

        <div className="menu-card-footer">
          <div className="menu-card-price">
            <span className="currency-symbol">₹</span>
            <span className="price-number">{item.price}</span>
            <span className="price-unit">/ item</span>
            <span className="menu-card-time-badge" title="Estimated prep time">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="cart-clock-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{getItemEstimateTime(item)}</span>
            </span>
          </div>

          {/* Interactive Add or Quantity Stepper */}
          {!item.available ? (
            <button className="btn btn-disabled" disabled>
              Sold Out
            </button>
          ) : cartQuantity > 0 ? (
            <div className="card-qty-stepper">
              <button
                type="button"
                className="qty-btn-card"
                onClick={() => onDecrease && onDecrease(item._id)}
                title="Decrease"
              >
                <MinusIcon size={14} />
              </button>
              <span className="qty-number-card">{cartQuantity}</span>
              <button
                type="button"
                className="qty-btn-card"
                onClick={() => onIncrease && onIncrease(item._id)}
                title="Increase"
              >
                <PlusIcon size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-add-cart"
              onClick={() => onAddToCart && onAddToCart(item)}
            >
              <PlusIcon size={15} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
