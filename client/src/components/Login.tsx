
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, Warehouse, LoaderCircle } from "lucide-react";
import { authService, type AuthUser } from "../services/authService";
import { useToast } from "./ToastProvider.tsx";
import "./Login.css";

interface LoginProps {
  onAuthenticated: (user: AuthUser) => void;
}

function Login({ onAuthenticated }: LoginProps) {
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const user = await authService.login(email.trim(), password);
      onAuthenticated(user);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Warehouse size={27} />
          </div>
          <h1>StockFlow</h1>
          <p>WAREHOUSE INVENTORY MANAGEMENT</p>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p>Enter your account details to access your inventory.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrapper">
              <LockKeyhole size={17} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <><LoaderCircle size={17} className="action-spinner" /> Signing in...</>
            ) : "Sign in to StockFlow"}
          </button>
        </form>

        <div className="login-security">
          <LockKeyhole size={14} />
          <span>Secure access to your warehouse workspace</span>
        </div>

        <footer className="login-footer">
          © {new Date().getFullYear()} StockFlow
        </footer>
      </section>
    </main>
  );
}

export default Login;