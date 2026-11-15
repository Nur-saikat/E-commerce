import React from 'react';
import { StyleSheet, View } from 'react-native';
import { catalogApi, siteApi } from '../../api';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  Page,
  PageHeader,
  RatingStars,
  Spinner,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function AboutScreen() {
  useDocumentTitle('About');
  const router = useRouter();
  const { settings } = useSettings();
  const data = useAsync(async () => {
    const [categories, testimonials] = await Promise.all([
      catalogApi.categories(),
      siteApi.testimonials().catch(() => []),
    ]);
    return { categories, testimonials };
  }, []);

  return (
    <Page gap={spacing.xxl}>
      <PageHeader back title="The Safwan story" subtitle={settings.tagline ?? undefined} />

      <Card style={{ padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.ink }}>
        <AppText variant="display" color={colors.white} style={{ maxWidth: 720 }}>
          Everyday essentials and little luxuries, chosen with care in Mirpur, Dhaka.
        </AppText>
        <AppText variant="body" color={colors.faint} style={{ maxWidth: 720 }}>
          {settings.storeName} began with a simple idea: shopping for your home and family should feel calm, honest and
          personal. We curate each collection by hand, from baby softness to everyday wellness, and stand behind every
          order with a real support team.
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button label="Shop the collection" onPress={() => router.navigate('shop')} />
          <Button
            label="Talk to us"
            variant="outline"
            onPress={() => router.navigate('contact')}
            textStyle={{ color: colors.white }}
            style={{ borderColor: colors.inkSoft }}
          />
        </View>
      </Card>

      <View style={styles.grid}>
        {[
          {
            title: 'Curated, not crowded',
            body: 'We keep the catalogue focused on pieces we would use ourselves — tested for quality, comfort and value.',
          },
          {
            title: 'Fair, transparent pricing',
            body: 'No hidden charges. Tax, delivery and reward points are shown clearly before you confirm any order.',
          },
          {
            title: 'Care after checkout',
            body: 'Order tracking, returns and refunds are built into your account, with mobile banking options that fit how you pay.',
          },
        ].map(value => (
          <Card key={value.title} style={{ flex: 1, minWidth: 240, padding: spacing.xl, gap: spacing.sm }}>
            <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
            <AppText variant="h3">{value.title}</AppText>
            <AppText variant="small" color={colors.muted}>{value.body}</AppText>
          </Card>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <AppText variant="h2">What we carry</AppText>
        {data.loading && !data.data ? (
          <Spinner label="Loading categories…" />
        ) : (
          <View style={styles.chips}>
            {data.data?.categories.map(category => (
              <Button
                key={category.id}
                label={category.name}
                size="sm"
                variant="outline"
                onPress={() => router.navigate('category', { slug: category.slug })}
              />
            ))}
          </View>
        )}
      </View>

      {data.data?.testimonials.length ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="h2">Kind words</AppText>
          <View style={styles.grid}>
            {data.data.testimonials.slice(0, 3).map(testimonial => (
              <Card key={testimonial.id} style={{ flex: 1, minWidth: 240, padding: spacing.xl, gap: spacing.sm }}>
                <RatingStars rating={testimonial.rating} showValue />
                <AppText variant="small">“{testimonial.quote}”</AppText>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <AppText variant="title">{testimonial.name}</AppText>
                  {testimonial.role ? <Badge label={testimonial.role} /> : null}
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
        <AppText variant="h3">Visit the studio</AppText>
        <AppText variant="small" color={colors.muted}>{settings.address ?? 'Mirpur, Dhaka, Bangladesh'}</AppText>
        {settings.phone ? <AppText variant="small" color={colors.muted}>Call: {settings.phone}</AppText> : null}
        {settings.email ? <AppText variant="small" color={colors.muted}>Email: {settings.email}</AppText> : null}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
