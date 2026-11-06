export type PageView = "suggested" | "list" | "map" | "compare" | "updates";

export type Route =
  | { view: "home" }
  | { view: "paper"; id: string }
  | { view: PageView };

const pages: PageView[] = ["suggested", "list", "map", "compare", "updates"];

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, ...rest] = path.split("/");
  if (head === "paper") {
    const raw = rest.join("/");
    if (!raw) return { view: "home" };
    try {
      return { view: "paper", id: decodeURIComponent(raw) };
    } catch {
      return { view: "home" };
    }
  }
  if ((pages as string[]).includes(head)) return { view: head as PageView };
  return { view: "home" };
}

export function routeToHash(route: Route): string {
  if (route.view === "home") return "#/";
  if (route.view === "paper") return `#/paper/${encodeURIComponent(route.id)}`;
  return `#/${route.view}`;
}
