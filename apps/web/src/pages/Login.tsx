import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input } from '@talkitout/ui';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ShieldCheck, Heart } from 'lucide-react';

const demoAccounts = [
  { label: 'Student demo', email: 'weijie@student.sg', password: 'password123' },
  { label: 'Counselor demo', email: 'counselor@talkitout.sg', password: 'password123' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/app/dashboard');
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoading(true);
    try {
      await login(demoEmail, demoPassword);
      navigate('/app/dashboard');
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex gradient-wellness">
      {/* Left panel — brand & warmth */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16 bg-[#13111C] relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-wellness-sage-600/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#E86FA0]/15 blur-3xl" />

        <div className="relative z-10 text-center text-white">
          <motion.div
            className="mb-8 mx-auto"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}TIO.png`}
              alt="Talk.ItOut"
              className="h-40 w-40 object-contain mx-auto drop-shadow-lg"
            />
          </motion.div>

          <h1 className="text-4xl font-bold mb-4 tracking-tight">Talk.ItOut</h1>
          <p className="text-lg text-white mb-10 max-w-sm leading-relaxed">
            A safe, supportive space for your mental wellbeing journey.
          </p>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {[
              { icon: Sparkles, text: 'AI companion that listens without judgment' },
              { icon: ShieldCheck, text: 'Private & secure — your data stays yours' },
              { icon: Heart, text: 'Built for students, powered by care' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-4 w-4" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <img
              src={`${import.meta.env.BASE_URL}TIO.png`}
              alt="Talk.ItOut"
              className="h-20 w-20 object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-text">Talk.ItOut</h1>
            <p className="text-sm text-muted">Your mental wellness companion</p>
          </div>

          <div className="card-wellness p-8">
            <h2 className="text-2xl font-bold text-text mb-1">Welcome back</h2>
            <p className="text-sm text-muted mb-7">We're glad you're here. Let's take care of you.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                className="w-full rounded-full bg-[#13111C] py-3 font-semibold text-white hover:bg-wellness-sage-700 transition-all"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted">New here? </span>
              <Link to="/register" className="font-semibold text-wellness-sage-600 hover:underline">
                Create an account
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface-alt p-4">
              <p className="text-xs font-semibold text-muted mb-1">Demo accounts</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleDemoLogin(account.email, account.password)}
                    className="w-full text-xs"
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted leading-relaxed">
                Password for both: <span className="font-medium text-text">password123</span>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Crisis Support: <strong className="text-wellness-sage-500">999</strong> · Samaritans <strong className="text-wellness-sage-500">1767</strong>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
