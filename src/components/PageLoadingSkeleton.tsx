import { Panel } from "@/components/ui";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#e7e2d8] ${className}`} />;
}

export function PageLoadingSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <SkeletonLine className="h-7 w-44" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonLine className="h-10 w-28" />
      </div>
      <Panel>
        <div className="grid gap-3">
          <SkeletonLine className="h-10 w-full" />
          <div className="overflow-hidden rounded-md border border-line">
            <SkeletonLine className="h-10 rounded-none" />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-3 border-t border-line px-3 py-3">
                <SkeletonLine className="h-4" />
                <SkeletonLine className="h-4" />
                <SkeletonLine className="h-4" />
                <SkeletonLine className="h-4" />
                <SkeletonLine className="h-4" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
