import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportQuery } from "@/graphql/queries";

export function ReportPage() {
  const { data, loading, error } = useReportQuery();

  const maxGenreCount = Math.max(1, ...(data?.report.byGenre.map((row) => row.totalBooksPurchased) ?? [1]));

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Reporting</h1>

      {error && <p className="text-destructive text-sm">Failed to load report: {error.message}</p>}

      {loading && !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        data && (
          <div className="flex flex-col gap-4">
            <Card className="max-w-xs">
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total books purchased
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{data.report.totalBooksPurchased}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By genre</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {data.report.byGenre.map((row) => (
                  <div key={row.genre.id} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate">{row.genre.name}</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(row.totalBooksPurchased / maxGenreCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-10 text-right">{row.totalBooksPurchased}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
