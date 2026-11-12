/**
 * Instant placeholder shown while a page loads: the same header shape plus shimmering blocks,
 * so the screen never looks frozen. Variants roughly match the page that's coming.
 */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "grid" | "profile" | "split" | "form" }) {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="sticky top-0 z-20 h-16 border-b border-black/[.06] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-8">
          <div className="sk size-7 rounded-lg" />
          <div className="sk h-4 w-20 rounded-md" />
          <div className="hidden gap-6 md:flex">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sk h-3.5 w-16 rounded-md" />
            ))}
          </div>
          <div className="flex-1" />
          <div className="sk size-9 rounded-xl" />
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-8 md:pt-10">
        <div className="sk mb-2 h-8 w-56 rounded-lg" />
        <div className="sk mb-8 h-4 w-80 max-w-full rounded-md" />
        {variant === "grid" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="sk hidden h-[520px] rounded-2xl lg:block" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="panel overflow-hidden">
                  <div className="sk h-16 rounded-none" />
                  <div className="flex flex-col gap-3 p-5">
                    <div className="sk size-14 rounded-2xl" />
                    <div className="sk h-4 w-32 rounded-md" />
                    <div className="sk h-3 w-full rounded-md" />
                    <div className="sk h-3 w-2/3 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {variant === "profile" && (
          <>
            <div className="panel overflow-hidden">
              <div className="sk h-36 rounded-none" />
              <div className="flex items-end gap-4 px-8 pb-6">
                <div className="sk -mt-12 size-[104px] rounded-[26px] border-[5px] border-white" />
                <div className="flex flex-1 flex-col gap-2 pb-2">
                  <div className="sk h-6 w-48 rounded-md" />
                  <div className="sk h-3.5 w-32 rounded-md" />
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
              <div className="sk h-64 rounded-2xl" />
              <div className="flex flex-col gap-4">
                <div className="sk h-36 rounded-2xl" />
                <div className="sk h-36 rounded-2xl" />
              </div>
            </div>
          </>
        )}
        {variant === "split" && <div className="sk h-[calc(100vh-14rem)] min-h-[480px] rounded-2xl" />}
        {variant === "form" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-6">
              <div className="sk h-64 rounded-2xl" />
              <div className="sk h-48 rounded-2xl" />
            </div>
            <div className="sk h-72 rounded-2xl" />
          </div>
        )}
        {variant === "list" && (
          <div className="panel flex flex-col divide-y divide-black/[.05]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-5">
                <div className="sk size-11 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="sk h-4 w-1/3 rounded-md" />
                  <div className="sk h-3 w-1/4 rounded-md" />
                </div>
                <div className="sk h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
