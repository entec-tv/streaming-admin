import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, Clock3, ExternalLink, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer, Device } from "@/services/types";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data-store";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "التنبيهات — EN TEC Server" }] }),
  component: () => (
    <RequireAuth>
      <AlertsPage />
    </RequireAuth>
  ),
});

type AlertKind = "app_expired" | "app_expiring" | "app_disabled" | "trial_expired" | "trial_expiring";
type AlertSeverity = "critical" | "warning";

interface OperationalAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  description: string;
  customerId?: string;
  customerName?: string;
  macAddress: string;
  dueAt: string | null;
}

interface SubscriptionRecord {
  customer: Customer;
  macAddress: string;
  appActive?: boolean;
  appExpiry?: string | null;
}

const DAY = 24 * 60 * 60 * 1000;
const APP_EXPIRY_WINDOW = 7 * DAY;
const TRIAL_EXPIRY_WINDOW = 3 * DAY;
const normalizeMac = (value: string) => value.toUpperCase().replace(/[^A-F0-9]/g, "");

const kindLabels: Record<AlertKind, string> = {
  app_expired: "تفعيل منتهٍ",
  app_expiring: "تفعيل قريب الانتهاء",
  app_disabled: "تفعيل معطل",
  trial_expired: "تجربة منتهية",
  trial_expiring: "تجربة قريبة الانتهاء",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
};

