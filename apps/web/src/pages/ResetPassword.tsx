import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input } from '@talkitout/ui';
import { CheckCircle, KeyRound, Loader2 } from 'lucide-react';
import { authAPI } from '../api/client';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setIsReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setIsReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const goToLogin = async () => {
    await supabase.auth.signOut();
    window.location.replace(`${window.location.origin}${import.meta.env.BASE_URL}#/login`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      toast.error('The passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.updatePassword(password);
      setIsComplete(true);
      toast.success('Your password has been updated.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Unable to update password.');
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
        {isComplete ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wellness-sage-100 text-wellness-sage-700">
              <CheckCircle className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="mt-3 text-sm text-muted">You can now sign in using your new password.</p>
            <Button onClick={goToLogin} className="mt-6 w-full rounded-full bg-gradient-sunset py-3 font-semibold text-white hover:brightness-110 hover:saturate-110">
              Return to sign in
            </Button>
          </div>
        ) : !isReady ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-wellness-sage-500" />
            <h1 className="mt-4 text-lg font-bold">Verifying reset link…</h1>
            <p className="mt-2 text-sm text-muted">If this takes too long, the link may have expired. Request a new one from the sign-in page.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-wellness-sage-500 text-white shadow-glow">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Choose a new password</h1>
            <p className="mb-6 mt-2 text-sm text-muted">Use at least eight characters and avoid reusing an old password.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="New password" type="password" value={password} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} minLength={8} required />
              <Input label="Confirm new password" type="password" value={confirmation} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirmation(event.target.value)} minLength={8} required />
              <Button type="submit" isLoading={isLoading} className="w-full rounded-full bg-gradient-sunset py-3 font-semibold text-white hover:brightness-110 hover:saturate-110">
                Update password
              </Button>
            </form>
          </>
        )}
      </motion.main>
    </div>
  );
};
