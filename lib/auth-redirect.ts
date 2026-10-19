const LOCAL_ORIGIN = "https://mindbridge.invalid";

export function getSafeReturnPath(
  value?: string | string[],
  origin = LOCAL_ORIGIN,
): string {
  if (typeof value !== "string") return "/";
  try {
    const target = new URL(value, origin);
    if (
      target.origin !== new URL(origin).origin ||
      target.pathname === "/auth" ||
      target.pathname.startsWith("/auth/")
    )
      return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export function getSignInPath(returnTo: string): string {
  const search = new URLSearchParams({
    redirect_url: getSafeReturnPath(returnTo),
  });
  return `/auth/login?${search}`;
}
