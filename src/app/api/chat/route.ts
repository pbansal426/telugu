import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  scenario?: string;
  targetLanguage?: string;
}

interface ScenarioData {
  greeting: string;
  pills: [string, string, string];
}

const SCENARIO_MAP: Record<string, ScenarioData> = {
  dining: {
    greeting:
      "Nǐ xiǎng chī shénme? Zhèlǐ de càidān hěn fēngfù! (What would you like to eat? The menu here is abundant!)",
    pills: [
      "Wǒ yào zhège. (I want this one.)",
      "Bú yào tài là. (Not too spicy.)",
      "Mǎidān, xièxie. (Check please, thank you.)",
    ],
  },
  banter: {
    greeting:
      "Nǐ chīle ma? Zuìjìn máng shénme ne? (Have you eaten? What have you been up to recently?)",
    pills: [
      "Chīle, nǐ ne? (I've eaten, and you?)",
      "Hái hǎo, bù tài máng. (Not bad, not too busy.)",
      "Zuìjìn tǐng máng de. (Been quite busy lately.)",
    ],
  },
  plans: {
    greeting:
      "Míngtiān wǎnshang yǒu kòng ma? Yìqǐ qù hē bēi kāfēi? (Are you free tomorrow evening? Grab a coffee together?)",
    pills: [
      "Yǒu kòng, jǐ diǎn jiàn? (I'm free, what time meet?)",
      "Míngtiān bùxíng, hòutiān ne? (Tomorrow doesn't work, how about day after?)",
      "Hǎo a, zài nǎlǐ jiàn? (Sounds good, where shall we meet?)",
    ],
  },
  opinions: {
    greeting:
      "Nǐ juéde zhège zěnmeyàng? Xǐhuan ma? (What do you think of this? Do you like it?)",
    pills: [
      "Wǒ juéde hěn hǎo! (I think it's very good!)",
      "Tài bàng le! (That's awesome!)",
      "Hái kěyǐ ba. (It's alright, I guess.)",
    ],
  },
  clarifications: {
    greeting:
      "Tīng de dǒng ma? Xūyào wǒ shuō màn yìdiǎn ma? (Do you understand? Need me to speak slower?)",
    pills: [
      "Máfan zài shuō yí cì. (Please say it once more.)",
      "Qǐng shuō màn yìdiǎn. (Please speak a bit slower.)",
      "Wǒ tīng dǒng le, xièxie! (I understood, thank you!)",
    ],
  },
  partings: {
    greeting:
      "Shíjiān bù zǎo le, nǐ děi zǒule ma? (It's getting late, do you need to go?)",
    pills: [
      "Wǒ xiān zǒule, xiàcì jiàn! (I'll head out first, see you next time!)",
      "Míngtiān jiàn! (See you tomorrow!)",
      "Dàole fā xìnxī! (Text me when you arrive!)",
    ],
  },
  general: {
    greeting:
      "Nǐ hǎo! Hěn gāoxìng hé nǐ liáotiān, jīntiān zěnmeyàng? (Hello! So glad to chat with you, how is today going?)",
    pills: [
      "Wǒ hěn hǎo, nǐ ne? (I'm doing well, and you?)",
      "Jīntiān tǐng máng de. (Today was pretty busy.)",
      "Hěn gāoxìng rènshí nǐ! (Nice to meet you!)",
    ],
  },
};

function resolveScenario(scenario?: string): ScenarioData {
  if (!scenario) return SCENARIO_MAP.general;
  const key = scenario.toLowerCase().trim();
  if (SCENARIO_MAP[key]) return SCENARIO_MAP[key];

  if (key.includes("din") || key.includes("food") || key.includes("eat"))
    return SCENARIO_MAP.dining;
  if (key.includes("plan") || key.includes("time") || key.includes("meet"))
    return SCENARIO_MAP.plans;
  if (key.includes("opinion") || key.includes("think") || key.includes("view"))
    return SCENARIO_MAP.opinions;
  if (key.includes("clarif") || key.includes("slow") || key.includes("repeat"))
    return SCENARIO_MAP.clarifications;
  if (key.includes("part") || key.includes("bye") || key.includes("leave"))
    return SCENARIO_MAP.partings;
  if (key.includes("banter") || key.includes("greet") || key.includes("chat"))
    return SCENARIO_MAP.banter;

  return SCENARIO_MAP.general;
}

