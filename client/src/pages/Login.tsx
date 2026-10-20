import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { Button, ErrorNote, Field } from "../components/ui";

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(name, email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <svg viewBox="0 0 32 32" className="size-12" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--sunken)" strokeWidth="5" />
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--protein)" strokeWidth="5" strokeDasharray="22 82" transform="rotate(-90 16 16)" />
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--carbs)" strokeWidth="5" strokeDasharray="20 82" strokeDashoffset="-25" transform="rotate(-90 16 16)" />
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--fat)" strokeWidth="5" strokeDasharray="12 82" strokeDashoffset="-48" transform="rotate(-90 16 16)" />
      </svg>
      <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight">Plate</h1>
      <p className="mt-2 text-ink-soft">Log what you eat and see where your calories come from.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          hint={mode === "signup" ? "At least 8 characters" : undefined}
        />
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
          }}
          className="font-bold text-brand underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </main>
  );
}
