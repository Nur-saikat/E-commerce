import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { catalogApi } from '../../api';
import type { Category, ProductQuery, ProductSummary } from '../../api/types';
import { ProductGrid } from '../../components/ProductCard';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  Pagination,
  SearchInput,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter, useParams } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { useWishlist } from '../../state/WishlistContext';
import { colors, radius, spacing } from '../../theme';

const sortOptions = [
  { label: 'Newest first', value: 'latest' },
  { label: 'Most popular', value: 'popularity' },
  { label: 'Price: low to high', value: 'price-low' },
  { label: 'Price: high to low', value: 'price-high' },
  { label: 'Top rated', value: 'rating' },
];

export function ShopScreen() {
  const params = useParams();
  const router = useRouter();
  const cart = useCart();
  const { toast } = useFeedback();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const { settings, fmt } = useSettings();
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  const lockedSlug = params.slug;
  const initialCategory = params.category ?? params.slug ?? '';
  const initialSearch = params.search ?? params.q ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState(initialCategory);
  const [brandId, setBrandId] = useState(params.brandId ?? '');
  const [sort, setSort] = useState(params.sortBy ?? 'latest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(params.onSale === 'true');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useDocumentTitle(lockedSlug ? 'Category' : 'Shop');

  const paramKey = `${lockedSlug ?? ''}|${initialCategory}|${initialSearch}|${params.brandId ?? ''}|${params.sortBy ?? ''}|${params.onSale ?? ''}`;
  useEffect(() => {
    const nextSearch = params.search ?? params.q ?? '';
    setSearch(nextSearch);
    setSubmittedSearch(nextSearch);
    setCategorySlug(params.category ?? params.slug ?? '');
    setBrandId(params.brandId ?? '');
    setSort(params.sortBy ?? 'latest');
    setOnSale(params.onSale === 'true');
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  const taxonomy = useAsync(async () => {
    const [categories, brands] = await Promise.all([catalogApi.categories(false), catalogApi.brands(false)]);
    return { categories, brands };
  }, []);

  const categories = useMemo(() => flattenCategories(taxonomy.data?.categories ?? []), [taxonomy.data]);
  const activeCategory = categories.find(c => c.slug === categorySlug || c.id === categorySlug);
  const onSaleValue = onSale ? 'true' : undefined;

  const query: ProductQuery = {
    page,
    pageSize: 12,
    search: submittedSearch.trim() || undefined,
    categorySlug: categorySlug || undefined,
    brandId: brandId || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ?? undefined,
    inStock: inStock || undefined,
    onSale: onSaleValue === 'true' ? true : undefined,
    sortBy: sort.startsWith('price') ? 'price' : sort,
    descending: sort === 'price-high' || sort === 'latest' || sort === 'popularity' || sort === 'rating',
  };

  const products = useAsync(() => catalogApi.products(query), [
    page,
    submittedSearch,
    categorySlug,
    brandId,
    sort,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    onSale,
  ]);

  const add = async (product: ProductSummary) => {
    try {
      await cart.add(product.id, 1);
      toast(`${product.name} added to your cart.`, 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to add this product.', 'error');
    }
  };
  const wish = async (product: ProductSummary) => {
    if (!user) {
      toast('Sign in to save products to your wishlist.', 'info');
      router.navigate('login');
      return;
    }
    try {
      const added = await wishlist.toggle(product.id);
      toast(added ? 'Saved to your wishlist.' : 'Removed from your wishlist.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update your wishlist.', 'error');
    }
  };

  const reset = () => {
    setSearch('');
    setSubmittedSearch('');
    setCategorySlug(lockedSlug ?? '');
    setBrandId('');
    setSort('latest');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(null);
    setInStock(false);
    setOnSale(false);
    setPage(1);
  };

  const filterPanel = (
    <Card style={{ padding: spacing.lg, gap: spacing.lg, minWidth: wide ? 250 : undefined }}>
      <View style={styles.filterHeader}>
        <AppText variant="h3">Filters</AppText>
        <Button label="Reset" size="sm" variant="link" onPress={reset} />
      </View>
      {!lockedSlug ? (
        <SelectField
          label="Category"
          value={categorySlug}
          options={[{ label: 'All categories', value: '' }, ...categories.map(c => ({ label: c.name, value: c.slug }))]}
          onChange={value => {
            setCategorySlug(value);
            setPage(1);
          }}
          allowClear
          placeholder="All categories"
        />
      ) : null}
      <SelectField
        label="Brand"
        value={brandId}
        options={[{ label: 'All brands', value: '' }, ...(taxonomy.data?.brands ?? []).map(b => ({ label: b.name, value: b.id }))]}
        onChange={value => {
          setBrandId(value);
          setPage(1);
        }}
        allowClear
        placeholder="All brands"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TextField
          label={`Min (${settings.currencySymbol})`}
          value={minPrice}
          onChangeText={value => {
            setMinPrice(value.replace(/[^0-9.]/g, ''));
            setPage(1);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          style={{ flex: 1 }}
        />
        <TextField
          label={`Max (${settings.currencySymbol})`}
          value={maxPrice}
          onChangeText={value => {
            setMaxPrice(value.replace(/[^0-9.]/g, ''));
            setPage(1);
          }}
          keyboardType="decimal-pad"
          placeholder="Any"
          style={{ flex: 1 }}
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color={colors.inkSoft}>Rating</AppText>
        <View style={styles.chips}>
          {[4, 3, 2].map(rating => (
            <Button
              key={rating}
              label={`${rating}★ & up`}
              size="sm"
              variant={minRating === rating ? 'secondary' : 'outline'}
              onPress={() => {
                setMinRating(minRating === rating ? null : rating);
                setPage(1);
              }}
            />
          ))}
        </View>
      </View>
      <View style={styles.toggleLine}>
        <AppText variant="small" color={colors.inkSoft}>In stock only</AppText>
        <Switch
          value={inStock}
          onValueChange={value => {
            setInStock(value);
            setPage(1);
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      <View style={styles.toggleLine}>
        <AppText variant="small" color={colors.inkSoft}>On sale</AppText>
        <Switch
          value={onSale}
          onValueChange={value => {
            setOnSale(value);
            setPage(1);
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      <AppText variant="tiny" color={colors.faint}>
        Prices shown include any active discount, from {fmt(0)} up.
      </AppText>
    </Card>
  );

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back={!!lockedSlug}
        title={activeCategory?.name ?? (submittedSearch ? `Results for “${submittedSearch}”` : 'Shop all')}
        subtitle={
          activeCategory?.description ??
          'Everyday essentials, carefully sourced for comfort, safety and joy.'
        }
        actions={
          wide ? undefined : (
            <Button
              label={filtersOpen ? 'Hide filters' : 'Filters'}
              variant="outline"
              onPress={() => setFiltersOpen(open => !open)}
            />
          )
        }
      />

      <View style={styles.searchRow}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmittedSearch(search);
            setPage(1);
          }}
        />
        <View style={{ minWidth: 190 }}>
          <SelectField
            value={sort}
            options={sortOptions}
            onChange={value => {
              setSort(value);
              setPage(1);
            }}
          />
        </View>
      </View>

      {!wide && filtersOpen ? filterPanel : null}

      <View style={[styles.layout, !wide && { flexDirection: 'column' }]}>
        {wide ? <View style={{ width: 260 }}>{filterPanel}</View> : null}
        <View style={{ flex: 1, gap: spacing.lg }}>
          {products.loading && !products.data ? (
            <Spinner label="Loading products…" />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={() => products.reload()} />
          ) : products.data && products.data.items.length === 0 ? (
            <EmptyState
              title="No products match those filters"
              message="Try widening your price range or clearing a filter."
              actionLabel="Reset filters"
              onAction={reset}
            />
          ) : (
            <>
              <AppText variant="small" color={colors.muted}>
                {products.data?.pagination.totalItems ?? 0} products
              </AppText>
              <ProductGrid
                products={products.data?.items ?? []}
                onAdd={add}
                wishedIds={wishlist.ids}
                onToggleWishlist={wish}
              />
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
        </View>
      </View>
    </Page>
  );
}

function flattenCategories(categories: Category[], depth = 0): (Category & { depth: number })[] {
  return categories.flatMap(category => [
    { ...category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'center' },
  layout: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  toggleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
