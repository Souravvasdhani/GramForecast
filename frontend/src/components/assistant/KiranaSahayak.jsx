import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Loader2, Send, X } from "lucide-react";
import { sendAssistantMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const STARTERS = [
  "Is hafte kya order karu?",
  "Kaunsa product sabse zyada bikega?",
  "Kya kam stock mein hai?",
];

export default function KiranaSahayak() {
  const { isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (!isAuthenticated) return null;

  const submit = async (text = draft) => {
    const message = text.trim();
    if (!message || sending) return;
    setDraft("");
    setError("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    setSending(true);
    try {
      const response = await sendAssistantMessage(message, language);
      setMessages((current) => [...current, { role: "assistant", text: response.reply }]);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Assistant is unavailable right now.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section className="flex h-[min(600px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-green-100 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Bot className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-bold">Kirana Sahayak</h2>
                <p className="text-[11px] text-green-100">Your shop assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLanguage((current) => current === "en" ? "hi" : current === "hi" ? "mr" : "en")}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-green-50 hover:bg-white/10"
                aria-label="Change assistant language"
              >{language === "en" ? "हिंदी" : language === "hi" ? "मराठी" : "EN"}</button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close assistant">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-green-50/40 p-3">
            {messages.length === 0 && (
              <div className="rounded-xl border border-green-100 bg-white p-3 text-sm text-gray-600">
                {t("Ask me about stock, demand, or what to order this week.")}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "rounded-br-sm bg-brand-mid text-white" : "rounded-bl-sm border border-gray-100 bg-white text-gray-700 shadow-sm"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {t("Checking your shop data...")}</div>}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div ref={endRef} />
          </div>

          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-gray-100 px-3 py-2">
              {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => submit(starter)} className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100">{starter}</button>)}
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("Ask Kirana Sahayak...")} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-mid focus:ring-2 focus:ring-green-100" aria-label="Message Kirana Sahayak" />
            <button type="submit" disabled={!draft.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mid text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-mid text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-dark" aria-label={isOpen ? "Close Kirana Sahayak" : "Open Kirana Sahayak"}>
        {isOpen ? <ChevronDown className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}