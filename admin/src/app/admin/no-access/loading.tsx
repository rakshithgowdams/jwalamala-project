export default function NoAccessLoading() {
  return (
    <section className="utility-panel no-access" aria-busy="true">
      <div className="section-title">
        <h1>Restricted</h1>
      </div>
      <p>Loading…</p>
    </section>
  );
}
