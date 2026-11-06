import type { ReactNode } from "react";

export function PageHeader({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  count?: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>
          {title}
          {count ? <span className="heading-count tabular">{count}</span> : null}
        </h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{children}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
