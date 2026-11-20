export async function GET() {
  return Response.json({
    status: "ok",
    app: "TrapMasters",
    timestamp: new Date().toISOString(),
  });
}
