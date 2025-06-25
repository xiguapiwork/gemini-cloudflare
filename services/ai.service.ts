// services/ai.service.ts
import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_SYSTEM_INSTRUCTION = "你是一个高效的助理，能分布思考解决用户的问题，你一般都用中文回答内容";

const INTENTION_SYSTEM_INSTRUCTION = `你是一个意图识别助手，你的任务是分析用户输入并识别其与多个意图的关联性。
请根据用户输入，判断它是否与每个意图相关，并以JSON格式输出结果。

你必须严格按照以下JSON格式输出：
{
    "intentions": [
        {
            "intention_name": "意图1名称",
            "condition": true或false,
            "content": "关于该意图的详细内容总结"
        },
        {
            "intention_name": "意图2名称",
            "condition": true或false,
            "content": "关于该意图的详细内容总结"
        },
        // 更多意图...
    ]
}

请注意：
1. 你必须评估用户输入与每个预设意图的关联性
2. 对于每个意图，都需要提供condition和content
3. 如果与某个预设意图不相关，condition设为false，但仍需提供简短的content说明
4. 请确保输出是有效的JSON格式`;

export interface MessageObject {
  role: string;
  content: string;
}

export interface IntentionSetting {
  intention_1?: string;
  intention_2?: string;
  intention_3?: string;
  intention_4?: string;
  intention_5?: string;
  intention_else?: string;
}

export interface IntentionResult {
  intention_name: string;
  condition: boolean;
  content: string;
}

// 允许null值的IntentionResult类型
export type IntentionResultOrNull = IntentionResult | null;

export interface AIRequest {
  input?: string | Array<MessageObject>;
  messageList?: Array<MessageObject>;
  apikey: string;
  systemInstruction?: string;
  temperature?: number;
  intention_setting?: IntentionSetting;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  details?: string;
  intention_1_result?: IntentionResult;
  intention_2_result?: IntentionResult;
  intention_3_result?: IntentionResult;
  intention_4_result?: IntentionResult;
  intention_5_result?: IntentionResult;
  intention_else_result?: IntentionResult;
}

export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
  try {
    // 验证必需参数 - 支持input或messageList
    const inputData = request.input || request.messageList;
    if (!inputData) {
      return {
        success: false,
        error: "Missing required parameter: input or messageList"
      };
    }

    if (!request.apikey) {
      return {
        success: false,
        error: "Missing required parameter: apikey"
      };
    }

    // 验证temperature参数
    const temperature = request.temperature ?? 1; // 默认值为1
    if (temperature < 0 || temperature > 2) {
      return {
        success: false,
        error: "Temperature must be between 0 and 2"
      };
    }

    // 处理input类型判断和转换
    let contents: string | Array<{role: string, parts: Array<{text: string}>}>;
    if (typeof inputData === 'string') {
      // 如果是字符串，直接使用
      contents = inputData;
    } else if (Array.isArray(inputData)) {
      // 如果是数组，验证格式并转换为Gemini API格式
      for (const msg of inputData) {
        if (!msg.role || !msg.content) {
          return {
            success: false,
            error: "Array input must contain objects with 'role' and 'content' properties"
          };
        }
      }
      // 转换为Gemini API格式
      contents = inputData.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role, // Gemini使用'model'而不是'assistant'
        parts: [{ text: msg.content }]
      }));
    } else {
      return {
        success: false,
        error: "Input must be either a string or an array of message objects"
      };
    }

    // 初始化GoogleGenAI
    const ai = new GoogleGenAI({ apiKey: request.apikey });
    
    // 检查是否有意图设置
    if (request.intention_setting) {
      // 处理意图识别
      const intentionSettings: string[] = [];
      
      // 收集有效的意图设置
      for (let i = 1; i <= 5; i++) {
        const key = `intention_${i}` as keyof IntentionSetting;
        const value = request.intention_setting[key];
        if (value && typeof value === 'string') {
          intentionSettings.push(value);
        }
      }
      
      // 添加else意图
      const intentionElse = request.intention_setting.intention_else || "else";
      intentionSettings.push(intentionElse);
      
      // 更新系统提示词，加入意图选项
      let intentionSystemPrompt = INTENTION_SYSTEM_INSTRUCTION;
      intentionSystemPrompt += "\n可选的意图有：\n";
      for (const intention of intentionSettings) {
        intentionSystemPrompt += `- ${intention}\n`;
      }
      
      // 调用Gemini API，使用结构化输出
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-05-20",
        contents: contents,
        config: {
          systemInstruction: intentionSystemPrompt,
          temperature: temperature,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intentions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    intention_name: {
                      type: Type.STRING,
                    },
                    condition: {
                      type: Type.BOOLEAN,
                    },
                    content: {
                      type: Type.STRING,
                    },
                  },
                },
              },
            },
          },
        },
      });
      
      // 解析JSON响应
      try {
        const jsonResponse = JSON.parse(response.text || "");
        const intentionResults: {[key: string]: IntentionResultOrNull} = {};
        
        // 初始化所有意图结果为空
        for (let i = 1; i <= 5; i++) {
          intentionResults[`intention_${i}_result`] = null;
        }
        intentionResults["intention_else_result"] = null;
        
        // 填充意图结果
        if (jsonResponse.intentions && Array.isArray(jsonResponse.intentions)) {
          // 处理自定义意图（最多5个）
          for (let i = 0; i < Math.min(5, intentionSettings.length - 1); i++) {
            const intentionName = intentionSettings[i];
            const resultKey = `intention_${i+1}_result`;
            
            // 查找对应意图的结果
            let intentionFound = false;
            for (const intentionData of jsonResponse.intentions) {
              if (intentionData.intention_name === intentionName) {
                intentionResults[resultKey] = {
                  intention_name: intentionName,
                  condition: intentionData.condition,
                  content: intentionData.content
                };
                intentionFound = true;
                break;
              }
            }
            
            // 如果没有找到对应意图的结果，设置默认值
            if (!intentionFound) {
              intentionResults[resultKey] = {
                intention_name: intentionName,
                condition: false,
                content: `未找到与${intentionName}意图相关的内容`
              };
            }
          }
          
          // 单独处理else意图（始终是最后一个）
          const intentionName = intentionSettings[intentionSettings.length - 1];
          const resultKey = "intention_else_result";
          
          // 查找对应意图的结果
          let intentionFound = false;
          for (const intentionData of jsonResponse.intentions) {
            if (intentionData.intention_name === intentionName) {
              intentionResults[resultKey] = {
                intention_name: intentionName,
                condition: intentionData.condition,
                content: intentionData.content
              };
              intentionFound = true;
              break;
            }
          }
          
          // 如果没有找到对应意图的结果，设置默认值
          if (!intentionFound) {
            intentionResults[resultKey] = {
              intention_name: intentionName,
              condition: false,
              content: `未找到与${intentionName}意图相关的内容`
            };
          }
        }
        
        return {
          success: true,
          response: response.text,
          ...intentionResults
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to parse JSON response",
          details: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      // 使用提供的systemInstruction或默认值
      const finalSystemInstruction = request.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
      
      // 调用Gemini API（普通模式）
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-05-20",
        contents: contents,
        config: {
          systemInstruction: finalSystemInstruction,
          temperature: temperature,
        },
      });
      
      return {
        success: true,
        response: response.text
      };
    }

  } catch (error) {
    console.error("Error processing AI request:", error);
    return {
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

