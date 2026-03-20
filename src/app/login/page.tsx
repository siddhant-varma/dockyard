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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            DockYard
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
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
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