function buildAlerts(customers: Customer[], devices: Device[], now: number): OperationalAlert[] {
  const subscriptionsByMac = new Map<string, SubscriptionRecord[]>();

  for (const customer of customers) {
    if (customer.status !== "active") continue;
    for (const subscription of customer.subscriptions || []) {
      if (subscription.status === "blocked") continue;
      const macAddress = subscription.macAddress || "";
      const mac = normalizeMac(macAddress);
      if (!mac) continue;
      const records = subscriptionsByMac.get(mac) || [];
      records.push({ customer, macAddress, appActive: subscription.appActive, appExpiry: subscription.appExpiry });
      subscriptionsByMac.set(mac, records);
    }
  }

  const alerts: OperationalAlert[] = [];
  const appAlertMacs = new Set<string>();
  const hasValidAccess = new Set<string>();
  const appExpiryLimit = now + APP_EXPIRY_WINDOW;

  for (const [mac, records] of subscriptionsByMac) {
    const enabled = records.filter((record) => record.appActive !== false);
    const expiries = enabled
      .map((record) => ({ record, time: record.appExpiry ? new Date(record.appExpiry).getTime() : null }))
      .filter((item) => item.time === null || Number.isFinite(item.time));
    const unlimited = expiries.some((item) => item.time === null);
    const latestExpiry = expiries.reduce<number | null>((latest, item) =>
      item.time !== null && (latest === null || item.time > latest) ? item.time : latest, null);

    if (unlimited || (latestExpiry !== null && latestExpiry > now)) {
      hasValidAccess.add(mac);
      if (!unlimited && latestExpiry !== null && latestExpiry <= appExpiryLimit) {
        const record = expiries.find((item) => item.time === latestExpiry)?.record || enabled[0];
        alerts.push({
          id: `app-expiring-${mac}`,
          kind: "app_expiring",
          severity: "warning",
          title: "تفعيل التطبيق سينتهي قريبًا",
          description: "ينتهي تفعيل الجهاز خلال الأيام السبعة القادمة.",
          customerId: record.customer._id,
          customerName: record.customer.name,
          macAddress: record.macAddress,
          dueAt: new Date(latestExpiry).toISOString(),
        });
        appAlertMacs.add(mac);
      }
      continue;
    }

    const expiredExpiry = expiries
      .filter((item): item is { record: SubscriptionRecord; time: number } => item.time !== null && item.time <= now)
      .sort((a, b) => b.time - a.time)[0];

    if (expiredExpiry) {
      alerts.push({
        id: `app-expired-${mac}`,
        kind: "app_expired",
        severity: "critical",
        title: "انتهى تفعيل التطبيق",
        description: "انتهت صلاحية التفعيل المرتبط بهذا الجهاز.",
        customerId: expiredExpiry.record.customer._id,
        customerName: expiredExpiry.record.customer.name,
        macAddress: expiredExpiry.record.macAddress,
        dueAt: new Date(expiredExpiry.time).toISOString(),
      });
      appAlertMacs.add(mac);
      continue;
    }

    const record = records[0];
    alerts.push({
      id: `app-disabled-${mac}`,
      kind: "app_disabled",
      severity: "warning",
      title: "تفعيل التطبيق معطل",
      description: "لا يوجد اشتراك تطبيق فعال لهذا الجهاز حاليًا.",
      customerId: record.customer._id,
      customerName: record.customer.name,
      macAddress: record.macAddress,
      dueAt: null,
    });
    appAlertMacs.add(mac);
  }

  const trialExpiryLimit = now + TRIAL_EXPIRY_WINDOW;
  for (const device of devices) {
    if (device.status === "revoked") continue;
    const mac = normalizeMac(device.macAddress || "");
    if (!mac || hasValidAccess.has(mac) || appAlertMacs.has(mac)) continue;
    const trialEnd = device.trialEndsAt ? new Date(device.trialEndsAt).getTime() : Number.NaN;
    if (!Number.isFinite(trialEnd)) continue;

    const linked = subscriptionsByMac.get(mac)?.[0];
    if (trialEnd <= now) {
      alerts.push({
        id: `trial-expired-${mac}`,
        kind: "trial_expired",
        severity: "critical",
        title: "انتهت الفترة التجريبية للجهاز",
        description: "انتهت تجربة الجهاز ولا يوجد له تفعيل تطبيق ساري.",
        customerId: linked?.customer._id,
        customerName: linked?.customer.name,
        macAddress: device.macAddress,
        dueAt: new Date(trialEnd).toISOString(),
      });
    } else if (trialEnd <= trialExpiryLimit) {
      alerts.push({
        id: `trial-expiring-${mac}`,
        kind: "trial_expiring",
        severity: "warning",
        title: "الفترة التجريبية قاربت على الانتهاء",
        description: "تنتهي تجربة الجهاز خلال الأيام الثلاثة القادمة.",
        customerId: linked?.customer._id,
        customerName: linked?.customer.name,
        macAddress: device.macAddress,
        dueAt: new Date(trialEnd).toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return a.severity === "critical" ? bTime - aTime : aTime - bTime;
  });
}

function AlertsPage() {
  const { role } = useAuth();
  const { customers, devices, fetchDevices } = useData();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (role === "owner" || role === "admin") void fetchDevices();
  }, [fetchDevices, role]);

  const alerts = useMemo(() => buildAlerts(customers, devices, now), [customers, devices, now]);
  const filteredAlerts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return alerts.filter((alert) =>
      (kindFilter === "all" || alert.kind === kindFilter)
      && (severityFilter === "all" || alert.severity === severityFilter)
      && (!term || `${alert.title} ${alert.customerName || ""} ${alert.macAddress}`.toLocaleLowerCase().includes(term))
    );
  }, [alerts, kindFilter, query, severityFilter]);
  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;

  if (role !== "owner" && role !== "admin") {
    return (
      <AppShell title="التنبيهات" description="تنبيهات تشغيلية عن الأجهزة والتفعيلات">
        <Card className="surface-card border-border/70 p-8 text-center text-muted-foreground">
          لا تملك صلاحية الاطلاع على التنبيهات التشغيلية.
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="التنبيهات" description="متابعة التفعيلات والفترات التجريبية التي تحتاج إلى مراجعة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="إجمالي التنبيهات" value={alerts.length} icon={Bell} hint="تُحتسب من بيانات العملاء والأجهزة المحمّلة" />
        <StatCard label="تحتاج إلى إجراء" value={criticalCount} icon={AlertTriangle} />
        <StatCard label="قريبة الانتهاء أو معطلة" value={warningCount} icon={CalendarClock} />
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold">قائمة التنبيهات ({filteredAlerts.length})</h2>
            <p className="mt-1 text-xs text-muted-foreground">تُحسب من حالة الاشتراكات المسجلة، ولا تحتاج إلى إغلاق يدوي.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative min-w-56 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالعميل أو عنوان الجهاز" className="pr-9" />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="الأولوية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأولويات</SelectItem>
                <SelectItem value="critical">تحتاج إجراء</SelectItem>
                <SelectItem value="warning">تنبيه</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="نوع التنبيه" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(kindLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredAlerts.map((alert) => {
            const critical = alert.severity === "critical";
            const Icon = critical ? AlertTriangle : Clock3;
            const badgeClass = critical
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning";
            return (
              <article key={alert.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${badgeClass}`}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{alert.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>{kindLabels[alert.kind]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {alert.customerName && <span>العميل: <b className="text-foreground">{alert.customerName}</b></span>}
                      <span>الجهاز: <b className="font-mono text-foreground" dir="ltr">{alert.macAddress}</b></span>
                      {alert.dueAt && <span>التاريخ: <b className="text-foreground">{formatDate(alert.dueAt)}</b></span>}
                    </div>
                  </div>
                </div>
                {alert.customerId ? (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to="/customer/$customerId" params={{ customerId: alert.customerId }}>
                      فتح العميل <ExternalLink className="mr-2 size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to="/devices">فتح الأجهزة <ExternalLink className="mr-2 size-4" /></Link>
                  </Button>
                )}
              </article>
            );
          })}
          {filteredAlerts.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 font-bold">لا توجد تنبيهات مطابقة</p>
              <p className="mt-1 text-sm text-muted-foreground">جرّب تغيير البحث أو المرشحات.</p>
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
