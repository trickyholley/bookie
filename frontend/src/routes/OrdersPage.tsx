import type { Format } from "@bookie/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/context/UserContext";
import { useOrdersQuery } from "@/graphql/queries";

const FORMAT_LABELS: Record<Format, string> = {
  HARDCOVER: "Hardcover",
  SOFTCOVER: "Softcover",
  AUDIOBOOK: "Audiobook",
  EREADER: "E-reader",
};

export function OrdersPage() {
  const { userId } = useCurrentUser();
  const { data, loading, error } = useOrdersQuery({ userId: userId ?? "" });

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Order History</h1>
        <p className="text-muted-foreground">Select a user above to see their past orders.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Order History</h1>

      {error && <p className="text-destructive text-sm">Failed to load orders: {error.message}</p>}

      {loading && !data && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {data && data.orders.length === 0 && (
        <p className="text-muted-foreground text-sm">No orders yet for this user.</p>
      )}

      <div className="flex flex-col gap-3">
        {data?.orders.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>Order #{order.id.slice(0, 8)}</CardDescription>
              </div>
              <span className="font-semibold">${order.total.toFixed(2)}</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {item.book.title}
                    <Badge variant="secondary">{FORMAT_LABELS[item.format]}</Badge>
                    <span className="text-muted-foreground">×{item.quantity}</span>
                  </span>
                  <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
