export async function GET() {
  return Response.json({
    region: process.env.VERCEL_REGION || "not set"
  });
}
