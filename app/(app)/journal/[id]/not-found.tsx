export default function JournalNotFound() {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Journal entry not found.</h1>
      <p className="cb-muted">指定されたジャーナルエントリーが見つかりませんでした。</p>
    </div>
  );
}
