import React, { useState } from 'react';
import { View } from 'react-native';
import { catalogApi } from '../../api';
import type { Brand, BrandRequest } from '../../api/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  ProductImage,
  Spinner,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { ImageUploadButton } from '../../components/ImageUploadButton';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

interface Draft {
  name: string;
  description: string;
  logoUrl: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyDraft: Draft = { name: '', description: '', logoUrl: '', sortOrder: '0', isActive: true };

export function AdminBrandsScreen() {
  useDocumentTitle('Brands');
  const { toast, confirm } = useFeedback();
  const brands = useAsync(() => catalogApi.brands(true), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setDraft({
      name: brand.name,
      description: brand.description ?? '',
      logoUrl: brand.logoUrl ?? '',
      sortOrder: String(brand.sortOrder),
      isActive: brand.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast('Brand name is required.', 'error');
      return;
    }
    const payload: BrandRequest = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (editing) await catalogApi.updateBrand(editing.id, payload);
      else await catalogApi.createBrand(payload);
      toast(editing ? 'Brand updated.' : 'Brand created.', 'success');
      setOpen(false);
      brands.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this brand.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (brand: Brand) => {
    const ok = await confirm({ title: `Delete ${brand.name}?`, message: 'Products linked to this brand will remain, without a brand.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await catalogApi.deleteBrand(brand.id);
      toast('Brand deleted.', 'success');
      brands.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this brand.', 'error');
    }
  };

  return (
    <AdminPage title="Brands" subtitle="The labels featured across the storefront." actions={<Button label="New brand" onPress={openCreate} />}>
      {brands.loading && !brands.data ? (
        <Spinner label="Loading brands…" />
      ) : brands.error ? (
        <ErrorState message={brands.error} onRetry={() => brands.reload()} />
      ) : (brands.data?.length ?? 0) === 0 ? (
        <EmptyState title="No brands yet" message="Add the makers and labels you carry." actionLabel="New brand" onAction={openCreate} />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          {brands.data?.map(brand => (
            <Card key={brand.id} style={{ flex: 1, minWidth: 240, padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <View style={{ width: 48 }}>
                  <ProductImage url={brand.logoUrl} name={brand.name} height={48} radiusValue={8} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                    <AppText variant="title">{brand.name}</AppText>
                    {!brand.isActive ? <Badge label="Inactive" /> : null}
                  </View>
                  <AppText variant="tiny" color={colors.muted}>{brand.productCount} product{brand.productCount === 1 ? '' : 's'}</AppText>
                </View>
              </View>
              {brand.description ? <AppText variant="small" color={colors.muted} numberOfLines={2}>{brand.description}</AppText> : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(brand)} />
                <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(brand)} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit brand' : 'New brand'}
        onClose={() => setOpen(false)}
        width={560}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create brand'} onPress={save} loading={saving} />
          </>
        }
      >
        <Toolbar>
          <TextField label="Name" value={draft.name} onChangeText={value => setDraft(prev => ({ ...prev, name: value }))} style={{ flex: 2, minWidth: 200 }} />
          <TextField label="Sort order" value={draft.sortOrder} onChangeText={value => setDraft(prev => ({ ...prev, sortOrder: value }))} keyboardType="number-pad" style={{ flex: 1, minWidth: 110 }} />
        </Toolbar>
        <Toolbar>
          <TextField label="Logo URL" value={draft.logoUrl} onChangeText={value => setDraft(prev => ({ ...prev, logoUrl: value }))} autoCapitalize="none" style={{ flex: 1, minWidth: 240 }} />
          <ImageUploadButton onUploaded={urls => setDraft(prev => ({ ...prev, logoUrl: urls[0] }))} />
        </Toolbar>
        <TextField label="Description" value={draft.description} onChangeText={value => setDraft(prev => ({ ...prev, description: value }))} multiline />
        <ToggleRow label="Active" description="Inactive brands are hidden from shoppers." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
      </ModalSheet>
    </AdminPage>
  );
}
