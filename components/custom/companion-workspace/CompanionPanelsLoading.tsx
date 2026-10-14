import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanionPanelsLoading() {
  return (
    <>
      <section
        role="status"
        aria-label="Loading conversation"
        aria-busy="true"
        className="border-border/40 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-white"
      >
        <span className="sr-only">Loading conversation…</span>
        <div
          aria-hidden="true"
          className="border-border/60 flex items-center gap-3 border-b px-6 py-4"
        >
          <Skeleton className="bg-muted size-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="bg-muted h-5 w-32" />
            <Skeleton className="bg-muted h-3 w-44" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="min-h-0 flex-1 space-y-5 overflow-hidden p-6"
        >
          <Skeleton className="bg-muted h-16 w-4/5 rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl bg-[#ffede4]" />
          <Skeleton className="bg-muted h-40 w-4/5 rounded-2xl" />
        </div>
        <div aria-hidden="true" className="shrink-0 p-4">
          <Skeleton className="bg-muted/60 h-28 rounded-2xl" />
        </div>
      </section>
      <section
        role="status"
        aria-label="Loading companion information"
        aria-busy="true"
        className="border-border/40 hidden min-h-0 overflow-hidden rounded-2xl border bg-white xl:block"
      >
        <span className="sr-only">Loading companion information…</span>
        <div
          aria-hidden="true"
          className="border-border/60 flex justify-around border-b p-4"
        >
          <Skeleton className="bg-muted h-4 w-16" />
          <Skeleton className="bg-muted h-4 w-16" />
        </div>
        <div aria-hidden="true" className="space-y-7 p-6">
          <Skeleton className="bg-muted h-5 w-24" />
          <Skeleton className="bg-muted h-16 w-full" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex gap-4">
              <Skeleton className="bg-muted size-5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="bg-muted h-3 w-20" />
                <Skeleton className="bg-muted h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
