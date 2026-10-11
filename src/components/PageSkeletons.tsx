import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-lg border bg-card divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-xs" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompaniesSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-3 w-full max-w-2xl" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <Skeleton className="size-4" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 rounded-lg border bg-card flex flex-col">
            <div className="px-3 py-2.5 border-b flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6" />
            </div>
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="bg-background rounded-md border p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function CallHistorySkeleton() {
  return (
    <div className="p-8 space-y-6 w-full">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-3 w-full max-w-xl" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-8 w-16 rounded-md" />
        <div className="flex gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-6 w-48 flex-1 max-w-xs" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      {/* Month grid */}
      <div className="flex-1 min-h-0 rounded-lg border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-2 py-2 border-r last:border-r-0">
              <Skeleton className="h-3 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {/* Weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b last:border-b-0" style={{ height: "calc((100% - 36px) / 5)" }}>
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="p-2 border-r last:border-r-0 space-y-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                {(week + day) % 3 === 0 && <Skeleton className="h-5 w-full rounded" />}
                {(week + day) % 5 === 0 && <Skeleton className="h-5 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ValuationsSkeleton() {
  return (
    <div className="p-8 space-y-6 w-full">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <Skeleton className="w-full aspect-[4/3]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CallModeSkeleton() {
  return (
    <div className="relative flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
      {/* Progress bar */}
      <div className="shrink-0 h-1 bg-muted">
        <div className="h-full bg-muted-foreground/20 w-1/4 animate-pulse" />
      </div>
      {/* Card */}
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-7 w-48 rounded-md" />
        </div>
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function EmailsSkeleton() {
  return (
    <div className="p-8 space-y-6 w-full">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b pb-0">
        <Skeleton className="h-10 w-24 rounded-none rounded-t-sm" />
        <Skeleton className="h-10 w-28 rounded-none rounded-t-sm" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {/* Search */}
      <Skeleton className="h-9 w-full max-w-sm" />
      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-3 w-full max-w-lg" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-4">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 flex-1 max-w-xs" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteSkeleton({ pathname }: { pathname?: string }) {
  if (pathname?.startsWith("/companies")) return <CompaniesSkeleton />;
  if (pathname?.startsWith("/kanban")) return <KanbanSkeleton />;
  if (pathname?.startsWith("/settings")) return <SettingsSkeleton />;
  if (pathname?.startsWith("/emails")) return <EmailsSkeleton />;
  if (pathname?.startsWith("/call-mode")) return <CallModeSkeleton />;
  if (pathname?.startsWith("/calendar")) return <CalendarSkeleton />;
  if (pathname?.startsWith("/valuations")) return <ValuationsSkeleton />;
  if (pathname?.startsWith("/calls")) return <CallHistorySkeleton />;
  return <DashboardSkeleton />;
}
