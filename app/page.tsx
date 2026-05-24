import { ProductGrid } from "@/components/ProductGrid";
import { prisma } from "@/lib/db";

async function getProducts() {
  const products = await prisma.product.findMany({
    include: {
      stockLevels: { include: { warehouse: true } },
    },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    imageUrl: p.imageUrl,
    priceInCents: p.priceInCents,
    stockByWarehouse: p.stockLevels.map((sl) => ({
      warehouseId: sl.warehouseId,
      warehouseName: sl.warehouse.name,
      warehouseLocation: sl.warehouse.location,
      total: sl.total,
      reserved: sl.reserved,
      available: sl.total - sl.reserved,
    })),
  }));
}

async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: "asc" } });
}

export default async function HomePage() {
  const [products, warehouses] = await Promise.all([
    getProducts(),
    getWarehouses(),
  ]);

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
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--accent)",
            }}
          >
            STOCKR
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
            }}
          >
            INVENTORY SYSTEM
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
          }}
        >
          {products.length} PRODUCTS · {warehouses.length} WAREHOUSES
        </div>
      </header>

      {/* Page title */}
      <div style={{ padding: "48px 32px 32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "var(--text)",
            marginBottom: 12,
          }}
        >
          Available Stock
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Select a warehouse and reserve units. Reservations hold for 15 minutes.
        </p>
      </div>

      <ProductGrid products={products} warehouses={warehouses} />
    </main>
  );
}
