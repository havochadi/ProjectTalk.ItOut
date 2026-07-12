import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input } from '@talkitout/ui';
import { ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await authAPI.requestPasswordReset(email);
      setIsSent(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Unable to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-text">
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <Link to="/login" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        {isSent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wellness-sage-100 text-wellness-sage-700">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              If an account exists for <span className="font-semibold text-text">{email}</span>, Supabase has sent a password reset link. Check your spam folder too.
            </p>
            <button
              type="button"
              onClick={() => setIsSent(false)}
              className="mt-6 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text"
            >
              Try another email
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-wellness-sage-500 text-white shadow-glow">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
              Enter your account email and we’ll send you a secure link to choose a new password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-[2.55rem] h-4 w-4 text-muted" />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" isLoading={isLoading} className="w-full rounded-full bg-[#13111C] py-3 font-semibold text-white hover:bg-wellness-sage-700">
                Send reset link
              </Button>
            </form>
          </>
        )}
      </motion.main>
    </div>
  );
};
