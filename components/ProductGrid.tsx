"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StockByWarehouse = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  total: number;
  reserved: number;
  available: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  priceInCents: number;
  stockByWarehouse: StockByWarehouse[];
};

type Warehouse = {
  id: string;
  name: string;
  location: string;
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function StockBadge({ available }: { available: number }) {
  if (available === 0)
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--danger)",
          background: "var(--danger-dim)",
          padding: "2px 8px",
          borderRadius: 2,
        }}
      >
        OUT OF STOCK
      </span>
    );
  if (available <= 3)
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--warning)",
          background: "#ffaa0020",
          padding: "2px 8px",
          borderRadius: 2,
        }}
      >
        {available} LEFT
      </span>
    );
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        color: "var(--success)",
        background: "#40d4a020",
        padding: "2px 8px",
        borderRadius: 2,
      }}
    >
      {available} AVAIL
    </span>
  );
}

function ReserveModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableWarehouses = product.stockByWarehouse.filter(
    (s) => s.available > 0
  );

  const selectedStock = product.stockByWarehouse.find(
    (s) => s.warehouseId === selectedWarehouseId
  );

  async function handleReserve() {
    if (!selectedWarehouseId) return;
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = `${product.id}-${selectedWarehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? "Not enough stock. Someone may have just reserved the last units.");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(`/reserve/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 32,
          width: "100%",
          maxWidth: 480,
          animation: "fadeUp 0.2s ease both",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "var(--text-dim)",
            marginBottom: 8,
          }}
        >
          {product.sku}
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          {product.name}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            color: "var(--accent)",
            marginBottom: 24,
          }}
        >
          {formatPrice(product.priceInCents)}
        </div>

        {/* Warehouse selector */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            SELECT WAREHOUSE
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {product.stockByWarehouse.map((s) => (
              <button
                key={s.warehouseId}
                onClick={() =>
                  s.available > 0 && setSelectedWarehouseId(s.warehouseId)
                }
                disabled={s.available === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background:
                    selectedWarehouseId === s.warehouseId
                      ? "var(--accent-dim)"
                      : "var(--surface-2)",
                  border: `1px solid ${
                    selectedWarehouseId === s.warehouseId
                      ? "var(--accent)"
                      : "var(--border)"
                  }`,
                  borderRadius: 4,
                  cursor: s.available === 0 ? "not-allowed" : "pointer",
                  opacity: s.available === 0 ? 0.4 : 1,
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {s.warehouseName}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-dim)",
                    }}
                  >
                    {s.warehouseLocation}
                  </div>
                </div>
                <StockBadge available={s.available} />
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        {selectedStock && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              QUANTITY
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--text)",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 20,
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity(Math.min(selectedStock.available, quantity + 1))
                }
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--text)",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-dim)",
                }}
              >
                max {selectedStock.available}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "var(--danger-dim)",
              border: "1px solid var(--danger)",
              borderRadius: 4,
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--danger)",
              marginBottom: 16,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text-muted)",
              fontSize: 13,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleReserve}
            disabled={!selectedWarehouseId || loading}
            style={{
              flex: 2,
              padding: "12px 0",
              background:
                !selectedWarehouseId || loading
                  ? "var(--border)"
                  : "var(--accent)",
              border: "none",
              borderRadius: 4,
              color: "var(--bg)",
              fontSize: 13,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              cursor:
                !selectedWarehouseId || loading ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              transition: "background 0.15s",
            }}
          >
            {loading ? "RESERVING..." : "RESERVE NOW"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  warehouses,
}: {
  products: Product[];
  warehouses: Warehouse[];
}) {
  const [reservingProduct, setReservingProduct] = useState<Product | null>(
    null
  );

  return (
    <div style={{ padding: "0 32px 64px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {products.map((product, i) => {
          const totalAvailable = product.stockByWarehouse.reduce(
            (sum, s) => sum + s.available,
            0
          );

          return (
            <div
              key={product.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden",
                animation: `fadeUp 0.4s ease ${i * 60}ms both`,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border-2)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)")
              }
            >
              {/* Product image */}
              {product.imageUrl && (
                <div
                  style={{
                    height: 180,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                  }}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: totalAvailable === 0 ? 0.4 : 1,
                    }}
                  />
                </div>
              )}

              <div style={{ padding: 20 }}>
                {/* SKU */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    color: "var(--text-dim)",
                    marginBottom: 6,
                  }}
                >
                  {product.sku}
                </div>

                {/* Name */}
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                    color: "var(--text)",
                  }}
                >
                  {product.name}
                </h3>

                {/* Description */}
                {product.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      marginBottom: 16,
                    }}
                  >
                    {product.description}
                  </p>
                )}

                {/* Stock by warehouse */}
                <div style={{ marginBottom: 16 }}>
                  {product.stockByWarehouse.map((s) => (
                    <div
                      key={s.warehouseId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                        }}
                      >
                        {s.warehouseName}
                      </span>
                      <StockBadge available={s.available} />
                    </div>
                  ))}
                </div>

                {/* Price + CTA */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--accent)",
                    }}
                  >
                    {formatPrice(product.priceInCents)}
                  </span>
                  <button
                    onClick={() =>
                      totalAvailable > 0 && setReservingProduct(product)
                    }
                    disabled={totalAvailable === 0}
                    style={{
                      padding: "8px 16px",
                      background:
                        totalAvailable === 0 ? "transparent" : "var(--accent)",
                      border:
                        totalAvailable === 0
                          ? "1px solid var(--border)"
                          : "none",
                      borderRadius: 4,
                      color:
                        totalAvailable === 0 ? "var(--text-dim)" : "var(--bg)",
                      fontSize: 12,
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      cursor:
                        totalAvailable === 0 ? "not-allowed" : "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (totalAvailable > 0)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--accent-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (totalAvailable > 0)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--accent)";
                    }}
                  >
                    {totalAvailable === 0 ? "SOLD OUT" : "RESERVE"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {reservingProduct && (
        <ReserveModal
          product={reservingProduct}
          onClose={() => setReservingProduct(null)}
        />
      )}
    </div>
  );
}
