import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogIn, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";

export const Route = createFileRoute("/portal/login")({
  head: () => ({
    meta: [
      { title: "بوابة المستخدمين — EN TEC" },
    ],
  }),
  component: PortalLogin,
});

function PortalLogin() {
  const [macAddress, setMacAddress] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = Route.useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macAddress || !deviceKey) {
      toast.error("يرجى إدخال الماك أدرس ورمز الجهاز");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/portal/login", { macAddress, deviceKey });

      if (res.status === 200 || res.status === 201) {
        const data = res.data;
        // Save to localStorage
        localStorage.setItem("portal_auth", JSON.stringify({ macAddress, deviceKey, data }));
        toast.success("تم تسجيل الدخول بنجاح");
        navigate({ to: "/portal" });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "بيانات الدخول غير صحيحة أو حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/30 via-black to-black pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-24 items-center justify-center rounded-[2rem] bg-black shadow-2xl shadow-yellow-500/20 border border-white/10 p-4 relative">
                <div className="absolute inset-0 bg-yellow-500/5 rounded-[2rem] animate-pulse" />
                <img src="/favicon.ico" alt="EN TEC Logo" className="w-full h-full object-contain drop-shadow-xl relative z-10" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black tracking-tight text-white drop-shadow-md">EN TEC Server</p>
                <p className="text-sm text-yellow-500 font-bold tracking-[0.2em] uppercase mt-1">IPTV Manager</p>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">بوابة المستخدمين</h1>
          <p className="text-zinc-400 text-sm">أدخل بيانات جهازك للتحكم بقوائم التشغيل الخاصة بك</p>
        </div>

        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="mac" className="text-zinc-200 font-medium">الماك أدرس (MAC Address)</Label>
              <Input
                id="mac"
                type="text"
                placeholder="00:1A:79:XX:XX:XX"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                className="h-12 text-center text-lg tracking-widest font-mono bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-yellow-500"
                dir="ltr"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key" className="text-zinc-200 font-medium">رمز الجهاز (Device Key)</Label>
              <Input
                id="key"
                type="text"
                placeholder="123456"
                value={deviceKey}
                onChange={(e) => setDeviceKey(e.target.value)}
                className="h-12 text-center text-lg tracking-widest font-mono bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-yellow-500"
                dir="ltr"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg rounded-xl transition-all"
              disabled={loading}
            >
              {loading ? "جاري التحقق..." : (
                <>
                  <LogIn className="w-5 h-5 ml-2" />
                  دخول
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
