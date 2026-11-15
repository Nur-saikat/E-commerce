import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { addressesApi, ordersApi, paymentsApi, siteApi, voucherApi } from '../../api';
import type { CheckoutConfig, PaymentInitiateResponse, VoucherWallet } from '../../api/types';
import {
  AlertBox,
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  KeyValue,
  Page,
  PageHeader,
  ProductImage,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { lastOrderStore } from '../../state/lastOrder';
import { PAYMENT_LABELS } from '../../config';
import { colors, radius, spacing } from '../../theme';

interface AddressFormState {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const emptyAddress: AddressFormState = {
  fullName: '',
  phone: '',
  street: '',
  city: 'Dhaka',
  state: 'Dhaka',
  postalCode: '',
  country: 'Bangladesh',
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function CheckoutScreen() {
  useDocumentTitle('Checkout');
  const router = useRouter();
  const cart = useCart();
  const { user } = useAuth();
  const { toast } = useFeedback();
  const { fmt } = useSettings();
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  const config = useAsync(() => siteApi.checkoutConfig(), []);
  const addresses = useAsync(async () => (user ? addressesApi.list() : []), [user?.id]);
  const wallet = useAsync<VoucherWallet | null>(async () => {
    if (!user || !config.data?.voucherPointsEnabled) return null;
    try {
      return await voucherApi.wallet();
    } catch {
      return null;
    }
  }, [user?.id, config.data?.voucherPointsEnabled]);

  const [address, setAddress] = useState<AddressFormState>(emptyAddress);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [guestEmail, setGuestEmail] = useState('');
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [usePoints, setUsePoints] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    const defaults = addresses.data ?? [];
    const preferred = defaults.find(a => a.isDefault) ?? defaults[0];
    if (preferred && !selectedAddressId) {
      setAddress({
        fullName: preferred.fullName,
        phone: preferred.phone,
        street: preferred.street,
        city: preferred.city,
        state: preferred.state,
        postalCode: preferred.postalCode,
        country: preferred.country,
      });
      setSelectedAddressId(preferred.id);
    }
  }, [addresses.data]);

  useEffect(() => {
    if (user && !address.fullName) {
      setAddress(prev => ({
        ...prev,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone ?? prev.phone,
      }));
      setGuestEmail(user.email);
    }
  }, [user]);

  const checkoutConfig: CheckoutConfig | null = config.data;
  useEffect(() => {
    if (!checkoutConfig) return;
    const methods = checkoutConfig.shippingMethods.filter(m => m.isActive);
    if (!shippingMethodId && methods.length) {
      setShippingMethodId((methods.find(m => m.isDefault) ?? methods[0]).id);
    }
    if (!paymentMethod && checkoutConfig.enabledPaymentMethods.length) {
      setPaymentMethod(checkoutConfig.enabledPaymentMethods[0]);
    }
  }, [checkoutConfig]);

  const summary = cart.summary;
  const selectedMethod = checkoutConfig?.shippingMethods.find(m => m.id === shippingMethodId);
  const freeThreshold = checkoutConfig?.freeShippingThreshold ?? 0;
  const shippingCost =
    selectedMethod && !(freeThreshold > 0 && summary.subtotal - summary.discount >= freeThreshold)
      ? selectedMethod.cost
      : 0;
  const tax = round2((summary.subtotal - summary.discount) * (checkoutConfig?.taxRate ?? 0) / 100);
  const totalBeforePoints = round2(summary.subtotal - summary.discount + shippingCost + tax);
  const maxPointsDiscount =
    usePoints && wallet.data && checkoutConfig
      ? Math.min(
          round2(totalBeforePoints * Math.min(checkoutConfig.voucherMaxRedeemPercent, 100) / 100),
          round2(wallet.data.balance * (checkoutConfig.voucherPointValue || 1)),
        )
      : 0;
  const estimatedTotal = round2(Math.max(totalBeforePoints - maxPointsDiscount, 0));

  const paymentOptions = useMemo(
    () => (checkoutConfig?.enabledPaymentMethods ?? []).map(method => {
      const key = method.toLowerCase();
      return {
        value: method,
        label: PAYMENT_LABELS[method] ?? method,
        hint:
          key === 'cod'
            ? 'Pay the courier when your parcel arrives'
            : ['bkash', 'nagad', 'rocket'].includes(key)
              ? 'Send money, then submit the transaction ID'
              : key === 'voucher'
                ? 'Your voucher points cover the full order'
                : 'You will be redirected to the secure payment page',
      };
    }),
    [checkoutConfig],
  );

  const mobileOption = checkoutConfig?.mobileBanking.find(option => option.provider === paymentMethod);

  const validate = () => {
    const next: Record<string, string> = {};
    (['fullName', 'phone', 'street', 'city', 'state', 'postalCode', 'country'] as const).forEach(key => {
      if (!address[key].trim()) next[key] = 'Required';
    });
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail.trim())) {
      next.guestEmail = 'Enter a valid email address for order updates.';
    }
    if (!shippingMethodId) next.shipping = 'Choose a shipping method.';
    if (!paymentMethod) next.payment = 'Choose a payment method.';
    setAddressErrors(next);
    if (Object.keys(next).length) {
      setError('Please complete the highlighted fields.');
      return false;
    }
    setError(null);
    return true;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await ordersApi.checkout({
        shippingAddress: {
          fullName: address.fullName.trim(),
          phone: address.phone.trim(),
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
        },
        billingAddress: null,
        shippingMethodId: shippingMethodId || null,
        couponCode: summary.couponCode ?? null,
        paymentMethod,
        notes: notes.trim() || null,
        guestEmail: user ? user.email : guestEmail.trim(),
        saveAddress: !!user && saveAddress,
        useVoucherPoints: usePoints,
      });
      await cart.refresh();
      lastOrderStore.remember(order, user ? user.email : guestEmail.trim());
      toast(`Order ${order.orderNumber} placed.`, 'success');

      if (order.paymentStatus === 'Paid' || order.total <= 0) {
        router.replace('confirmation', { orderId: order.id });
        return;
      }

      if (['Stripe', 'SslCommerz'].includes(paymentMethod)) {
        try {
          const base = typeof window !== 'undefined' ? `${window.location.origin}/#` : '';
          const initiation: PaymentInitiateResponse = await paymentsApi.initiate({
            orderId: order.id,
            provider: paymentMethod,
            successUrl: `${base}/order-confirmation/${order.id}?payment=success`,
            cancelUrl: `${base}/order-confirmation/${order.id}?payment=cancelled`,
            guestEmail: user ? user.email : guestEmail.trim(),
          });
          if (initiation.redirectUrl) {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.href = initiation.redirectUrl;
            } else {
              const { Linking } = require('react-native');
              Linking.openURL(initiation.redirectUrl);
            }
            return;
          }
        } catch (paymentError: any) {
          toast(paymentError?.message ?? 'Unable to start the payment. You can retry from the order page.', 'error');
        }
      }
      router.replace('confirmation', { orderId: order.id });
    } catch (err: any) {
      setError(err?.message ?? 'Unable to place your order.');
    } finally {
      setPlacing(false);
    }
  };

  if (config.loading && !config.data) {
    return (
      <Page>
        <Spinner label="Preparing checkout…" />
      </Page>
    );
  }
  if (config.error) {
    return (
      <Page>
        <ErrorState message={config.error} onRetry={() => config.reload()} />
      </Page>
    );
  }
  if (!cart.items.length) {
    return (
      <Page>
        <EmptyState
          title="Nothing to check out yet"
          message="Add a few pieces to your cart, then come back."
          actionLabel="Browse the shop"
          onAction={() => router.navigate('shop')}
        />
      </Page>
    );
  }

  const savedAddresses = addresses.data ?? [];

  return (
    <Page gap={spacing.xl}>
      <PageHeader back title="Checkout" subtitle="A few details and your order is on its way." />
      {error ? <AlertBox tone="danger" message={error} /> : null}
      <View style={[styles.layout, !wide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1.35, gap: spacing.lg, minWidth: 0 }}>
          {savedAddresses.length ? (
            <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
              <AppText variant="h3">Deliver to a saved address</AppText>
              <View style={{ gap: spacing.sm }}>
                {savedAddresses.map(saved => (
                  <Pressable
                    key={saved.id}
                    onPress={() => {
                      setSelectedAddressId(saved.id);
                      setAddress({
                        fullName: saved.fullName,
                        phone: saved.phone,
                        street: saved.street,
                        city: saved.city,
                        state: saved.state,
                        postalCode: saved.postalCode,
                        country: saved.country,
                      });
                      setAddressErrors({});
                    }}
                    style={[
                      styles.addressOption,
                      selectedAddressId === saved.id && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="title">{saved.fullName}{saved.isDefault ? '  · Default' : ''}</AppText>
                      <AppText variant="tiny" color={colors.muted}>
                        {saved.street}, {saved.city} {saved.postalCode} · {saved.phone}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
                <Button
                  label="Use a different address"
                  variant="link"
                  size="sm"
                  onPress={() => {
                    setSelectedAddressId('new');
                    setAddress(emptyAddress);
                    setAddressErrors({});
                  }}
                  style={{ alignSelf: 'flex-start' }}
                />
              </View>
            </Card>
          ) : null}

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Shipping address</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField
                label="Full name"
                value={address.fullName}
                onChangeText={value => setAddress(prev => ({ ...prev, fullName: value }))}
                error={addressErrors.fullName}
                style={{ flex: 1, minWidth: 200 }}
              />
              <TextField
                label="Phone"
                value={address.phone}
                onChangeText={value => setAddress(prev => ({ ...prev, phone: value }))}
                keyboardType="phone-pad"
                error={addressErrors.phone}
                style={{ flex: 1, minWidth: 180 }}
              />
            </View>
            <TextField
              label="Street address"
              value={address.street}
              onChangeText={value => setAddress(prev => ({ ...prev, street: value }))}
              placeholder="House, road, area"
              error={addressErrors.street}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField
                label="City"
                value={address.city}
                onChangeText={value => setAddress(prev => ({ ...prev, city: value }))}
                error={addressErrors.city}
                style={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                label="District / State"
                value={address.state}
                onChangeText={value => setAddress(prev => ({ ...prev, state: value }))}
                error={addressErrors.state}
                style={{ flex: 1, minWidth: 140 }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
              <TextField
                label="Postal code"
                value={address.postalCode}
                onChangeText={value => setAddress(prev => ({ ...prev, postalCode: value }))}
                error={addressErrors.postalCode}
                style={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                label="Country"
                value={address.country}
                onChangeText={value => setAddress(prev => ({ ...prev, country: value }))}
                error={addressErrors.country}
                style={{ flex: 1, minWidth: 160 }}
              />
            </View>
            {!user ? (
              <TextField
                label="Email for order updates"
                value={guestEmail}
                onChangeText={setGuestEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={addressErrors.guestEmail}
                helper="We share tracking updates and receipts here."
              />
            ) : null}
          </Card>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Shipping method</AppText>
            {(checkoutConfig?.shippingMethods ?? []).filter(m => m.isActive).map(method => {
              const selected = shippingMethodId === method.id;
              const free = freeThreshold > 0 && summary.subtotal - summary.discount >= freeThreshold;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setShippingMethodId(method.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">{method.name}</AppText>
                    <AppText variant="tiny" color={colors.muted}>
                      {method.estimatedDaysMin}–{method.estimatedDaysMax} business days
                      {method.description ? ` · ${method.description}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="title">{free ? 'Free' : fmt(method.cost)}</AppText>
                </Pressable>
              );
            })}
            {addressErrors.shipping ? <AppText variant="tiny" color={colors.danger}>{addressErrors.shipping}</AppText> : null}
          </Card>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Payment</AppText>
            {paymentOptions.map(option => {
              const selected = paymentMethod === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPaymentMethod(option.value)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={[styles.radio, selected && { borderColor: colors.primary }]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">{option.label}</AppText>
                    <AppText variant="tiny" color={colors.muted}>{option.hint}</AppText>
                  </View>
                </Pressable>
              );
            })}
            {addressErrors.payment ? <AppText variant="tiny" color={colors.danger}>{addressErrors.payment}</AppText> : null}
            {mobileOption ? (
              <AlertBox
                tone="info"
                title={`${PAYMENT_LABELS[mobileOption.provider] ?? mobileOption.provider} instructions`}
                message={`Send the total to ${mobileOption.accountNumber}. ${mobileOption.instructions}`}
              />
            ) : null}
            {checkoutConfig?.voucherPointsEnabled && user ? (
              <Pressable
                onPress={() => setUsePoints(value => !value)}
                style={[styles.option, usePoints && styles.optionSelected]}
              >
                <View style={[styles.radio, usePoints && { borderColor: colors.primary }]}>
                  {usePoints ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="title">Use voucher points</AppText>
                  <AppText variant="tiny" color={colors.muted}>
                    Balance {wallet.data?.balance ?? 0} points · worth up to {fmt(maxPointsDiscount)}
                  </AppText>
                </View>
                {wallet.data ? <Badge label={`${wallet.data.balance} pts`} /> : null}
              </Pressable>
            ) : null}
          </Card>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Order notes</AppText>
            <TextField
              value={notes}
              onChangeText={setNotes}
              placeholder="Delivery instructions, gift note, landmark…"
              multiline
              maxLength={1000}
            />
            {user ? (
              <Pressable onPress={() => setSaveAddress(value => !value)} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <View style={[styles.checkbox, saveAddress && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  {saveAddress ? <AppText variant="tiny" color={colors.white}>✓</AppText> : null}
                </View>
                <AppText variant="small" color={colors.inkSoft}>Save this address to my account</AppText>
              </Pressable>
            ) : null}
          </Card>
        </View>

        <View style={{ flex: 0.85, gap: spacing.md, minWidth: 280 }}>
          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Your order</AppText>
            <View style={{ gap: spacing.md, maxHeight: 340 }}>
              {cart.items.map(item => (
                <View key={item.id} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <View style={{ width: 48 }}>
                    <ProductImage url={item.imageUrl} name={item.productName} height={48} radiusValue={8} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="small" numberOfLines={1}>{item.productName}</AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      {item.quantity} × {fmt(item.unitPrice)}
                      {item.variantName ? ` · ${item.variantName}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="small" weight="600">{fmt(item.lineTotal)}</AppText>
                </View>
              ))}
            </View>
            <Divider />
            <KeyValue label="Subtotal" value={fmt(summary.subtotal)} />
            {summary.discount > 0 ? <KeyValue label="Discount" value={`− ${fmt(summary.discount)}`} /> : null}
            <KeyValue label="Shipping" value={shippingCost === 0 ? 'Free' : fmt(shippingCost)} />
            <KeyValue label={`Tax (${checkoutConfig?.taxRate ?? 0}%)`} value={fmt(tax)} />
            {usePoints && maxPointsDiscount > 0 ? (
              <KeyValue label="Voucher points" value={`− ${fmt(maxPointsDiscount)}`} />
            ) : null}
            <Divider />
            <KeyValue label="Total" value={fmt(estimatedTotal)} strong />
            <Button label={placing ? 'Placing order…' : 'Place order'} size="lg" full loading={placing} onPress={placeOrder} />
            <AppText variant="tiny" color={colors.faint} align="center">
              By placing your order you agree to our delivery and returns policy.
            </AppText>
          </Card>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  addressOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
