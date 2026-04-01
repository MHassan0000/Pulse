import Image from "next/image";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

const Topbar = () => {
  return (
    <header className="fixed top-0 z-50 w-full bg-black">
      <div className="mx-auto grid h-14 max-w-full grid-cols-3 items-center px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/images/pulse-logo-new.png"
            alt="Pulse logo"
            width={40}
            height={40}
            className="h-12 w-12"
            priority
          />
        </div>
        <div className="text-center text-sm font-semibold text-white/90">
          Home
        </div>
        <div className="flex items-center justify-end gap-3">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-full border border-[#1f1f1f] bg-[#0a0a0a] px-4 py-2 text-xs text-zinc-300 transition-all duration-200 hover:bg-zinc-900 active:scale-[0.98]">
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