function buildGemmaSystemPrompt(scenario?: string): string {
  const scContext = scenario ? ` Current situational scenario: "${scenario}".` : "";

  return `You are Gemma, a warm, natural, colloquial Chinese friend in Beijing/Chengdu having a casual spoken conversation.${scContext}
CRITICAL RULES:
1. SCRIPT: Speak ONLY in Romanized Hanyu Pinyin with tone diacritics (e.g. "Nǐ hǎo!"), immediately followed by an English translation in parentheses (e.g. "(Hello!)"). ZERO Chinese characters (Hanzi) are allowed.
2. PACING: Keep your response friendly, colloquial, and strictly under 25 words per turn. Never lecture or write paragraphs.
3. NEVER-FREEZE SCAFFOLDING PILLS: At the very end of your response, on a new line, provide exactly 3 suggested short Pinyin replies (with English translations) that the user can immediately say next.
Format the pills strictly as:
PILLS: [Pinyin 1 (English)] | [Pinyin 2 (English)] | [Pinyin 3 (English)]

Example response:
Nǐ xiǎng chī shénme? Zhèlǐ de miàn hěn hǎochī! (What would you like to eat? The noodles here are delicious!)
PILLS: [Wǒ yào miàntiáo. (I want noodles.)] | [Bú yào tài là. (Not too spicy.)] | [Yǒu tuījiàn ma? (Any recommendations?)]`;
}

function getFallbackResponse(
  scenario?: string,
  userMessage?: string
): { text: string; pills: [string, string, string] } {
  const sc = resolveScenario(scenario);
  if (!userMessage) {
    return { text: sc.greeting, pills: sc.pills };
  }

  const lower = userMessage.toLowerCase();

  if (
    lower.includes("nǐ hǎo") ||
    lower.includes("ni hao") ||
    lower.includes("hello") ||
    lower.includes("hi")
  ) {
    return {
      text: "Nǐ hǎo a! Hěn gāoxìng jiàndào nǐ. (Hello there! So glad to see you.)",
      pills: sc.pills,
    };
  }

  if (
    scenario === "dining" &&
    (lower.includes("mǎidān") || lower.includes("maidan") || lower.includes("check"))
  ) {
    return {
      text: "Hǎo de, yígòng bāshí kuài, xièxie nǐ! (Okay, total is eighty yuan, thank you!)",
      pills: [
        "Kěyǐ shǎomǎ ma? (Can I scan to pay?)",
        "Gěi nǐ qián. (Here is the money.)",
        "Xièxie, zàijiàn! (Thank you, goodbye!)",
      ],
    };
  }

  if (
    lower.includes("xièxie") ||
    lower.includes("xiexie") ||
    lower.includes("thanks") ||
    lower.includes("thank you")
  ) {
    return {
      text: "Bú kèqi! Hái yǒu shénme wǒ néng bāng nǐ de? (You're welcome! Anything else I can help with?)",
      pills: sc.pills,
    };
  }

  return {
    text: sc.greeting,
    pills: sc.pills,
  };
}

function parseNeverFreezePills(
  text: string,
  scenario?: string
): { cleanContent: string; pills: [string, string, string] } {
  const fallbackPills = resolveScenario(scenario).pills;

  if (!text || typeof text !== "string") {
    return { cleanContent: "", pills: [...fallbackPills] };
  }

  const pillsRegex = /(?:\n|\r\n)?(?:PILLS|SUGGESTIONS|SCAFFOLDING):\s*([\s\S]+)$/i;
  const match = text.match(pillsRegex);

  if (match) {
    const cleanContent = text.replace(pillsRegex, "").trim();
    const rawPillsBlock = match[1].trim();

    let extracted: string[] = [];
    if (rawPillsBlock.includes("|")) {
      extracted = rawPillsBlock.split("|");
    } else {
      extracted = rawPillsBlock.split(/\r?\n/);
    }

    const cleanPills = extracted
      .map((p) =>
        p
          .trim()
          .replace(/^\s*\d+[\.\)]\s*/, "")
          .replace(/^\[\s*/, "")
          .replace(/\s*\]$/, "")
          .trim()
      )
      .filter((p) => p.length > 0);

    if (cleanPills.length >= 3) {
      return {
        cleanContent,
        pills: [cleanPills[0], cleanPills[1], cleanPills[2]],
      };
    }
  }

  const numberedRegex = /(?:^|\n)\s*1[\.\)]\s*([^\n]+)\n\s*2[\.\)]\s*([^\n]+)\n\s*3[\.\)]\s*([^\n]+)/;
  const numMatch = text.match(numberedRegex);
  if (numMatch) {
    const cleanContent = text.replace(numberedRegex, "").trim();
    return {
      cleanContent,
      pills: [numMatch[1].trim(), numMatch[2].trim(), numMatch[3].trim()],
    };
  }

  return {
    cleanContent: text.trim(),
    pills: [...fallbackPills],
  };
}

