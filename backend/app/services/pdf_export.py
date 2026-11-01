"""Generate a simple PDF medical passport for a pet."""
from __future__ import annotations

import html
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _esc(value) -> str:
    return html.escape(str(value if value is not None else ""))


def _cell(text, style: ParagraphStyle) -> Paragraph:
    return Paragraph(_esc(text).replace("\n", "<br/>") or "—", style)


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
    cell = ParagraphStyle(
        "CellWrap",
        parent=body,
        fontSize=8,
        leading=10,
        wordWrap="CJK",
    )
    header_cell = ParagraphStyle(
        "HeaderCell",
        parent=cell,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0e7490"),
    )
    story = []

    story.append(Paragraph("Profipaws — Pasaporte de salud", title))
    story.append(
        Paragraph(
            f"<b>{_esc(pet.get('name', '—'))}</b> · {_esc(pet.get('species', ''))}"
            + (f" · {_esc(pet.get('breed'))}" if pet.get("breed") else "")
            + (f" · {_esc(pet.get('color'))}" if pet.get("color") else "")
            + (f" · chip {_esc(pet.get('chip_id'))}" if pet.get("chip_id") else ""),
            body,
        )
    )
    meta = []
    if pet.get("birth_date"):
        meta.append(f"Nacimiento: {_esc(pet['birth_date'])}")
    if pet.get("weight_kg") is not None:
        meta.append(f"Peso: {_esc(pet['weight_kg'])} kg")
    if pet.get("allergies"):
        meta.append(f"Alergias: {_esc(pet['allergies'])}")
    if meta:
        story.append(Paragraph(" · ".join(meta), body))
    story.append(Spacer(1, 0.3 * cm))

    def section(label: str, rows: list[list], headers: list[str], widths: list[float] | None = None):
        story.append(Paragraph(label, h2))
        if not rows:
            story.append(Paragraph("Sin registros.", body))
            return
        usable = 17.4 * cm
        if widths and len(widths) == len(headers):
            col_w = [usable * w for w in widths]
        else:
            col_w = [usable / max(len(headers), 1)] * len(headers)
        data = [[_cell(h, header_cell) for h in headers]]
        for row in rows:
            data.append([_cell(v, cell) for v in row])
        table = Table(data, hAlign="LEFT", colWidths=col_w, repeatRows=1)
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
                v.get("name") or "",
                v.get("brand") or "—",
                v.get("code") or "—",
                v.get("administered_at") or "",
                v.get("next_due_at") or "—",
            ]
            for v in vaccines
        ],
        ["Nombre", "Marca", "Código", "Aplicada", "Próxima"],
        [0.28, 0.18, 0.14, 0.2, 0.2],
    )
    section(
        "Historial médico",
        [
            [
                r.get("record_type") or "",
                r.get("title") or "",
                r.get("description") or "—",
                r.get("occurred_at") or "",
            ]
            for r in records
        ],
        ["Tipo", "Título", "Notas", "Fecha"],
        [0.14, 0.22, 0.46, 0.18],
    )
    section(
        "Enfermedades crónicas",
        [
            [c.get("name") or "", c.get("notes") or "—", c.get("diagnosed_at") or "—"]
            for c in conditions
        ],
        ["Nombre", "Notas", "Diagnóstico"],
        [0.28, 0.52, 0.2],
    )
    section(
        "Recordatorios",
        [
            [
                e.get("event_type") or "",
                e.get("title") or "",
                (str(e.get("scheduled_at") or ""))[:16],
            ]
            for e in events
        ],
        ["Tipo", "Título", "Fecha"],
        [0.2, 0.55, 0.25],
    )
    section(
        "Diario (últimas entradas)",
        [
            [
                (str(l.get("logged_at") or ""))[:16],
                l.get("note") or "",
                f"{l.get('mood') or '—'} / {l.get('appetite') or '—'}",
            ]
            for l in logs[:15]
        ],
        ["Fecha", "Nota", "Ánimo/Apetito"],
        [0.2, 0.55, 0.25],
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
            f"<b>{_esc(pet.get('name', '—'))}</b> · {_esc(pet.get('species', ''))}"
            + (f" · {_esc(pet.get('breed'))}" if pet.get("breed") else "")
            + (f" · {_esc(pet.get('color'))}" if pet.get("color") else "")
            + (f" · chip {_esc(pet.get('chip_id'))}" if pet.get("chip_id") else ""),
            body,
        )
    )
    meta = []
    if pet.get("birth_date"):
        meta.append(f"Nacimiento: {_esc(pet['birth_date'])}")
    if pet.get("weight_kg") is not None:
        meta.append(f"Peso: {_esc(pet['weight_kg'])} kg")
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
                [Paragraph(f"<b>{_esc(v.get('name') or '—')}</b>", small), ""],
                [
                    Paragraph(f"<b>Marca:</b> {_esc(v.get('brand') or '—')}", small),
                    Paragraph(f"<b>Código:</b> {_esc(v.get('code') or '—')}", small),
                ],
                [
                    Paragraph(f"<b>Aplicada:</b> {_esc(v.get('administered_at') or '—')}", small),
                    Paragraph(f"<b>Próxima:</b> {_esc(v.get('next_due_at') or '—')}", small),
                ],
                [
                    Paragraph(f"<b>Nota:</b> {_esc(v.get('notes') or '—')}", small),
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
