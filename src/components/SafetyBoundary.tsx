type SafetyBoundaryProps = {
  compact?: boolean;
  id?: string;
};

export function SafetyBoundary({ compact = false, id }: SafetyBoundaryProps) {
  return (
    <aside className={compact ? "action-card" : "control-strip"} id={id} aria-label="Emergency guidance boundary" role="note">
      <div>
        <p className="signal-label">Safety boundary</p>
        <strong>Historical replay only. Not current emergency guidance.</strong>
      </div>
      <p>During an active incident, follow current local evacuation orders and public-safety agencies.</p>
    </aside>
  );
}
