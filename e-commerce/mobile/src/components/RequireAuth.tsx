import React from 'react';
import { useAuth } from '../state/AuthContext';
import { useRouter } from '../navigation/Router';
import { EmptyState, Page, Spinner } from './ui';

export function RequireAuth({
  children,
  title = 'Sign in to continue',
  message = 'Your account keeps your orders, addresses and rewards in one place.',
}: {
  children: React.ReactNode;
  title?: string;
  message?: string;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  if (!ready) {
    return (
      <Page>
        <Spinner label="Checking your session…" />
      </Page>
    );
  }
  if (!user) {
    return (
      <Page>
        <EmptyState
          title={title}
          message={message}
          actionLabel="Sign in"
          onAction={() => router.navigate('login')}
        />
      </Page>
    );
  }
  return <>{children}</>;
}
