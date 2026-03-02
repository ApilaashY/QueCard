"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdEmail, MdLock } from "react-icons/md";
import { supabase } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid claim")) {
          setError("Incorrect email or password.");
        } else {
          setError(error.message);
        }
      } else if (data) {
        router.push("/app");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-900/10 via-black to-black"></div>
      
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome back</h1>
          <p className="text-gray-400">Log in to your QueCard account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdEmail className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600" 
                placeholder="you@example.com"
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300" htmlFor="password">
                Password
              </label>
              <Link href="#" className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MdLock className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600" 
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold transition-all shadow-lg shadow-blue-500/20 mt-6 cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {"Don't have an account?"}
          <Link href="/signup" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
