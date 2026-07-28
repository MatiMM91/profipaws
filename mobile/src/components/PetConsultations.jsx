import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react-native'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'
import { Body, Field, PrimaryButton, Subtitle } from './ui'
import { formatDue, todayISO } from '../utils/dates'

export default function PetConsultations({ petId, canEdit }) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const [items, setItems] = useState([])
  const [openId, setOpenId] = useState(null)
  const [notes, setNotes] = useState({})
  const [form, setForm] = useState({
    doctor_name: '',
    specialty: '',
    consulted_at: todayISO(),
    reason: '',
    treatment: '',
  })
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await api(`/api/pets/${petId}/consultations`)
    setItems(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [petId])

  async function loadNotes(consultationId) {
    const data = await api(`/api/pets/${petId}/consultations/${consultationId}/notes`)
    setNotes((prev) => ({ ...prev, [consultationId]: Array.isArray(data) ? data : [] }))
  }

  async function addConsultation() {
    setSaving(true)
    try {
      await api(`/api/pets/${petId}/consultations`, { method: 'POST', body: form })
      setForm({
        doctor_name: '',
        specialty: '',
        consulted_at: todayISO(),
        reason: '',
        treatment: '',
      })
      await load()
    } catch {
      Alert.alert(t('seguimiento.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function addNote(consultationId) {
    if (!noteText.trim()) return
    try {
      await api(`/api/pets/${petId}/consultations/${consultationId}/notes`, {
        method: 'POST',
        body: { content: noteText.trim() },
      })
      setNoteText('')
      await loadNotes(consultationId)
    } catch {
      Alert.alert(t('seguimiento.noteSaveError'))
    }
  }

  function removeConsultation(id) {
    Alert.alert(t('seguimiento.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await api(`/api/pets/${petId}/consultations/${id}`, { method: 'DELETE' })
          await load()
        },
      },
    ])
  }

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.text }}>
          {t('seguimiento.title')}
        </Text>
        <Subtitle style={{ marginTop: 4 }}>{t('seguimiento.subtitle')}</Subtitle>
      </View>

      {canEdit && (
        <View style={{ gap: 8 }}>
          <Field
            placeholder={t('seguimiento.doctor')}
            value={form.doctor_name}
            onChangeText={(v) => setForm((f) => ({ ...f, doctor_name: v }))}
          />
          <Field
            placeholder={t('seguimiento.specialty')}
            value={form.specialty}
            onChangeText={(v) => setForm((f) => ({ ...f, specialty: v }))}
          />
          <Field
            placeholder={t('seguimiento.date')}
            value={form.consulted_at}
            onChangeText={(v) => setForm((f) => ({ ...f, consulted_at: v }))}
          />
          <Field
            placeholder={t('seguimiento.reason')}
            value={form.reason}
            onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
          />
          <Field
            placeholder={t('seguimiento.treatment')}
            value={form.treatment}
            onChangeText={(v) => setForm((f) => ({ ...f, treatment: v }))}
          />
          <PrimaryButton title={t('seguimiento.add')} onPress={addConsultation} loading={saving} />
        </View>
      )}

      {items.length === 0 ? (
        <Body muted>{t('seguimiento.empty')}</Body>
      ) : (
        items.map((c) => {
          const open = openId === c.id
          const cNotes = notes[c.id] || []
          return (
            <View
              key={c.id}
              style={{
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                borderRadius: 14,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 8,
              }}
            >
              <Pressable
                onPress={async () => {
                  const next = open ? null : c.id
                  setOpenId(next)
                  if (next) await loadNotes(next)
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', color: colors.text, fontSize: 16 }}>
                    {c.doctor_name || t('seguimiento.consultations')}
                  </Text>
                  {canEdit && (
                    <Pressable onPress={() => removeConsultation(c.id)} hitSlop={8}>
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
                <Body muted style={{ fontSize: 13 }}>
                  {[c.specialty, formatDue(c.consulted_at, i18n.language)].filter(Boolean).join(' · ')}
                </Body>
                {c.reason ? <Body style={{ marginTop: 4 }}>{c.reason}</Body> : null}
              </Pressable>

              {open && (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  <Body muted style={{ fontSize: 12 }}>{t('seguimiento.evolutionHint')}</Body>
                  {(cNotes.length ? cNotes : []).map((n) => (
                    <Body key={n.id} style={{ fontSize: 13 }}>
                      • {n.content || n.note}
                    </Body>
                  ))}
                  {cNotes.length === 0 && <Body muted>{t('seguimiento.notesEmpty')}</Body>}
                  {canEdit && (
                    <>
                      <Field
                        placeholder={t('seguimiento.notePlaceholder')}
                        value={noteText}
                        onChangeText={setNoteText}
                      />
                      <PrimaryButton
                        title={t('seguimiento.addNote')}
                        onPress={() => addNote(c.id)}
                      />
                    </>
                  )}
                </View>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}
