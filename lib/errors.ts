export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InsufficientStockError extends AppError {
  constructor() {
    super("Not enough stock available for this reservation.", 409);
  }
}

export class ReservationExpiredError extends AppError {
  constructor() {
    super("This reservation has expired and can no longer be confirmed.", 410);
  }
}

export class ReservationNotFoundError extends AppError {
  constructor() {
    super("Reservation not found.", 404);
  }
}

export class ReservationInvalidStateError extends AppError {
  constructor(msg: string) {
    super(msg, 422);
  }
}

export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.statusCode });
  }
  console.error("Unexpected error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
