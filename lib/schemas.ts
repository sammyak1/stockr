import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const ReservationStatusSchema = z.enum(["PENDING", "CONFIRMED", "RELEASED"]);

export const ReservationSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  status: ReservationStatusSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    priceInCents: z.number(),
    imageUrl: z.string().nullable(),
  }),
  warehouse: z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
  }),
});

export type ReservationResponse = z.infer<typeof ReservationSchema>;
