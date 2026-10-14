import React from "react";
import { getChineseStarterPack } from "@/core/content/chinese-pack";
import { ConversationalTutor } from "@/components/tutor/ConversationalTutor";

export const metadata = {
  title: "Mandarin Chinese Conversational Practice Room | Neuro-Acoustic Tutor",
  description:
    "Real-time pitch tracking, tone sandhi scaffolding, and low-latency Gemma 26B conversational AI sparring for spoken Mandarin Chinese.",
};

export default function ChinesePracticePage() {
  const items = getChineseStarterPack();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5]">
      <ConversationalTutor initialItems={items} />
    </div>
  );
}
