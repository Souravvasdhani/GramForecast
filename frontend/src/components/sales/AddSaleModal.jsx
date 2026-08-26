import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mic, MicOff, X } from "lucide-react";
import { createSale, fetchProducts } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";

const PRODUCT_ALIASES = {
  kanda: "Onion (Kanda)",
  कांदा: "Onion (Kanda)",
  onion: "Onion (Kanda)",
  chawal: "Rice",
  rice: "Rice",
  "sarson tel": "Mustard Oil",
  "mustard oil": "Mustard Oil",
  aata: "Wheat Flour",
  atta: "Wheat Flour",
  "wheat flour": "Wheat Flour",
  haldi: "Turmeric",
  turmeric: "Turmeric",
  "chana dal": "Gram Dal",
  "gram dal": "Gram Dal",
  cheeni: "Sugar",
  sugar: "Sugar",
};

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, bees: 20, tees: 30, chaalis: 40, pachaas: 50,
  दस: 10, बीस: 20, तीस: 30, चालीस: 40, पचास: 50,
};

const parseSalePhrase = (phrase, products) => {
  const normalized = phrase.toLowerCase().replace(/[,.!?]/g, " ").replace(/\s+/g, " ").trim();
  const product = products.find((item) => {
    const name = item.name.toLowerCase();
    return normalized.includes(name) || Object.entries(PRODUCT_ALIASES).some(([alias, fullName]) => fullName.toLowerCase() === name && normalized.includes(alias));
  });
  const numberMatch = normalized.match(/\b\d+(?:\.\d+)?\b/);
  let quantity = numberMatch ? Number(numberMatch[0]) : null;
  if (quantity === null) {
    const numberWord = Object.keys(NUMBER_WORDS).find((word) => normalized.includes(word));
    quantity = numberWord ? NUMBER_WORDS[numberWord] : null;
  }
  return { product, quantity: quantity > 0 ? quantity : null };
};

export default function AddSaleModal({ isOpen, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    fetchProducts().then((items) => {
      const active = items.filter((item) => item.is_active !== false).slice(0, 6);
      setProducts(active);
      if (!productId && active[0]) {
        setProductId(active[0].id);
        setPrice(active[0].selling_price || "");
      }
    }).catch(() => setError("Products could not be loaded."));
  }, [isOpen]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (!isOpen) return null;

  const selectedProduct = products.find((item) => item.id === productId);
  const selectProduct = (item) => {
    setProductId(item.id);
    setPrice(item.selling_price || "");
  };

  const listen = () => {
    const Recognition = window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice entry needs Chrome on localhost or HTTPS.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setError(""); };
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      const parsed = parseSalePhrase(text, products);
      if (parsed.product) selectProduct(parsed.product);
      if (parsed.quantity) setQuantity(parsed.quantity);
      if (!parsed.product || !parsed.quantity) setError("I heard you, but please confirm product and quantity.");
    };
    recognition.onerror = (event) => {
      if (language === "mr" && event.error === "language-not-supported" && recognition.lang === "mr-IN") {
        recognition.lang = "hi-IN";
        recognition.start();
        return;
      }
      setError("Voice entry did not catch that. Please try again.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedProduct || Number(quantity) <= 0 || Number(price) < 0) return;
    setSaving(true);
    setError("");
    try {
      await createSale({ product_id: selectedProduct.id, quantity: Number(quantity), price_per_unit: Number(price), payment_method: paymentMethod });
      const language = localStorage.getItem("kirana_language") || "en";
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const confirmation = language === "mr"
          ? `${quantity} ${selectedProduct.unit} ${selectedProduct.name} ची विक्री नोंदवली आहे`
          : language === "hi"
          ? `${quantity} ${selectedProduct.unit} ${selectedProduct.name} darj ho gaya`
          : `${quantity} ${selectedProduct.unit} ${selectedProduct.name} sale recorded`;
        const speech = new SpeechSynthesisUtterance(confirmation);
        const supportedMarathi = window.speechSynthesis.getVoices().some((voice) => voice.lang?.toLowerCase().startsWith("mr"));
        speech.lang = language === "mr" && supportedMarathi ? "mr-IN" : language === "mr" || language === "hi" ? "hi-IN" : "en-IN";
        window.speechSynthesis.speak(speech);
      }
      onSuccess?.();
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Sale could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="add-sale-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 id="add-sale-title" className="text-lg font-bold text-gray-900">+ Add Sale / बिक्री जोड़ें</h2><p className="text-xs text-gray-500">Tap a product or speak the sale</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close add sale"><X className="h-5 w-5" /></button>
        </div>
        <button type="button" onClick={listen} className={`mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 px-4 py-4 text-sm font-semibold ${listening ? "border-red-300 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"}`}>
          {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          {listening ? "Listening... बोलिए" : "Tap to speak / बोलकर जोड़ें"}
        </button>
        {transcript && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Heard: <strong>{transcript}</strong></p>}
        <form onSubmit={submit}>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Product</label>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map((item) => <button key={item.id} type="button" onClick={() => selectProduct(item)} className={`min-h-14 rounded-xl border px-2 py-2 text-sm font-semibold ${item.id === productId ? "border-brand-mid bg-green-50 text-green-800 ring-2 ring-green-100" : "border-gray-200 text-gray-700 hover:border-green-300"}`}>{item.name}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-600">Quantity<input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-base" /></label>
            <label className="text-xs font-semibold text-gray-600">Price / {selectedProduct?.unit || "unit"}<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-base" /></label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-gray-600">Payment mode<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"><option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Udhaar</option><option value="barter">Barter</option><option value="other">Other</option></select></label>
          {selectedProduct && <p className="mt-3 flex items-center gap-1 text-xs text-gray-500"><CheckCircle2 className="h-4 w-4 text-green-600" /> {quantity} {selectedProduct.unit} {selectedProduct.name} = ₹{(Number(quantity || 0) * Number(price || 0)).toFixed(0)}</p>}
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !selectedProduct} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-mid px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Sale / बिक्री दर्ज करें</button>
        </form>
      </div>
    </div>
  );
}