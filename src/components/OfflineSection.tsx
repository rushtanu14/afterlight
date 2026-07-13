const phases = [
  {
    index: "01",
    title: "Assign before fire season",
    copy: "Choose non-sensitive constraints, name a primary and backup role for each task, then print the household practice card."
  },
  {
    index: "02",
    title: "Practice and expose gaps",
    copy: "Rehearse each handoff, record the date even when gaps remain, and resolve unanswered ownership before the next drill."
  },
  {
    index: "03",
    title: "Learn from attributable rows",
    copy: "Confirm only sourced historical lessons, carry them into the drill, and repeat without turning them into current route advice."
  }
];

export function OfflineSection() {
  return (
    <section className="offline-section" id="offline" aria-labelledby="offline-title">
      <div className="offline-copy">
        <p className="signal-label">Repeatable preparedness loop</p>
        <h2 id="offline-title">A practice artifact, not a one-time demo.</h2>
        <p>
          Afterlight is useful when a household leaves with assigned responsibilities, unresolved questions, and a dated card to rehearse again.
          Current monitoring remains separate and never turns this drill into active-incident guidance.
        </p>
      </div>
      <div className="offline-grid">
        {phases.map((phase) => (
          <article key={phase.index}>
            <span className="mini-icon">{phase.index}</span>
            <h3>{phase.title}</h3>
            <p>{phase.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
