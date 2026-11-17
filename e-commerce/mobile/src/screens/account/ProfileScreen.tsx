import React, { useState } from 'react';
import { View } from 'react-native';
import { authApi } from '../../api';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AlertBox,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Page,
  PageHeader,
  TextField,
} from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';

export function ProfileScreen() {
  useDocumentTitle('Profile');
  return (
    <RequireAuth title="Sign in to edit your profile" message="Manage your name, contact details and password.">
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const { user, updateUser } = useAuth();
  const { toast } = useFeedback();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const saveAvatar = async (url: string) => {
    setAvatarUrl(url);
    try {
      const updated = await authApi.updateProfile({
        firstName: user?.firstName ?? firstName.trim(),
        lastName: user?.lastName ?? lastName.trim(),
        phone: user?.phone ?? (phone.trim() || null),
        avatarUrl: url,
      });
      updateUser(updated);
      toast('Profile photo updated.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save your photo.', 'error');
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast('First and last name are required.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      updateUser(updated);
      toast('Profile updated.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast('Use at least 8 characters for your new password.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('The new passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast('Password changed successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to change your password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Page gap={spacing.xl}>
      <PageHeader back title="Profile & security" subtitle="Keep your contact details up to date for smooth deliveries." />

      <Card style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Avatar name={user?.fullName ?? user?.email} url={avatarUrl || user?.avatarUrl} size={72} />
            <ImageUploadButton
              purpose="avatar"
              size="sm"
              label="Change photo"
              onUploaded={urls => {
                if (urls[0]) void saveAvatar(urls[0]);
              }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
            <AppText variant="h3">{user?.fullName}</AppText>
            <AppText variant="small" color={colors.muted}>{user?.email}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={user?.role ?? 'Customer'} />
              <Badge
                label={user?.emailVerified ? 'Email verified' : 'Email unverified'}
                tone={user?.emailVerified ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
              />
            </View>
          </View>
        </View>

        <Divider />

        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="First name" value={firstName} onChangeText={setFirstName} style={{ flex: 1, minWidth: 200 }} />
          <TextField label="Last name" value={lastName} onChangeText={setLastName} style={{ flex: 1, minWidth: 200 }} />
          <TextField
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="01xxxxxxxxx"
            style={{ flex: 1, minWidth: 200 }}
          />
        </View>
        <TextField label="Email address" value={user?.email ?? ''} editable={false} helper="Contact support to change your sign-in email." />
        <Button label="Save profile" onPress={saveProfile} loading={savingProfile} style={{ alignSelf: 'flex-start' }} />
      </Card>

      <Card style={{ padding: spacing.xl, gap: spacing.lg }}>
        <AppText variant="h3">Change password</AppText>
        <TextField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            helper="At least 8 characters."
            style={{ flex: 1, minWidth: 200 }}
          />
          <TextField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            style={{ flex: 1, minWidth: 200 }}
          />
        </View>
        <Button
          label="Update password"
          variant="secondary"
          onPress={savePassword}
          loading={savingPassword}
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      <AlertBox
        tone="info"
        title="Session security"
        message="Safwan uses short-lived access tokens with rotating refresh tokens. Changing your password signs out other devices at the next token refresh."
      />
    </Page>
  );
}
