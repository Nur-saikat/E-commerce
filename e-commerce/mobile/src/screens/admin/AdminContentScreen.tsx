import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import type { Banner, BannerRequest, ContactMessage, Testimonial, TestimonialRequest } from '../../api/types';
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
  ProductImage,
  RatingStars,
  Spinner,
  Tabs,
  TextField,
  ToggleRow,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AdminPage } from './AdminKit';

type TabKey = 'banners' | 'testimonials' | 'messages' | 'subscribers';

export function AdminContentScreen() {
  useDocumentTitle('Storefront content');
  const [tab, setTab] = useState<TabKey>('banners');

  return (
    <AdminPage title="Storefront content" subtitle="Banners, testimonials, enquiries and newsletter subscribers.">
      <Tabs
        tabs={[
          { key: 'banners', label: 'Banners' },
          { key: 'testimonials', label: 'Testimonials' },
          { key: 'messages', label: 'Contact messages' },
          { key: 'subscribers', label: 'Subscribers' },
        ]}
        active={tab}
        onChange={key => setTab(key as TabKey)}
      />
      {tab === 'banners' ? <BannersPanel /> : null}
      {tab === 'testimonials' ? <TestimonialsPanel /> : null}
      {tab === 'messages' ? <MessagesPanel /> : null}
      {tab === 'subscribers' ? <SubscribersPanel /> : null}
    </AdminPage>
  );
}

function BannersPanel() {
  const { toast, confirm } = useFeedback();
  const banners = useAsync(() => adminApi.banners(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [draft, setDraft] = useState<BannerRequest>({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    buttonText: '',
    position: 'Hero',
    sortOrder: 0,
    isActive: true,
    startAt: null,
    endAt: null,
  });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft({ title: '', subtitle: '', imageUrl: '', linkUrl: '', buttonText: '', position: 'Hero', sortOrder: 0, isActive: true, startAt: null, endAt: null });
    setOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setDraft({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      imageUrl: banner.imageUrl ?? '',
      linkUrl: banner.linkUrl ?? '',
      buttonText: banner.buttonText ?? '',
      position: banner.position,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startAt: banner.startAt ?? null,
      endAt: banner.endAt ?? null,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      toast('Banner title is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) await adminApi.updateBanner(editing.id, draft);
      else await adminApi.createBanner(draft);
      toast(editing ? 'Banner updated.' : 'Banner created.', 'success');
      setOpen(false);
      banners.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (banner: Banner) => {
    const ok = await confirm({ title: 'Delete this banner?', message: 'It will disappear from the storefront.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteBanner(banner.id);
      toast('Banner deleted.', 'success');
      banners.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this banner.', 'error');
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label="New banner" onPress={openCreate} />
      </View>
      {banners.loading && !banners.data ? (
        <Spinner label="Loading banners…" />
      ) : banners.error ? (
        <ErrorState message={banners.error} onRetry={() => banners.reload()} />
      ) : (banners.data?.length ?? 0) === 0 ? (
        <EmptyState title="No banners" message="Add your first hero banner." actionLabel="New banner" onAction={openCreate} />
      ) : (
        banners.data?.map(banner => (
          <Card key={banner.id} style={{ padding: spacing.lg }}>
            <View style={styles.row}>
              <View style={{ width: 96 }}>
                <ProductImage url={banner.imageUrl} name={banner.title} height={60} radiusValue={8} />
              </View>
              <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppText variant="title">{banner.title}</AppText>
                  <Badge label={banner.position} />
                  {!banner.isActive ? <Badge label="Hidden" /> : null}
                </View>
                {banner.subtitle ? <AppText variant="tiny" color={colors.muted} numberOfLines={1}>{banner.subtitle}</AppText> : null}
                <AppText variant="tiny" color={colors.faint}>
                  Sort {banner.sortOrder}
                  {banner.linkUrl ? ` · ${banner.linkUrl}` : ''}
                  {banner.startAt ? ` · from ${dateTime(banner.startAt)}` : ''}
                  {banner.endAt ? ` · until ${dateTime(banner.endAt)}` : ''}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(banner)} />
                <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(banner)} />
              </View>
            </View>
          </Card>
        ))
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit banner' : 'New banner'}
        onClose={() => setOpen(false)}
        width={620}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create banner'} onPress={save} loading={saving} />
          </>
        }
      >
        <TextField label="Title" value={draft.title} onChangeText={value => setDraft(prev => ({ ...prev, title: value }))} />
        <TextField label="Subtitle" value={draft.subtitle ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, subtitle: value }))} />
        <TextField label="Image URL" value={draft.imageUrl ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, imageUrl: value }))} autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Link URL" value={draft.linkUrl ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, linkUrl: value }))} autoCapitalize="none" style={{ flex: 2, minWidth: 200 }} />
          <TextField label="Button text" value={draft.buttonText ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, buttonText: value }))} style={{ flex: 1, minWidth: 140 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Position" value={draft.position} onChangeText={value => setDraft(prev => ({ ...prev, position: value }))} style={{ flex: 1, minWidth: 160 }} />
          <TextField label="Sort order" value={String(draft.sortOrder)} onChangeText={value => setDraft(prev => ({ ...prev, sortOrder: Number(value) || 0 }))} keyboardType="number-pad" style={{ flex: 1, minWidth: 120 }} />
        </View>
        <ToggleRow label="Active" description="Hidden banners do not appear on the storefront." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
      </ModalSheet>
    </View>
  );
}

