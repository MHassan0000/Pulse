import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const protectedRoutes = createRouteMatcher([
  "/create(.*)",
  "/profile(.*)",
  "/activity(.*)",
  "/communities(.*)",
  "/search(.*)",
  "/thread(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (protectedRoutes(req)) {
    const signUpUrl = new URL("/sign-up", req.url);
    signUpUrl.searchParams.set("redirect_url", req.url);

    auth.protect(undefined, {
      unauthenticatedUrl: signUpUrl.toString(),
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
