import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { catalogApi } from '../../api';
import type { Category, CategoryRequest } from '../../api/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  ProductImage,
  SelectField,
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
  parentId: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
  sortOrder: string;
}

const emptyDraft: Draft = {
  name: '',
  description: '',
  parentId: '',
  imageUrl: '',
  seoTitle: '',
  seoDescription: '',
  isActive: true,
  sortOrder: '0',
};

function flatten(categories: Category[], depth = 0): (Category & { depth: number })[] {
  return categories.flatMap(category => [{ ...category, depth }, ...flatten(category.children ?? [], depth + 1)]);
}

export function AdminCategoriesScreen() {
  useDocumentTitle('Categories');
  const { toast, confirm } = useFeedback();
  const categories = useAsync(() => catalogApi.categories(true), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const flat = useMemo(() => flatten(categories.data ?? []), [categories.data]);
  const parentOptions = useMemo(
    () =>
      flat
        .filter(category => category.id !== editing?.id)
        .map(category => ({
          label: `${'— '.repeat(category.depth)}${category.name}`,
          value: category.id,
        })),
    [flat, editing],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setDraft({
      name: category.name,
      description: category.description ?? '',
      parentId: category.parentId ?? '',
      imageUrl: category.imageUrl ?? '',
      seoTitle: category.seoTitle ?? '',
      seoDescription: category.seoDescription ?? '',
      isActive: category.isActive,
      sortOrder: String(category.sortOrder),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast('Category name is required.', 'error');
      return;
    }
    const payload: CategoryRequest = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      parentId: draft.parentId || null,
      imageUrl: draft.imageUrl.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder) || 0,
    };
    setSaving(true);
    try {
      if (editing) await catalogApi.updateCategory(editing.id, payload);
      else await catalogApi.createCategory(payload);
      toast(editing ? 'Category updated.' : 'Category created.', 'success');
      setOpen(false);
      categories.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    const ok = await confirm({
      title: `Delete ${category.name}?`,
      message: 'Products in this category may need to be reassigned first.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await catalogApi.deleteCategory(category.id);
      toast('Category deleted.', 'success');
      categories.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this category.', 'error');
    }
  };

  return (
    <AdminPage
      title="Categories"
      subtitle="Organise the catalogue into a browsable tree."
      actions={<Button label="New category" onPress={openCreate} />}
    >
      {categories.loading && !categories.data ? (
        <Spinner label="Loading categories…" />
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={() => categories.reload()} />
      ) : flat.length === 0 ? (
        <EmptyState title="No categories yet" message="Add a category so products can be grouped." actionLabel="New category" onAction={openCreate} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {flat.map(category => (
            <Card key={category.id} style={{ padding: spacing.md, marginLeft: Math.min(category.depth, 4) * 20 }}>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
                <View style={{ width: 44 }}>
                  <ProductImage url={category.imageUrl} name={category.name} height={44} radiusValue={8} />
                </View>
                <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                    <AppText variant="title">{category.name}</AppText>
                    {!category.isActive ? <Badge label="Inactive" /> : null}
                  </View>
                  <AppText variant="tiny" color={colors.muted}>
                    /{category.slug} · {category.productCount} product{category.productCount === 1 ? '' : 's'} · order {category.sortOrder}
                  </AppText>
                  {category.description ? (
                    <AppText variant="tiny" color={colors.faint} numberOfLines={1}>{category.description}</AppText>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(category)} />
                  <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(category)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit category' : 'New category'}
        onClose={() => setOpen(false)}
        width={620}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create category'} onPress={save} loading={saving} />
          </>
        }
      >
        <Toolbar>
          <TextField label="Name" value={draft.name} onChangeText={value => setDraft(prev => ({ ...prev, name: value }))} style={{ flex: 2, minWidth: 220 }} />
          <TextField
            label="Sort order"
            value={draft.sortOrder}
            onChangeText={value => setDraft(prev => ({ ...prev, sortOrder: value }))}
            keyboardType="number-pad"
            style={{ flex: 1, minWidth: 120 }}
          />
        </Toolbar>
        <SelectField
          label="Parent category"
          value={draft.parentId}
          options={parentOptions}
          onChange={value => setDraft(prev => ({ ...prev, parentId: value }))}
          allowClear
          placeholder="Top level"
        />
        <TextField label="Description" value={draft.description} onChangeText={value => setDraft(prev => ({ ...prev, description: value }))} multiline />
        <Toolbar>
          <TextField label="Image URL" value={draft.imageUrl} onChangeText={value => setDraft(prev => ({ ...prev, imageUrl: value }))} autoCapitalize="none" style={{ flex: 1, minWidth: 240 }} />
          <ImageUploadButton onUploaded={urls => setDraft(prev => ({ ...prev, imageUrl: urls[0] }))} />
        </Toolbar>
        <TextField label="SEO title" value={draft.seoTitle} onChangeText={value => setDraft(prev => ({ ...prev, seoTitle: value }))} />
        <TextField label="SEO description" value={draft.seoDescription} onChangeText={value => setDraft(prev => ({ ...prev, seoDescription: value }))} multiline />
        <ToggleRow label="Active" description="Inactive categories are hidden from shoppers." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
      </ModalSheet>
    </AdminPage>
  );
}
