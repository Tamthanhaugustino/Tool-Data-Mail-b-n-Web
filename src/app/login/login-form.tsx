"use client";

import { useActionState } from "react";
import { Eye } from "lucide-react";
import { signInAction, type SignInState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState<SignInState | null, FormData>(
    signInAction,
    null,
  );

  return (
    <>
      {state?.error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <form className="mt-6 space-y-4" action={action}>
        {from ? <input type="hidden" name="from" value={from} /> : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue="trang.nguyen@vietsoftware.com.vn"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="password">Mật khẩu</Label>
            <span className="text-xs text-slate-400">Quên mật khẩu? (sẽ có sau)</span>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              defaultValue="demo123"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              aria-label="Hiện mật khẩu"
              tabIndex={-1}
            >
              <Eye className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <label htmlFor="remember" className="text-sm text-slate-600">
            Ghi nhớ thiết bị này 30 ngày
          </label>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
    </>
  );
}
