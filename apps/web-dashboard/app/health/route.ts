export function GET() {
  return Response.json(
    { status: "UP", checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
