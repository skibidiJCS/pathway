import type { PathwayAccount } from "../services/firebase-client";
import type { SyncState, Theme, View } from "./app-types";

interface AppHeaderProps {
  view: View;
  collectionSize: number;
  account: PathwayAccount | null;
  syncState: SyncState;
  authBusy: boolean;
  authReady: boolean;
  theme: Theme;
  onHome: () => void;
  onReview: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Account";
}

export function AppHeader({
  view,
  collectionSize,
  account,
  syncState,
  authBusy,
  authReady,
  theme,
  onHome,
  onReview,
  onSignIn,
  onSignOut,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="site-header">
      <button
        className="brand"
        type="button"
        onClick={onHome}
        aria-label="Return to the Pathway homepage"
        title="Return to homepage"
      >
        <img
          className="brand-logo"
          src="/pathway-logo-full.png"
          alt="Pathway Research"
        />
      </button>
      <div className="header-actions">
        <button
          className={`header-text-button${view === "review" ? " active" : ""}`}
          type="button"
          onClick={onReview}
          aria-pressed={view === "review"}
        >
          Saved <span>{collectionSize}</span>
        </button>
        {account ? (
          <details className="account-menu">
            <summary className="header-text-button">
              {firstName(account.name)}
            </summary>
            <div className="account-popover">
              <strong>{account.name}</strong>
              <span>{account.email}</span>
              <span className={`sync-label ${syncState}`}>
                {syncState === "loading"
                  ? "Loading collection…"
                  : syncState === "syncing"
                    ? "Syncing…"
                    : syncState === "error"
                      ? "Sync needs attention"
                      : "Synced with Google"}
              </span>
              <button type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </details>
        ) : (
          <button
            className="header-text-button"
            type="button"
            onClick={onSignIn}
            disabled={authBusy || !authReady}
          >
            {authBusy ? "Signing in…" : "Sign in"}
          </button>
        )}
        <a
          className="source-link"
          href="https://openalex.org"
          target="_blank"
          rel="noreferrer"
        >
          Data by OpenAlex ↗
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          aria-pressed={theme === "dark"}
        >
          <span className="theme-icon moon" aria-hidden="true">
            ☾
          </span>
          <span className="theme-icon sun" aria-hidden="true">
            ☀
          </span>
        </button>
      </div>
    </header>
  );
}
