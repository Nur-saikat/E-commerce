import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import type { Customer, Role } from '../../api/types';
import { PERMISSIONS } from '../../api/types';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  Pagination,
  SearchInput,
  SelectField,
  Spinner,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { date, dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

export function AdminCustomersScreen() {
  useDocumentTitle('Customers');
  const { fmt } = useSettings();
  const { toast } = useFeedback();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.customersManage);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const customers = useAsync(() => adminApi.customers({ page, pageSize: 12, search: submitted || undefined }), [page, submitted]);
  const roles = useAsync<Role[]>(async () => {
    if (!canManage) return [];
    try {
      return await adminApi.roles();
    } catch {
      return [];
    }
  }, [canManage]);

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setPhone(customer.phone ?? '');
    setRole(customer.role);
    setIsActive(customer.isActive);
  };

  const save = async () => {
    if (!editing) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast('First and last name are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateCustomer(editing.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        isActive,
        role: role || undefined,
      });
      toast('Customer updated.', 'success');
      setEditing(null);
      customers.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update this customer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Customers" subtitle="Accounts, order history and access levels.">
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search name or email…"
          style={{ maxWidth: 420 }}
        />
        <Button
          label="Reset"
          variant="ghost"
          onPress={() => {
            setSearch('');
            setSubmitted('');
            setPage(1);
          }}
        />
      </Toolbar>

      {customers.loading && !customers.data ? (
        <Spinner label="Loading customers…" />
      ) : customers.error ? (
        <ErrorState message={customers.error} onRetry={() => customers.reload()} />
      ) : (customers.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No customers found" message="Try a different search term." />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            {customers.data?.items.map(customer => (
              <Card key={customer.id} style={{ padding: spacing.lg }}>
                <View style={styles.row}>
                  <Avatar name={customer.fullName} size={40} />
                  <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <AppText variant="title">{customer.fullName}</AppText>
                      <Badge label={customer.role} />
                      {!customer.isActive ? <Badge label="Disabled" tone={{ bg: colors.dangerSoft, fg: colors.danger }} /> : null}
                      {customer.emailVerified ? <Badge label="Verified" tone={{ bg: colors.successSoft, fg: colors.success }} /> : null}
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {customer.email}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                    </AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      Joined {date(customer.createdAt)}
                      {customer.lastLoginAt ? ` · Last seen ${dateTime(customer.lastLoginAt)}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="small" weight="600">{customer.orderCount} orders</AppText>
                    <AppText variant="tiny" color={colors.muted}>{fmt(customer.totalSpent)} spent</AppText>
                  </View>
                  {canManage ? <Button label="Manage" size="sm" variant="outline" onPress={() => openEdit(customer)} /> : null}
                </View>
              </Card>
            ))}
          </View>
          {customers.data ? (
            <Pagination
              page={customers.data.pagination.page}
              totalPages={customers.data.pagination.totalPages}
              totalItems={customers.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={!!editing}
        title="Manage customer"
        subtitle={editing?.email}
        onClose={() => setEditing(null)}
        width={560}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(null)} />
            <Button label="Save changes" onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="First name" value={firstName} onChangeText={setFirstName} style={{ flex: 1, minWidth: 180 }} />
          <TextField label="Last name" value={lastName} onChangeText={setLastName} style={{ flex: 1, minWidth: 180 }} />
        </View>
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {(roles.data?.length ?? 0) > 0 ? (
          <SelectField
            label="Role"
            value={role}
            options={roles.data!.map(item => ({ label: item.name, value: item.name }))}
            onChange={setRole}
          />
        ) : (
          <AppText variant="tiny" color={colors.faint}>Role changes require role administration access.</AppText>
        )}
        <ToggleRow label="Account active" description="Disabled accounts cannot sign in or place orders." value={isActive} onValueChange={setIsActive} />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
});
