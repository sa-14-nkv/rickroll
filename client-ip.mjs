import { isIP } from "node:net";

export function getClientIp(request, isVercel = process.env.VERCEL === "1") {
  if (isVercel) {
    const forwardedFor = request.get("x-forwarded-for");
    if (typeof forwardedFor !== "string") {
      return null;
    }

    return forwardedFor
      .split(",")
      .map((address) => address.trim())
      .find((address) => isIP(address) !== 0) || null;
  }

  return typeof request.ip === "string" && isIP(request.ip) !== 0
    ? request.ip
    : null;
}
