import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { catalogApi, uploadsApi } from '../../api';
import type { Category, ProductDetail, ProductRequest, ProductSummary, ProductVariantRequest } from '../../api/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ModalSheet,
  Pagination,
  ProductImage,
  SearchInput,
  SelectField,
  Spinner,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { pickWebFile } from '../../utils/webFile';
import { AdminPage, ListHeader, Toolbar } from './AdminKit';

interface VariantDraft {
  id?: string | null;
  name: string;
  sku: string;
  price: string;
  stock: string;
  attributes: string;
  imageUrl: string;
}

interface ProductDraft {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: string;
  costPrice: string;
  discountPrice: string;
  stock: string;
  lowStockThreshold: string;
  thumbnailUrl: string;
  images: string[];
  specs: { key: string; value: string }[];
  variants: VariantDraft[];
  tags: string;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
}

const emptyDraft: ProductDraft = {
  name: '',
  sku: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  brandId: '',
  price: '',
  costPrice: '',
  discountPrice: '',
  stock: '0',
  lowStockThreshold: '5',
  thumbnailUrl: '',
  images: [],
  specs: [{ key: '', value: '' }],
  variants: [],
  tags: '',
  isFeatured: false,
  isActive: true,
  seoTitle: '',
  seoDescription: '',
};

function flatten(categories: Category[], depth = 0): (Category & { depth: number })[] {
  return categories.flatMap(category => [{ ...category, depth }, ...flatten(category.children ?? [], depth + 1)]);
}

