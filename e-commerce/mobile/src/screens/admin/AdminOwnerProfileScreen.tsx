import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { businessApi, uploadsApi } from '../../api';
import type { BusinessDocumentRequest, EmploymentHistory, OwnerProfileRequest } from '../../api/types';
import {
  Button,
  Card,
  ErrorState,
  Section,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui';
import { assetUrl } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { toIso } from '../../utils/dates';
import { pickWebFile } from '../../utils/webFile';
import { AdminPage, EmptyRow } from './AdminKit';

const DOC_CATEGORIES = ['CV', 'NID', 'Contract', 'Certificate', 'Other'];

interface Draft {
  fullName: string;
  businessName: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  nationalId: string;
  tinNumber: string;
  binNumber: string;
  bio: string;
  employmentHistory: EmploymentHistory[];
  documents: BusinessDocumentRequest[];
}

const blankDraft: Draft = {
  fullName: '',
  businessName: '',
  designation: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  nationalId: '',
  tinNumber: '',
  binNumber: '',
  bio: '',
  employmentHistory: [],
  documents: [],
};

export function AdminOwnerProfileScreen() {
  useDocumentTitle('Owner profile');
  const { toast } = useFeedback();
  const profile = useAsync(() => businessApi.profile(), []);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const data = profile.data;
    if (!data) return;
    setDraft({
      fullName: data.fullName,
      businessName: data.businessName,
      designation: data.designation,
      email: data.email,
      phone: data.phone,
      address: data.address ?? '',
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      nationalId: data.nationalId ?? '',
      tinNumber: data.tinNumber ?? '',
      binNumber: data.binNumber ?? '',
      bio: data.bio ?? '',
      employmentHistory: data.employmentHistory.map(item => ({
        company: item.company,
        role: item.role,
        location: item.location ?? '',
        startDate: item.startDate ? item.startDate.slice(0, 10) : '',
        endDate: item.endDate ? item.endDate.slice(0, 10) : '',
        description: item.description ?? '',
      })),
      documents: data.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        url: doc.url,
        fileName: doc.fileName,
        size: doc.size,
        contentType: doc.contentType ?? null,
      })),
    });
  }, [profile.data]);

  const attachFile = async () => {
    const file = await pickWebFile();
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadsApi.upload(file);
      setDraft(prev => ({
        ...prev,
        documents: [
          ...prev.documents,
          {
            title: uploaded.fileName,
            category: 'Other',
            url: uploaded.url,
            fileName: uploaded.fileName,
            size: uploaded.size,
            contentType: file.type || null,
          },
        ],
      }));
      toast('Document uploaded.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to upload this document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.fullName.trim() || !draft.businessName.trim() || !draft.email.trim()) {
      toast('Name, business name and email are required.', 'error');
      return;
    }
    if (draft.employmentHistory.some(item => !item.company.trim() || !item.role.trim())) {
      toast('Every employment entry needs a company and role.', 'error');
      return;
    }
    if (draft.documents.some(doc => !doc.title.trim() || !doc.url.trim())) {
      toast('Every document needs a title and a link.', 'error');
      return;
    }
    const payload: OwnerProfileRequest = {
      fullName: draft.fullName.trim(),
      businessName: draft.businessName.trim(),
      designation: draft.designation.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim() || null,
      dateOfBirth: draft.dateOfBirth ? toIso(draft.dateOfBirth) : null,
      nationalId: draft.nationalId.trim() || null,
      tinNumber: draft.tinNumber.trim() || null,
      binNumber: draft.binNumber.trim() || null,
      bio: draft.bio.trim() || null,
      employmentHistory: draft.employmentHistory.map(item => ({
        company: item.company.trim(),
        role: item.role.trim(),
        location: item.location?.trim() || null,
        startDate: toIso(item.startDate),
        endDate: item.endDate ? toIso(item.endDate) : null,
        description: item.description?.trim() || null,
      })),
      documents: draft.documents.map(doc => ({
        id: doc.id ?? null,
        title: doc.title.trim(),
        category: doc.category,
        url: doc.url.trim(),
        fileName: doc.fileName || doc.title.trim(),
        size: doc.size,
        contentType: doc.contentType ?? null,
      })),
    };
    setSaving(true);
    try {
      await businessApi.saveProfile(payload);
      toast('Owner profile saved.', 'success');
      profile.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save the owner profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateHistory = (index: number, patch: Partial<EmploymentHistory>) => {
    setDraft(prev => ({
      ...prev,
      employmentHistory: prev.employmentHistory.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateDocument = (index: number, patch: Partial<BusinessDocumentRequest>) => {
    setDraft(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) => (i === index ? { ...doc, ...patch } : doc)),
    }));
  };

  const openDocument = (doc: BusinessDocumentRequest) => {
    const url = assetUrl(doc.url);
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <AdminPage
      title="Owner profile"
      subtitle="Your identity, business details and supporting documents."
      actions={<Button label="Save profile" onPress={save} loading={saving} />}
    >
      {profile.loading && !profile.data ? (
        <Spinner label="Loading profile…" />
      ) : profile.error ? (
        <ErrorState message={profile.error} onRetry={() => profile.reload()} />
      ) : (
        <>
          <Section title="Identity">
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <TextField label="Full name" value={draft.fullName} onChangeText={value => setDraft(prev => ({ ...prev, fullName: value }))} style={{ flex: 1, minWidth: 200 }} />
                <TextField label="Business name" value={draft.businessName} onChangeText={value => setDraft(prev => ({ ...prev, businessName: value }))} style={{ flex: 1, minWidth: 200 }} />
                <TextField label="Designation" value={draft.designation} onChangeText={value => setDraft(prev => ({ ...prev, designation: value }))} style={{ flex: 1, minWidth: 170 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <TextField label="Email" value={draft.email} onChangeText={value => setDraft(prev => ({ ...prev, email: value }))} keyboardType="email-address" autoCapitalize="none" style={{ flex: 1, minWidth: 200 }} />
                <TextField label="Phone" value={draft.phone} onChangeText={value => setDraft(prev => ({ ...prev, phone: value }))} keyboardType="phone-pad" style={{ flex: 1, minWidth: 160 }} />
                <TextField label="Date of birth" value={draft.dateOfBirth} onChangeText={value => setDraft(prev => ({ ...prev, dateOfBirth: value }))} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
              </View>
              <TextField label="Address" value={draft.address} onChangeText={value => setDraft(prev => ({ ...prev, address: value }))} />
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <TextField label="National ID" value={draft.nationalId} onChangeText={value => setDraft(prev => ({ ...prev, nationalId: value }))} style={{ flex: 1, minWidth: 170 }} />
                <TextField label="TIN" value={draft.tinNumber} onChangeText={value => setDraft(prev => ({ ...prev, tinNumber: value }))} style={{ flex: 1, minWidth: 140 }} />
                <TextField label="BIN" value={draft.binNumber} onChangeText={value => setDraft(prev => ({ ...prev, binNumber: value }))} style={{ flex: 1, minWidth: 140 }} />
              </View>
              <TextField label="Bio" value={draft.bio} onChangeText={value => setDraft(prev => ({ ...prev, bio: value }))} multiline placeholder="A short background for business records." />
            </Card>
          </Section>

          <Section
            title="Employment history"
            subtitle="Previous roles and experience."
            actionLabel="Add role"
            onAction={() =>
              setDraft(prev => ({
                ...prev,
                employmentHistory: [
                  ...prev.employmentHistory,
                  { company: '', role: '', location: '', startDate: '', endDate: '', description: '' },
                ],
              }))
            }
          >
            <Card style={{ padding: spacing.lg, gap: spacing.lg }}>
              {draft.employmentHistory.length === 0 ? (
                <EmptyRow message="No previous roles recorded." />
              ) : (
                draft.employmentHistory.map((item, index) => (
                  <View key={index} style={styles.historyBlock}>
                    <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                      <TextField label="Company" value={item.company} onChangeText={value => updateHistory(index, { company: value })} style={{ flex: 1, minWidth: 190 }} />
                      <TextField label="Role" value={item.role} onChangeText={value => updateHistory(index, { role: value })} style={{ flex: 1, minWidth: 170 }} />
                      <TextField label="Location" value={item.location ?? ''} onChangeText={value => updateHistory(index, { location: value })} style={{ flex: 1, minWidth: 150 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                      <TextField label="Start date" value={item.startDate} onChangeText={value => updateHistory(index, { startDate: value })} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
                      <TextField label="End date" value={item.endDate ?? ''} onChangeText={value => updateHistory(index, { endDate: value })} placeholder="Present" style={{ flex: 1, minWidth: 150 }} />
                      <TextField label="Description" value={item.description ?? ''} onChangeText={value => updateHistory(index, { description: value })} style={{ flex: 2, minWidth: 220 }} />
                    </View>
                    <Button
                      label="Remove role"
                      size="sm"
                      variant="ghost"
                      textStyle={{ color: colors.danger }}
                      onPress={() => setDraft(prev => ({ ...prev, employmentHistory: prev.employmentHistory.filter((_, i) => i !== index) }))}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  </View>
                ))
              )}
            </Card>
          </Section>

          <Section
            title="Documents"
            subtitle="Keep identity and business papers on file."
            actionLabel="Add link"
            onAction={() =>
              setDraft(prev => ({
                ...prev,
                documents: [
                  ...prev.documents,
                  { title: '', category: 'Other', url: '', fileName: '', size: 0, contentType: null },
                ],
              }))
            }
          >
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              {Platform.OS === 'web' ? (
                <Button label="Attach file" variant="outline" onPress={attachFile} loading={uploading} style={{ alignSelf: 'flex-start' }} />
              ) : null}
              {draft.documents.length === 0 ? (
                <EmptyRow message="No documents attached." />
              ) : (
                draft.documents.map((doc, index) => (
                  <View key={`${doc.id ?? 'doc'}-${index}`} style={styles.docRow}>
                    <TextField label="Title" value={doc.title} onChangeText={value => updateDocument(index, { title: value })} style={{ flex: 2, minWidth: 160 }} />
                    <SelectField label="Category" value={doc.category} options={DOC_CATEGORIES.map(value => ({ value, label: value }))} onChange={value => updateDocument(index, { category: value ?? 'Other' })} style={{ flex: 1, minWidth: 130 }} />
                    <TextField label="Link" value={doc.url} onChangeText={value => updateDocument(index, { url: value })} placeholder="https://…" autoCapitalize="none" style={{ flex: 2, minWidth: 180 }} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: 1 }}>
                      <Button label="Open" size="sm" variant="ghost" onPress={() => openDocument(doc)} />
                      <Button label="Remove" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => setDraft(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }))} />
                    </View>
                  </View>
                ))
              )}
            </Card>
          </Section>

          <Button label="Save profile" onPress={save} loading={saving} style={{ alignSelf: 'flex-start' }} />
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  historyBlock: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  docRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' },
});
