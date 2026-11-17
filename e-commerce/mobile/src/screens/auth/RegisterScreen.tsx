import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppText, AlertBox, Button, TextField } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AuthShell } from './AuthShell';

export function RegisterScreen() {
  useDocumentTitle('Create account');
  const { requestRegistrationOtp, verifyRegistration, busy } = useAuth();
  const router = useRouter();
  const { toast } = useFeedback();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (step !== 'verify' || resendIn <= 0) return;
    const timer = setInterval(() => setResendIn(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, resendIn]);

  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const sendCode = async () => {
    setError(null);
    if (!validateDetails()) return;
    try {
      const challenge = await requestRegistrationOtp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      setStep('verify');
      setCode('');
      setResendIn(challenge.resendAfterSeconds);
      if (challenge.otp) toast(`Development code: ${challenge.otp}`, 'info');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to send the verification code.');
    }
  };

  const verify = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    try {
      const user = await verifyRegistration(form.email, code);
      toast(`Welcome to Safwan, ${user.firstName}.`, 'success');
      router.reset('home');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to verify that code.');
    }
  };

  const editDetails = () => {
    setStep('details');
    setCode('');
    setError(null);
  };

  if (step === 'verify') {
    return (
      <AuthShell
        title="Verify your email"
        subtitle={`Enter the 6-digit code we sent to ${form.email.trim()}. Your account is created once the code is confirmed.`}
        footer={
          <AppText variant="small" color={colors.muted}>
            Wrong email?{' '}
            <AppText variant="small" weight="600" color={colors.primary} onPress={editDetails}>
              Edit your details
            </AppText>
          </AppText>
        }
      >
        {error ? <AlertBox tone="danger" message={error} /> : null}
        <TextField
          label="Verification code"
          value={code}
          onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
        <Button label="Verify & create account" onPress={verify} loading={busy} full size="lg" />
        <Button
          label={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          variant="outline"
          onPress={sendCode}
          disabled={busy || resendIn > 0}
          full
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="We'll email you a 6-digit code to confirm your address."
      footer={
        <AppText variant="small" color={colors.muted}>
          Already have an account?{' '}
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.replace('login')}>
            Sign in
          </AppText>
        </AppText>
      }
    >
      {error ? <AlertBox tone="danger" message={error} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 150 }}>
          <TextField label="First name" value={form.firstName} onChangeText={set('firstName')} placeholder="Ayesha" error={fieldErrors.firstName} />
        </View>
        <View style={{ flex: 1, minWidth: 150 }}>
          <TextField label="Last name" value={form.lastName} onChangeText={set('lastName')} placeholder="Rahman" error={fieldErrors.lastName} />
        </View>
      </View>
      <TextField
        label="Email address"
        value={form.email}
        onChangeText={set('email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
      />
      <TextField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={set('phone')}
        placeholder="+880 1XXX XXXXXX"
        keyboardType="phone-pad"
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={set('password')}
        placeholder="At least 8 characters"
        secureTextEntry
        error={fieldErrors.password}
      />
      <TextField
        label="Confirm password"
        value={form.confirm}
        onChangeText={set('confirm')}
        placeholder="Repeat your password"
        secureTextEntry
        error={fieldErrors.confirm}
        onSubmitEditing={sendCode}
      />
      <Button label="Send verification code" onPress={sendCode} loading={busy} full size="lg" />
    </AuthShell>
  );
}
