import { Home, Plus, Search, User } from "lucide-react";

const navItems = [
  { label: "Home", icon: Home },
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
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-900"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
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
