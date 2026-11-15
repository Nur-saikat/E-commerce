import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { couponsApi } from '../../api';
import type { Coupon, CouponRequest } from '../../api/types';
import {
  AppText,
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
import { date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

interface Draft {
  code: string;
  description: string;
  type: string;
  value: string;
  minimumPurchase: string;
  maximumDiscount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
}

const emptyDraft: Draft = {
  code: '',
  description: '',
  type: 'Percentage',
  value: '',
  minimumPurchase: '0',
  maximumDiscount: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
};

export function AdminCouponsScreen() {
  useDocumentTitle('Coupons');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const coupons = useAsync(() => couponsApi.list({ page, pageSize: 10, search: submitted || undefined }), [page, submitted]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setDraft({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: String(coupon.value),
      minimumPurchase: String(coupon.minimumPurchase),
      maximumDiscount: coupon.maximumDiscount != null ? String(coupon.maximumDiscount) : '',
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 10) : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
      perUserLimit: String(coupon.perUserLimit),
      isActive: coupon.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.code.trim()) {
      toast('Coupon code is required.', 'error');
      return;
    }
    const value = Number(draft.value);
    if (!Number.isFinite(value) || value <= 0 || (draft.type === 'Percentage' && value > 100)) {
      toast('Enter a valid discount value.', 'error');
      return;
    }
    const payload: CouponRequest = {
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim() || 'Discount coupon',
      type: draft.type,
      value,
      minimumPurchase: Number(draft.minimumPurchase) || 0,
      maximumDiscount: draft.maximumDiscount.trim() ? Number(draft.maximumDiscount) : null,
      startsAt: draft.startsAt.trim() || null,
      expiresAt: draft.expiresAt.trim() || null,
      usageLimit: draft.usageLimit.trim() ? Number(draft.usageLimit) : null,
      perUserLimit: Number(draft.perUserLimit) || 1,
      userIds: editing?.userIds ?? [],
      isActive: draft.isActive,
    };
    setSaving(true);
    try {
      if (editing) await couponsApi.update(editing.id, payload);
      else await couponsApi.create(payload);
      toast(editing ? 'Coupon updated.' : 'Coupon created.', 'success');
      setOpen(false);
      coupons.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this coupon.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (coupon: Coupon) => {
    const ok = await confirm({ title: `Delete ${coupon.code}?`, message: 'Shoppers will no longer be able to use this code.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await couponsApi.remove(coupon.id);
      toast('Coupon deleted.', 'success');
      coupons.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this coupon.', 'error');
    }
  };

  return (
    <AdminPage title="Coupons" subtitle="Discount codes for campaigns and loyal customers." actions={<Button label="New coupon" onPress={openCreate} />}>
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search coupon code…"
          style={{ maxWidth: 420 }}
        />
      </Toolbar>

      {coupons.loading && !coupons.data ? (
        <Spinner label="Loading coupons…" />
      ) : coupons.error ? (
        <ErrorState message={coupons.error} onRetry={() => coupons.reload()} />
      ) : (coupons.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No coupons yet" message="Create a code to run your first promotion." actionLabel="New coupon" onAction={openCreate} />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            {coupons.data?.items.map(coupon => (
              <Card key={coupon.id} style={{ padding: spacing.lg }}>
                <View style={styles.row}>
                  <View style={{ flex: 1, minWidth: 200, gap: 3 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <AppText variant="title">{coupon.code}</AppText>
                      <Badge label={coupon.type === 'Percentage' ? `${coupon.value}% off` : `${fmt(coupon.value)} off`} />
                      {!coupon.isActive ? <Badge label="Inactive" /> : null}
                      {coupon.isValid ? <Badge label="Live" tone={{ bg: colors.successSoft, fg: colors.success }} /> : null}
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {coupon.description} · min spend {fmt(coupon.minimumPurchase)}
                      {coupon.maximumDiscount != null ? ` · max discount ${fmt(coupon.maximumDiscount)}` : ''}
                    </AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      Used {coupon.usedCount}
                      {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ''} · {coupon.perUserLimit} per customer
                      {coupon.startsAt ? ` · from ${date(coupon.startsAt)}` : ''}
                      {coupon.expiresAt ? ` · until ${date(coupon.expiresAt)}` : ''}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                    <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(coupon)} />
                    <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(coupon)} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
          {coupons.data ? (
            <Pagination
              page={coupons.data.pagination.page}
              totalPages={coupons.data.pagination.totalPages}
              totalItems={coupons.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit coupon' : 'New coupon'}
        onClose={() => setOpen(false)}
        width={620}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create coupon'} onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Code"
            value={draft.code}
            onChangeText={value => setDraft(prev => ({ ...prev, code: value.toUpperCase() }))}
            autoCapitalize="characters"
            placeholder="SAFWAN10"
            style={{ flex: 1, minWidth: 180 }}
          />
          <SelectField
            label="Discount type"
            value={draft.type}
            options={[
              { label: 'Percentage', value: 'Percentage' },
              { label: 'Fixed amount', value: 'Fixed' },
            ]}
            onChange={value => setDraft(prev => ({ ...prev, type: value }))}
            style={{ flex: 1, minWidth: 180 }}
          />
          <TextField
            label={draft.type === 'Percentage' ? 'Percent off' : 'Amount off'}
            value={draft.value}
            onChangeText={value => setDraft(prev => ({ ...prev, value: value }))}
            keyboardType="decimal-pad"
            style={{ flex: 1, minWidth: 140 }}
          />
        </View>
        <TextField label="Description" value={draft.description} onChangeText={value => setDraft(prev => ({ ...prev, description: value }))} />
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Minimum spend" value={draft.minimumPurchase} onChangeText={value => setDraft(prev => ({ ...prev, minimumPurchase: value }))} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Maximum discount" value={draft.maximumDiscount} onChangeText={value => setDraft(prev => ({ ...prev, maximumDiscount: value }))} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Total uses" value={draft.usageLimit} onChangeText={value => setDraft(prev => ({ ...prev, usageLimit: value }))} keyboardType="number-pad" placeholder="Unlimited" style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Per customer" value={draft.perUserLimit} onChangeText={value => setDraft(prev => ({ ...prev, perUserLimit: value }))} keyboardType="number-pad" style={{ flex: 1, minWidth: 140 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Starts (YYYY-MM-DD)" value={draft.startsAt} onChangeText={value => setDraft(prev => ({ ...prev, startsAt: value }))} placeholder="2026-01-01" style={{ flex: 1, minWidth: 180 }} />
          <TextField label="Expires (YYYY-MM-DD)" value={draft.expiresAt} onChangeText={value => setDraft(prev => ({ ...prev, expiresAt: value }))} placeholder="2026-12-31" style={{ flex: 1, minWidth: 180 }} />
        </View>
        <ToggleRow label="Active" description="Inactive coupons are rejected at checkout." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
});