function createFallbackStream(
  scenario?: string,
  userMessage?: string
): ReadableStream<Uint8Array> {
  const { text, pills } = getFallbackResponse(scenario, userMessage);
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const tokens = text.match(/\S+|\s+/g) || [text];
      for (const token of tokens) {
        const payload = JSON.stringify({
          token,
          text: token,
          content: token,
          choices: [{ delta: { content: token } }],
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      const pillsPayload = JSON.stringify({
        type: "pills",
        pills,
      });
      controller.enqueue(encoder.encode(`data: ${pillsPayload}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function createProxyStream(
  upstreamBody: ReadableStream<Uint8Array>,
  scenario?: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstreamBody.getReader();

  let accumulatedText = "";
  let inPillsSection = false;
  let lineBuffer = "";

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() || "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;

            const dataStr = line.replace(/^data:\s*/, "").trim();
            if (dataStr === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const deltaContent: string =
                parsed.choices?.[0]?.delta?.content ?? "";

              if (deltaContent) {
                accumulatedText += deltaContent;

                if (!inPillsSection) {
                  const pillsMarkerIndex = accumulatedText.search(
                    /(?:\n|\r\n)?(?:PILLS|SUGGESTIONS|SCAFFOLDING):/i
                  );
                  if (pillsMarkerIndex !== -1) {
                    inPillsSection = true;
                  } else {
                    const tokenPayload = JSON.stringify({
                      token: deltaContent,
                      text: deltaContent,
                      content: deltaContent,
                      choices: [{ delta: { content: deltaContent } }],
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${tokenPayload}\n\n`)
                    );
                  }
                }
              }
            } catch {
              // Ignore non-JSON or partial frames
            }
          }
        }

        const { pills } = parseNeverFreezePills(accumulatedText, scenario);
        const pillsPayload = JSON.stringify({
          type: "pills",
          pills,
        });
        controller.enqueue(encoder.encode(`data: ${pillsPayload}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const fallback = resolveScenario(scenario);
        const pillsPayload = JSON.stringify({
          type: "pills",
          pills: fallback.pills,
        });
        controller.enqueue(encoder.encode(`data: ${pillsPayload}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: ChatRequestBody = { messages: [] };
  try {
    body = await req.json();
  } catch {
    body = { messages: [] };
  }

  const { messages = [], scenario, targetLanguage } = body;
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  const lmStudioUrl =
    process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1/chat/completions";
  const timeoutMs = Number(process.env.LM_STUDIO_TIMEOUT_MS || 2500);

  const sseHeaders = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const upstreamResponse = await fetch(lmStudioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LM_STUDIO_MODEL || "gemma-2-27b-it",
        messages: [
          { role: "system", content: buildGemmaSystemPrompt(scenario) },
          ...messages,
        ],
        temperature: 0.7,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (upstreamResponse.ok && upstreamResponse.body) {
      const proxyStream = createProxyStream(upstreamResponse.body, scenario);
      return new Response(proxyStream, {
        status: 200,
        headers: sseHeaders,
      });
    }

    // Non-OK status from LM Studio (e.g. 500, 404) -> graceful fallback
    const fallbackStream = createFallbackStream(scenario, lastUserMessage);
    return new Response(fallbackStream, {
      status: 200,
      headers: sseHeaders,
    });
  } catch {
    // Fetch failed or timed out (LM Studio offline) -> graceful fallback
    const fallbackStream = createFallbackStream(scenario, lastUserMessage);
    return new Response(fallbackStream, {
      status: 200,
      headers: sseHeaders,
    });
  }
}
