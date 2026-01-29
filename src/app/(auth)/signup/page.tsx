"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:handleSubmit',message:'Form submitted - raw email value',data:{email:email,emailLength:email.length,emailCharCodes:Array.from(email).map(c=>c.charCodeAt(0)),emailTrimmed:email.trim(),trimmedLength:email.trim().length,hasLeadingSpace:email.startsWith(' ')||email.startsWith('\t'),hasTrailingSpace:email.endsWith(' ')||email.endsWith('\t')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:beforeSignUp',message:'About to call Supabase signUp',data:{emailBeingSent:email,emailRegexMatch:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D,E'})}).catch(()=>{});
      // #endregion
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:signUpError',message:'Supabase signUp returned error',data:{errorMessage:error.message,errorName:error.name,errorCode:(error as unknown as Record<string,unknown>).code,errorStatus:(error as unknown as Record<string,unknown>).status,fullError:JSON.stringify(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        setError(error.message);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:signUpSuccess',message:'Supabase signUp succeeded',data:{email:email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'SUCCESS'})}).catch(()=>{});
      // #endregion
      setSuccess(true);
    } catch {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:catchError',message:'Unexpected error in signup',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'UNEXPECTED'})}).catch(()=>{});
      // #endregion
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-foreground">Check your email</CardTitle>
          <CardDescription className="text-muted-foreground">
            We&apos;ve sent you a confirmation link at {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/login")} className="w-full">
            Back to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-foreground">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign up for Content Master Pro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                const newVal = e.target.value;
                // #region agent log
                if (newVal.length > 5 && newVal.includes('@')) { fetch('http://127.0.0.1:7243/ingest/ea8c74f9-e59d-42b1-847c-9b92e8afc606',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'signup/page.tsx:emailOnChange',message:'Email input changed',data:{value:newVal,length:newVal.length,charCodes:Array.from(newVal).map(c=>c.charCodeAt(0))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{}); }
                // #endregion
                setEmail(newVal);
              }}
              required
              className="bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
