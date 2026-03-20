import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

/**
 * Login page — shows GitHub OAuth sign-in button.
 * Redirects to home if already authenticated.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white/[0.03]">
      <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-white/[0.03] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            DockYard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your projects
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
