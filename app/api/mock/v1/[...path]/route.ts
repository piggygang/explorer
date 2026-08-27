import { dispatchMock } from "@/lib/api/mock/dispatch";

// Reading request.url makes this dynamic anyway; say so explicitly.
export const dynamic = "force-dynamic";

/** The in-process mock, exposed over HTTP — same dispatcher, same responses. */
export async function GET(request: Request) {
  return dispatchMock(request);
}
