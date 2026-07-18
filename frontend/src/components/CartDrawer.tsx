import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { CheckoutItemInput, Format } from "@bookie/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/context/UserContext";
import { useCart } from "@/context/CartContext";
import { useCheckoutMutation } from "@/graphql/mutations";

const FORMAT_LABELS: Record<Format, string> = {
  HARDCOVER: "Hardcover",
  SOFTCOVER: "Softcover",
  AUDIOBOOK: "Audiobook",
  EREADER: "E-reader",
};

export function CartDrawer() {
  const { userId } = useCurrentUser();
  const { items, itemCount, total, updateQuantity, removeItem, clear } = useCart();
  const [checkout, { loading }] = useCheckoutMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleCheckout() {
    if (!userId || items.length === 0) return;
    setMessage(null);
    const checkoutItems: CheckoutItemInput[] = items.map((item) => ({
      bookId: item.bookId,
      format: item.format,
      quantity: item.quantity,
    }));
    try {
      await checkout({ variables: { userId, items: checkoutItems } });
      clear();
      setMessage("Order placed! Check the Orders tab for your history.");
    } catch {
      setMessage("Checkout failed — please try again.");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMessage(null);
      }}
    >
      <SheetTrigger render={<Button variant="outline" className="relative" />}>
        <ShoppingCart className="size-4" />
        Cart
        {itemCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 justify-center rounded-full px-1">
            {itemCount}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {userId ? "Review your items before checking out." : "Select a user to start a cart."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          {items.length === 0 && <p className="text-muted-foreground text-sm">Your cart is empty.</p>}
          {items.map((item) => (
            <div key={`${item.bookId}:${item.format}`} className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">
                  {FORMAT_LABELS[item.format]} · ${item.unitPrice.toFixed(2)}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => updateQuantity(item.bookId, item.format, item.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => updateQuantity(item.bookId, item.format, item.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(item.bookId, item.format)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <SheetFooter>
          <Separator />
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {message && <p className="text-muted-foreground text-xs">{message}</p>}
          <Button disabled={!userId || items.length === 0 || loading} onClick={handleCheckout}>
            {loading ? "Placing order…" : "Checkout"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
