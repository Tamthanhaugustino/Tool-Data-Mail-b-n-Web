"use client";

import { useState } from "react";
import { Copy, Eye, Key } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { usePrototype } from "@/components/prototype/prototype-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ApiConnectionStatus } from "@/lib/mock-data";
import type { Session } from "@/lib/auth/types";

function ApiKeyCard({
  name,
  letter,
  letterBg,
  description,
  connected,
  onToggle,
}: {
  name: string;
  letter: string;
  letterBg: string;
  description: string;
  connected: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3">
          <div
            className={`flex size-9 items-center justify-center rounded-lg font-bold ${letterBg}`}
          >
            {letter}
          </div>
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <CardDescription dangerouslySetInnerHTML={{ __html: description }} />
          </div>
        </div>
        <Badge variant={connected ? "default" : "secondary"} className="shrink-0">
          {connected ? "Đã kết nối" : "Chưa kết nối"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>API key</Label>
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 font-mono text-sm">
            <Key className="size-4 text-slate-400" />
            <span className="flex-1 tracking-widest text-slate-400">
              ••••••••••••••••••••
            </span>
            {connected && <span className="text-slate-600">a3d2</span>}
            <Button variant="ghost" size="icon-sm" type="button">
              <Eye className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" type="button">
              <Copy className="size-3.5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Key được mã hoá & lưu phía server (mock — chưa có backend).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Test connection
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle}>
            (Demo) {connected ? "Ngắt kết nối" : "Kết nối mock"}
          </Button>
          <Button size="sm">Lưu key</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsContent({ session }: { session: Session }) {
  const { apiStatus, setApiStatus } = usePrototype();
  const [hunterConnected, setHunterConnected] = useState(true);
  const [serpConnected, setSerpConnected] = useState(true);

  const syncApiStatus = (hunter: boolean, serp: boolean) => {
    let next: ApiConnectionStatus = "ok";
    if (!hunter && !serp) next = "error";
    else if (!hunter || !serp) next = "partial";
    setApiStatus(next);
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
            Trạng thái topbar (mock):{" "}
            <b>
              {apiStatus === "ok"
                ? "API OK"
                : apiStatus === "partial"
                  ? "1 API chưa kết nối"
                  : "API lỗi"}
            </b>
          </p>
          <ApiKeyCard
            name="Hunter.io API Key"
            letter="H"
            letterBg="bg-orange-100 text-orange-700"
            description="Dùng cho <b>Domain Scan</b> — tìm email từ domain."
            connected={hunterConnected}
            onToggle={() => {
              const next = !hunterConnected;
              setHunterConnected(next);
              syncApiStatus(next, serpConnected);
            }}
          />
          <ApiKeyCard
            name="SerpAPI Key"
            letter="S"
            letterBg="bg-blue-100 text-blue-700"
            description="Dùng cho <b>Keyword Discovery</b> — tìm website từ SERP."
            connected={serpConnected}
            onToggle={() => {
              const next = !serpConnected;
              setSerpConnected(next);
              syncApiStatus(hunterConnected, next);
            }}
          />
        </TabsContent>

        <TabsContent value="account">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
              <CardDescription>
                Role hiện tại: <b className="uppercase">{session.role}</b> · Gói {session.plan}
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
                Demo auth chưa lưu mật khẩu vào DB. Sẽ nối khi có Supabase Auth (Phase 04+).
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
