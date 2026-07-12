const phases = [
  {
    index: "01",
    title: "Before",
    copy: "Review official alerts, old route failures, shelter notes, and non-sensitive preparedness checklists."
  },
  {
    index: "02",
    title: "During",
    copy: "Monitor current public signals without attaching them to historical route advice or evacuation timing."
  },
  {
    index: "03",
    title: "After",
    copy: "Convert what failed into route rules, assistance cards, and source checks that survive the next incident."
  }
];

export function OfflineSection() {
  return (
    <section className="offline-section" id="offline" aria-labelledby="offline-title">
      <div className="offline-copy">
        <p className="signal-label">Before, during, after</p>
        <h2 id="offline-title">The product is not another alert dashboard. It is memory that operates.</h2>
        <p>
          The point is not to predict a perfect minute. Current monitoring stays separate from official-row historical lessons that a household can
          preserve before the same bottleneck repeats.
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
