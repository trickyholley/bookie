import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenresQuery } from "@/graphql/queries";

const ALL_GENRES = "__all__";

interface GenreFilterProps {
  genreId: string | undefined;
  onChange: (genreId: string | undefined) => void;
}

export function GenreFilter({ genreId, onChange }: GenreFilterProps) {
  const { data } = useGenresQuery();
  const genres = data?.genres ?? [];

  return (
    <Select
      value={genreId ?? ALL_GENRES}
      onValueChange={(value) => onChange(!value || value === ALL_GENRES ? undefined : value)}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All genres" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_GENRES}>All genres</SelectItem>
        {genres.map((genre) => (
          <SelectItem key={genre.id} value={genre.id}>
            {genre.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
