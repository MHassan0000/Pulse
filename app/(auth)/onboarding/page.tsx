import { Show, UserButton } from "@clerk/nextjs";

const OnboardingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white [background:radial-gradient(1200px_circle_at_top,#111111_0%,#000000_55%)]">
      <div className="mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-[#1f1f1f] bg-[#0a0a0a]/80 p-8 text-center shadow-[0_0_60px_rgba(255,255,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Welcome to Pulse
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Your account is ready
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Follow creators, post threads, and build your space.
          </p>
          <div className="mt-6 flex items-center justify-center">
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            Start exploring your personalized feed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
