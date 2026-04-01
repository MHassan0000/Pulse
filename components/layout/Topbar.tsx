import Image from "next/image";
import { User } from "lucide-react";

const Topbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1f1f1f] bg-black/70 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-[1240px] grid-cols-3 items-center px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/images/pulse-logo-new.png"
            alt="Pulse logo"
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          <span className="text-sm font-semibold tracking-wide text-white">
            Pulse
          </span>
        </div>
        <div className="text-center text-sm font-semibold text-white/90">
          Home
        </div>
        <div className="flex items-center justify-end">
          <button className="flex items-center gap-2 rounded-full border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-1.5 text-xs text-zinc-300 transition-all duration-200 hover:bg-zinc-900 active:scale-[0.98]">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
