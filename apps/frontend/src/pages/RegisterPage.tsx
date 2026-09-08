import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "@/features/auth/model/AuthContext";
import { btnPrimary } from "@/styles/buttonStyles";

export default function RegisterPage() {
  const { actions } = useAuthContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);
    setApiError(null);

    let valid = true;
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      await actions.register(username, email, password, playerName || undefined);
      navigate("/");
    } catch {
      setApiError("Registration failed. Username or email may already be taken.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto mt-10 md:mt-16">
      <h1 className="text-3xl font-bold text-ui-text mb-6">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-ui-border bg-ui-surface p-5 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-ui-border-strong rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-transparent"
              autoComplete="username"
              minLength={3}
              required
            />
            {usernameError && <p className="text-state-failed text-sm mt-1">{usernameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ui-border-strong rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-transparent"
              required
            />
            {emailError && <p className="text-state-failed text-sm mt-1">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ui-border-strong rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-transparent"
              autoComplete="new-password"
              minLength={6}
              required
            />
            {passwordError && <p className="text-state-failed text-sm mt-1">{passwordError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name <span className="text-ui-text-mute">(optional)</span>
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border border-ui-border-strong rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-transparent"
            />
          </div>
        </div>
        {apiError && <p className="text-state-failed text-sm">{apiError}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`${btnPrimary} w-full md:w-auto md:self-end md:px-10 font-semibold`}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm text-ui-text-soft">
        Already have an account?{" "}
        <Link to="/login" className="text-ui-text-soft hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
