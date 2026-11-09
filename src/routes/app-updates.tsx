import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, ExternalLink, History, RotateCcw, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/notifications";
import { api, endpoints } from "@/services/api";
import type { AppUpdate, AppUpdateHistoryEntry, AppUpdateHistoryResponse, AppUpdatePlatform } from "@/services/types";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/app-updates")({
  head: () => ({ meta: [{ title: "تحديث التطبيق — EN TEC Server" }] }),
  component: () => (
    <RequireAuth>
      <AppUpdatesPage />
    </RequireAuth>
  ),
});

const platforms: { id: AppUpdatePlatform; title: string; urlLabel: string; placeholder: string; description: string }[] = [
  { id: "windows", title: "Windows", urlLabel: "رابط ملف التثبيت EXE", placeholder: "https://example.com/ENTEC-Streaming-Setup.exe", description: "يتحقق التطبيق من SHA-256 ثم يشغّل المثبّت تلقائيًا." },
  { id: "android", title: "Android / Android TV", urlLabel: "رابط ملف APK مباشر", placeholder: "https://example.com/entec-streaming.apk", description: "يُنزّل APK ويفتح مُثبّت Android للتأكيد. يجب توقيع الإصدار الجديد بالمفتاح نفسه للحفاظ على بيانات التطبيق." },
  { id: "ios", title: "iPhone / iPad", urlLabel: "رابط App Store أو TestFlight", placeholder: "https://apps.apple.com/app/...", description: "يفتح صفحة التطبيق في المتجر؛ تنزيل تحديث iOS وتثبيته يتم من خلال Apple." },
  { id: "web", title: "Web", urlLabel: "رابط الموقع (اختياري)", placeholder: "https://example.com", description: "انشر حزمة الويب أولًا، ثم حدّث رقمها هنا. سيعيد التطبيق تحميل النسخة المنشورة." },
];

type UpdateForm = { version: string; downloadUrl: string; sha256: string };
const blank: UpdateForm = { version: "", downloadUrl: "", sha256: "" };
const blankForms = (): Record<AppUpdatePlatform, UpdateForm> => ({ windows: { ...blank }, android: { ...blank }, ios: { ...blank }, web: { ...blank } });

