import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, AlertBox, Button, TextField } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AuthShell } from './AuthShell';

export function LoginScreen() {
  useDocumentTitle('Sign in');
  const { login, busy } = useAuth();
  const router = useRouter();
  const { toast } = useFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    setError(null);
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = 'Enter your email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      const user = await login(email, password);
      toast(`Welcome back, ${user.firstName}.`, 'success');
      if (router.canGoBack) router.goBack();
      else router.reset('home');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to sign in.');
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Your orders, wishlist and rewards are waiting."
      footer={
        <AppText variant="small" color={colors.muted}>
          New to Safwan?{' '}
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.replace('register')}>
            Create an account
          </AppText>
        </AppText>
      }
    >
      {error ? <AlertBox tone="danger" message={error} /> : null}
      <TextField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoComplete="password"
        error={fieldErrors.password}
        onSubmitEditing={submit}
      />
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.navigate('forgot-password')}>
          Forgot password?
        </AppText>
      </View>
      <Button label="Sign in" onPress={submit} loading={busy} full size="lg" />
    </AuthShell>
  );
}
