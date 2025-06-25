// routes/chat.route.ts
import { processAIRequest, AIRequest, AIResponse } from "../services/ai.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handleChatRequest(request: Request): Promise<Response> {
  // 处理OPTIONS请求
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 只处理POST请求
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST method is allowed" }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    // 解析请求体
    const body = await request.json();
    const aiRequest: AIRequest = {
      input: body.input,
      messageList: body.messageList,
      apikey: body.apikey,
      systemInstruction: body.systemInstruction,
      temperature: body.temperature,
      intention_setting: body.intention_setting
    };

    // 调用AI服务
    const aiResponse: AIResponse = await processAIRequest(aiRequest);

    // 根据AI服务响应返回结果
    if (aiResponse.success) {
      return new Response(
        JSON.stringify(aiResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } else {
      return new Response(
        JSON.stringify(aiResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

  } catch (error) {
    console.error("Error handling chat request:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to parse request", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}
