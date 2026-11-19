import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { businessApi, uploadsApi } from '../../api';
import type { BusinessDocumentRequest, StaffMember, StaffRequest } from '../../api/types';
import {
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
import { assetUrl, date, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { pickWebFile } from '../../utils/webFile';
import { AdminPage, EmptyRow, Toolbar } from './AdminKit';

const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Intern'];
const STAFF_STATUSES = ['Active', 'OnLeave', 'Resigned', 'Terminated'];
const DOC_CATEGORIES = ['CV', 'NID', 'Contract', 'Certificate', 'Other'];

interface Draft {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: string;
  status: string;
  joinedOn: string;
  leftOn: string;
  salary: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  documents: BusinessDocumentRequest[];
}

function blankDraft(): Draft {
  return {
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    employmentType: 'FullTime',
    status: 'Active',
    joinedOn: todayInput(),
    leftOn: '',
    salary: '0',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    documents: [],
  };
}

export function AdminStaffScreen() {
  useDocumentTitle('Staff');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const staff = useAsync(
    () =>
      businessApi.staff({
        page,
        pageSize: 10,
        status: status || undefined,
        search: submitted || undefined,
      }),
    [status, submitted, page],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft(blankDraft());
    setOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setDraft({
      employeeCode: member.employeeCode,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      designation: member.designation,
      department: member.department,
      employmentType: member.employmentType,
      status: member.status,
      joinedOn: member.joinedOn.slice(0, 10),
      leftOn: member.leftOn ? member.leftOn.slice(0, 10) : '',
      salary: String(member.salary),
      address: member.address ?? '',
      emergencyContactName: member.emergencyContactName ?? '',
      emergencyContactPhone: member.emergencyContactPhone ?? '',
      notes: member.notes ?? '',
      documents: member.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        url: doc.url,
        fileName: doc.fileName,
        size: doc.size,
        contentType: doc.contentType ?? null,
      })),
    });
    setOpen(true);
  };

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

  const openDocument = (doc: BusinessDocumentRequest) => {
    const url = assetUrl(doc.url);
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const save = async () => {
    if (!draft.fullName.trim() || !draft.email.trim()) {
      toast('Full name and email are required.', 'error');
      return;
    }
    if (!draft.designation.trim() || !draft.department.trim()) {
      toast('Designation and department are required.', 'error');
      return;
    }
    const salary = Number(draft.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      toast('Enter a valid salary.', 'error');
      return;
    }
    if (draft.documents.some(doc => !doc.title.trim() || !doc.url.trim())) {
      toast('Every document needs a title and a link.', 'error');
      return;
    }
    const payload: StaffRequest = {
      employeeCode: draft.employeeCode.trim() || null,
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      designation: draft.designation.trim(),
      department: draft.department.trim(),
      employmentType: draft.employmentType,
      status: draft.status,
      joinedOn: toIso(draft.joinedOn),
      leftOn: draft.leftOn ? toIso(draft.leftOn) : null,
      salary,
      address: draft.address.trim() || null,
      emergencyContactName: draft.emergencyContactName.trim() || null,
      emergencyContactPhone: draft.emergencyContactPhone.trim() || null,
      notes: draft.notes.trim() || null,
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
      if (editing) await businessApi.updateStaff(editing.id, payload);
      else await businessApi.createStaff(payload);
      toast(editing ? 'Staff record updated.' : 'Staff member added.', 'success');
      setOpen(false);
      staff.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this staff record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: StaffMember) => {
    const ok = await confirm({
      title: `Delete ${member.fullName}?`,
      message: 'This removes the staff record and its documents from the business ledger.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deleteStaff(member.id);
      toast('Staff record deleted.', 'success');
      staff.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this staff record.', 'error');
    }
  };

  const updateDocument = (index: number, patch: Partial<BusinessDocumentRequest>) => {
    setDraft(prev => ({
      ...prev,
      documents: prev.documents.map((doc, i) => (i === index ? { ...doc, ...patch } : doc)),
    }));
  };

  return (
    <AdminPage
      title="Staff"
      subtitle="Team records, employment terms and documents."
      actions={<Button label="Add staff" onPress={openCreate} />}
    >
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search by name, email or code"
          style={{ flex: 1, minWidth: 220 }}
        />
        <SelectField
          label="Status"
          value={status}
          allowClear
          options={STAFF_STATUSES.map(value => ({ value, label: titleCase(value) }))}
          onChange={value => {
            setStatus(value ?? '');
            setPage(1);
          }}
          style={{ flex: 1, minWidth: 160 }}
        />
      </Toolbar>

      {staff.loading && !staff.data ? (
        <Spinner label="Loading staff…" />
      ) : staff.error ? (
        <ErrorState message={staff.error} onRetry={() => staff.reload()} />
      ) : (staff.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No staff records"
          message={submitted || status ? 'No team members match these filters.' : 'Add your first team member to track employment and documents.'}
          actionLabel="Add staff"
          onAction={openCreate}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {staff.data?.items.map(member => (
              <Card key={member.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{member.fullName}</AppText>
                      <Badge label={titleCase(member.status)} />
                      <Badge label={titleCase(member.employmentType)} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {member.designation} · {member.department}
                      {member.employeeCode ? ` · ${member.employeeCode}` : ''}
                    </AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      {member.email} · {member.phone || 'No phone'} · joined {date(member.joinedOn)}
                      {member.leftOn ? ` · left ${date(member.leftOn)}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Monthly salary</AppText>
                    <AppText variant="h3">{fmt(member.salary)}</AppText>
                  </View>
                </View>

                {member.documents.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                    {member.documents.map(doc => (
                      <Button
                        key={doc.id}
                        label={`${doc.category} · ${doc.title}`}
                        size="sm"
                        variant="outline"
                        onPress={() => openDocument({ title: doc.title, category: doc.category, url: doc.url, fileName: doc.fileName, size: doc.size })}
                      />
                    ))}
                  </View>
                ) : null}

                {member.notes ? <AppText variant="small" color={colors.muted}>{member.notes}</AppText> : null}

                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(member)} />
                  <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(member)} />
                </View>
              </Card>
            ))}
          </View>
          {staff.data ? (
            <Pagination
              page={staff.data.pagination.page}
              totalPages={staff.data.pagination.totalPages}
              totalItems={staff.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit staff member' : 'New staff member'}
        onClose={() => !saving && setOpen(false)}
        width={760}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add staff'} onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Full name" value={draft.fullName} onChangeText={value => setDraft(prev => ({ ...prev, fullName: value }))} style={{ flex: 1, minWidth: 200 }} />
          <TextField label="Employee code (optional)" value={draft.employeeCode} onChangeText={value => setDraft(prev => ({ ...prev, employeeCode: value }))} style={{ flex: 1, minWidth: 160 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Email" value={draft.email} onChangeText={value => setDraft(prev => ({ ...prev, email: value }))} keyboardType="email-address" autoCapitalize="none" style={{ flex: 1, minWidth: 200 }} />
          <TextField label="Phone" value={draft.phone} onChangeText={value => setDraft(prev => ({ ...prev, phone: value }))} keyboardType="phone-pad" style={{ flex: 1, minWidth: 160 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Designation" value={draft.designation} onChangeText={value => setDraft(prev => ({ ...prev, designation: value }))} style={{ flex: 1, minWidth: 180 }} />
          <TextField label="Department" value={draft.department} onChangeText={value => setDraft(prev => ({ ...prev, department: value }))} style={{ flex: 1, minWidth: 160 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <SelectField label="Employment type" value={draft.employmentType} options={EMPLOYMENT_TYPES.map(value => ({ value, label: titleCase(value) }))} onChange={value => setDraft(prev => ({ ...prev, employmentType: value ?? 'FullTime' }))} style={{ flex: 1, minWidth: 160 }} />
          <SelectField label="Status" value={draft.status} options={STAFF_STATUSES.map(value => ({ value, label: titleCase(value) }))} onChange={value => setDraft(prev => ({ ...prev, status: value ?? 'Active' }))} style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Monthly salary" value={draft.salary} onChangeText={value => setDraft(prev => ({ ...prev, salary: value }))} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 140 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Joined on" value={draft.joinedOn} onChangeText={value => setDraft(prev => ({ ...prev, joinedOn: value }))} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Left on (optional)" value={draft.leftOn} onChangeText={value => setDraft(prev => ({ ...prev, leftOn: value }))} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        </View>
        <TextField label="Address (optional)" value={draft.address} onChangeText={value => setDraft(prev => ({ ...prev, address: value }))} />
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Emergency contact (optional)" value={draft.emergencyContactName} onChangeText={value => setDraft(prev => ({ ...prev, emergencyContactName: value }))} style={{ flex: 1, minWidth: 200 }} />
          <TextField label="Emergency phone (optional)" value={draft.emergencyContactPhone} onChangeText={value => setDraft(prev => ({ ...prev, emergencyContactPhone: value }))} keyboardType="phone-pad" style={{ flex: 1, minWidth: 170 }} />
        </View>
        <TextField label="Notes (optional)" value={draft.notes} onChangeText={value => setDraft(prev => ({ ...prev, notes: value }))} multiline />

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <AppText variant="title">Documents</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {Platform.OS === 'web' ? (
                <Button label="Attach file" size="sm" variant="outline" onPress={attachFile} loading={uploading} />
              ) : null}
              <Button
                label="Add link"
                size="sm"
                variant="ghost"
                onPress={() =>
                  setDraft(prev => ({
                    ...prev,
                    documents: [
                      ...prev.documents,
                      { title: '', category: 'Other', url: '', fileName: '', size: 0, contentType: null },
                    ],
                  }))
                }
              />
            </View>
          </View>
          {draft.documents.length === 0 ? (
            <EmptyRow message="No documents attached." />
          ) : (
            <View style={{ gap: spacing.md }}>
              {draft.documents.map((doc, index) => (
                <View key={`${doc.id ?? 'doc'}-${index}`} style={styles.docRow}>
                  <TextField label="Title" value={doc.title} onChangeText={value => updateDocument(index, { title: value })} style={{ flex: 2, minWidth: 160 }} />
                  <SelectField label="Category" value={doc.category} options={DOC_CATEGORIES.map(value => ({ value, label: value }))} onChange={value => updateDocument(index, { category: value ?? 'Other' })} style={{ flex: 1, minWidth: 130 }} />
                  <TextField label="Link" value={doc.url} onChangeText={value => updateDocument(index, { url: value })} placeholder="https://…" autoCapitalize="none" style={{ flex: 2, minWidth: 180 }} />
                  <Button label="Remove" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => setDraft(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }))} style={{ marginBottom: 1 }} />
                </View>
              ))}
            </View>
          )}
          <AppText variant="tiny" color={colors.muted}>
            Files upload to secure storage; drafts still need a title before saving.
          </AppText>
        </View>
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  docRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' },
});