function AppUpdatesPage() {
  const { role } = useAuth();
  const canManage = role === "owner" || role === "admin";
  const [forms, setForms] = useState(blankForms);
  const [savedUpdates, setSavedUpdates] = useState<Record<AppUpdatePlatform, AppUpdate | null>>({ windows: null, android: null, ios: null, web: null });
  const [activePlatform, setActivePlatform] = useState<AppUpdatePlatform>("windows");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AppUpdatePlatform | null>(null);
  const [history, setHistory] = useState<AppUpdateHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ updates: AppUpdate[] }>(endpoints.appUpdates)
      .then(({ data }) => {
        const next = blankForms();
        const saved = { windows: null, android: null, ios: null, web: null } as Record<AppUpdatePlatform, AppUpdate | null>;
        for (const update of data.updates || []) {
          next[update.platform] = { version: update.version, downloadUrl: update.downloadUrl || "", sha256: update.sha256 || "" };
          saved[update.platform] = update;
        }
        setForms(next);
        setSavedUpdates(saved);
      })
      .catch(() => toast.error("تعذّر تحميل إعدادات التحديث"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    api.get<AppUpdateHistoryResponse>(endpoints.appUpdateHistory(activePlatform), { params: { page: historyPage, limit: 10 } })
      .then(({ data }) => { if (active) setHistory(data); })
      .catch(() => {
        if (!active) return;
        setHistory({ entries: [], total: 0, page: historyPage, pages: 0 });
        toast.error("تعذّر تحميل سجل إصدارات التطبيق");
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [activePlatform, historyPage, historyRefresh]);

  const save = async (platform: AppUpdatePlatform) => {
    const form = forms[platform];
    if (!/^\d+\.\d+\.\d+$/.test(form.version.trim())) {
      toast.error("أدخل الإصدار بالصيغة 1.2.3");
      return;
    }
    const definition = platforms.find((item) => item.id === platform)!;
    if (platform !== "web" || form.downloadUrl.trim()) {
      try {
        const parsed = new URL(form.downloadUrl.trim());
        if (parsed.protocol !== "https:") throw new Error("https required");
      } catch {
        toast.error(`أدخل ${definition.urlLabel} صحيحًا يبدأ بـ HTTPS`);
        return;
      }
    }
    if (platform === "windows" && !/^[a-f\d]{64}$/i.test(form.sha256.trim())) {
      toast.error("أدخل بصمة SHA-256 صحيحة لملف Windows");
      return;
    }

    setSaving(platform);
    try {
      const { data } = await api.put(endpoints.appUpdate(platform), {
        version: form.version.trim(),
        downloadUrl: form.downloadUrl.trim(),
        sha256: form.sha256.trim().toLowerCase(),
      });
      const saved = data.update as AppUpdate;
      setSavedUpdates((current) => ({ ...current, [platform]: saved }));
      setForms((current) => ({
        ...current,
        [platform]: { version: saved.version, downloadUrl: saved.downloadUrl || "", sha256: saved.sha256 || "" },
      }));
      setHistoryPage(1);
      setHistoryRefresh((current) => current + 1);
      toast.success(`تم حفظ تحديث ${definition.title}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "تعذّر حفظ إعدادات التحديث");
    } finally {
      setSaving(null);
    }
  };

  const restore = async (entry: AppUpdateHistoryEntry) => {
    const saved = savedUpdates[activePlatform];
    if (restoring || (saved && saved.version === entry.version && saved.downloadUrl === entry.downloadUrl && saved.sha256 === entry.sha256)) return;
    const platformTitle = platforms.find((item) => item.id === activePlatform)?.title || activePlatform;
    if (!window.confirm(`سيتم استبدال إعداد ${platformTitle} الحالي بالإصدار ${entry.version}. سيُسجل هذا كعملية استعادة جديدة. هل تريد المتابعة؟`)) return;
    setRestoring(entry._id);
    try {
      const { data } = await api.post(endpoints.appUpdateHistoryRestore(activePlatform, entry._id));
      const restored = data.update as AppUpdate;
      setSavedUpdates((current) => ({ ...current, [activePlatform]: restored }));
      setForms((current) => ({
        ...current,
        [activePlatform]: { version: restored.version, downloadUrl: restored.downloadUrl || "", sha256: restored.sha256 || "" },
      }));
      setHistoryPage(1);
      setHistoryRefresh((current) => current + 1);
      toast.success(`تمت استعادة إعداد الإصدار ${restored.version}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "تعذّرت استعادة إعداد الإصدار");
    } finally {
      setRestoring(null);
    }
  };

  const updateField = (platform: AppUpdatePlatform, field: keyof UpdateForm, value: string) => {
    setForms((current) => ({ ...current, [platform]: { ...current[platform], [field]: value } }));
  };

  return (
    <AppShell title="تحديث التطبيق" description="إدارة الإصدارات وروابط التحديث لكل منصة">
      <div className="mx-auto max-w-3xl">
        <Tabs value={activePlatform} onValueChange={(value) => { setActivePlatform(value as AppUpdatePlatform); setHistoryPage(1); }} dir="rtl">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:grid-cols-4">
            {platforms.map((platform) => <TabsTrigger key={platform.id} value={platform.id}>{platform.title}</TabsTrigger>)}
          </TabsList>
          {platforms.map((platform) => {
            const form = forms[platform.id];
            const saved = savedUpdates[platform.id];
            return (
              <TabsContent key={platform.id} value={platform.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download className="size-5 text-primary" /> إصدار {platform.title}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5" dir="rtl">
                    <div className="space-y-2">
                      <Label htmlFor={`${platform.id}-version`}>رقم الإصدار</Label>
                      <Input id={`${platform.id}-version`} placeholder="مثال: 1.2.3" value={form.version} disabled={loading || !canManage} onChange={(event) => updateField(platform.id, "version", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${platform.id}-url`}>{platform.urlLabel}</Label>
                      <Input id={`${platform.id}-url`} type="url" dir="ltr" placeholder={platform.placeholder} value={form.downloadUrl} disabled={loading || !canManage} onChange={(event) => updateField(platform.id, "downloadUrl", event.target.value)} />
                    </div>
                    {platform.id === "windows" && (
                      <div className="space-y-2">
                        <Label htmlFor="windows-sha">بصمة SHA-256 لملف التثبيت</Label>
                        <Input id="windows-sha" dir="ltr" autoComplete="off" placeholder="64 hexadecimal characters" value={form.sha256} disabled={loading || !canManage} onChange={(event) => updateField("windows", "sha256", event.target.value)} />
                        <p className="text-xs leading-6 text-muted-foreground">احسب البصمة بالأمر: <code dir="ltr">Get-FileHash .\ENTEC-Streaming-Setup.exe -Algorithm SHA256</code></p>
                      </div>
                    )}
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                      تحديث التطبيق يحافظ على بياناته المحلية. على Android وiOS يتولى نظام التشغيل تثبيت النسخة الموقّعة المناسبة؛ لا تحذف التطبيق يدويًا قبل التحديث.
                    </div>
                    {canManage && <Button onClick={() => save(platform.id)} disabled={loading || saving !== null} className="gap-2">
                      {saving === platform.id ? <Save className="size-4 animate-pulse" /> : <Check className="size-4" />}
                      {saving === platform.id ? "جارٍ الحفظ…" : `حفظ إعداد ${platform.title}`}
                    </Button>}
                  </CardContent>
                </Card>
                <Card className="mt-5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="size-5 text-primary" /> سجل إصدارات {platform.title}</CardTitle>
                    <CardDescription>يسجل المستخدم والتوقيت والإعداد المحفوظ. تتضمن القائمة لقطة للإعداد السابق عند بدء السجل؛ لا تتوفر تغييرات أقدم من ذلك.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">جارٍ تحميل السجل…</p>
                    ) : history?.entries.length ? (
                      <div className="divide-y divide-border/70">
                        {history.entries.map((entry) => {
                          const isCurrent = saved?.version === entry.version && saved?.downloadUrl === entry.downloadUrl && saved?.sha256 === entry.sha256;
                          return (
                            <div key={entry._id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold">الإصدار {entry.version}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${entry.action === "restored" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    {entry.action === "restored" ? "استعادة" : entry.action === "baseline" ? "الإعداد السابق" : "نشر"}
                                  </span>
                                  {isCurrent && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">الإعداد الحالي</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(entry.changedAt).toLocaleString("ar-EG")} · {entry.actorUsername}{entry.actorRole !== "system" ? ` (${entry.actorRole === "owner" ? "مالك" : "مدير"})` : ""}
                                </p>
                                {entry.downloadUrl && (
                                  <a href={entry.downloadUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline">
                                    {entry.downloadUrl}<ExternalLink className="size-3 shrink-0" />
                                  </a>
                                )}
                                {entry.sha256 && <p className="break-all font-mono text-[11px] text-muted-foreground" dir="ltr">SHA-256: {entry.sha256}</p>}
                              </div>
                              {canManage && <Button variant="outline" size="sm" disabled={isCurrent || restoring !== null || historyLoading} onClick={() => void restore(entry)}>
                                {restoring === entry._id ? <RotateCcw className="ml-2 size-4 animate-spin" /> : <RotateCcw className="ml-2 size-4" />}
                                {restoring === entry._id ? "جارٍ الاستعادة…" : "استعادة"}
                              </Button>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تغييرات مسجلة بعد. يبدأ السجل من أول حفظ جديد.</p>
                    )}
                    {history && history.pages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-sm text-muted-foreground">
                        <span>صفحة {history.page} من {history.pages} · {history.total} تغيير</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={historyPage <= 1 || historyLoading} onClick={() => setHistoryPage((page) => page - 1)}><ChevronRight className="ml-1 size-4" /> السابق</Button>
                          <Button variant="outline" size="sm" disabled={historyPage >= history.pages || historyLoading} onClick={() => setHistoryPage((page) => page + 1)}>التالي <ChevronLeft className="mr-1 size-4" /></Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppShell>
  );
}
