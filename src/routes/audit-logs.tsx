import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Search, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, endpoints } from "@/services/api";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "سجل التدقيق — EN TEC Server" }] }),
  component: () => (
    <RequireAuth>
      <AuditLogsPage />
    </RequireAuth>
  ),
});

interface AuditEntry {
  _id: string;
  actorUsername: string;
  actorRole: "owner" | "admin" | string;
  method: string;
  path: string;
  resourceId?: string;
  success: boolean;
  statusCode: number;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

const roleNames: Record<string, string> = { owner: "مالك", admin: "مدير", viewer: "قراءة فقط" };
const methodNames: Record<string, string> = { POST: "إنشاء", PUT: "تعديل", PATCH: "تعديل", DELETE: "حذف" };

function AuditLogsPage() {
  const { role, ready } = useAuth();
  const [result, setResult] = useState<AuditResponse>({ logs: [], total: 0, page: 1, pages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready || (role !== "owner" && role !== "admin")) return;
    let active = true;
    setLoading(true);
    setError(false);
    api.get(endpoints.auditLogs, { params: { page, limit: 50, search } })
      .then(({ data }) => { if (active) setResult(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ready, role, page, search]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  if (role !== "owner" && role !== "admin") {
    return (
      <AppShell title="سجل التدقيق" description="عرض العمليات الإدارية المسجلة">
        <Card className="surface-card border-border/70 p-8 text-center text-muted-foreground">
          لا تملك صلاحية الاطلاع على سجل التدقيق.
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="سجل التدقيق" description="العمليات الإدارية المسجلة ونتيجتها">
      <Card className="surface-card border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-base font-extrabold">العمليات ({result.total})</h2>
          </div>
          <form onSubmit={submitSearch} className="flex gap-2">
            <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث بالمستخدم أو المسار أو المعرّف" className="w-64" />
            <Button type="submit" variant="outline" aria-label="بحث"><Search className="size-4" /></Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-4 py-3 font-bold">المستخدم</th>
                <th className="px-4 py-3 font-bold">العملية</th>
                <th className="px-4 py-3 font-bold">المورد</th>
                <th className="px-4 py-3 font-bold">النتيجة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.map((entry) => (
                <tr key={entry._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{entry.actorUsername}</span>
                    <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{roleNames[entry.actorRole] || entry.actorRole}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{methodNames[entry.method] || entry.method}</span>
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{entry.method}</span>
                  </td>
                  <td className="px-4 py-3" dir="ltr">
                    <span className="font-mono text-xs">{entry.path}</span>
                    {entry.resourceId && <span className="mr-2 text-xs text-muted-foreground">{entry.resourceId}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${entry.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {entry.success ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                      {entry.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(entry.createdAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
              {result.logs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  {loading ? "جارٍ تحميل سجل التدقيق..." : error ? "تعذر تحميل سجل التدقيق" : "لا توجد عمليات مسجلة لهذه الصفحة"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
          <span>صفحة {result.page || page} من {result.pages || 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronRight className="ml-1 size-4" /> السابق</Button>
            <Button variant="outline" size="sm" disabled={page >= result.pages || loading || result.pages === 0} onClick={() => setPage((value) => value + 1)}>التالي <ChevronLeft className="mr-1 size-4" /></Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
