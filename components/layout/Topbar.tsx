import Image from "next/image";
import { SignInButton, Show, UserButton } from "@clerk/nextjs";

const Topbar = () => {
  return (
    <header className="fixed top-0 z-50 w-full bg-white dark:bg-black">
      <div className="mx-auto grid h-14 max-w-full grid-cols-3 items-center px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/images/pulse-logo-new.png"
            alt="Pulse logo"
            width={40}
            height={40}
            className="h-12 w-12 invert dark:invert-0 hover:scale-110 transition-all duration-400 cursor-pointer"
            priority
          />
        </div>
        <div className="text-center text-sm font-semibold text-zinc-900 dark:text-white/90">
          Home
        </div>
        <div className="flex items-center justify-end gap-3">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-600 transition-all duration-200 cursor-pointer hover:bg-zinc-100 active:scale-[0.98] dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:text-zinc-300 dark:hover:bg-zinc-900">
                Log in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
