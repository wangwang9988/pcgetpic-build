function firstNonNegativeInteger(...values: unknown[]): number | null {
  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "boolean" ||
      (typeof value === "string" && value.trim() === "")
    ) {
      continue;
    }

    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function resolveCouponRemainCount(product: unknown): number {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return 0;
  }
  const fields = product as Record<string, unknown>;

  const explicitRemainCount = firstNonNegativeInteger(
    fields.couponRemainCount,
    fields.couponsurplus,
    fields.coupon_surplus,
    fields.couponRemainingCount,
  );
  if (explicitRemainCount !== null) return explicitRemainCount;

  const totalCount = firstNonNegativeInteger(
    fields.couponTotalNum,
    fields.couponTotalCount,
    fields.couponnum,
    fields.coupon_num,
  );
  const receivedCount = firstNonNegativeInteger(
    fields.couponReceiveNum,
    fields.couponReceiveCount,
    fields.couponreceive,
    fields.coupon_receive,
    fields.couponReceive,
  );
  if (totalCount === null || receivedCount === null) return 0;

  return Math.max(0, totalCount - receivedCount);
}
