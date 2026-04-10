"use client";

import Image from "next/image";
import {
  OrganizationSwitcher,
  SignInButton,
  Show,
  UserButton,
} from "@clerk/nextjs";

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
            <SignInButton mode="modal" forceRedirectUrl="/" fallbackRedirectUrl="/">
              Log in
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="hidden sm:block">
              <OrganizationSwitcher
                afterCreateOrganizationUrl="/communities"
                afterSelectOrganizationUrl="/communities"
                appearance={{
                  elements: {
                    organizationSwitcherTrigger:
                      "h-9 rounded-full border border-zinc-200 bg-white px-3 text-xs dark:border-[#1f1f1f] dark:bg-[#0a0a0a]",
                  },
                }}
              />
            </div>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
