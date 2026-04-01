import Image from "next/image";
import {
  AlignJustify,
  Heart,
  Home,
  MapPin,
  Plus,
  Search,
  User,
} from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Search", icon: Search },
  { label: "Create", icon: Plus },
  { label: "Activity", icon: Heart },
  { label: "Profile", icon: User },
];

const Sidebar = () => {
  return (
    <div className="flex h-full w-full flex-col items-center py-6">

      <nav className="mt-10 flex flex-1 flex-col items-center justify-center gap-4">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-200 transition-all duration-200 hover:bg-zinc-900 ${item.active ? "bg-zinc-900/60" : ""
              }`}
            aria-label={item.label}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
      <div className="grid gap-3 pb-2">
        <button
          className="flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-900"
          aria-label="Saved"
        >
          <MapPin className="h-5 w-5" />
        </button>
        <button
          className="flex items-center justify-center rounded-2xl px-3 py-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-900"
          aria-label="More"
        >
          <AlignJustify className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
