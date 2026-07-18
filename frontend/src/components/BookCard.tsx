import { useState } from "react";
import { Star, ShoppingCart } from "lucide-react";
import type { Book, Format } from "@bookie/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/context/UserContext";
import { useCart } from "@/context/CartContext";
import { useSubmitReviewMutation } from "@/graphql/mutations";

const FORMAT_LABELS: Record<Format, string> = {
  HARDCOVER: "Hardcover",
  SOFTCOVER: "Softcover",
  AUDIOBOOK: "Audiobook",
  EREADER: "E-reader",
};

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const { userId } = useCurrentUser();
  const { addItem } = useCart();

  const [format, setFormat] = useState<Format>(book.formats[0]!);
  const [quantity, setQuantity] = useState(1);
  const [addedFlash, setAddedFlash] = useState(false);

  const [submitReview, { loading: reviewLoading }] = useSubmitReviewMutation();
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  function handleAddToCart() {
    addItem({ bookId: book.id, title: book.title, format, unitPrice: book.price }, quantity);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1200);
  }

  async function handleRate(rating: number) {
    if (!userId) return;
    setReviewMessage(null);
    try {
      await submitReview({ variables: { bookId: book.id, userId, rating } });
      setReviewMessage("Thanks for your review!");
    } catch (error) {
      setReviewMessage(
        error instanceof Error && error.message.includes("already reviewed")
          ? "You've already reviewed this book."
          : "Couldn't submit your review.",
      );
    }
  }

  return (
    <Card className="flex flex-col gap-3 py-4">
      <CardHeader className="gap-1">
        <CardTitle className="line-clamp-2 text-base leading-tight">{book.title}</CardTitle>
        <CardDescription>
          {book.authors.map((author) => author.name).join(", ") || "Unknown author"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        <div className="flex flex-wrap gap-1">
          {book.genres.map((genre) => (
            <Badge key={genre.id} variant="secondary">
              {genre.name}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground">{book.publisher.name}</p>
        <div className="flex items-center justify-between">
          <span className="font-semibold">${book.price.toFixed(2)}</span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Star className="size-3.5 fill-current" />
            {book.averageRating ? book.averageRating.toFixed(1) : "—"} ({book.reviewCount})
          </span>
        </div>

        <div className="flex items-center gap-1 pt-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              disabled={!userId || reviewLoading}
              onClick={() => handleRate(rating)}
              title={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Star className="text-muted-foreground hover:text-foreground size-4 transition-colors" />
            </button>
          ))}
          {reviewMessage && <span className="text-muted-foreground ml-1 text-xs">{reviewMessage}</span>}
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-2">
        <Select value={format} onValueChange={(value) => setFormat(value as Format)}>
          <SelectTrigger className="w-[9.5rem]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {book.formats.map((f) => (
              <SelectItem key={f} value={f}>
                {FORMAT_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="w-16"
        />
        <Button
          size="sm"
          disabled={!userId}
          onClick={handleAddToCart}
          className={cn("flex-1", addedFlash && "bg-primary/80")}
        >
          <ShoppingCart className="size-4" />
          {addedFlash ? "Added" : "Add"}
        </Button>
      </CardFooter>
    </Card>
  );
}
