/*
  Warnings:

  - You are about to drop the `_BookAuthors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BookGenres` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_BookAuthors" DROP CONSTRAINT "_BookAuthors_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookAuthors" DROP CONSTRAINT "_BookAuthors_B_fkey";

-- DropForeignKey
ALTER TABLE "_BookGenres" DROP CONSTRAINT "_BookGenres_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookGenres" DROP CONSTRAINT "_BookGenres_B_fkey";

-- DropTable
DROP TABLE "_BookAuthors";

-- DropTable
DROP TABLE "_BookGenres";

-- CreateTable
CREATE TABLE "BookAuthor" (
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "BookAuthor_pkey" PRIMARY KEY ("bookId","authorId")
);

-- CreateTable
CREATE TABLE "BookGenre" (
    "bookId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "BookGenre_pkey" PRIMARY KEY ("bookId","genreId")
);

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookAuthor" ADD CONSTRAINT "BookAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookGenre" ADD CONSTRAINT "BookGenre_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookGenre" ADD CONSTRAINT "BookGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
