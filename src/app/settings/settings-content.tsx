"use client";

import { useEffect, useMemo, useState } from "react";
import { Key, Loader2, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { usePrototype } from "@/components/prototype/prototype-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ApiConnectionStatus } from "@/lib/mock-data";
import type { Session } from "@/lib/auth/types";
import type { ApiKeyProvider, ApiKeyStatus } from "@/lib/api-keys/types";

type ApiKeyFormState = Record<ApiKeyProvider, string>;

const PROVIDER_COPY: Record<
  ApiKeyProvider,
  { name: string; letter: string; letterBg: string; description: string; placeholder: string }
> = {
  hunter: {
    name: "Hunter.io API Key",
    letter: "H",
    letterBg: "bg-orange-100 text-orange-700",
    description: "Dùng cho Domain Scan — tìm email từ domain.",
    placeholder: "Nhập Hunter API key",
  },
  serpapi: {
    name: "SerpAPI Key",
    letter: "S",
    letterBg: "bg-blue-100 text-blue-700",
    description: "Dùng cho Keyword Discovery — tìm website từ SERP.",
    placeholder: "Nhập SerpAPI key",
  },
};

function statusLabel(status: ApiKeyStatus): string {
  if (status.hasUserKey) return `Đã lưu ${status.maskedKey ?? "****"}`;
  if (status.serverFallbackAvailable) return "Dùng server env";
  return "Chưa cấu hình";
}

function statusVariant(status: ApiKeyStatus): "default" | "secondary" {
  return status.hasUserKey || status.serverFallbackAvailable ? "default" : "secondary";
}

function ApiKeyCard({
  status,
  value,
  busy,
  onChange,
  onSave,
  onDelete,
}: {
  status: ApiKeyStatus;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const copy = PROVIDER_COPY[status.provider];
  const canSave = value.trim().length > 0 && !busy;
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className={`flex size-9 items-center justify-center rounded-lg font-bold ${copy.letterBg}`}>
            {copy.letter}
          </div>
          <div>
            <CardTitle className="text-base">{copy.name}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
        <Badge variant={statusVariant(status)} className="shrink-0">
          {statusLabel(status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`api-key-${status.provider}`}>API key cá nhân</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Key className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id={`api-key-${status.provider}`}
                className="pl-9 font-mono"
                type="password"
                autoComplete="off"
                placeholder={status.hasUserKey ? "Để trống nếu không đổi key" : copy.placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={onSave} disabled={!canSave}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Lưu
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={busy || !status.hasUserKey}
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Không hiển thị lại plaintext sau khi lưu. Key được mã hóa ở server khi{" "}
            <code className="font-mono">APP_ENCRYPTION_KEY</code> đã cấu hình.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsContent({ session }: { session: Session }) {
  const { apiStatus, setApiStatus } = usePrototype();
  const [providers, setProviders] = useState<ApiKeyStatus[]>([]);
  const [form, setForm] = useState<ApiKeyFormState>({ hunter: "", serpapi: "" });
  const [busyProvider, setBusyProvider] = useState<ApiKeyProvider | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

  const syncApiStatus = (items: ApiKeyStatus[]) => {
    const usable = items.filter((p) => p.hasUserKey || p.serverFallbackAvailable).length;
    let next: ApiConnectionStatus = "ok";
    if (usable === 0) next = "error";
    else if (usable < 2) next = "partial";
    setApiStatus(next);
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/settings/api-keys", { cache: "no-store" })
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const err = (data as { message?: string; error?: string } | null) ?? null;
          throw new Error(err?.message ?? err?.error ?? `HTTP ${res.status}`);
        }
        return (data as { providers?: ApiKeyStatus[] } | null)?.providers ?? [];
      })
      .then((next) => {
        if (cancelled) return;
        setProviders(next);
        syncApiStatus(next);
      })
      .catch((e) => {
        if (cancelled) return;
        setMessage({
          type: "error",
          text: e instanceof Error ? e.message : "Không tải được trạng thái API key.",
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const encryptionConfigured = providers.some((p) => p.encryptionConfigured);

  const sortedProviders = useMemo(
    () =>
      [...providers].sort((a, b) =>
        a.provider === "hunter" && b.provider !== "hunter" ? -1 : 1,
      ),
    [providers],
  );

  const saveKey = async (provider: ApiKeyProvider) => {
    setBusyProvider(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, apiKey: form[provider] }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (data as { message?: string; error?: string } | null) ?? null;
        throw new Error(err?.message ?? err?.error ?? `HTTP ${res.status}`);
      }
      const saved = (data as { provider?: ApiKeyStatus } | null)?.provider;
      if (saved) {
        setProviders((prev) => prev.map((p) => (p.provider === provider ? saved : p)));
      }
      setForm((prev) => ({ ...prev, [provider]: "" }));
      setMessage({ type: "success", text: "Đã lưu API key cá nhân. Plaintext không được trả về client." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Không lưu được API key.",
      });
    } finally {
      setBusyProvider(null);
    }
  };

  const deleteKey = async (provider: ApiKeyProvider) => {
    setBusyProvider(provider);
    setMessage(null);
    try {
      const res = await fetch(`/api/settings/api-keys/${provider}`, { method: "DELETE" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const err = (data as { message?: string; error?: string } | null) ?? null;
        throw new Error(err?.message ?? err?.error ?? `HTTP ${res.status}`);
      }
      setProviders((prev) =>
        prev.map((p) =>
          p.provider === provider
            ? { ...p, hasUserKey: false, keyHint: null, maskedKey: null }
            : p,
        ),
      );
      setMessage({ type: "success", text: "Đã xóa API key cá nhân." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Không xóa được API key.",
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Quản lý API key, tài khoản và bảo mật." />

      <Tabs defaultValue="api">
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="account">Tài khoản</TabsTrigger>
          <TabsTrigger value="password">Đổi mật khẩu</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <p className="text-sm text-slate-500">
            Trạng thái provider:{" "}
            <b>
              {apiStatus === "ok"
                ? "đã có key khả dụng"
                : apiStatus === "partial"
                  ? "một provider có key"
                  : "chưa có key khả dụng"}
            </b>
          </p>

          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertDescription className="text-sm">
              {encryptionConfigured
                ? "APP_ENCRYPTION_KEY đã sẵn sàng: có thể lưu key cá nhân đã mã hóa."
                : "Chưa cấu hình APP_ENCRYPTION_KEY: API sẽ không lưu plaintext. Nếu owner đã cấu hình server env, provider vẫn dùng fallback server-side."}
            </AlertDescription>
          </Alert>

          {message ? (
            <Alert
              className={
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : message.type === "success"
                    ? "border-green-200 bg-green-50 text-green-900"
                    : "border-slate-200 bg-slate-50 text-slate-800"
              }
            >
              <AlertDescription className="text-sm">{message.text}</AlertDescription>
            </Alert>
          ) : null}

          {sortedProviders.map((status) => (
            <ApiKeyCard
              key={status.provider}
              status={status}
              value={form[status.provider]}
              busy={busyProvider === status.provider}
              onChange={(value) => setForm((prev) => ({ ...prev, [status.provider]: value }))}
              onSave={() => void saveKey(status.provider)}
              onDelete={() => void deleteKey(status.provider)}
            />
          ))}
        </TabsContent>

        <TabsContent value="account">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
              <CardDescription>
                Role hiện tại: <b className="uppercase">{session.role}</b> · Gói {session.plan} · Auth{" "}
                {session.authProvider === "supabase" ? "Supabase" : "demo HMAC"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input defaultValue={session.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={session.email} readOnly />
              </div>
              <Button>Lưu thay đổi (mock)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
              <CardDescription>
                Phase 09E mới thêm nền hybrid. Đổi mật khẩu thật sẽ dùng Supabase Auth ở phase sau.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input type="password" />
              </div>
              <Button disabled>Cập nhật mật khẩu (sắp có)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Cài đặt thông báo email khi scan xong / export sẵn sàng (mock).
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
