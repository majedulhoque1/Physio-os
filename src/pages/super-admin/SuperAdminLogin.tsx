import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "@/styles/super-admin.css";

const SA_EMAIL = "majedulhoqueofficial@gmail.com";

export function SuperAdminLogin() {
  const { signIn, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate("/super-admin", { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, navigate]);

  if (isAuthenticated && isSuperAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await signIn(SA_EMAIL, password);
    setIsLoading(false);
    if (result.error) { setError(result.error); return; }
    setTimeout(() => navigate("/super-admin", { replace: true }), 100);
  }

  return (
    <div
      className="nb-bg flex min-h-screen items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span
            className="mx-auto inline-flex h-12 w-12 items-center justify-center"
            style={{ background: "#4ADE80", border: "3px solid #000", borderRadius: "2px" }}
          >
            <Shield className="h-6 w-6 text-black" />
          </span>
          <h1 className="nb-heading mt-4 text-4xl text-black">
            System Admin
          </h1>
          <p className="mt-1 text-sm font-bold text-gray-600 uppercase tracking-wider">
            Physio OS Platform Control
          </p>
        </div>

        {/* Login card */}
        <div className="nb-modal p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={SA_EMAIL}
                disabled
                className="nb-input w-full px-3.5 py-2.5 text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-black uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                className="nb-input w-full px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p
                className="px-3.5 py-2.5 text-sm font-bold text-black"
                style={{ border: "2px solid #000", background: "#FF79C6", borderRadius: "2px" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="nb-btn w-full bg-black px-4 py-2.5 text-sm text-white"
            >
              {isLoading ? "Authenticating..." : "Access Panel"}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-5 block w-full text-center text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wider"
        >
          Back to clinic login
        </button>
      </div>
    </div>
  );
}