export function AdminProductsScreen() {
  useDocumentTitle('Products');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const taxonomy = useAsync(async () => {
    const [categories, brands] = await Promise.all([catalogApi.categories(true), catalogApi.brands(true)]);
    return { categories: flatten(categories), brands };
  }, []);

  const products = useAsync(
    () =>
      catalogApi.products({
        page,
        pageSize: 10,
        search: submitted || undefined,
        sortBy: 'latest',
        descending: true,
        includeInactive: true,
      }),
    [page, submitted],
  );

  const categoryOptions = useMemo(
    () =>
      (taxonomy.data?.categories ?? []).map(category => ({
        label: `${'— '.repeat(category.depth)}${category.name}`,
        value: category.id,
      })),
    [taxonomy.data],
  );
  const brandOptions = useMemo(
    () => (taxonomy.data?.brands ?? []).map(brand => ({ label: brand.name, value: brand.id })),
    [taxonomy.data],
  );

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft, specs: [{ key: '', value: '' }], images: [], variants: [] });
    setEditorOpen(true);
  };

  const openEdit = async (product: ProductSummary) => {
    setEditingId(product.id);
    setEditorOpen(true);
    setLoadingProduct(true);
    try {
      const detail: ProductDetail = await catalogApi.product(product.id, true);
      setDraft({
        name: detail.name,
        sku: detail.sku,
        shortDescription: detail.shortDescription ?? '',
        description: detail.description,
        categoryId: detail.categoryId ?? '',
        brandId: detail.brandId ?? '',
        price: String(detail.price),
        costPrice: String(detail.costPrice),
        discountPrice: detail.discountPrice != null ? String(detail.discountPrice) : '',
        stock: String(detail.stock),
        lowStockThreshold: String(detail.lowStockThreshold),
        thumbnailUrl: detail.thumbnailUrl ?? '',
        images: detail.images ?? [],
        specs: Object.entries(detail.specifications ?? {}).map(([key, value]) => ({ key, value })),
        variants: (detail.variants ?? []).map(variant => ({
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price: String(variant.price),
          stock: String(variant.stock),
          attributes: Object.entries(variant.attributes ?? {})
            .map(([key, value]) => `${key}:${value}`)
            .join(', '),
          imageUrl: variant.imageUrl ?? '',
        })),
        tags: (detail.tags ?? []).join(', '),
        isFeatured: detail.isFeatured,
        isActive: detail.isActive,
        seoTitle: detail.seoTitle ?? '',
        seoDescription: detail.seoDescription ?? '',
      });
      if (!detail.specifications || Object.keys(detail.specifications).length === 0) {
        setDraft(prev => ({ ...prev, specs: [{ key: '', value: '' }] }));
      }
    } catch (error: any) {
      toast(error?.message ?? 'Unable to load this product.', 'error');
      setEditorOpen(false);
    } finally {
      setLoadingProduct(false);
    }
  };

  const save = async () => {
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    if (!draft.name.trim() || !draft.sku.trim()) {
      toast('Product name and SKU are required.', 'error');
      return;
    }
    if (!draft.description.trim()) {
      toast('Add a description for this product.', 'error');
      return;
    }
    if (!draft.categoryId) {
      toast('Choose a category.', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast('Enter a valid selling price.', 'error');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast('Enter a valid stock quantity.', 'error');
      return;
    }
    const discount = draft.discountPrice.trim() ? Number(draft.discountPrice) : null;
    if (discount !== null && (!Number.isFinite(discount) || discount <= 0 || discount >= price)) {
      toast('Discount price must be greater than zero and below the selling price.', 'error');
      return;
    }
    const variants: ProductVariantRequest[] = draft.variants
      .filter(variant => variant.name.trim() && variant.sku.trim())
      .map(variant => ({
        id: variant.id ?? null,
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        price: Number(variant.price) || 0,
        stock: Number(variant.stock) || 0,
        attributes: variant.attributes
          .split(',')
          .map(part => part.split(':'))
          .filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
          .reduce<Record<string, string>>((acc, parts) => ({ ...acc, [parts[0].trim()]: parts[1].trim() }), {}),
        imageUrl: variant.imageUrl.trim() || null,
      }));

    const payload: ProductRequest = {
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      shortDescription: draft.shortDescription.trim() || null,
      description: draft.description.trim(),
      categoryId: draft.categoryId,
      brandId: draft.brandId || null,
      price,
      costPrice: Number(draft.costPrice) || 0,
      discountPrice: draft.discountPrice.trim() ? Number(draft.discountPrice) : null,
      stock,
      lowStockThreshold: Number(draft.lowStockThreshold) || 0,
      images: draft.images,
      thumbnailUrl: draft.thumbnailUrl.trim() || draft.images[0] || null,
      specifications: draft.specs.reduce<Record<string, string>>((acc, spec) => {
        if (spec.key.trim() && spec.value.trim()) acc[spec.key.trim()] = spec.value.trim();
        return acc;
      }, {}),
      variants,
      tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) await catalogApi.updateProduct(editingId, payload);
      else await catalogApi.createProduct(payload);
      toast(editingId ? 'Product updated.' : 'Product created.', 'success');
      setEditorOpen(false);
      products.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this product.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: ProductSummary) => {
    const ok = await confirm({
      title: `Delete ${product.name}?`,
      message: 'This removes the product from the storefront. Existing orders are not affected.',
      confirmLabel: 'Delete product',
      danger: true,
    });
    if (!ok) return;
    try {
      await catalogApi.deleteProduct(product.id);
      toast('Product deleted.', 'success');
      products.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this product.', 'error');
    }
  };

  const uploadImage = async (target: 'thumbnail' | 'gallery') => {
    const file = await pickWebFile('image/*');
    if (!file) {
      if (Platform.OS !== 'web') toast('Add an image URL on this device.', 'info');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadsApi.upload(file);
      setDraft(prev =>
        target === 'thumbnail'
          ? { ...prev, thumbnailUrl: result.url }
          : { ...prev, images: [...prev.images, result.url] },
      );
      toast('Image uploaded.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to upload this image.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const setField = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  return (
    <AdminPage
      title="Products"
      subtitle="Create and maintain the Safwan catalogue."
      actions={<Button label="New product" onPress={openCreate} />}
    >
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search by name or SKU…"
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

      {products.loading && !products.data ? (
        <Spinner label="Loading products…" />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={() => products.reload()} />
      ) : (products.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No products found"
          message={submitted ? 'Try a different search term.' : 'Create your first product to open the store.'}
          actionLabel="New product"
          onAction={openCreate}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {products.data?.items.map(product => (
              <Card key={product.id} style={{ padding: spacing.lg }}>
                <View style={styles.row}>
                  <View style={{ width: 56 }}>
                    <ProductImage url={product.thumbnailUrl} name={product.name} height={56} radiusValue={10} />
                  </View>
                  <View style={{ flex: 1, minWidth: 180, gap: 3 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                      <AppText variant="title">{product.name}</AppText>
                      {!product.isActive ? <Badge label="Inactive" /> : null}
                      {product.isFeatured ? <Badge label="Featured" tone={{ bg: colors.accentSoft, fg: colors.accent }} /> : null}
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {product.sku} · {product.categoryName ?? 'No category'}
                      {product.brandName ? ` · ${product.brandName}` : ''}
                    </AppText>
                    <AppText variant="tiny" color={product.totalStock <= 5 ? colors.danger : colors.faint}>
                      Stock {product.totalStock} · Sold {product.soldCount}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="title">{fmt(product.effectivePrice)}</AppText>
                    {product.discountPercent > 0 ? (
                      <AppText variant="tiny" color={colors.faint} style={{ textDecorationLine: 'line-through' }}>{fmt(product.price)}</AppText>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(product)} />
                    <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(product)} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
          {products.data ? (
            <Pagination
              page={products.data.pagination.page}
              totalPages={products.data.pagination.totalPages}
              totalItems={products.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={editorOpen}
        title={editingId ? 'Edit product' : 'New product'}
        subtitle="Details, pricing, stock, media and variants."
        onClose={() => setEditorOpen(false)}
        width={820}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setEditorOpen(false)} />
            <Button label={editingId ? 'Save changes' : 'Create product'} onPress={save} loading={saving || loadingProduct} />
          </>
        }
      >
        {loadingProduct ? (
          <Spinner label="Loading product…" />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField label="Name" value={draft.name} onChangeText={value => setField('name', value)} style={{ flex: 2, minWidth: 240 }} />
              <TextField label="SKU" value={draft.sku} onChangeText={value => setField('sku', value)} style={{ flex: 1, minWidth: 160 }} />
            </View>
            <TextField label="Short description" value={draft.shortDescription} onChangeText={value => setField('shortDescription', value)} placeholder="One line that sells the piece" />
            <TextField label="Description" value={draft.description} onChangeText={value => setField('description', value)} multiline />
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <SelectField label="Category" value={draft.categoryId} options={categoryOptions} onChange={value => setField('categoryId', value)} style={{ flex: 1, minWidth: 220 }} />
              <SelectField
                label="Brand (optional)"
                value={draft.brandId}
                options={brandOptions}
                onChange={value => setField('brandId', value)}
                allowClear
                placeholder="No brand"
                style={{ flex: 1, minWidth: 220 }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField label="Price" value={draft.price} onChangeText={value => setField('price', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 140 }} />
              <TextField label="Discount price" value={draft.discountPrice} onChangeText={value => setField('discountPrice', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 140 }} />
              <TextField label="Cost price" value={draft.costPrice} onChangeText={value => setField('costPrice', value)} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 140 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField label="Stock" value={draft.stock} onChangeText={value => setField('stock', value)} keyboardType="number-pad" style={{ flex: 1, minWidth: 140 }} />
              <TextField label="Low stock alert" value={draft.lowStockThreshold} onChangeText={value => setField('lowStockThreshold', value)} keyboardType="number-pad" style={{ flex: 1, minWidth: 140 }} />
              <TextField label="Tags (comma separated)" value={draft.tags} onChangeText={value => setField('tags', value)} style={{ flex: 2, minWidth: 220 }} />
            </View>

            <Divider />
            <View style={{ gap: spacing.sm }}>
              <AppText variant="h3">Media</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <TextField label="Thumbnail URL" value={draft.thumbnailUrl} onChangeText={value => setField('thumbnailUrl', value)} autoCapitalize="none" style={{ flex: 2, minWidth: 240 }} />
                {Platform.OS === 'web' ? (
                  <Button label={uploading ? 'Uploading…' : 'Upload'} variant="outline" onPress={() => uploadImage('thumbnail')} loading={uploading} />
                ) : null}
                <View style={{ width: 56 }}>
                  <ProductImage url={draft.thumbnailUrl} name={draft.name} height={56} radiusValue={10} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {draft.images.map((image, index) => (
                  <View key={`${image}-${index}`} style={{ width: 88, gap: 4 }}>
                    <ProductImage url={image} height={72} radiusValue={8} />
                    <Button
                      label="Remove"
                      size="sm"
                      variant="ghost"
                      onPress={() => setField('images', draft.images.filter((_, i) => i !== index))}
                      textStyle={{ color: colors.danger }}
                    />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button
                  label="Add gallery URL"
                  variant="outline"
                  size="sm"
                  onPress={() => setField('images', [...draft.images, ''])}
                />
                {Platform.OS === 'web' ? (
                  <Button label="Upload gallery image" variant="outline" size="sm" onPress={() => uploadImage('gallery')} loading={uploading} />
                ) : null}
              </View>
              {draft.images.map((image, index) =>
                image === '' ? (
                  <TextField
                    key={`empty-${index}`}
                    label={`Gallery image ${index + 1} URL`}
                    value={draft.images[index]}
                    onChangeText={value => setField('images', draft.images.map((item, i) => (i === index ? value : item)))}
                    autoCapitalize="none"
                  />
                ) : null,
              )}
            </View>

            <Divider />
            <View style={{ gap: spacing.sm }}>
              <ListHeader right={<Button label="Add specification" size="sm" variant="outline" onPress={() => setField('specs', [...draft.specs, { key: '', value: '' }])} />}>
                <AppText variant="h3">Specifications</AppText>
              </ListHeader>
              {draft.specs.map((spec, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <TextField
                    label="Key"
                    value={spec.key}
                    onChangeText={value => setField('specs', draft.specs.map((item, i) => (i === index ? { ...item, key: value } : item)))}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <TextField
                    label="Value"
                    value={spec.value}
                    onChangeText={value => setField('specs', draft.specs.map((item, i) => (i === index ? { ...item, value } : item)))}
                    style={{ flex: 2, minWidth: 200 }}
                  />
                  <Button
                    label="Remove"
                    variant="ghost"
                    size="sm"
                    onPress={() => setField('specs', draft.specs.filter((_, i) => i !== index))}
                    textStyle={{ color: colors.danger }}
                  />
                </View>
              ))}
            </View>

            <Divider />
            <View style={{ gap: spacing.sm }}>
              <ListHeader
                right={
                  <Button
                    label="Add variant"
                    size="sm"
                    variant="outline"
                    onPress={() =>
                      setField('variants', [
                        ...draft.variants,
                        { name: '', sku: '', price: draft.price, stock: '0', attributes: '', imageUrl: '' },
                      ])
                    }
                  />
                }
              >
                <AppText variant="h3">Variants</AppText>
              </ListHeader>
              {draft.variants.length === 0 ? (
                <AppText variant="small" color={colors.faint}>No variants. Add sizes or colours when needed.</AppText>
              ) : null}
              {draft.variants.map((variant, index) => (
                <Card key={variant.id ?? index} style={{ padding: spacing.md, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                    <TextField label="Name" value={variant.name} onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, name: value } : item)))} style={{ flex: 1, minWidth: 140 }} />
                    <TextField label="SKU" value={variant.sku} onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, sku: value } : item)))} style={{ flex: 1, minWidth: 140 }} />
                    <TextField label="Price" value={variant.price} onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, price: value } : item)))} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 110 }} />
                    <TextField label="Stock" value={variant.stock} onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, stock: value } : item)))} keyboardType="number-pad" style={{ flex: 1, minWidth: 100 }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <TextField
                      label="Attributes (e.g. Colour:Red, Size:M)"
                      value={variant.attributes}
                      onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, attributes: value } : item)))}
                      style={{ flex: 2, minWidth: 220 }}
                    />
                    <TextField label="Image URL" value={variant.imageUrl} onChangeText={value => setField('variants', draft.variants.map((item, i) => (i === index ? { ...item, imageUrl: value } : item)))} autoCapitalize="none" style={{ flex: 1, minWidth: 180 }} />
                    <Button label="Remove" variant="ghost" size="sm" onPress={() => setField('variants', draft.variants.filter((_, i) => i !== index))} textStyle={{ color: colors.danger }} />
                  </View>
                </Card>
              ))}
            </View>

            <Divider />
            <ToggleRow label="Featured product" description="Show in the featured rail on the home page." value={draft.isFeatured} onValueChange={value => setField('isFeatured', value)} />
            <ToggleRow label="Active" description="Inactive products are hidden from shoppers." value={draft.isActive} onValueChange={value => setField('isActive', value)} />
            <TextField label="SEO title" value={draft.seoTitle} onChangeText={value => setField('seoTitle', value)} />
            <TextField label="SEO description" value={draft.seoDescription} onChangeText={value => setField('seoDescription', value)} multiline />
          </View>
        )}
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  rowActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
