import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Public routes — anyone can access
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

export default hasClerkKey
  ? clerkMiddleware(async (auth, request) => {
      const { userId } = await auth();
      const { pathname } = request.nextUrl;

      // If authenticated user visits landing or auth pages → send to /home
      if (userId && (pathname === "/" || pathname.startsWith("/sign-"))) {
        return NextResponse.redirect(new URL("/home", request.url));
      }

      // Protect all non-public routes
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : function passthrough(_request) {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
