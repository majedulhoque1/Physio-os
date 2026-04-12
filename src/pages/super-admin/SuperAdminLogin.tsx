import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SA_EMAIL = "majedulhoqueofficials@gmail.com";

export function SuperAdminLogin() {
  const { signIn, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Already authenticated as super admin — redirect
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate("/super-admin", { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, navigate]);

  if (isAuthenticated && isSuperAdmin) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn(SA_EMAIL, password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // signIn triggers auth state change — isSuperAdmin will update.
    // Navigate after a tick to let AuthContext settle.
    setTimeout(() => navigate("/super-admin", { replace: true }), 100);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900">
            <Shield className="h-5 w-5 text-white" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
            System Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Physio OS Platform Control
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email — locked */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={SA_EMAIL}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {isLoading ? "Authenticating..." : "Access Panel"}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-5 block w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Back to clinic login
        </button>
      </div>
    </div>
  );
}