function TestimonialsPanel() {
  const { toast, confirm } = useFeedback();
  const testimonials = useAsync(() => adminApi.testimonials(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [draft, setDraft] = useState<TestimonialRequest>({ name: '', role: '', avatarUrl: '', rating: 5, quote: '', isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: '', role: '', avatarUrl: '', rating: 5, quote: '', isActive: true, sortOrder: 0 });
    setOpen(true);
  };

  const openEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setDraft({
      name: testimonial.name,
      role: testimonial.role ?? '',
      avatarUrl: testimonial.avatarUrl ?? '',
      rating: testimonial.rating,
      quote: testimonial.quote,
      isActive: testimonial.isActive,
      sortOrder: testimonial.sortOrder,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.quote.trim()) {
      toast('Name and quote are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) await adminApi.updateTestimonial(editing.id, draft);
      else await adminApi.createTestimonial(draft);
      toast(editing ? 'Testimonial updated.' : 'Testimonial created.', 'success');
      setOpen(false);
      testimonials.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this testimonial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (testimonial: Testimonial) => {
    const ok = await confirm({ title: 'Delete this testimonial?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteTestimonial(testimonial.id);
      toast('Testimonial deleted.', 'success');
      testimonials.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this testimonial.', 'error');
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label="New testimonial" onPress={openCreate} />
      </View>
      {testimonials.loading && !testimonials.data ? (
        <Spinner label="Loading testimonials…" />
      ) : testimonials.error ? (
        <ErrorState message={testimonials.error} onRetry={() => testimonials.reload()} />
      ) : (testimonials.data?.length ?? 0) === 0 ? (
        <EmptyState title="No testimonials" message="Add kind words from your customers." actionLabel="New testimonial" onAction={openCreate} />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          {testimonials.data?.map(testimonial => (
            <Card key={testimonial.id} style={{ flex: 1, minWidth: 260, padding: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar name={testimonial.name} url={testimonial.avatarUrl} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="title">{testimonial.name}</AppText>
                  <AppText variant="tiny" color={colors.muted}>{testimonial.role ?? 'Customer'}</AppText>
                </View>
                {!testimonial.isActive ? <Badge label="Hidden" /> : null}
              </View>
              <RatingStars rating={testimonial.rating} showValue />
              <AppText variant="small" color={colors.inkSoft}>“{testimonial.quote}”</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(testimonial)} />
                <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(testimonial)} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit testimonial' : 'New testimonial'}
        onClose={() => setOpen(false)}
        width={560}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Create testimonial'} onPress={save} loading={saving} />
          </>
        }
      >
        <TextField label="Customer name" value={draft.name} onChangeText={value => setDraft(prev => ({ ...prev, name: value }))} />
        <TextField label="Role / location" value={draft.role ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, role: value }))} />
        <TextField label="Avatar URL" value={draft.avatarUrl ?? ''} onChangeText={value => setDraft(prev => ({ ...prev, avatarUrl: value }))} autoCapitalize="none" />
        <TextField
          label="Rating (1–5)"
          value={String(draft.rating)}
          onChangeText={value => setDraft(prev => ({ ...prev, rating: Math.min(5, Math.max(1, Number(value) || 5)) }))}
          keyboardType="number-pad"
        />
        <TextField label="Quote" value={draft.quote} onChangeText={value => setDraft(prev => ({ ...prev, quote: value }))} multiline />
        <ToggleRow label="Active" description="Show this testimonial on the storefront." value={draft.isActive} onValueChange={value => setDraft(prev => ({ ...prev, isActive: value }))} />
      </ModalSheet>
    </View>
  );
}

function MessagesPanel() {
  const { toast, confirm } = useFeedback();
  const [page, setPage] = useState(1);
  const messages = useAsync(() => adminApi.contactMessages({ page, pageSize: 10 }), [page]);

  const markRead = async (message: ContactMessage) => {
    try {
      await adminApi.markContactRead(message.id);
      messages.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update this message.', 'error');
    }
  };

  const remove = async (message: ContactMessage) => {
    const ok = await confirm({ title: 'Delete this message?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteContactMessage(message.id);
      toast('Message deleted.', 'success');
      messages.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this message.', 'error');
    }
  };

  if (messages.loading && !messages.data) return <Spinner label="Loading messages…" />;
  if (messages.error) return <ErrorState message={messages.error} onRetry={() => messages.reload()} />;
  const data = messages.data;
  if (!data || !data.items.length) {
    return <EmptyState title="No contact messages" message="Messages sent from the contact page appear here." />;
  }

  return (
    <View style={{ gap: spacing.md }}>
      {data.items.map(message => (
        <Card key={message.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                <AppText variant="title">{message.subject}</AppText>
                {!message.isRead ? <Badge label="Unread" tone={{ bg: colors.warningSoft, fg: colors.warning }} /> : null}
              </View>
              <AppText variant="tiny" color={colors.muted}>
                {message.name} · {message.email}
                {message.phone ? ` · ${message.phone}` : ''}
              </AppText>
              <AppText variant="tiny" color={colors.faint}>{dateTime(message.createdAt)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {!message.isRead ? <Button label="Mark read" size="sm" variant="outline" onPress={() => markRead(message)} /> : null}
              <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(message)} />
            </View>
          </View>
          <AppText variant="small" color={colors.inkSoft}>{message.message}</AppText>
        </Card>
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        totalItems={data.pagination.totalItems}
        onChange={setPage}
      />
    </View>
  );
}

function SubscribersPanel() {
  const { toast, confirm } = useFeedback();
  const [page, setPage] = useState(1);
  const subscribers = useAsync(() => adminApi.subscribers({ page, pageSize: 15 }), [page]);

  const remove = async (id: string, email: string) => {
    const ok = await confirm({ title: `Remove ${email}?`, message: 'They will no longer receive the newsletter.', confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      await adminApi.deleteSubscriber(id);
      toast('Subscriber removed.', 'success');
      subscribers.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to remove this subscriber.', 'error');
    }
  };

  if (subscribers.loading && !subscribers.data) return <Spinner label="Loading subscribers…" />;
  if (subscribers.error) return <ErrorState message={subscribers.error} onRetry={() => subscribers.reload()} />;
  const data = subscribers.data;
  if (!data || !data.items.length) {
    return <EmptyState title="No subscribers yet" message="Newsletter signups appear here." />;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Card padded={false}>
        {data.items.map((subscriber, index) => (
          <View key={subscriber.id}>
            <View style={styles.row}>
              <View style={{ flex: 1, padding: spacing.lg, gap: 2 }}>
                <AppText variant="title">{subscriber.email}</AppText>
                <AppText variant="tiny" color={colors.faint}>
                  Subscribed {dateTime(subscriber.createdAt)} · {subscriber.isActive ? 'active' : 'inactive'}
                </AppText>
              </View>
              <View style={{ paddingRight: spacing.lg }}>
                <Button label="Remove" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(subscriber.id, subscriber.email)} />
              </View>
            </View>
            {index < data.items.length - 1 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
          </View>
        ))}
      </Card>
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        totalItems={data.pagination.totalItems}
        onChange={setPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
});
