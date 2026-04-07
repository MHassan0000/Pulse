import UserCard from "@/components/search/UserCard";
import Pagination from "@/components/layout/Pagination";
import { fetchUsers } from "@/lib/actions/user.actions";

type SearchResultsProps = {
  userId: string;
  query?: string;
  pageNumber: number;
};

const SearchResults = async ({
  userId,
  query,
  pageNumber,
}: SearchResultsProps) => {
  const result = await fetchUsers({
    userId,
    searchString: query,
    pageNumber,
    pageSize: 25,
  });

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        {result.users.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-[#1f1f1f] dark:bg-black dark:text-zinc-400">
            No result found.
          </div>
        ) : (
          result.users.map((person) => (
            <UserCard
              key={person.id}
              id={person.id}
              name={person.name}
              username={person.username}
              imgUrl={person.image}
              personType="User"
            />
          ))
        )}
      </div>

      <Pagination path="search" pageNumber={pageNumber} isNext={result.isNext} />
    </>
  );
};

export default SearchResults;
