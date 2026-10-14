import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

async function readSseStream(res: Response): Promise<{
  text: string;
  pills: string[];
  rawLines: string[];
  hasDoneMarker: boolean;
}> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let pills: string[] = [];
  const rawLines: string[] = [];
  let hasDoneMarker = false;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      rawLines.push(line);

      if (line === "data: [DONE]") {
        hasDoneMarker = true;
      } else if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.type === "pills" && Array.isArray(json.pills)) {
            pills = json.pills;
          } else if (json.token) {
            text += json.token;
          }
        } catch {
          // non-JSON frame
        }
      }
    }
  }

  return { text, pills, rawLines, hasDoneMarker };
}

describe("POST /api/chat", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Step 1 test from task brief
  it("returns streaming text or fallback when LM Studio is offline", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Nǐ hǎo!" }],
        scenario: "dining",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });

  it("streams tokens and delivers exactly 3 Never-Freeze scaffolding pills in offline fallback", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:1234"));

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Nǐ hǎo!" }],
        scenario: "dining",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { text, pills, hasDoneMarker } = await readSseStream(res);
    expect(text.length).toBeGreaterThan(0);
    expect(hasDoneMarker).toBe(true);

    // Exactly 3 Never-Freeze scaffolding reply pills
    expect(pills).toHaveLength(3);
    for (const pill of pills) {
      expect(pill.length).toBeGreaterThan(0);
      // Pinyin with English translation in parentheses
      expect(pill).toMatch(/\(.*\)/);
    }
  });

  it("yields scenario-specific fallback content and pills for dining, banter, and plans", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:1234"));

    // 1. Dining
    const reqDining = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Wǒ xiǎng chī fàn." }],
        scenario: "dining",
      }),
    });
    const resDining = await POST(reqDining);
    const dataDining = await readSseStream(resDining);
    expect(dataDining.pills[0]).toContain("Wǒ yào zhège");

    // 2. Banter
    const reqBanter = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Zuìjìn zěnmeyàng?" }],
        scenario: "banter",
      }),
    });
    const resBanter = await POST(reqBanter);
    const dataBanter = await readSseStream(resBanter);
    expect(dataBanter.pills[0]).toContain("Chīle");

    // 3. Plans
    const reqPlans = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Míngtiān jiàn?" }],
        scenario: "plans",
      }),
    });
    const resPlans = await POST(reqPlans);
    const dataPlans = await readSseStream(resPlans);
    expect(dataPlans.pills[0]).toContain("Yǒu kòng");
  });

  it("recognizes user intent in offline fallback (e.g. check/bill in dining)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:1234"));

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Mǎidān, xièxie!" }],
        scenario: "dining",
      }),
    });
    const res = await POST(req);
    const { text, pills } = await readSseStream(res);
    expect(text.toLowerCase()).toContain("bāshí kuài");
    expect(pills[0]).toContain("shǎomǎ");
  });

  it("proxies streaming SSE to LM Studio when online and extracts Never-Freeze pills", async () => {
    const mockEncoder = new TextEncoder();
    const mockChunks = [
      'data: {"choices":[{"delta":{"content":"Nǐ xiǎng chī "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"shénme? (What to eat?)\\n"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"PILLS: [Wǒ yào bāozi. (I want buns.)] | [Bú yào là. (Not spicy.)] | [Mǎidān. (Bill.)]"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    let capturedUrl = "";
    let capturedBody: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of mockChunks) {
            controller.enqueue(mockEncoder.encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Nǐ hǎo!" }],
        scenario: "dining",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify proxy called LM Studio with Gemma 26B conversational system prompt
    expect(capturedUrl).toContain(":1234/v1/chat/completions");
    expect(capturedBody.messages[0].role).toBe("system");
    expect(capturedBody.messages[0].content).toContain("Gemma");
    expect(capturedBody.messages[0].content).toContain("Romanized Hanyu Pinyin");
    expect(capturedBody.messages[0].content).toContain("under 25 words per turn");
    expect(capturedBody.messages[0].content).toContain("NEVER-FREEZE SCAFFOLDING PILLS");

    const { text, pills, hasDoneMarker } = await readSseStream(res);
    expect(text).toContain("Nǐ xiǎng chī shénme?");
    // Verify PILLS: was suppressed from clean speech bubble text
    expect(text).not.toContain("PILLS:");

    // Verify structured parsing produced the 3 pills from the stream
    expect(pills).toHaveLength(3);
    expect(pills[0]).toBe("Wǒ yào bāozi. (I want buns.)");
    expect(pills[1]).toBe("Bú yào là. (Not spicy.)");
    expect(pills[2]).toBe("Mǎidān. (Bill.)");
    expect(hasDoneMarker).toBe(true);
  });

  it("handles LM Studio upstream 500 error gracefully by falling back", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Nǐ hǎo!" }],
        scenario: "opinions",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { text, pills, hasDoneMarker } = await readSseStream(res);
    expect(text.length).toBeGreaterThan(0);
    expect(pills).toHaveLength(3);
    expect(hasDoneMarker).toBe(true);
  });

  it("handles malformed JSON request body without crashing", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:1234"));

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: "invalid-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { text, pills, hasDoneMarker } = await readSseStream(res);
    expect(text.length).toBeGreaterThan(0);
    expect(pills).toHaveLength(3);
    expect(hasDoneMarker).toBe(true);
  });
});
