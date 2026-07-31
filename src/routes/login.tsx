import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Mail, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — EN TEC Server" },
      { name: "description", content: "تسجيل دخول الإدارة إلى لوحة تحكم EN TEC Server لإدارة IPTV." },
      { property: "og:title", content: "تسجيل الدخول — EN TEC Server" },
      { property: "og:description", content: "دخول آمن لمدراء منصة EN TEC Server." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "البريد الإلكتروني غير صالح" }).max(255),
  password: z.string().min(6, { message: "كلمة المرور يجب ألا تقل عن 6 أحرف" }).max(72),
});

function LoginPage() {
  const { login, isAuthed, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@entec.tv");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthed) navigate({ to: "/" });
  }, [ready, isAuthed, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    // بيانات وهمية مؤقتة — استبدلها بـ api.post(endpoints.login, ...) عند ربط NestJS
    setTimeout(() => {
      setLoading(false);
      login(parsed.data.email);
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: "/" });
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 opacity-25 [background:radial-gradient(60%_50%_at_50%_0%,var(--primary),transparent)]" />
      <div className="surface-card w-full max-w-md rounded-3xl border border-border/70 p-8">
        <div className="flex flex-col items-center text-center">
          <span className="brand-gradient flex size-14 items-center justify-center rounded-2xl text-primary-foreground">
            <Satellite className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">EN TEC Server</h1>
          <p className="mt-1 text-sm text-muted-foreground">لوحة تحكم إدارة تطبيق IPTV</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                dir="ltr"
                className="pr-9 text-right"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@entec.tv"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                className="pr-9"
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full font-bold" disabled={loading}>
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            وضع تجريبي: أي بريد صالح وكلمة مرور من 6 أحرف
          </p>
        </form>
      </div>
    </div>
  );
}