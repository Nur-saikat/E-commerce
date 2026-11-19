import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import type { Settings, ShippingMethod, ShippingMethodRequest } from '../../api/types';
import {
  AppText,
  AlertBox,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  ModalSheet,
  Spinner,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage } from './AdminKit';

type NumericKey = 'taxRate' | 'flatShippingRate' | 'freeShippingThreshold' | 'voucherPointValue' | 'voucherEarnPercent' | 'voucherMaxRedeemPercent';

type Draft = Omit<Settings, NumericKey> & Record<NumericKey, string>;

const numericKeys: NumericKey[] = [
  'taxRate',
  'flatShippingRate',
  'freeShippingThreshold',
  'voucherPointValue',
  'voucherEarnPercent',
  'voucherMaxRedeemPercent',
];

function toDraft(settings: Settings): Draft {
  const draft: any = { ...settings };
  numericKeys.forEach(key => {
    draft[key] = String(settings[key] ?? 0);
  });
  return draft as Draft;
}

export function AdminSettingsScreen() {
  useDocumentTitle('Settings');
  const { settings, reload } = useSettings();
  const { toast } = useFeedback();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(toDraft(settings));
  }, [settings]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!draft.storeName.trim()) {
      toast('Store name is required.', 'error');
      return;
    }
    const payload: Settings = {
      ...(draft as unknown as Settings),
      taxRate: Number(draft.taxRate) || 0,
      flatShippingRate: Number(draft.flatShippingRate) || 0,
      freeShippingThreshold: Number(draft.freeShippingThreshold) || 0,
      voucherPointValue: Number(draft.voucherPointValue) || 0,
      voucherEarnPercent: Number(draft.voucherEarnPercent) || 0,
      voucherMaxRedeemPercent: Math.min(100, Number(draft.voucherMaxRedeemPercent) || 0),
      storeName: draft.storeName.trim(),
    };
    setSaving(true);
    try {
      await adminApi.updateSettings(payload);
      await reload();
      toast('Store settings saved.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Settings"
      subtitle="Store identity, payments, rewards and delivery."
      actions={<Button label="Save changes" onPress={save} loading={saving} />}
    >
      <View style={styles.columns}>
        <Card style={{ flex: 1, minWidth: 300, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Store identity</AppText>
          <TextField label="Store name" value={draft.storeName} onChangeText={value => set('storeName', value)} />
          <TextField label="Tagline" value={draft.tagline ?? ''} onChangeText={value => set('tagline', value)} />
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField label="Logo URL" value={draft.logoUrl ?? ''} onChangeText={value => set('logoUrl', value)} autoCapitalize="none" style={{ flex: 1, minWidth: 220 }} />
            <ImageUploadButton onUploaded={urls => set('logoUrl', urls[0])} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField label="Support email" value={draft.email ?? ''} onChangeText={value => set('email', value)} autoCapitalize="none" style={{ flex: 1, minWidth: 200 }} />
            <TextField label="Support phone" value={draft.phone ?? ''} onChangeText={value => set('phone', value)} keyboardType="phone-pad" style={{ flex: 1, minWidth: 180 }} />
          </View>
          <TextField label="Address" value={draft.address ?? ''} onChangeText={value => set('address', value)} multiline />
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField label="Currency code" value={draft.currency} onChangeText={value => set('currency', value.toUpperCase())} style={{ flex: 1, minWidth: 140 }} />
            <TextField label="Currency symbol" value={draft.currencySymbol} onChangeText={value => set('currencySymbol', value)} style={{ flex: 1, minWidth: 140 }} />
          </View>
          <TextField label="Footer about" value={draft.footerAbout ?? ''} onChangeText={value => set('footerAbout', value)} multiline />
          <TextField label="Copyright text" value={draft.copyrightText ?? ''} onChangeText={value => set('copyrightText', value)} />
        </Card>

        <Card style={{ flex: 1, minWidth: 300, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Pricing & delivery</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField label="Tax rate (%)" value={draft.taxRate} onChangeText={value => set('taxRate', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 130 }} />
            <TextField label="Flat shipping rate" value={draft.flatShippingRate} onChangeText={value => set('flatShippingRate', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 150 }} />
          </View>
          <TextField
            label="Free shipping threshold"
            value={draft.freeShippingThreshold}
            onChangeText={value => set('freeShippingThreshold', value)}
            keyboardType="decimal-pad"
            helper="Orders at or above this subtotal ship free. Set 0 to disable."
          />
          <Divider />
          <AppText variant="h3">Reward points</AppText>
          <ToggleRow label="Enable voucher points" description="Customers earn and redeem points." value={draft.voucherPointsEnabled} onValueChange={value => set('voucherPointsEnabled', value)} />
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField label="Point value" value={draft.voucherPointValue} onChangeText={value => set('voucherPointValue', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 130 }} />
            <TextField label="Earn percent" value={draft.voucherEarnPercent} onChangeText={value => set('voucherEarnPercent', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 130 }} />
            <TextField label="Max redeem percent" value={draft.voucherMaxRedeemPercent} onChangeText={value => set('voucherMaxRedeemPercent', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 150 }} />
          </View>
        </Card>
      </View>

      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <AppText variant="h3">Payment methods</AppText>
        <ToggleRow label="Cash on delivery" description="Collect payment when the order arrives." value={draft.codEnabled} onValueChange={value => set('codEnabled', value)} />
        <ToggleRow label="Stripe" description="Card payments handled securely by Stripe." value={draft.stripeEnabled} onValueChange={value => set('stripeEnabled', value)} />
        <ToggleRow label="SSLCommerz" description="Local card and bank gateway." value={draft.sslCommerzEnabled} onValueChange={value => set('sslCommerzEnabled', value)} />
        <Divider />
        <ToggleRow label="bKash" description="Manual mobile banking verification." value={draft.bkashEnabled} onValueChange={value => set('bkashEnabled', value)} />
        {draft.bkashEnabled ? <TextField label="bKash merchant number" value={draft.bkashMerchantNumber ?? ''} onChangeText={value => set('bkashMerchantNumber', value)} keyboardType="phone-pad" /> : null}
        <ToggleRow label="Nagad" description="Manual mobile banking verification." value={draft.nagadEnabled} onValueChange={value => set('nagadEnabled', value)} />
        {draft.nagadEnabled ? <TextField label="Nagad merchant number" value={draft.nagadMerchantNumber ?? ''} onChangeText={value => set('nagadMerchantNumber', value)} keyboardType="phone-pad" /> : null}
        <ToggleRow label="Rocket" description="Manual mobile banking verification." value={draft.rocketEnabled} onValueChange={value => set('rocketEnabled', value)} />
        {draft.rocketEnabled ? <TextField label="Rocket merchant number" value={draft.rocketMerchantNumber ?? ''} onChangeText={value => set('rocketMerchantNumber', value)} keyboardType="phone-pad" /> : null}
        <AlertBox
          tone="info"
          message="Card details are never stored on Safwan servers. Mobile banking payments are verified by staff from the order detail screen."
        />
      </Card>

      <ShippingMethodsPanel />

      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
          <AppText variant="h3">Navigation menu</AppText>
          <Button label="Add menu item" size="sm" variant="outline" onPress={() => set('menuItems', [...draft.menuItems, { label: '', url: '', sortOrder: draft.menuItems.length }])} />
        </View>
        {draft.menuItems.length === 0 ? <AppText variant="small" color={colors.faint}>Using the default navigation.</AppText> : null}
        {draft.menuItems.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField label="Label" value={item.label} onChangeText={value => set('menuItems', draft.menuItems.map((entry, i) => (i === index ? { ...entry, label: value } : entry)))} style={{ flex: 1, minWidth: 160 }} />
            <TextField label="URL" value={item.url} onChangeText={value => set('menuItems', draft.menuItems.map((entry, i) => (i === index ? { ...entry, url: value } : entry)))} style={{ flex: 2, minWidth: 200 }} autoCapitalize="none" />
            <Button label="Remove" variant="ghost" size="sm" textStyle={{ color: colors.danger }} onPress={() => set('menuItems', draft.menuItems.filter((_, i) => i !== index))} />
          </View>
        ))}
      </Card>

      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
          <AppText variant="h3">Social links</AppText>
          <Button
            label="Add link"
            size="sm"
            variant="outline"
            onPress={() => {
              const nextNetwork = ['facebook', 'instagram', 'tiktok', 'youtube', 'x'].find(key => !(key in draft.socialLinks));
              if (!nextNetwork) {
                toast('All suggested networks are already listed.', 'info');
                return;
              }
              set('socialLinks', { ...draft.socialLinks, [nextNetwork]: '' });
            }}
          />
        </View>
        {Object.entries(draft.socialLinks).map(([key, value]) => (
          <View key={key} style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField label="Network" value={key} editable={false} style={{ flex: 1, minWidth: 140 }} />
            <TextField
              label="URL"
              value={value}
              onChangeText={next => set('socialLinks', { ...draft.socialLinks, [key]: next })}
              style={{ flex: 2, minWidth: 220 }}
              autoCapitalize="none"
            />
            <Button
              label="Remove"
              variant="ghost"
              size="sm"
              textStyle={{ color: colors.danger }}
              onPress={() => {
                const next = { ...draft.socialLinks };
                delete next[key];
                set('socialLinks', next);
              }}
            />
          </View>
        ))}
        {Object.keys(draft.socialLinks).length === 0 ? <AppText variant="small" color={colors.faint}>No social links added.</AppText> : null}
      </Card>

      <Button label="Save changes" onPress={save} loading={saving} style={{ alignSelf: 'flex-end' }} />
    </AdminPage>
  );
}

function ShippingMethodsPanel() {
  const { toast, confirm } = useFeedback();
  const methods = useAsync(() => adminApi.shippingMethods(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingMethod | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', cost: '0', min: '1', max: '3', isActive: true, isDefault: false });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: '', description: '', cost: '0', min: '1', max: '3', isActive: true, isDefault: false });
    setOpen(true);
  };

  const openEdit = (method: ShippingMethod) => {
    setEditing(method);
    setDraft({
      name: method.name,
      description: method.description ?? '',
      cost: String(method.cost),
      min: String(method.estimatedDaysMin),
      max: String(method.estimatedDaysMax),
      isActive: method.isActive,
      isDefault: method.isDefault,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast('Shipping method name is required.', 'error');
      return;
    }
    const payload: ShippingMethodRequest = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      cost: Number(draft.cost) || 0,
      estimatedDaysMin: Number(draft.min) || 0,
      estimatedDaysMax: Number(draft.max) || 0,
      isActive: draft.isActive,
      isDefault: draft.isDefault,
    };
    setSaving(true);
    try {
      if (editing) await adminApi.updateShippingMethod(editing.id, payload);
      else await adminApi.createShippingMethod(payload);
      toast(editing ? 'Shipping method updated.' : 'Shipping method created.', 'success');
      setOpen(false);
      methods.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this shipping method.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (method: ShippingMethod) => {
    const ok = await confirm({ title: `Delete ${method.name}?`, message: 'Orders already placed keep this method on their record.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteShippingMethod(method.id);
      toast('Shipping method deleted.', 'success');
      methods.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this shipping method.', 'error');
    }
  };

  return (
    <Card style={{ padding: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
        <AppText variant="h3">Shipping methods</AppText>
        <Button label="New method" size="sm" onPress={openCreate} />
      </View>
      {methods.loading && !methods.data ? (
        <Spinner />
      ) : methods.error ? (
        <ErrorState message={methods.error} onRetry={() => methods.reload()} />
      ) : (methods.data?.length ?? 0) === 0 ? (
        <AppText variant="small" color={colors.faint}>No shipping methods configured.</AppText>
      ) : (
        methods.data?.map(method => (
          <View key={method.id} style={styles.methodRow}>
            <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                <AppText variant="title">{method.name}</AppText>
                {method.isDefault ? <Badge label="Default" /> : null}
                {!method.isActive ? <Badge label="Inactive" /> : null}
              </View>
              <AppText variant="tiny" color={colors.muted}>
                {method.cost.toFixed(2)} · {method.estimatedDaysMin}–{method.estimatedDaysMax} days
                {method.description ? ` · ${method.description}` : ''}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(method)} />
              <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(method)} />
            </View>
          </View>
        ))
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit shipping method' : 'New shipping method'}
        onClose={() => setOpen(false)}
        width={560}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create method'} onPress={save} loading={saving} />
          </>
        }
      >
        <TextField label="Name" value={draft.name} onChangeText={value => setDraft(prev => ({ ...prev, name: value }))} />
        <TextField label="Description" value={draft.description} onChangeText={value => setDraft(prev => ({ ...prev, description: value }))} />
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Cost" value={draft.cost} onChangeText={value => setDraft(prev => ({ ...prev, cost: value }))} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 120 }} />
          <TextField label="Min days" value={draft.min} onChangeText={value => setDraft(prev => ({ ...prev, min: value }))} keyboardType="number-pad" style={{ flex: 1, minWidth: 110 }} />
          <TextField label="Max days" value={draft.max} onChangeText={value => setDraft(prev => ({ ...prev, max: value }))} keyboardType="number-pad" style={{ flex: 1, minWidth: 110 }} />
        </View>
        <ToggleRow label="Active" description="Available at checkout." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
        <ToggleRow label="Default method" description="Preselected for shoppers." value={draft.isDefault} onValueChange={value => setDraft(prev => ({ ...prev, isDefault: value }))} />
      </ModalSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
});
