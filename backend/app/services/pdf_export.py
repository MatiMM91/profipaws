"""Generate a simple PDF medical passport for a pet."""
from __future__ import annotations

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_pet_passport_pdf(dossier: dict) -> bytes:
    pet = dossier.get("pet") or {}
    vaccines = dossier.get("vaccines") or []
    records = dossier.get("medical_records") or []
    events = dossier.get("calendar_events") or []
    conditions = dossier.get("chronic_conditions") or []
    logs = dossier.get("daily_logs") or []

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=f"Profipaws — {pet.get('name', 'Pet')}",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleCyan",
        parent=styles["Heading1"],
        textColor=colors.HexColor("#0e7490"),
        spaceAfter=6,
    )
    h2 = ParagraphStyle(
        "H2Cyan",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#155e75"),
        fontSize=13,
        spaceBefore=14,
        spaceAfter=6,
    )
    body = styles["BodyText"]
    story = []

    story.append(Paragraph("Profipaws — Pasaporte de salud", title))
    story.append(
        Paragraph(
            f"<b>{pet.get('name', '—')}</b> · {pet.get('species', '')}"
            + (f" · {pet.get('breed')}" if pet.get("breed") else "")
            + (f" · chip {pet.get('chip_id')}" if pet.get("chip_id") else ""),
            body,
        )
    )
    meta = []
    if pet.get("birth_date"):
        meta.append(f"Nacimiento: {pet['birth_date']}")
    if pet.get("weight_kg") is not None:
        meta.append(f"Peso: {pet['weight_kg']} kg")
    if pet.get("allergies"):
        meta.append(f"Alergias: {pet['allergies']}")
    if meta:
        story.append(Paragraph(" · ".join(meta), body))
    story.append(Spacer(1, 0.3 * cm))

    def section(label: str, rows: list[list[str]], headers: list[str]):
        story.append(Paragraph(label, h2))
        if not rows:
            story.append(Paragraph("Sin registros.", body))
            return
        data = [headers] + rows
        table = Table(data, hAlign="LEFT", colWidths=[4.2 * cm, 5.5 * cm, 6 * cm][: len(headers)])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#a5f3fc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(table)

    section(
        "Vacunas",
        [
            [
                str(v.get("name") or ""),
                str(v.get("administered_at") or ""),
                str(v.get("next_due_at") or "—"),
            ]
            for v in vaccines
        ],
        ["Nombre", "Aplicada", "Próxima"],
    )
    section(
        "Historial médico",
        [
            [
                str(r.get("record_type") or ""),
                str(r.get("title") or ""),
                str(r.get("occurred_at") or ""),
            ]
            for r in records
        ],
        ["Tipo", "Título", "Fecha"],
    )
    section(
        "Enfermedades crónicas",
        [
            [str(c.get("name") or ""), str(c.get("notes") or "—"), str(c.get("diagnosed_at") or "—")]
            for c in conditions
        ],
        ["Nombre", "Notas", "Diagnóstico"],
    )
    section(
        "Recordatorios",
        [
            [
                str(e.get("event_type") or ""),
                str(e.get("title") or ""),
                str(e.get("scheduled_at") or "")[:16],
            ]
            for e in events
        ],
        ["Tipo", "Título", "Fecha"],
    )
    section(
        "Diario (últimas entradas)",
        [
            [
                str(l.get("logged_at") or "")[:16],
                str(l.get("note") or "")[:80],
                f"{l.get('mood') or '—'} / {l.get('appetite') or '—'}",
            ]
            for l in logs[:15]
        ],
        ["Fecha", "Nota", "Ánimo/Apetito"],
    )

    story.append(Spacer(1, 0.8 * cm))
    story.append(
        Paragraph(
            "<font size='8' color='#64748b'>Generado por Profipaws. Documento informativo para el tutor/clínica.</font>",
            body,
        )
    )
    doc.build(story)
    return buf.getvalue()
