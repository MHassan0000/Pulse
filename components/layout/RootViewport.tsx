"use client";

type RootViewportProps = {
  children: React.ReactNode;
};

const RootViewport = ({ children }: RootViewportProps) => {
  return (
    <main className="pt-14 md:pl-18">
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-180 min-h-0 flex-col overflow-hidden px-4 pb-6 pt-6 md:px-6">
        {children}
      </div>
    </main>
  );
};

export default RootViewport;
