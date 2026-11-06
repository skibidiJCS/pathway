import {
  Bookmark,
  Compass,
  ExternalLink,
  Folder,
  GitCompareArrows,
  LogOut,
  Moon,
  Network,
  RefreshCw,
  SearchCheck,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { SavedPaper } from "../../lib/research-types";
import type { PathwayAccount } from "../services/firebase-client";
import type { LibraryView, SyncState, Theme, View } from "./app-types";
import { Wordmark } from "./Wordmark";

interface SidebarProps {
  view: View;
  activeFolder: string;
  collection: SavedPaper[];
  updatesCount: number;
  account: PathwayAccount | null;
  syncState: SyncState;
  theme: Theme;
  compact: boolean;
  open: boolean;
  onHome: () => void;
  onExplore: () => void;
  onOpen: (view: LibraryView) => void;
  onFolder: (folder: string) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  onClose: () => void;
}

const libraryLinks: Array<{
  view: LibraryView;
  label: string;
  icon: LucideIcon;
}> = [
  { view: "library", label: "Reading list", icon: Bookmark },
  { view: "gaps", label: "Find gaps", icon: SearchCheck },
  { view: "map", label: "Map", icon: Network },
  { view: "compare", label: "Compare two", icon: GitCompareArrows },
  { view: "updates", label: "New citing papers", icon: RefreshCw },
];

function syncText(syncState: SyncState): string {
  if (syncState === "loading") return "Loading collection…";
  if (syncState === "syncing") return "Syncing…";
  if (syncState === "error") return "Sync needs attention";
  return "Synced with Google";
}

function NavItem({
  icon: Icon,
  label,
  meta,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  meta?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item${active ? " active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="nav-icon" size={16} strokeWidth={1.5} aria-hidden />
      <span className="nav-label">{label}</span>
      {meta ? <span className="nav-meta">{meta}</span> : null}
    </button>
  );
}

export function Sidebar({
  view,
  activeFolder,
  collection,
  updatesCount,
  account,
  syncState,
  theme,
  compact,
  open,
  onHome,
  onExplore,
  onOpen,
  onFolder,
  onSignOut,
  onToggleTheme,
  onClose,
}: SidebarProps) {
  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of collection) {
      if (entry.folder) {
        counts.set(entry.folder, (counts.get(entry.folder) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [collection]);
  const hidden = compact && !open;

  return (
    <>
      {compact ? (
        <button
          type="button"
          className={`sidebar-scrim${open ? " visible" : ""}`}
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={onClose}
        />
      ) : null}
      <aside
        id="app-sidebar"
        className={`sidebar${open ? " open" : ""}`}
        aria-label="Pathway navigation"
        inert={hidden}
      >
        <div className="sidebar-brand-row">
          <button
            className="brand"
            type="button"
            onClick={onHome}
            title="Start a new path"
          >
            <Wordmark />
          </button>
          {compact ? (
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}
        </div>

        <nav className="sidebar-scroll" aria-label="Main">
          <button
            type="button"
            className={`explore-link${view === "explore" ? " active" : ""}`}
            onClick={onExplore}
            aria-current={view === "explore" ? "page" : undefined}
          >
            <Compass size={18} strokeWidth={1.5} aria-hidden />
            Explore papers
          </button>

          <div className="nav-group">
            <h2 className="nav-heading">Your papers</h2>
            {libraryLinks.map((link) => (
              <NavItem
                key={link.view}
                icon={link.icon}
                label={link.label}
                meta={
                  link.view === "library"
                    ? String(collection.length)
                    : link.view === "updates" && updatesCount > 0
                      ? String(updatesCount)
                      : undefined
                }
                active={
                  view === link.view &&
                  !(link.view === "library" && activeFolder)
                }
                onClick={() => onOpen(link.view)}
              />
            ))}
          </div>

          {folders.length > 0 ? (
            <div className="nav-group">
              <h2 className="nav-heading">Folders</h2>
              {folders.map(([folder, count]) => (
                <NavItem
                  key={folder}
                  icon={Folder}
                  label={folder}
                  meta={String(count)}
                  active={view === "library" && activeFolder === folder}
                  onClick={() => onFolder(folder)}
                />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          {account ? (
            <div className="account-block">
              <div className="account-text">
                <span className="account-name">{account.name}</span>
                <span className={`sync-label ${syncState}`}>
                  {syncText(syncState)}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="nav-item"
            onClick={onToggleTheme}
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? (
              <Sun className="nav-icon" size={16} strokeWidth={1.5} aria-hidden />
            ) : (
              <Moon className="nav-icon" size={16} strokeWidth={1.5} aria-hidden />
            )}
            <span className="nav-label">
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </span>
          </button>
          <a
            className="nav-item"
            href="https://openalex.org"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="nav-icon" size={16} strokeWidth={1.5} aria-hidden />
            <span className="nav-label">Data from OpenAlex</span>
          </a>
        </div>
      </aside>
    </>
  );
}
