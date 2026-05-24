"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Reservation = {
  id: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    priceInCents: number;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (status !== "PENDING") return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isExpired = secondsLeft === 0 && status === "PENDING";
  const isUrgent = secondsLeft < 120 && secondsLeft > 0;

  return { secondsLeft, minutes, seconds, isExpired, isUrgent };
}

function StatusBanner({ status }: { status: string }) {
  if (status === "CONFIRMED")
    return (
      <div
        style={{
          background: "#40d4a015",
          border: "1px solid var(--success)",
          borderRadius: 6,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <div
            style={{
              fontWeight: 700,
              color: "var(--success)",
              marginBottom: 2,
            }}
          >
            Reservation Confirmed
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            Payment processed. Your order is placed.
          </div>
        </div>
      </div>
    );

  if (status === "RELEASED")
    return (
      <div
        style={{
          background: "var(--danger-dim)",
          border: "1px solid var(--danger)",
          borderRadius: 6,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 20 }}>✕</span>
        <div>
          <div
            style={{ fontWeight: 700, color: "var(--danger)", marginBottom: 2 }}
          >
            Reservation Released
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            Stock has been returned to inventory.
          </div>
        </div>
      </div>
    );

  return null;
}

export function ReservationClient({
  initialReservation,
}: {
  initialReservation: Reservation;
}) {
  const [reservation, setReservation] = useState(initialReservation);
  const [loading, setLoading] = useState<"confirm" | "release" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { minutes, seconds, isExpired, isUrgent } = useCountdown(
    reservation.expiresAt,
    reservation.status
  );

  const handleConfirm = useCallback(async () => {
    setLoading("confirm");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        setError(
          "⏱ This reservation expired before it could be confirmed. The stock has been released."
        );
        setReservation((r) => ({ ...r, status: "RELEASED" }));
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong confirming the reservation.");
        return;
      }
      setReservation(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const handleRelease = useCallback(async () => {
    setLoading("release");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong releasing the reservation.");
        return;
      }
      setReservation(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const totalPrice = reservation.product.priceInCents * reservation.quantity;
  const isPending = reservation.status === "PENDING";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          STOCKR
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
          }}
        >
          RESERVATION CHECKOUT
        </span>
      </header>

      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "48px 24px",
          animation: "fadeUp 0.4s ease both",
        }}
      >
        {/* Reservation ID */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "var(--text-dim)",
            marginBottom: 4,
          }}
        >
          RESERVATION
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 28,
          }}
        >
          #{reservation.id}
        </div>

        <StatusBanner status={reservation.status} />

        {/* Countdown */}
        {isPending && (
          <div
            style={{
              background: isUrgent
                ? "rgba(255,68,68,0.08)"
                : isExpired
                ? "var(--danger-dim)"
                : "var(--surface)",
              border: `1px solid ${
                isExpired
                  ? "var(--danger)"
                  : isUrgent
                  ? "var(--warning)"
                  : "var(--border)"
              }`,
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: isExpired ? "var(--danger)" : "var(--text-dim)",
                  marginBottom: 4,
                }}
              >
                {isExpired ? "EXPIRED" : "EXPIRES IN"}
              </div>
              {!isExpired && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 36,
                    fontWeight: 500,
                    color: isUrgent ? "var(--warning)" : "var(--text)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                  className={isUrgent ? "animate-ticker" : ""}
                >
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
              )}
              {isExpired && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--danger)",
                  }}
                >
                  This reservation has expired
                </div>
              )}
            </div>
            {!isExpired && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isUrgent ? "var(--warning)" : "var(--success)",
                  boxShadow: `0 0 8px ${isUrgent ? "var(--warning)" : "var(--success)"}`,
                }}
                className={isUrgent ? "animate-ticker" : ""}
              />
            )}
          </div>
        )}

        {/* Product summary */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {reservation.product.imageUrl && (
            <div
              style={{
                height: 140,
                overflow: "hidden",
                background: "var(--surface-2)",
              }}
            >
              <img
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "var(--text-dim)",
                marginBottom: 4,
              }}
            >
              {reservation.product.sku}
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              {reservation.product.name}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                ["Warehouse", reservation.warehouse.name],
                ["Location", reservation.warehouse.location],
                ["Quantity", String(reservation.quantity)],
                [
                  "Unit Price",
                  formatPrice(reservation.product.priceInCents),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--text-dim)",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: 16,
                paddingTop: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-dim)",
                  letterSpacing: "0.1em",
                }}
              >
                TOTAL
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--accent)",
                }}
              >
                {formatPrice(totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "var(--danger-dim)",
              border: "1px solid var(--danger)",
              borderRadius: 4,
              padding: "12px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--danger)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        {isPending && !isExpired && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleRelease}
              disabled={loading !== null}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                color: loading !== null ? "var(--text-dim)" : "var(--text-muted)",
                fontSize: 13,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                cursor: loading !== null ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--danger)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
            >
              {loading === "release" ? "CANCELLING..." : "CANCEL"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading !== null}
              style={{
                flex: 2,
                padding: "14px 0",
                background: loading !== null ? "var(--border)" : "var(--accent)",
                border: "none",
                borderRadius: 4,
                color: "var(--bg)",
                fontSize: 13,
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                cursor: loading !== null ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent)";
              }}
            >
              {loading === "confirm" ? "CONFIRMING..." : "CONFIRM PURCHASE"}
            </button>
          </div>
        )}

        {isPending && isExpired && (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 16,
              }}
            >
              This reservation has expired. Stock has been returned.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "var(--accent)",
                borderRadius: 4,
                color: "var(--bg)",
                fontSize: 13,
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textDecoration: "none",
              }}
            >
              BROWSE PRODUCTS
            </Link>
          </div>
        )}

        {(reservation.status === "CONFIRMED" ||
          reservation.status === "RELEASED") && (
          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              padding: "14px 0",
              background:
                reservation.status === "CONFIRMED"
                  ? "var(--accent)"
                  : "var(--surface)",
              border:
                reservation.status === "RELEASED"
                  ? "1px solid var(--border)"
                  : "none",
              borderRadius: 4,
              color:
                reservation.status === "CONFIRMED"
                  ? "var(--bg)"
                  : "var(--text-muted)",
              fontSize: 13,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            ← BACK TO PRODUCTS
          </Link>
        )}
      </div>
    </main>
  );
}
