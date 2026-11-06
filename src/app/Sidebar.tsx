import {
  Bookmark,
  Compass,
  ExternalLink,
  Folder,
  GitCompareArrows,
  Layers,
  LogOut,
  Moon,
  Network,
  RefreshCw,
  Rows3,
  Sun,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { Paper, SavedPaper } from "../../lib/research-types";
import type { PathwayAccount } from "../services/firebase-client";
import type { ReviewSection, SyncState, Theme, View } from "./app-types";
import { Wordmark } from "./Wordmark";

interface SidebarProps {
  view: View;
  activeSection: ReviewSection | null;
  activeFolder: string;
  collection: SavedPaper[];
  updatesCount: number;
  history: Paper[];
  currentPaperId: string | null;
  account: PathwayAccount | null;
  syncState: SyncState;
  theme: Theme;
  compact: boolean;
  open: boolean;
  onHome: () => void;
  onExplore: () => void;
  onSaved: () => void;
  onSection: (section: ReviewSection) => void;
  onFolder: (folder: string) => void;
  onTrailSelect: (paper: Paper) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  onClose: () => void;
}

const toolLinks: Array<{
  section: ReviewSection;
  label: string;
  icon: LucideIcon;
}> = [
  { section: "map", label: "Paper map", icon: Network },
  { section: "compare", label: "Compare two papers", icon: GitCompareArrows },
  { section: "bridges", label: "Bridge papers", icon: Waypoints },
  { section: "overlap", label: "Reference overlap", icon: Layers },
  { section: "coverage", label: "Coverage", icon: Rows3 },
  { section: "updates", label: "New citing papers", icon: RefreshCw },
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
  activeSection,
  activeFolder,
  collection,
  updatesCount,
  history,
  currentPaperId,
  account,
  syncState,
  theme,
  compact,
  open,
  onHome,
  onExplore,
  onSaved,
  onSection,
  onFolder,
  onTrailSelect,
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
  // History is stored newest first; a path reads from where you started.
  const trail = useMemo(() => [...history].reverse(), [history]);
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
            title="Start a new search"
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
          <div className="nav-group">
            <NavItem
              icon={Compass}
              label="Explore"
              active={view === "explore"}
              onClick={onExplore}
            />
            <NavItem
              icon={Bookmark}
              label="Saved"
              meta={String(collection.length)}
              active={view === "review" && !activeSection && !activeFolder}
              onClick={onSaved}
            />
          </div>

          <div className="nav-group">
            <h2 className="nav-heading">Collection tools</h2>
            {toolLinks.map((link) => (
              <NavItem
                key={link.section}
                icon={link.icon}
                label={link.label}
                meta={
                  link.section === "updates" && updatesCount > 0
                    ? String(updatesCount)
                    : undefined
                }
                active={view === "review" && activeSection === link.section}
                onClick={() => onSection(link.section)}
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
                  active={view === "review" && activeFolder === folder}
                  onClick={() => onFolder(folder)}
                />
              ))}
            </div>
          ) : null}

          <div className="nav-group trail-group">
            <h2 className="nav-heading">Your pathway</h2>
            {trail.length === 0 ? (
              <p className="trail-empty">
                Papers you open appear here in order
              </p>
            ) : (
              <ol className="trail" aria-label="Papers explored, oldest first">
                {trail.map((paper) => {
                  const current = paper.id === currentPaperId;
                  return (
                    <li
                      key={paper.id}
                      className={`trail-stop${current ? " current" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => onTrailSelect(paper)}
                        aria-current={current ? "step" : undefined}
                        title={paper.title}
                      >
                        <span className="trail-node" aria-hidden />
                        <span className="trail-text">
                          <span className="trail-title">{paper.title}</span>
                          <span className="trail-meta tabular">
                            {paper.year ?? "Year unknown"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
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
            className="nav-item source-link"
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
