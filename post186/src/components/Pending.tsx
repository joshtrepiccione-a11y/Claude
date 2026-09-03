/** Shown on the public preview where a verified fact has not been supplied yet. */
export function Pending({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <p>{children}</p>
    </div>
  );
}
