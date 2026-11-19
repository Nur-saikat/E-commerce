import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addressesApi } from '../../api';
import type { Address, AddressInput } from '../../api/types';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  Page,
  PageHeader,
  Spinner,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';

const emptyForm: AddressInput & { isDefault: boolean } = {
  fullName: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Bangladesh',
  isDefault: false,
};

const fieldLabels: { key: keyof AddressInput; label: string; placeholder: string; keyboardType?: 'phone-pad' | 'number-pad' }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Name of the recipient' },
  { key: 'phone', label: 'Phone number', placeholder: '01xxxxxxxxx', keyboardType: 'phone-pad' },
  { key: 'street', label: 'Street address', placeholder: 'House, road, area' },
  { key: 'city', label: 'City', placeholder: 'Dhaka' },
  { key: 'state', label: 'District / state', placeholder: 'Dhaka' },
  { key: 'postalCode', label: 'Postal code', placeholder: '1216', keyboardType: 'number-pad' },
  { key: 'country', label: 'Country', placeholder: 'Bangladesh' },
];

export function AddressesScreen() {
  useDocumentTitle('Addresses');
  return (
    <RequireAuth title="Sign in to manage addresses" message="Saved delivery addresses make checkout faster.">
      <AddressesContent />
    </RequireAuth>
  );
}

function AddressesContent() {
  const { user } = useAuth();
  const { toast, confirm } = useFeedback();
  const addresses = useAsync(() => addressesApi.list(), [user?.id]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, fullName: user?.fullName ?? '', phone: user?.phone ?? '', isDefault: !(addresses.data?.length) });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setErrors({});
    setFormOpen(true);
  };

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    fieldLabels.forEach(field => {
      if (!String(form[field.key] ?? '').trim()) nextErrors[field.key] = 'This field is required.';
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        isDefault: form.isDefault,
      };
      if (editing) await addressesApi.update(editing.id, payload);
      else await addressesApi.create(payload);
      toast(editing ? 'Address updated.' : 'Address saved.', 'success');
      setFormOpen(false);
      addresses.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this address.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (address: Address) => {
    try {
      await addressesApi.setDefault(address.id);
      toast('Default delivery address updated.', 'success');
      addresses.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to set the default address.', 'error');
    }
  };

  const remove = async (address: Address) => {
    const ok = await confirm({
      title: 'Remove this address?',
      message: 'You can add it again at any time.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await addressesApi.remove(address.id);
      toast('Address removed.', 'success');
      addresses.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to remove this address.', 'error');
    }
  };

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Addresses"
        subtitle="Delivery details for faster checkout."
        actions={<Button label="Add address" onPress={openCreate} />}
      />

      {addresses.loading && !addresses.data ? (
        <Spinner label="Loading your addresses…" />
      ) : addresses.error ? (
        <ErrorState message={addresses.error} onRetry={() => addresses.reload()} />
      ) : (addresses.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No saved addresses"
          message="Add a delivery address now, or save one during checkout."
          actionLabel="Add address"
          onAction={openCreate}
        />
      ) : (
        <View style={styles.grid}>
          {addresses.data?.map(address => (
            <Card key={address.id} style={{ flex: 1, minWidth: 260, padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                <AppText variant="title" style={{ flex: 1 }}>{address.fullName}</AppText>
                <Badge label={address.isDefault ? 'Default' : 'Saved'} tone={address.isDefault ? { bg: colors.primarySoft, fg: colors.primaryDark } : undefined} />
              </View>
              <AppText variant="small" color={colors.muted}>{address.phone}</AppText>
              <AppText variant="small">
                {address.street}
                {'\n'}
                {address.city}, {address.state} {address.postalCode}
                {'\n'}
                {address.country}
              </AppText>
              <View style={styles.actions}>
                {!address.isDefault ? (
                  <Button label="Set default" size="sm" variant="ghost" onPress={() => makeDefault(address)} />
                ) : null}
                <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(address)} />
                <Button label="Remove" size="sm" variant="ghost" onPress={() => remove(address)} textStyle={{ color: colors.danger }} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <ModalSheet
        visible={formOpen}
        title={editing ? 'Edit address' : 'Add an address'}
        subtitle="All fields are required for reliable delivery."
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setFormOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Save address'} onPress={save} loading={busy} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          {fieldLabels.map(field => (
            <TextField
              key={field.key}
              label={field.label}
              value={form[field.key]}
              onChangeText={value => setForm(prev => ({ ...prev, [field.key]: value }))}
              placeholder={field.placeholder}
              keyboardType={field.keyboardType}
              error={errors[field.key]}
              style={{ flex: 1, minWidth: 220 }}
            />
          ))}
        </View>
        <ToggleRow
          label="Use as default address"
          description="Selected automatically at checkout."
          value={form.isDefault}
          onValueChange={value => setForm(prev => ({ ...prev, isDefault: value }))}
        />
      </ModalSheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
});
