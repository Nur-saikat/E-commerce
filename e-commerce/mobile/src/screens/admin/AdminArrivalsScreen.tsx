import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import type { BusinessProductOption, StockArrivalRequest } from '../../api/types';
import {
  AlertBox,
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
} from '../../components/ui';
import { date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { AdminPage, EmptyRow } from './AdminKit';

export function AdminArrivalsScreen() {
  useDocumentTitle('Stock arrivals');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [page, setPage] = useState(1);
  const arrivals = useAsync(() => businessApi.arrivals({ page, pageSize: 10 }), [page]);

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<BusinessProductOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<BusinessProductOption | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [arrivalDate, setArrivalDate] = useState(todayInput);
  const [saving, setSaving] = useState(false);

  const openModal = async () => {
    setOpen(true);
    setSearch('');
    setPicked(null);
    setVariantId('');
    setQuantity('1');
    setUnitCost('');
    setSupplier('');
    setReference('');
    setNote('');
    setArrivalDate(todayInput());
    if (options.length === 0) {
      setOptionsLoading(true);
      try {
        setOptions(await businessApi.products());
      } catch (error: any) {
        toast(error?.message ?? 'Unable to load products.', 'error');
      } finally {
        setOptionsLoading(false);
      }
    }
  };

  const matches = options
    .filter(option => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return option.name.toLowerCase().includes(term) || option.sku.toLowerCase().includes(term);
    })
    .slice(0, 8);

  const chooseProduct = (option: BusinessProductOption) => {
    setPicked(option);
    setVariantId('');
    setUnitCost(option.costPrice ? String(option.costPrice) : '');
    setQuantity('1');
  };

  const save = async () => {
    if (!picked) {
      toast('Choose the product that arrived.', 'error');
      return;
    }
    const qty = Number(quantity);
    const cost = Number(unitCost);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('Quantity must be greater than zero.', 'error');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast('Enter a valid unit cost.', 'error');
      return;
    }
    const payload: StockArrivalRequest = {
      productId: picked.id,
      variantId: variantId || null,
      quantity: qty,
      unitCost: cost,
      supplier: supplier.trim() || null,
      reference: reference.trim() || null,
      note: note.trim() || null,
      arrivalDate: toIso(arrivalDate),
    };
    setSaving(true);
    try {
      await businessApi.createArrival(payload);
      toast('Stock arrival recorded.', 'success');
      setOpen(false);
      arrivals.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to record this arrival.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this arrival?',
      message: 'The stock added by this arrival will be reversed. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deleteArrival(id);
      toast('Arrival deleted.', 'success');
      arrivals.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this arrival.', 'error');
    }
  };

  const variantOptions = [
    { value: '', label: 'Base product' },
    ...(picked?.variants ?? []).map(variant => ({ value: variant.id, label: `${variant.name} (${variant.sku})` })),
  ];

  return (
    <AdminPage
      title="Stock arrivals"
      subtitle="Log new stock the moment it reaches the studio."
      actions={<Button label="Record arrival" onPress={openModal} />}
    >
      {arrivals.loading && !arrivals.data ? (
        <Spinner label="Loading arrivals…" />
      ) : arrivals.error ? (
        <ErrorState message={arrivals.error} onRetry={() => arrivals.reload()} />
      ) : (arrivals.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No stock arrivals"
          message="Record incoming units to keep inventory and cost reporting accurate."
          actionLabel="Record arrival"
          onAction={openModal}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {arrivals.data?.items.map(arrival => (
              <Card key={arrival.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{arrival.productName}</AppText>
                      {arrival.variantName ? <Badge label={arrival.variantName} /> : null}
                      <Badge
                        label={arrival.stockApplied ? 'Stock applied' : 'Not applied'}
                        tone={arrival.stockApplied ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                      />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {date(arrival.arrivalDate)} · {arrival.quantity} unit(s) at {fmt(arrival.unitCost)}
                      {arrival.supplier ? ` · ${arrival.supplier}` : ''}
                      {arrival.reference ? ` · ${arrival.reference}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Total cost</AppText>
                    <AppText variant="h3">{fmt(arrival.totalCost)}</AppText>
                  </View>
                </View>
                {arrival.note ? <AppText variant="small" color={colors.muted}>{arrival.note}</AppText> : null}
                <Button
                  label="Delete"
                  size="sm"
                  variant="ghost"
                  textStyle={{ color: colors.danger }}
                  onPress={() => remove(arrival.id)}
                  style={{ alignSelf: 'flex-start' }}
                />
              </Card>
            ))}
          </View>
          {arrivals.data ? (
            <Pagination
              page={arrivals.data.pagination.page}
              totalPages={arrivals.data.pagination.totalPages}
              totalItems={arrivals.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title="Record stock arrival"
        subtitle="Stock is added immediately and cost is tracked for profit reporting."
        onClose={() => !saving && setOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label="Save arrival" onPress={save} loading={saving} />
          </>
        }
      >
        {optionsLoading ? (
          <Spinner label="Loading catalogue…" />
        ) : picked ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <AppText variant="small" weight="600">{picked.name}</AppText>
                <AppText variant="tiny" color={colors.muted}>{picked.sku} · current stock {picked.totalStock}</AppText>
              </View>
              <Button label="Change" size="sm" variant="ghost" onPress={() => setPicked(null)} />
            </View>
            {picked.variants.length > 0 ? (
              <SelectField label="Variant" value={variantId} options={variantOptions} onChange={value => setVariantId(value ?? '')} />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <SearchInput value={search} onChangeText={setSearch} placeholder="Search products by name or SKU" />
            {matches.length === 0 ? (
              <EmptyRow message={`No products match “${search}”.`} />
            ) : (
              matches.map(option => (
                <Button
                  key={option.id}
                  label={`${option.name} · ${option.sku} · stock ${option.totalStock}`}
                  variant="ghost"
                  size="sm"
                  textStyle={{ color: colors.ink }}
                  onPress={() => chooseProduct(option)}
                  style={{ justifyContent: 'flex-start' }}
                />
              ))
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={{ flex: 1, minWidth: 100 }} />
          <TextField label="Unit cost" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 120 }} />
          <TextField label="Arrival date" value={arrivalDate} onChangeText={setArrivalDate} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Supplier (optional)" value={supplier} onChangeText={setSupplier} style={{ flex: 1, minWidth: 180 }} />
          <TextField label="Reference (optional)" value={reference} onChangeText={setReference} style={{ flex: 1, minWidth: 150 }} />
        </View>
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline />
        <AlertBox message="Only record a new arrival. If you need to correct stock, use an inventory adjustment instead." />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});
