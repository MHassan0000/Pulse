import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => {
  return (
    <div className="min-h-screen bg-black text-white [background:radial-gradient(1200px_circle_at_top,#111111_0%,#000000_55%)]">
      <div className="mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-[#1f1f1f] bg-[#0a0a0a]/80 p-8 shadow-[0_0_60px_rgba(255,255,255,0.06)]">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Get started
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Join Pulse
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Create your account and post your first thread.
            </p>
          </div>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            redirectUrl="/onboarding"
            afterSignUpUrl="/onboarding"
            forceRedirectUrl="/onboarding"
          />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
