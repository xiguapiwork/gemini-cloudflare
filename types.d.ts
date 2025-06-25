// 为Cloudflare Workers环境提供基本类型定义

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// 如果需要，可以在这里添加更多类型定义