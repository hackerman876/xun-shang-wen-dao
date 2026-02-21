import { describe, it, expect } from "vitest";

describe("QwenMax API Key validation", () => {
  it("should have QWEN_API_KEY set", () => {
    const key = process.env.QWEN_API_KEY;
    expect(key).toBeDefined();
    expect(key?.length).toBeGreaterThan(10);
    expect(key?.startsWith("sk-")).toBe(true);
  });

  it("should call QwenMax API successfully", async () => {
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      console.log("QWEN_API_KEY not set, skipping API call test");
      return;
    }

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-max",
          messages: [{ role: "user", content: "你好，请回复'ok'" }],
          max_tokens: 50,
        }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    expect(data.choices).toBeDefined();
    expect(data.choices?.[0]?.message?.content).toBeTruthy();
    console.log("✅ QwenMax API 验证成功:", data.choices?.[0]?.message?.content);
  }, 30000);
});
