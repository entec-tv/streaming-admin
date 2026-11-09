import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Download, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/notifications";
import { api, endpoints } from "@/services/api";
import type { AppUpdate, AppUpdatePlatform } from "@/services/types";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AppUpdatePlatform | null>(null);

  useEffect(() => {
    api.get<{ updates: AppUpdate[] }>(endpoints.appUpdates)
      .then(({ data }) => {
        const next = blankForms();
        for (const update of data.updates || []) {
          next[update.platform] = { version: update.version, downloadUrl: update.downloadUrl || "", sha256: update.sha256 || "" };
        }
        setForms(next);
      })
      .catch(() => toast.error("تعذّر تحميل إعدادات التحديث"))
      .finally(() => setLoading(false));
  }, []);

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
      await api.put(endpoints.appUpdate(platform), {
        version: form.version.trim(),
        downloadUrl: form.downloadUrl.trim(),
        sha256: form.sha256.trim().toLowerCase(),
      });
      toast.success(`تم حفظ تحديث ${definition.title}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "تعذّر حفظ إعدادات التحديث");
    } finally {
      setSaving(null);
    }
  };

  const updateField = (platform: AppUpdatePlatform, field: keyof UpdateForm, value: string) => {
    setForms((current) => ({ ...current, [platform]: { ...current[platform], [field]: value } }));
  };

  return (
    <AppShell title="تحديث التطبيق" description="إدارة الإصدارات وروابط التحديث لكل منصة">
      <div className="mx-auto max-w-3xl">
        <Tabs defaultValue="windows" dir="rtl">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:grid-cols-4">
            {platforms.map((platform) => <TabsTrigger key={platform.id} value={platform.id}>{platform.title}</TabsTrigger>)}
          </TabsList>
          {platforms.map((platform) => {
            const form = forms[platform.id];
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
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AppShell>
  );
}
