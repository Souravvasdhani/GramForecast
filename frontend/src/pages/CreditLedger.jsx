import { useEffect, useState } from "react";
import { BookOpen, Check, IndianRupee, Loader2, Phone, UserRound } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import KpiCard from "../components/ui/KpiCard";
import { createCreditEntry, fetchCreditEntries, markCreditPaid } from "../api/client";
import { useLanguage } from "../context/LanguageContext";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const today = new Date().toISOString().slice(0, 10);

export default function CreditLedger() {
  const { t } = useLanguage();
  const [ledger, setLedger] = useState({ total_outstanding: 0, entries: [] });
  const [form, setForm] = useState({ customer_name: "", phone: "", amount: "", note: "", date: today });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [error, setError] = useState("");

  const loadLedger = () => {
    setLoading(true);
    fetchCreditEntries()
      .then(setLedger)
      .catch(() => setError("Udhaar could not be loaded / उधार लोड नहीं हो सका"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLedger(); }, []);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.customer_name.trim() || Number(form.amount) <= 0) return;
    setSaving(true);
    setError("");
    try {
      await createCreditEntry({
        ...form,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        note: form.note.trim() || null,
        amount: Number(form.amount),
      });
      setForm({ customer_name: "", phone: "", amount: "", note: "", date: today });
      loadLedger();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Udhaar could not be saved / उधार सेव नहीं हो सका");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (entryId) => {
    setPayingId(entryId);
    setError("");
    try {
      await markCreditPaid(entryId);
      loadLedger();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not mark paid / भुगतान दर्ज नहीं हो सका");
    } finally {
      setPayingId("");
    }
  };

  return (
    <AppShell title="Udhaar / Khata" description="Track customer credit simply / ग्राहक का उधार आसानी से ट्रैक करें">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-3 text-amber-700"><BookOpen className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Udhaar / उधार</h1>
          <p className="mt-1 text-sm text-gray-500">Your simple khata ledger / आपका सरल खाता</p>
        </div>
      </div>

      <div className="mb-6 max-w-sm">
        <KpiCard icon={IndianRupee} label="Total Outstanding / कुल बकाया" value={money(ledger.total_outstanding)} iconBg="bg-amber-100" iconColor="text-amber-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div><h2 className="font-bold text-gray-900">People who owe / जिनका उधार है</h2><p className="mt-1 text-xs text-gray-500">{ledger.entries.length} entries / प्रविष्टियां</p></div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading / लोड हो रहा है...</div>
          ) : ledger.entries.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">No udhaar entries yet / अभी कोई उधार प्रविष्टि नहीं</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ledger.entries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-gray-400" /><p className="truncate font-semibold text-gray-900">{entry.customer_name}</p></div>
                    {entry.phone && <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{entry.phone}</p>}
                    {entry.note && <p className="mt-1 truncate text-xs text-gray-500">{entry.note}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">{entry.date}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right"><p className="font-bold tabular-nums text-gray-900">{money(entry.amount)}</p><span className={`text-[10px] font-semibold ${entry.status === "paid" ? "text-green-600" : "text-amber-600"}`}>{entry.status === "paid" ? "Paid / भुगतान" : "Unpaid / बाकी"}</span></div>
                    {entry.status === "unpaid" && <button type="button" onClick={() => markPaid(entry.id)} disabled={payingId === entry.id} className="flex min-h-10 items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-60"><Check className="h-4 w-4" />{payingId === entry.id ? "..." : "Mark paid / भुगतान"}</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Add udhaar / उधार जोड़ें</h2>
          <p className="mt-1 text-xs text-gray-500">Record credit given to a customer / ग्राहक को दिया उधार दर्ज करें</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-gray-600">Customer name / ग्राहक का नाम<input required name="customer_name" value={form.customer_name} onChange={updateField} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" placeholder="e.g. Ramesh Kumar" /></label>
            <label className="block text-xs font-semibold text-gray-600">Phone / फोन <span className="font-normal text-gray-400">(optional)</span><input name="phone" value={form.phone} onChange={updateField} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" inputMode="tel" /></label>
            <label className="block text-xs font-semibold text-gray-600">Amount / राशि<input required name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" placeholder="0" /></label>
            <label className="block text-xs font-semibold text-gray-600">Date / तारीख<input required name="date" type="date" value={form.date} onChange={updateField} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm" /></label>
            <label className="block text-xs font-semibold text-gray-600">Note / टिप्पणी <span className="font-normal text-gray-400">(optional)</span><textarea name="note" value={form.note} onChange={updateField} rows="2" className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm" /></label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={saving || !form.customer_name.trim() || Number(form.amount) <= 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-mid px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Add udhaar / उधार जोड़ें</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
