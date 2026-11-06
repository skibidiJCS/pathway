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
  Search,
  Settings,
  Sun,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SavedPaper } from "../../lib/research-types";
import type { PathwayAccount } from "../services/firebase-client";
import type { LibraryView, SyncState, Theme, View } from "./app-types";
import { Wordmark } from "./Wordmark";

interface SidebarProps {
  view: View;
  activeFolder: string;
  collection: SavedPaper[];
  updatesCount: number;
  suggestedCount: number;
  account: PathwayAccount | null;
  syncState: SyncState;
  signInButton: ReactNode;
  theme: Theme;
  compact: boolean;
  open: boolean;
  onHome: () => void;
  onFind: () => void;
  onExplore: () => void;
  onOpen: (view: LibraryView) => void;
  onFolder: (folder: string) => void;
  onSignOut: () => void;
  onChooseTheme: (theme: Theme) => void;
  onClose: () => void;
}

const libraryLinks: Array<{
  view: LibraryView;
  label: string;
  icon: LucideIcon;
}> = [
  { view: "suggested", label: "Suggested", icon: Waypoints },
  { view: "library", label: "Reading list", icon: Bookmark },
  { view: "map", label: "Map", icon: Network },
  { view: "compare", label: "Compare two", icon: GitCompareArrows },
  { view: "updates", label: "New citing papers", icon: RefreshCw },
];

const shortcuts: Array<[string, string]> = [
  ["Search", "/"],
  ["Move through a list", "↑ ↓"],
  ["Save", "S"],
  ["Skip", "X"],
  ["Follow", "F"],
];

function syncText(syncState: SyncState): string {
  if (syncState === "loading") return "Loading your list…";
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
      <Icon className="nav-icon" size={18} strokeWidth={1.75} aria-hidden />
      <span className="nav-label">{label}</span>
      {meta ? <span className="nav-meta">{meta}</span> : null}
    </button>
  );
}

function SettingsMenu({
  account,
  syncState,
  signInButton,
  theme,
  onChooseTheme,
  onSignOut,
  onClose,
}: {
  account: PathwayAccount | null;
  syncState: SyncState;
  signInButton: ReactNode;
  theme: Theme;
  onChooseTheme: (theme: Theme) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(".settings-button")) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="settings-menu" ref={menuRef} role="dialog" aria-label="Settings">
      <div className="settings-section">
        <span className="settings-label">Account</span>
        {account ? (
          <>
            <div className="settings-account">
              <strong>{account.name}</strong>
              <span className={syncState === "error" ? "sync-error" : ""}>
                {syncText(syncState)}
              </span>
            </div>
            <button type="button" className="nav-item" onClick={onSignOut}>
              <LogOut className="nav-icon" size={18} strokeWidth={1.75} aria-hidden />
              <span className="nav-label">Sign out</span>
            </button>
          </>
        ) : (
          signInButton
        )}
      </div>

      <div className="settings-section">
        <span className="settings-label">Theme</span>
        <div className="theme-switch">
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={() => onChooseTheme("light")}
          >
            <Sun size={16} strokeWidth={1.75} aria-hidden />
            Light
          </button>
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={() => onChooseTheme("dark")}
          >
            <Moon size={16} strokeWidth={1.75} aria-hidden />
            Dark
          </button>
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-label">Keyboard</span>
        <ul className="shortcut-list">
          {shortcuts.map(([label, key]) => (
            <li key={label}>
              {label}
              <kbd className="keycap">{key}</kbd>
            </li>
          ))}
        </ul>
      </div>

      <div className="settings-section">
        <a
          className="nav-item"
          href="https://openalex.org"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="nav-icon" size={18} strokeWidth={1.75} aria-hidden />
          <span className="nav-label">Data from OpenAlex</span>
        </a>
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  activeFolder,
  collection,
  updatesCount,
  suggestedCount,
  account,
  syncState,
  signInButton,
  theme,
  compact,
  open,
  onHome,
  onFind,
  onExplore,
  onOpen,
  onFolder,
  onSignOut,
  onChooseTheme,
  onClose,
}: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  useEffect(() => {
    if (hidden) setSettingsOpen(false);
  }, [hidden]);

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
              <X size={18} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>

        <nav className="sidebar-scroll" aria-label="Main">
          <button type="button" className="find-trigger" onClick={onFind}>
            <Search size={18} strokeWidth={1.75} aria-hidden />
            <span>Find a paper</span>
            <kbd className="keycap">/</kbd>
          </button>

          <div className="nav-group">
            <NavItem
              icon={Compass}
              label="Explore"
              active={view === "explore"}
              onClick={onExplore}
            />
            {libraryLinks.map((link) => (
              <NavItem
                key={link.view}
                icon={link.icon}
                label={link.label}
                meta={
                  link.view === "library"
                    ? String(collection.length)
                    : link.view === "suggested" && suggestedCount > 0
                      ? String(suggestedCount)
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
          {settingsOpen ? (
            <SettingsMenu
              account={account}
              syncState={syncState}
              signInButton={signInButton}
              theme={theme}
              onChooseTheme={onChooseTheme}
              onSignOut={() => {
                setSettingsOpen(false);
                onSignOut();
              }}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}
          <button
            type="button"
            className={`nav-item settings-button${settingsOpen ? " active" : ""}`}
            onClick={() => setSettingsOpen((value) => !value)}
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
          >
            <Settings className="nav-icon" size={18} strokeWidth={1.75} aria-hidden />
            <span className="nav-label">Settings</span>
            {account ? <span className="nav-meta">{account.name.split(" ")[0]}</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
