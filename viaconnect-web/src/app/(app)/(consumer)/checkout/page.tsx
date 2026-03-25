"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart, Trash2, Minus, Plus, CreditCard, Shield, Truck,
  ArrowLeft, Loader2, Package, Tag,
} from "lucide-react";
import toast from "react-hot-toast";

type CartItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image_url: string | null;
  delivery_form: string | null;
};

type Recommendation = {
  id: string;
  sku: string;
  product_name: string;
  category: string | null;
  monthly_price: number | null;
  dosage: string | null;
  frequency: string | null;
  product_id: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);

  // Load recommendations as suggested cart items
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's recommendations
      const { data: recs } = await supabase
        .from("recommendations")
        .select("id, sku, product_name, category, monthly_price, dosage, frequency, product_id")
        .eq("user_id", user.id)
        .eq("status", "recommended")
        .order("priority_rank");

      if (recs && recs.length > 0) {
        setRecommendations(recs);
        // Auto-populate cart from recommendations
        const cartItems: CartItem[] = recs.map((r) => ({
          id: r.id,
          sku: r.sku,
          name: r.product_name,
          category: r.category || "Supplement",
          price: r.monthly_price || 0,
          quantity: 1,
          image_url: null,
          delivery_form: null,
        }));
        setCart(cartItems);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const updateQuantity = useCallback((sku: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((sku: string) => {
    setCart((prev) => prev.filter((item) => item.sku !== sku));
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 75 ? 0 : 7.95;
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount + shipping;

  const applyPromo = useCallback(() => {
    const code = promoCode.trim().toUpperCase();
    if (code === "WELCOME15") {
      setDiscount(0.15);
      toast.success("15% discount applied!");
    } else if (code === "SAVE10") {
      setDiscount(0.10);
      toast.success("10% discount applied!");
    } else if (code === "SUBSAVE5") {
      setDiscount(0.05);
      toast.success("5% subscription discount applied!");
    } else {
      toast.error("Invalid promo code");
    }
  }, [promoCode]);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            name: item.name,
            price: Math.round(item.price * 100),
            quantity: item.quantity,
          })),
          mode: "payment",
          discount_pct: discount,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Checkout failed");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, discount]);

  const handleSubscribe = useCallback(async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            name: item.name,
            price: Math.round(item.price * 100 * 0.85), // 15% subscribe & save
            quantity: item.quantity,
          })),
          mode: "subscription",
          discount_pct: 0.15,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Subscription setup failed");
      }
    } catch {
      toast.error("Subscription setup failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <ShoppingCart className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">Your Protocol</h1>
        <span className="text-sm text-slate-400">({cart.length} items)</span>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h2 className="text-xl text-white mb-2">Your cart is empty</h2>
          <p className="text-slate-400 mb-6">Complete your assessment to get personalized recommendations</p>
          <button onClick={() => router.push("/supplements")} className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors">
            Browse Supplements
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <div key={item.sku} className="flex items-center gap-4 bg-dark-surface border border-dark-border rounded-xl p-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{item.name}</h3>
                  <p className="text-sm text-slate-400">{item.category}</p>
                  {recommendations.find((r) => r.sku === item.sku)?.dosage && (
                    <p className="text-xs text-cyan-400 mt-1">
                      {recommendations.find((r) => r.sku === item.sku)?.dosage} - {recommendations.find((r) => r.sku === item.sku)?.frequency}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.sku, -1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Minus className="w-4 h-4 text-slate-400" />
                  </button>
                  <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.sku, 1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="text-right w-20">
                  <p className="text-white font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">${item.price.toFixed(2)}/ea</p>
                </div>
                <button onClick={() => removeItem(item.sku)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({Math.round(discount * 100)}%)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-400">FREE</span> : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="border-t border-dark-border pt-3 flex justify-between text-white font-semibold text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mt-4 flex gap-2">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-dark-border rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button onClick={applyPromo} className="px-4 py-2 bg-white/5 border border-dark-border rounded-lg text-sm text-slate-300 hover:bg-white/10 transition-colors">
                  Apply
                </button>
              </div>

              {/* Checkout Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || cart.length === 0}
                  className="w-full py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  {isCheckingOut ? "Processing..." : `Pay $${total.toFixed(2)}`}
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={isCheckingOut || cart.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Subscribe & Save 15% - ${(total * 0.85).toFixed(2)}/mo
                </button>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure</div>
                <div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Free over $75</div>
                <div className="flex items-center gap-1">30-day guarantee</div>
              </div>
            </div>

            {/* Subscribe & Save Info */}
            <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Subscribe & Save</h3>
              <ul className="text-xs text-slate-300 space-y-1.5">
                <li>15% off every order</li>
                <li>Free shipping always</li>
                <li>Cancel or modify anytime</li>
                <li>Earn 2x ViaTokens on subscriptions</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
