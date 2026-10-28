const PLACEHOLDER_ROWS = 5;

export function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1">
      <span className="bg-app-fill mb-2 ml-1 h-3 w-16 animate-pulse rounded-full" />
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <div key={index} className="flex min-h-[64px] items-center gap-3.5 px-1 py-2">
          <span className="bg-app-fill size-12 shrink-0 animate-pulse rounded-full" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="bg-app-fill h-2.5 w-20 animate-pulse rounded-full" />
            <span className="bg-app-fill h-3.5 w-36 animate-pulse rounded-full" />
          </span>
          <span className="bg-app-fill h-3.5 w-16 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  );
}
