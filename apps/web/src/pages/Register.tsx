import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input } from '@talkitout/ui';
import { useAuth } from '../contexts/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    school: '',
    guardianConsent: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register({ ...formData, age: parseInt(formData.age), role: 'student' });
      navigate('/app/dashboard');
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 gradient-wellness">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <img
            src={`${import.meta.env.BASE_URL}TIO.png`}
            alt="Talk.ItOut"
            className="h-16 w-16 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-text">Create your account</h1>
          <p className="text-sm text-muted mt-1">Start your wellness journey today</p>
        </div>

        <div className="card-wellness p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              helperText="At least 8 characters"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Age"
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="15"
                min="10"
                max="19"
                required
              />
              <Input
                label="School (optional)"
                name="school"
                value={formData.school}
                onChange={handleChange}
                placeholder="Your school"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="guardianConsent"
                checked={formData.guardianConsent}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded accent-wellness-sage-500"
                required
              />
              <span className="text-xs text-muted leading-relaxed">
                I confirm that I have guardian consent to use this service (required for users under 18)
              </span>
            </label>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#13111C] py-3 font-semibold text-white hover:bg-wellness-sage-700 transition-all"
              isLoading={isLoading}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <span className="text-muted">Already have an account? </span>
            <Link to="/login" className="font-semibold text-wellness-sage-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Crisis Support: <strong className="text-wellness-sage-600">999</strong> · Samaritans <strong className="text-wellness-sage-600">1767</strong>
        </p>
      </motion.div>
    </div>
  );
};
