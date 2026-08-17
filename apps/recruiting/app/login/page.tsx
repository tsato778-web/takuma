import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { envStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;
  const configured = envStatus().auth;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        userId: String(formData.get("userId") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: "/",
      });
    } catch (e) {
      // signIn は成功時にリダイレクト用の例外を投げるため、認証エラーだけを拾う
      if (e instanceof AuthError) redirect("/login?error=1");
      throw e;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-[--color-border] bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold">NAORU 採用管理</h1>
        <p className="mt-1 text-sm text-[--color-muted]">
          共通の管理者アカウントでログインしてください
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            ID またはパスワードが違います。
          </p>
        ) : null}

        {!configured ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            管理者アカウントの環境変数が未設定です（AUTH_SECRET / ADMIN_USER_ID /
            ADMIN_PASSWORD_HASH）。
          </p>
        ) : null}

        <form className="mt-6 space-y-3" action={login}>
          <div>
            <label htmlFor="userId" className="text-[13px] font-medium">
              ID
            </label>
            <input
              id="userId"
              name="userId"
              type="text"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-[--color-border] px-3 py-2 text-sm outline-none focus:border-[--color-brand]"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-[13px] font-medium">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-[--color-border] px-3 py-2 text-sm outline-none focus:border-[--color-brand]"
            />
          </div>

          <button
            type="submit"
            disabled={!configured}
            className="w-full rounded-lg bg-[--color-brand] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            ログイン
          </button>
        </form>

        <p className="mt-4 text-[11px] text-[--color-muted]">
          このアカウントは本部3名で共有します。パスワードの共有範囲にご注意ください。
        </p>
      </div>
    </main>
  );
}
