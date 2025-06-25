// 导入Cloudflare Workers类型
import { handleChatRequest } from "./routes/chat.route";

export interface Env {
  // 如果需要，可以在这里定义环境变量
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 路由分发
    if (url.pathname === "/" || url.pathname === "/chat") {
      return await handleChatRequest(request);
    }
    
    // 404 处理
    return new Response(
      JSON.stringify({ error: "Not Found" }),
      { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
};