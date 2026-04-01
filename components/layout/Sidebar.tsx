import { Home, Plus, Search, User } from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Search", icon: Search },
  { label: "Create", icon: Plus },
  { label: "Profile", icon: User },
];

const Sidebar = () => {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-3">
        <nav className="grid gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-200 transition-all duration-200 hover:bg-zinc-900 ${
                item.active ? "bg-zinc-900/60" : ""
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </button>
          ))}
        </nav>
      </div>
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Quick tips
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          Keep threads short. Add visuals when it matters. Stay authentic.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
