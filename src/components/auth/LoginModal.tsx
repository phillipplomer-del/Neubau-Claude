/**
 * Login Modal Component
 * Simple name input for user registration
 */

import { useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginModal() {
  const { isLoggedIn, setUser } = useUserContext();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Don't render if already logged in
  if (isLoggedIn) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    // Validate: at least first and last name
    const parts = trimmedName.split(/\s+/);
    if (parts.length < 2 || parts.some(p => p.length < 2)) {
      setError('Bitte geben Sie Ihren Vor- und Nachnamen ein');
      return;
    }

    setUser(trimmedName);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-foreground/20 text-primary-foreground font-bold text-2xl mx-auto mb-4">
            G
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">
            Willkommen bei Galadriel
          </h1>
          <p className="mt-2 text-primary-foreground/80 text-sm">
            Ihr Business Intelligence Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="login-name" className="block text-sm font-medium text-foreground mb-2">
              Wie heißen Sie?
            </label>
            <Input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vor- und Nachname"
              autoFocus
              autoComplete="name"
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Ihr Name wird für Kommentare und zur Begrüßung verwendet.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!name.trim()}
          >
            Anmelden
          </Button>
        </form>
      </div>
    </div>
  );
}
