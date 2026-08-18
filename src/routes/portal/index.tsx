import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Tv, ListVideo, MonitorSmartphone, ShieldCheck, ShieldBan, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/services/api";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "بوابة المستخدمين — EN TEC" },
    ],
  }),
  component: PortalDashboard,
});

function PortalDashboard() {
  const navigate = Route.useNavigate();
  const [authData, setAuthData] = useState<any>(null);
  const [playlists, setPlaylists] = useState<{ name: string; url: string }[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isM3uOpen, setIsM3uOpen] = useState(false);
  const [isXtreamOpen, setIsXtreamOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // M3U form state
  const [editingM3uIdx, setEditingM3uIdx] = useState<number | null>(null);
  const [m3uName, setM3uName] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");

  // Xtream edit state
  const [editingXtreamId, setEditingXtreamId] = useState<string | null>(null);
  const [xtreamUsername, setXtreamUsername] = useState("");
  const [xtreamPassword, setXtreamPassword] = useState("");
  const [xtreamHost, setXtreamHost] = useState("");

  useEffect(() => {
    const dataStr = localStorage.getItem("portal_auth");
    if (!dataStr) {
      navigate({ to: "/portal/login", replace: true });
      return;
    }
    const parsed = JSON.parse(dataStr);
    setAuthData(parsed);
    setPlaylists(parsed.data?.device?.customPlaylists || []);
    setSubscriptions(parsed.data?.subscriptions || []);
    setLoading(false);

    // Silently refresh data to get latest subscription & playlists status
    api.post("/portal/login", { macAddress: parsed.macAddress, deviceKey: parsed.deviceKey })
      .then((res) => {
        if (res.status === 200 || res.status === 201) {
          const freshData = res.data;
          const newAuthData = { macAddress: parsed.macAddress, deviceKey: parsed.deviceKey, data: freshData };
          setAuthData(newAuthData);
          setPlaylists(freshData.device?.customPlaylists || []);
          setSubscriptions(freshData.subscriptions || []);
          localStorage.setItem("portal_auth", JSON.stringify(newAuthData));
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("portal_auth");
          navigate({ to: "/portal/login", replace: true });
        }
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("portal_auth");
    navigate({ to: "/portal/login", replace: true });
  };

  const saveM3uPlaylists = async (newList: { name: string; url: string }[]) => {
    if (!authData) return;
    setSaving(true);
    try {
      const res = await api.post("/portal/playlists", {
        macAddress: authData.macAddress,
        deviceKey: authData.deviceKey,
        playlists: newList,
      });

      if (res.status === 200 || res.status === 201) {
        toast.success("تم الحفظ بنجاح");
        setPlaylists(newList);
        setIsM3uOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveM3u = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uName || !m3uUrl) return;

    // Check if the URL is an Xtream API link
    const xtreamMatch = m3uUrl.match(/^(https?:\/\/[^\/]+(?::\d+)?).*[\?&]username=([^&]+).*[\?&]password=([^&]+)/i) || 
                        m3uUrl.match(/^(https?:\/\/[^\/]+(?::\d+)?).*[\?&]password=([^&]+).*[\?&]username=([^&]+)/i);

    if (xtreamMatch && editingM3uIdx === null) {
      // It's an Xtream link! Add as official subscription instead
      setSaving(true);
      try {
        let host = xtreamMatch[1];
        let user = "";
        let pass = "";
        
        if (m3uUrl.indexOf("username=") < m3uUrl.indexOf("password=")) {
           user = xtreamMatch[2];
           pass = xtreamMatch[3];
        } else {
           pass = xtreamMatch[2];
           user = xtreamMatch[3];
        }

        const res = await api.post("/portal/subscription/add", {
          macAddress: authData.macAddress,
          deviceKey: authData.deviceKey,
          data: { username: user, password: pass, host: host }
        });
        toast.success("تم التعرف على الرابط كاشتراك Xtream وتمت إضافته بنجاح");
        setSubscriptions([...subscriptions, res.data.subscription]);
        setIsM3uOpen(false);
        setM3uName("");
        setM3uUrl("");
      } catch (err: any) {
        toast.error("حدث خطأ أثناء إضافة الاشتراك");
      } finally {
        setSaving(false);
      }
      return;
    }
    
    let newList = [...playlists];
    if (editingM3uIdx !== null) {
      newList[editingM3uIdx] = { name: m3uName, url: m3uUrl };
    } else {
      newList.push({ name: m3uName, url: m3uUrl });
    }
    saveM3uPlaylists(newList);
  };

  const handleDeleteM3u = (index: number) => {
    if (confirm("هل أنت متأكد من حذف هذه القائمة؟")) {
      const newList = playlists.filter((_, i) => i !== index);
      saveM3uPlaylists(newList);
    }
  };

  const handleOpenM3u = (idx: number | null = null) => {
    if (idx !== null) {
      setEditingM3uIdx(idx);
      setM3uName(playlists[idx].name);
      setM3uUrl(playlists[idx].url);
    } else {
      setEditingM3uIdx(null);
      setM3uName("");
      setM3uUrl("");
    }
    setIsM3uOpen(true);
  };

  const handleDeleteXtream = async (subId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاشتراك؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه من لوحة الإدارة أيضاً.")) return;
    try {
      await api.post(`/portal/subscription/delete/${subId}`, {
        macAddress: authData.macAddress,
        deviceKey: authData.deviceKey,
      });
      toast.success("تم حذف الاشتراك بنجاح");
      setSubscriptions(subscriptions.filter(s => s._id !== subId));
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleOpenXtream = (sub: any) => {
    setEditingXtreamId(sub._id);
    setXtreamUsername(sub.username);
    setXtreamPassword(sub.password);
    setXtreamHost(sub.hostUrl || sub.hostName || "");
    setIsXtreamOpen(true);
  };

  const handleSaveXtream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingXtreamId || !xtreamUsername || !xtreamPassword || !xtreamHost) return;
    setSaving(true);
    try {
      await api.post(`/portal/subscription/update/${editingXtreamId}`, {
        macAddress: authData.macAddress,
        deviceKey: authData.deviceKey,
        data: { username: xtreamUsername, password: xtreamPassword, host: xtreamHost }
      });
      toast.success("تم تعديل الاشتراك بنجاح");
      
      const newSubs = subscriptions.map(s => {
        if (s._id === editingXtreamId) {
          return { ...s, username: xtreamUsername, password: xtreamPassword, hostUrl: xtreamHost, hostName: xtreamHost };
        }
        return s;
      });
      setSubscriptions(newSubs);
      setIsXtreamOpen(false);
    } catch (err: any) {
      toast.error("حدث خطأ أثناء التعديل");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authData) return null;

  const device = authData.data?.device;

  return (
    <div className="min-h-screen bg-[#05070a] text-white" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-black shadow-md border border-white/10 p-1.5">
              <img src="/favicon.ico" alt="EN TEC Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-bold text-lg hidden sm:block text-white">بوابة المستخدمين</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
              <Link to="/portal/status">حالة التطبيق</Link>
            </Button>
            <div className="text-sm font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 shadow-inner" dir="ltr">
              {device?.macAddress}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Unified Playlists */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <ListVideo className="w-5 h-5 text-yellow-500" />
              قوائم التشغيل الخاصة بك
            </h2>
            <Button onClick={() => handleOpenM3u()} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2">
              <Plus className="w-4 h-4" />
              إضافة قائمة M3U
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playlists.length === 0 && subscriptions.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-zinc-950/50 rounded-2xl border border-white/5 border-dashed">
                <ListVideo className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">لم تقم بإضافة أي قوائم تشغيل بعد، ولا يوجد اشتراكات Xtream مرتبطة بجهازك.</p>
              </div>
            ) : (
              <>
                {/* Render Xtream Subscriptions */}
                {subscriptions.map((sub) => (
                  <Card key={sub._id} className="bg-zinc-950/90 border-yellow-500/30 p-5 backdrop-blur-sm flex flex-col justify-between gap-4 group shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      اشتراك (Xtream)
                    </div>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg text-white truncate pr-2">{sub.hostName || 'اشتراك Xtream'}</h3>
                        <StatusBadge status={sub.status} />
                      </div>
                      <div className="text-sm text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5 font-mono" dir="ltr">
                        <div className="flex justify-between items-center">
                          <span>User: {sub.username}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenXtream(sub)} className="text-zinc-300 hover:text-white">
                        <Pencil className="w-4 h-4 ml-1.5" /> تعديل
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteXtream(sub._id)}
                        className="text-red-400 hover:bg-red-600/20 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 ml-1.5" /> حذف
                      </Button>
                    </div>
                  </Card>
                ))}

                {/* Render M3U Playlists */}
                {playlists.map((playlist, idx) => (
                  <Card key={idx} className="bg-zinc-950/80 border-white/5 p-5 backdrop-blur-sm flex flex-col justify-between gap-4 group shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      قائمة خارجية (M3U)
                    </div>
                    <div className="space-y-1 mt-2">
                      <h3 className="font-bold text-lg text-white">{playlist.name}</h3>
                      <p className="text-sm text-zinc-500 font-mono truncate" dir="ltr">{playlist.url}</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenM3u(idx)} className="text-zinc-300 hover:text-white">
                        <Pencil className="w-4 h-4 ml-1.5" /> تعديل
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteM3u(idx)}
                        className="text-red-400 hover:bg-red-600/20 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 ml-1.5" /> حذف
                      </Button>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </section>

      </main>

      {/* M3U Dialog */}
      <Dialog open={isM3uOpen} onOpenChange={setIsM3uOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingM3uIdx !== null ? "تعديل القائمة" : "إضافة قائمة M3U جديدة"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveM3u} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">اسم القائمة</Label>
              <Input 
                value={m3uName} 
                onChange={(e) => setM3uName(e.target.value)} 
                placeholder="مثال: القنوات الرياضية"
                className="bg-black/50 border-white/10 focus-visible:ring-yellow-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">رابط القائمة (URL)</Label>
              <Input 
                value={m3uUrl} 
                onChange={(e) => setM3uUrl(e.target.value)} 
                placeholder="http://example.com/playlist.m3u"
                dir="ltr"
                className="font-mono text-left bg-black/50 border-white/10 focus-visible:ring-yellow-500"
                required
              />
              <p className="text-[11px] text-zinc-500 pt-1">
                تلميح: إذا قمت بوضع رابط لاشتراك (Xtream)، سيقوم النظام تلقائياً باستخراج بيانات السيرفر، واسم المستخدم، وكلمة المرور وإضافته كاشتراك Xtream.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsM3uOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Xtream Edit Dialog */}
      <Dialog open={isXtreamOpen} onOpenChange={setIsXtreamOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الاشتراك (Xtream)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveXtream} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-zinc-200">رابط السيرفر (Host URL)</Label>
              <Input 
                value={xtreamHost} 
                onChange={(e) => setXtreamHost(e.target.value)} 
                dir="ltr"
                placeholder="http://domain.com:port"
                className="font-mono text-left bg-black/50 border-white/10 focus-visible:ring-yellow-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">اسم المستخدم (Username)</Label>
              <Input 
                value={xtreamUsername} 
                onChange={(e) => setXtreamUsername(e.target.value)} 
                dir="ltr"
                className="font-mono text-left bg-black/50 border-white/10 focus-visible:ring-yellow-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-200">كلمة المرور (Password)</Label>
              <Input 
                value={xtreamPassword} 
                onChange={(e) => setXtreamPassword(e.target.value)} 
                dir="ltr"
                className="font-mono text-left bg-black/50 border-white/10 focus-visible:ring-yellow-500"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsXtreamOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
