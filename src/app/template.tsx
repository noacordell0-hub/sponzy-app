/**
 * Wraps every page and re-mounts on each navigation, so pages fade in instead of snapping.
 * Opacity only (no transform), so fixed backgrounds like the starfield stay put.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
