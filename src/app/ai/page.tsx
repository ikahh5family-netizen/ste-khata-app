import { PageHeader } from "@/components/ui";
import { AiAssistant } from "@/components/AiAssistant";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default function AiPage() {
  const on = aiEnabled();
  return (
    <div>
      <PageHeader
        title="✨ AI Assistant"
        subtitle="Ask about your business in English, or make entries by typing or speaking"
        action={
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {on ? "GPT AI mode" : "Built-in smart mode"}
          </span>
        }
      />
      <AiAssistant aiMode={on} />
    </div>
  );
}
