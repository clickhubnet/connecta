import { authErrorResponse } from "@/lib/api-errors";
import { requireCurrentUser } from "@/lib/auth-context";
import { openConversationStream } from "@/server/realtime/conversation-stream";
import { canAccessPage, navigationItems } from "@/config/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    if (!navigationItems.some(item =>
      ["/conversas", "/envio-em-massa/conversas"].includes(item.href) && canAccessPage(user, item)
    )) throw new Error("FORBIDDEN");
    const stream = await openConversationStream(request.signal);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return authErrorResponse(error) ?? new Response("Conexão temporariamente indisponível.", { status: 503 });
  }
}
