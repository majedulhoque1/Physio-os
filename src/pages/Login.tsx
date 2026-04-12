import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn(email.trim(), password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Subtle decorative background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg tracking-tight">
            P
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your clinic dashboard
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-border bg-white p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-danger/5 border border-danger/10 px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Staff accounts are created by your clinic admin.
        </p>
      </div>

      {/* Hidden super admin access */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => navigate("/super-admin/login")}
          className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
        >
          System
        </button>
      </div>
    </div>
  );
}
