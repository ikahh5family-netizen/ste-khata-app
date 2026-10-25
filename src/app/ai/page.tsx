import { PageHeader } from "@/components/ui";
import { AiAssistant } from "@/components/AiAssistant";
import { aiAvailability } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default function AiPage() {
  const availability = aiAvailability();
  return (
    <div>
      <PageHeader
        title="✨ AI Assistant"
        subtitle="Ask about your shop, or create repair and expense entries by typing or speaking"
        action={
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${availability.mistral ? "bg-orange-100 text-orange-800" : "bg-slate-200 text-slate-600"}`}>
            {availability.mistral ? "Mistral Large 4 ready" : availability.openai ? "OpenAI ready" : "Built-in mode"}
          </span>
        }
      />
      <AiAssistant availability={availability} />
    </div>
  );
}
