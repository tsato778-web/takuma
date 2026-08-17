import { redirect } from "next/navigation";
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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-[--color-border] bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold">NAORU 採用管理</h1>
        <p className="mt-1 text-sm text-[--color-muted]">
          許可されたアカウントのみログインできます
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            ログインできませんでした。管理者に登録されている Google
            アカウントかご確認ください。
          </p>
        ) : null}

        {!configured ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Google ログインの環境変数が未設定です（AUTH_SECRET / AUTH_GOOGLE_ID /
            AUTH_GOOGLE_SECRET）。
          </p>
        ) : null}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            disabled={!configured}
            className="w-full rounded-lg bg-[--color-brand] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Google でログイン
          </button>
        </form>
      </div>
    </main>
  );
}
