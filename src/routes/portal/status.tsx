import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ArrowRight, MonitorSmartphone, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";

export const Route = createFileRoute("/portal/status")({
  head: () => ({
    meta: [
      { title: "حالة التطبيق — EN TEC" },
    ],
  }),
  component: AppStatusPage,
});

function AppStatusPage() {
  const navigate = Route.useNavigate();
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem("portal_auth");
      if (!stored) {
        navigate({ to: "/portal/login" });
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.macAddress || !parsed.deviceKey) {
          throw new Error("Invalid auth data");
        }
        setAuthData(parsed);

        // Silently refresh data to get latest subscription status
        api.post("/portal/login", { macAddress: parsed.macAddress, deviceKey: parsed.deviceKey })
          .then((res) => {
            if (res.status === 200 || res.status === 201) {
              const newAuthData = { macAddress: parsed.macAddress, deviceKey: parsed.deviceKey, data: res.data };
              setAuthData(newAuthData);
              localStorage.setItem("portal_auth", JSON.stringify(newAuthData));
            }
          })
          .catch((err) => {
            if (err.response?.status === 401) {
              localStorage.removeItem("portal_auth");
              navigate({ to: "/portal/login", replace: true });
            }
          });
      } catch {
        localStorage.removeItem("portal_auth");
        navigate({ to: "/portal/login" });
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (authData) {
      api.get("/plans").then(res => {
        setPlans(res.data.plans || []);
      }).catch(err => {
        console.error("Failed to fetch plans", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [authData]);

  const appState = useMemo(() => {
    if (!authData || !authData.data || !authData.data.subscriptions) return { isActive: false, expiry: null };
    
    let isActive = false;
    let maxExpiry: Date | null = null;

    for (const sub of authData.data.subscriptions) {
      if (sub.appActive !== false) {
        if (!sub.appExpiry) {
          // Never expires
          return { isActive: true, expiry: null };
        }
        const exp = new Date(sub.appExpiry);
        if (exp > new Date()) {
          isActive = true;
          if (!maxExpiry || exp > maxExpiry) {
            maxExpiry = exp;
          }
        }
      }
    }

    return { isActive, expiry: maxExpiry };
  }, [authData]);

  if (loading || !authData) return null;

  const device = authData.data?.device;

  const handleSubscribe = () => {
    window.open("https://wa.me/?text=مرحباً، أود الاشتراك في باقة التطبيق", "_blank");
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white">
              <Link to="/portal"><ArrowRight className="w-5 h-5" /></Link>
            </Button>
            <h1 className="font-bold text-lg text-white">حالة التطبيق والاشتراك</h1>
          </div>
          <div className="text-sm font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 shadow-inner" dir="ltr">
            {device?.macAddress}
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        {/* Status Card */}
        <Card className={`p-6 border ${appState.isActive ? 'border-green-500/30 bg-green-950/20' : 'border-red-500/30 bg-red-950/20'} backdrop-blur-sm relative overflow-hidden`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full ${appState.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              <MonitorSmartphone className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                {appState.isActive ? (
                  <><CheckCircle2 className="w-6 h-6 text-green-500" /> التطبيق مفعل</>
                ) : (
                  <><XCircle className="w-6 h-6 text-red-500" /> التطبيق غير مفعل</>
                )}
              </h2>
              {appState.isActive ? (
                <p className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {appState.expiry ? `ينتهي في: ${new Date(appState.expiry).toLocaleDateString('ar-EG')}` : "اشتراك دائم (لا ينتهي)"}
                </p>
              ) : (
                <p className="text-red-400/80">
                  انتهت فترة اشتراكك في التطبيق، يرجى تجديد الاشتراك للاستمرار في المشاهدة.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Pricing Plans */}
        {!appState.isActive && (
          <section className="space-y-6 pt-4">
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-2xl font-bold text-yellow-500">اختر باقتك</h3>
              <p className="text-zinc-400">جدد اشتراكك الآن للعودة للاستمتاع بجميع ميزات التطبيق</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {plans.length > 0 ? plans.map(plan => (
                <Card key={plan._id} className="relative p-6 bg-zinc-900/50 border-white/10 hover:border-yellow-500/50 transition-colors flex flex-col">
                  {plan.isPopular && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                      الأكثر طلباً
                    </div>
                  )}
                  <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-black text-yellow-500">{plan.price}</span>
                    <span className="text-zinc-500 text-sm">/ {plan.duration}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features?.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button onClick={handleSubscribe} className="w-full bg-white text-black hover:bg-zinc-200 font-bold">
                    الاشتراك الآن
                  </Button>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 text-zinc-500 border border-white/5 rounded-xl border-dashed">
                  لا توجد باقات متاحة حالياً. يرجى التواصل مع الدعم الفني.
                </div>
              )}
            </div>
            
            <div className="text-center pt-4">
               <Button onClick={handleSubscribe} variant="outline" className="border-white/10 hover:bg-white/5">
                 تواصل مع الدعم الفني للمساعدة
               </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
