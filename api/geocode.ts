import { createProductionGeocodeHandler } from "./_lib/geocodeRuntime";

export const maxDuration = 10;

const handle = createProductionGeocodeHandler();

function methodNotAllowed() {
  return new Response(JSON.stringify({
    success: false,
    error: { code: "method_not_allowed", message: "Use POST for location lookup." }
  }), {
    status: 405,
    headers: {
      Allow: "POST",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function POST(request: Request) {
  return handle(request);
}

export function GET() {
  return methodNotAllowed();
}

export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
