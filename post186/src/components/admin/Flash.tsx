export function Flash({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  if (error) {
    return (
      <div className="notice notice-warn" role="alert">
        <p>{error}</p>
      </div>
    );
  }
  if (saved) {
    return (
      <div className="notice notice-success" role="status">
        <p>Saved.</p>
      </div>
    );
  }
  if (deleted) {
    return (
      <div className="notice notice-success" role="status">
        <p>Deleted.</p>
      </div>
    );
  }
  return null;
}
