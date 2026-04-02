import { Bell, Home, Plus, Search, User } from "lucide-react";

const BottomBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black md:hidden">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-around px-6">
        {[Home, Search, Plus, Bell, User].map((Icon, index) => (
          <button
            key={index}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition-all duration-200 hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomBar;
