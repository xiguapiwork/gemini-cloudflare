# Gemini API 代理服务

这是一个基于 Cloudflare Workers 的 Google Gemini API 代理服务，提供简单的 HTTP 接口来调用 Gemini 模型。

## 项目架构

```
├── main.ts              # 主入口文件，负责请求处理和路由分发
├── routes/
│   └── chat.route.ts    # 聊天路由处理逻辑
├── services/
│   └── ai.service.ts    # AI服务核心逻辑
├── package.json         # 项目依赖配置
├── wrangler.toml        # Cloudflare Workers 配置
├── tsconfig.json        # TypeScript 配置
└── README.md            # 项目文档
```

## 功能特性

- 指定 gemini-2.5-flash-preview-05-20 模型
- 可自定义系统指令
- 内置 CORS 支持
- 错误处理和参数验证
- 模块化架构，便于功能扩展

## API 接口
### POST /


**请求参数：**

```json
{
  "input": "你的问题或内容",
  "apikey": "你的 Gemini API Key",
  "systemInstruction": "可选的系统指令",
  "temperature": 1
}
```

或者使用 messageList 参数（适用于 Coze 等平台）：

```json
{
  "messageList": [{"role": "user", "content": "你的问题"}],
  "apikey": "你的 Gemini API Key",
  "systemInstruction": "可选的系统指令",
  "temperature": 1
}
```

**参数说明：**

- `input` (二选一): 要发送给 AI 的内容，支持两种格式：
  - 字符串：直接的问题或内容
  - 数组：带有历史记录的对话，格式为 `[{"role": "user", "content": "消息内容"}, ...]`
- `messageList` (二选一): 与 input 类似，但专为 Coze 平台设计的参数名
- `apikey` (必需): 你的 Gemini API Key
- `systemInstruction` (可选): 自定义系统指令，默认为中文助手
- `temperature` (可选): 温度参数，控制回答的随机性，范围 0-2，默认为 1
- `intention_setting` (可选): 意图识别设置，包含多个意图字段

**响应格式：**

```json
{
  "success": true,
  "response": "AI 的回答内容"
}
```

如果启用了意图识别，响应会包含额外的意图识别结果字段。

## 部署到 Cloudflare Workers

1. 确保你已安装 Node.js 和 npm

2. 安装 Wrangler CLI
   ```bash
   npm install -g wrangler
   ```

3. 登录到你的 Cloudflare 账户
   ```bash
   wrangler login
   ```

4. 在项目目录中安装依赖
   ```bash
   npm install
   ```

5. 本地开发和测试
   ```bash
   npm run dev
   ```

6. 部署到 Cloudflare Workers
   ```bash
   npm run deploy
   ```

7. 部署完成后，你将获得一个 `*.workers.dev` 域名，可以用于访问你的服务

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 测试示例

部署完成后，你可以使用以下 curl 命令测试：

### 1. 基础字符串输入测试

```bash
curl -X POST https://your-workers-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你好，请介绍一下自己",
    "apikey": "YOUR_GEMINI_API_KEY"
  }'
```

### 2. 带自定义系统指令和温度参数的测试

```bash
curl -X POST https://your-workers-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello, introduce yourself",
    "apikey": "YOUR_GEMINI_API_KEY",
    "systemInstruction": "You are a helpful assistant that responds in English",
    "temperature": 0.7
  }'
```

### 3. 历史对话数组输入测试（使用 input 参数）

```bash
curl -X POST https://your-workers-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      {"role": "user", "content": "我叫小明"},
      {"role": "assistant", "content": "你好小明！很高兴认识你。"},
      {"role": "user", "content": "你还记得我的名字吗？"}
    ],
    "apikey": "YOUR_GEMINI_API_KEY",
    "temperature": 1.2
  }'
```

### 4. 使用 messageList 参数测试（适用于 Coze 平台）

```bash
curl -X POST https://your-workers-url.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "messageList": [
      {"role": "user", "content": "请帮我写一首关于春天的诗"},
      {"role": "assistant", "content": "春风轻拂柳絮飞，花开满园蝶舞归。"},
      {"role": "user", "content": "能再写一句吗？"}
    ],
    "apikey": "YOUR_GEMINI_API_KEY",
    "temperature": 0.9
  }'
```

## 注意事项

- 请妥善保管你的 API Key，不要在客户端代码中暴露
- 建议在生产环境中添加速率限制和身份验证
- 确保你的 Gemini API Key 有足够的配额
- 如果需要使用环境变量存储敏感信息，可以在 Cloudflare Dashboard 中配置
