"use client";

import { useState, useEffect, useRef } from "react";
import { UploadIcon, CheckCircleIcon, ImageIcon } from "./Icons";

const PHOTO_PRESETS = [
  { label: "Samosa", url: "/images/samosa.jpg" },
  { label: "Chai", url: "/images/chai.jpg" },
  { label: "Veg Patty", url: "/images/patty.jpg" },
  { label: "Paneer Roll", url: "/images/roll.jpg" },
  { label: "Cheese Maggi", url: "/images/maggi.jpg" },
  { label: "Cold Coffee", url: "/images/coffee.jpg" },
  { label: "Veg Sandwich", url: "/images/sandwich.jpg" }
];

export default function EditMenuItemModal({
  isOpen,
  item,
  selectedCanteen,
  onClose,
  onSave
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Hot Snacks");
  const [foodType, setFoodType] = useState("veg"); // "veg" | "non-veg" | "egg"
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      // Get price for this canteen
      const cp = item.canteenPrices?.[selectedCanteen?.id];
      setPrice(cp !== undefined ? cp : (item.price || item.basePrice || ""));
      setCategory(item.category || "Hot Snacks");
      setFoodType(item.foodType || (item.isVeg === false ? "non-veg" : "veg"));
      setImage(item.image || "/images/samosa.jpg");
      setDescription(item.description || "");

      // Check canteen availability
      const isSoldOut = Array.isArray(item.soldOutCanteens) && selectedCanteen?.id && item.soldOutCanteens.includes(selectedCanteen.id);
      setIsAvailable(!isSoldOut && item.available !== false);
      setErrorMsg("");
      setImageLoadError(false);
    }
  }, [item, selectedCanteen]);

  if (!isOpen || !item) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (!dataUrl) {
        setIsUploadingImage(false);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          setImage(compressed);
          setImageLoadError(false);
        } catch {
          setImage(dataUrl);
        } finally {
          setIsUploadingImage(false);
        }
      };
      img.onerror = () => setIsUploadingImage(false);
      img.src = dataUrl;
    };
    reader.onerror = () => setIsUploadingImage(false);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Food item name cannot be empty.");
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg("Please enter a valid positive price.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");

      const payload = {
        name: name.trim(),
        canteenId: selectedCanteen?.id || "foodcourt-34",
        canteenPrice: numPrice,
        price: numPrice,
        category: category.trim(),
        foodType,
        isVeg: foodType === "veg",
        image: image.trim() || "/images/samosa.jpg",
        description: description.trim(),
        canteenAvailable: isAvailable
      };

      const res = await fetch(`/api/menu/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update item");

      if (onSave) onSave(data);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update food item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card edit-menu-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "95%", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              ✏️ Edit Food Item Details
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Updating for: <strong>{selectedCanteen?.name || "Current Canteen"}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1rem", color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", padding: "10px 14px", borderRadius: "10px", fontSize: "0.84rem", marginBottom: "16px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155" }}>
              Food Item Name:
            </label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masala Dosa"
              required
            />
          </div>

          {/* Dietary Type: Veg / Non-Veg / Egg */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155", display: "block", marginBottom: "6px" }}>
              Dietary Food Type:
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              {/* Veg */}
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: foodType === "veg" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                  background: foodType === "veg" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: foodType === "veg" ? "#166534" : "#475569"
                }}
              >
                <input
                  type="radio"
                  name="modalFoodType"
                  value="veg"
                  checked={foodType === "veg"}
                  onChange={() => setFoodType("veg")}
                  style={{ display: "none" }}
                />
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #16a34a", padding: "2px", borderRadius: "3px" }}>
                  <span style={{ display: "block", width: "6px", height: "6px", background: "#16a34a", borderRadius: "50%" }}></span>
                </span>
                <span>Pure Veg</span>
              </label>

              {/* Non-Veg */}
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: foodType === "non-veg" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                  background: foodType === "non-veg" ? "#fef2f2" : "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: foodType === "non-veg" ? "#991b1b" : "#475569"
                }}
              >
                <input
                  type="radio"
                  name="modalFoodType"
                  value="non-veg"
                  checked={foodType === "non-veg"}
                  onChange={() => setFoodType("non-veg")}
                  style={{ display: "none" }}
                />
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #dc2626", padding: "2px", borderRadius: "3px" }}>
                  <span style={{ display: "block", width: "6px", height: "6px", background: "#dc2626", borderRadius: "50%" }}></span>
                </span>
                <span>Non-Veg</span>
              </label>

              {/* Egg */}
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: foodType === "egg" ? "2px solid #d97706" : "1px solid #cbd5e1",
                  background: foodType === "egg" ? "#fffbeb" : "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: foodType === "egg" ? "#92400e" : "#475569"
                }}
              >
                <input
                  type="radio"
                  name="modalFoodType"
                  value="egg"
                  checked={foodType === "egg"}
                  onChange={() => setFoodType("egg")}
                  style={{ display: "none" }}
                />
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #d97706", padding: "2px", borderRadius: "3px" }}>
                  <span style={{ display: "block", width: "6px", height: "6px", background: "#d97706", borderRadius: "50%" }}></span>
                </span>
                <span>Contains Egg</span>
              </label>
            </div>
          </div>

          {/* Price & Category in 2 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155" }}>
                Price (₹) for this Canteen:
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 40"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155" }}>
                Category:
              </label>
              <input
                type="text"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Hot Snacks, Beverages"
                required
              />
            </div>
          </div>

          {/* Photo Management */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155", margin: 0 }}>
                Photo (URL or Device Upload):
              </label>
              <button
                type="button"
                className="btn-link-clear"
                onClick={() => {
                  setImage("/images/samosa.jpg");
                  setImageLoadError(false);
                }}
                style={{ fontSize: "0.75rem", background: "none", border: "none", color: "#64748b", cursor: "pointer", textDecoration: "underline" }}
              >
                Reset Default Photo
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                className="form-input"
                value={image}
                onChange={(e) => {
                  setImage(e.target.value);
                  setImageLoadError(false);
                }}
                placeholder="Paste image link or upload below"
                style={{ flex: 1 }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                <UploadIcon size={14} />
                <span>{isUploadingImage ? "Uploading..." : "Upload"}</span>
              </button>
            </div>

            {/* Photo Preview & Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <img
                src={image}
                alt="Preview"
                onError={() => setImageLoadError(true)}
                style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover", border: "1px solid #cbd5e1" }}
              />
              <div style={{ flex: 1, fontSize: "0.78rem", color: "#64748b" }}>
                {imageLoadError ? (
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>⚠️ Failed to load image URL</span>
                ) : (
                  <span>✓ Photo loaded & preview ready</span>
                )}
              </div>
            </div>

            {/* Quick photo presets */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              <span style={{ fontSize: "0.74rem", color: "#64748b", alignSelf: "center" }}>Presets:</span>
              {PHOTO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setImage(p.url);
                    setImageLoadError(false);
                  }}
                  style={{
                    border: image === p.url ? "1.5px solid #0f172a" : "1px solid #e2e8f0",
                    background: image === p.url ? "#0f172a" : "#ffffff",
                    color: image === p.url ? "#ffffff" : "#334155",
                    fontSize: "0.74rem",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.84rem", color: "#334155" }}>
              Short Description:
            </label>
            <input
              type="text"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Crispy fried hot samosa served with spicy green chutney"
            />
          </div>

          {/* In-Stock Toggle */}
          <div style={{ background: isAvailable ? "#f0fdf4" : "#fef2f2", padding: "10px 14px", borderRadius: "10px", border: isAvailable ? "1px solid #bbf7d0" : "1px solid #fecaca", marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                style={{ width: "16px", height: "16px" }}
              />
              <span style={{ fontWeight: 700, fontSize: "0.86rem", color: isAvailable ? "#166534" : "#991b1b" }}>
                {isAvailable ? "● In Stock (Available for Ordering)" : "○ Sold Out (Blocked from Orders)"}
              </span>
            </label>
          </div>

          {/* Modal Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saving}
              style={{ minWidth: "120px", fontWeight: 700 }}
            >
              {saving ? "Saving Changes..." : "✓ Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
