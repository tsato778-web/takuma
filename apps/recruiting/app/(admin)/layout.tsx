import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="sticky top-0 h-screen">
        <Sidebar />
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-[--color-border] bg-white px-6 py-3">
          <span className="text-[13px] text-[--color-muted]">
            {session.user.name ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-[--color-border] px-2.5 py-1 text-[12px] text-[--color-muted] hover:bg-[--color-surface-2]"
            >
              ログアウト
            </button>
          </form>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
