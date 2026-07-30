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
            + (f" · {pet.get('color')}" if pet.get("color") else "")
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
        usable = 17.4 * cm
        col_w = usable / max(len(headers), 1)
        table = Table(data, hAlign="LEFT", colWidths=[col_w] * len(headers))
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#a5f3fc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
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
                str(v.get("brand") or "—"),
                str(v.get("code") or "—"),
                str(v.get("administered_at") or ""),
                str(v.get("next_due_at") or "—"),
            ]
            for v in vaccines
        ],
        ["Nombre", "Marca", "Código", "Aplicada", "Próxima"],
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


def build_vaccine_pass_pdf(dossier: dict) -> bytes:
    """Compact vaccine certificate / Entry PASS style PDF (Free)."""
    pet = dossier.get("pet") or {}
    vaccines = dossier.get("vaccines") or []

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=f"Profipaws PASS — {pet.get('name', 'Pet')}",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "PassTitle",
        parent=styles["Heading1"],
        textColor=colors.HexColor("#0e7490"),
        spaceAfter=4,
    )
    h2 = ParagraphStyle(
        "PassH2",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#155e75"),
        fontSize=13,
        spaceBefore=12,
        spaceAfter=6,
    )
    body = styles["BodyText"]
    story = []

    story.append(Paragraph("Profipaws — Certificado / PASS de vacunas", title))
    story.append(
        Paragraph(
            "Documento para mostrar vacunación de la mascota (tutor / establecimientos).",
            body,
        )
    )
    story.append(Spacer(1, 0.25 * cm))
    story.append(
        Paragraph(
            f"<b>{pet.get('name', '—')}</b> · {pet.get('species', '')}"
            + (f" · {pet.get('breed')}" if pet.get("breed") else "")
            + (f" · {pet.get('color')}" if pet.get("color") else "")
            + (f" · chip {pet.get('chip_id')}" if pet.get("chip_id") else ""),
            body,
        )
    )
    meta = []
    if pet.get("birth_date"):
        meta.append(f"Nacimiento: {pet['birth_date']}")
    if pet.get("weight_kg") is not None:
        meta.append(f"Peso: {pet['weight_kg']} kg")
    if meta:
        story.append(Paragraph(" · ".join(meta), body))

    story.append(Paragraph("Vacunas registradas", h2))
    if not vaccines:
        story.append(Paragraph("Sin vacunas registradas.", body))
    else:
        small = ParagraphStyle(
            "PassSmall",
            parent=body,
            fontSize=9,
            leading=12,
            spaceAfter=2,
        )
        for idx, v in enumerate(vaccines):
            block = [
                [Paragraph(f"<b>{v.get('name') or '—'}</b>", small), ""],
                [
                    Paragraph(f"<b>Marca:</b> {v.get('brand') or '—'}", small),
                    Paragraph(f"<b>Código:</b> {v.get('code') or '—'}", small),
                ],
                [
                    Paragraph(f"<b>Aplicada:</b> {v.get('administered_at') or '—'}", small),
                    Paragraph(f"<b>Próxima:</b> {v.get('next_due_at') or '—'}", small),
                ],
                [
                    Paragraph(f"<b>Nota:</b> {v.get('notes') or '—'}", small),
                    "",
                ],
            ]
            table = Table(block, hAlign="LEFT", colWidths=[8.5 * cm, 8.5 * cm])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#a5f3fc")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#cffafe")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("SPAN", (0, 0), (1, 0)),
                        ("SPAN", (0, 3), (1, 3)),
                    ]
                )
            )
            story.append(table)
            if idx < len(vaccines) - 1:
                story.append(Spacer(1, 0.35 * cm))

    story.append(Spacer(1, 0.8 * cm))
    story.append(
        Paragraph(
            "<font size='8' color='#64748b'>Generado por Profipaws. Informativo; no sustituye un certificado oficial "
            "si la normativa local exige uno emitido por un veterinario colegiado.</font>",
            body,
        )
    )
    doc.build(story)
    return buf.getvalue()
