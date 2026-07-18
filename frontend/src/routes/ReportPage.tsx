import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/PaginationControls";
import { useRecentOrdersQuery, useReportQuery } from "@/graphql/queries";

const ORDERS_PAGE_SIZE = 10;

export function ReportPage() {
  const { data, loading, error } = useReportQuery();

  const [ordersPage, setOrdersPage] = useState(1);
  const {
    data: ordersData,
    previousData: previousOrdersData,
    loading: ordersLoading,
    error: ordersError,
  } = useRecentOrdersQuery({ page: ordersPage, pageSize: ORDERS_PAGE_SIZE });
  // Same stale-while-refetching pattern as BrowsePage: keep the last page's
  // rows on screen (rather than blanking the card) while the next page loads.
  const recentOrders = ordersData?.recentOrders ?? previousOrdersData?.recentOrders;

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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order history</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {ordersError && (
                  <p className="text-destructive text-sm">Failed to load orders: {ordersError.message}</p>
                )}

                {ordersLoading && !recentOrders ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {recentOrders?.items.map((order) => (
                      <div key={order.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{order.user.name}</p>
                          <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            <span>·</span>
                            {order.items.map((item) => (
                              <Badge key={item.id} variant="secondary" className="font-normal">
                                {item.book.title} × {item.quantity}
                              </Badge>
                            ))}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold">${order.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {recentOrders && recentOrders.items.length === 0 && (
                      <p className="text-muted-foreground text-sm">No orders yet.</p>
                    )}
                  </div>
                )}

                {recentOrders && (
                  <PaginationControls
                    page={recentOrders.page}
                    totalPages={recentOrders.totalPages}
                    onPageChange={setOrdersPage}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
