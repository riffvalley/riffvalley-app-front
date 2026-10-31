export function readAndRemoveResetTokenFragment(
  location: Pick<Location, "hash" | "pathname" | "search">,
  history: Pick<History, "state" | "replaceState">,
  title: string
): string | null {
  const fragment = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const token = new URLSearchParams(fragment).get("token");
  history.replaceState(history.state, title, `${location.pathname}${location.search}`);
  return token?.trim() || null;
}
