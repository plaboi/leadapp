import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
const isPublicApiRoute = createRouteMatcher(["/api/webhooks/(.*)", "/api/worker/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth for public webhook and worker endpoints
  if (isPublicApiRoute(req)) return;
  
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
