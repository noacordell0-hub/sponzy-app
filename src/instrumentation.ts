import type { Instrumentation } from "next";

export function register() {
  /* nothing to set up at startup */
}

/** Next.js calls this for every uncaught server error (pages, API routes, server actions). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/log");
  await logError(err, {
    route: `${request.method} ${context.routePath ?? request.path}`,
    digest: (err as { digest?: string }).digest,
    routeType: context.routeType,
  });
};
