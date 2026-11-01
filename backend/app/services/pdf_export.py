"""Generate a simple PDF medical passport for a pet."""
from __future__ import annotations

import html
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PAGE_INNER_WIDTH = 17.4 * cm
CELL_PAD_X = 3  # matches LEFT/RIGHTPADDING


def _esc(value) -> str:
    return html.escape(str(value if value is not None else ""))


def _force_wrap(text: str, max_width: float, font_name: str = "Helvetica", font_size: float = 8) -> str:
    """Insert <br/> so long values never paint outside their column."""
    raw = str(text if text is not None else "").strip() or "—"
    # Preserve intentional newlines first.
    chunks = raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines: list[str] = []
    avail = max(max_width - (CELL_PAD_X * 2), 24)

    for chunk in chunks:
        words = chunk.split(" ") if chunk else [""]
        current = ""
        for word in words:
            # Break oversized tokens character by character.
            while stringWidth(word, font_name, font_size) > avail:
                cut = 1
                while cut < len(word) and stringWidth(word[: cut + 1], font_name, font_size) <= avail:
                    cut += 1
                piece = word[:cut]
                candidate = f"{current} {piece}".strip() if current else piece
                if current and stringWidth(candidate, font_name, font_size) > avail:
                    lines.append(current)
                    current = piece
                else:
                    current = candidate
                word = word[cut:]
            candidate = f"{current} {word}".strip() if current else word
            if current and stringWidth(candidate, font_name, font_size) > avail:
                lines.append(current)
                current = word
            else:
                current = candidate
        lines.append(current)

    return "<br/>".join(_esc(line) if line != "" else "&nbsp;" for line in lines)


def _cell(text, style: ParagraphStyle, max_width: float) -> Paragraph:
    return Paragraph(_force_wrap(text, max_width, style.fontName, style.fontSize), style)


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
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.black,
    )
    header_cell = ParagraphStyle(
        "HeaderCell",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
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
        if widths and len(widths) == len(headers):
            col_w = [PAGE_INNER_WIDTH * w for w in widths]
        else:
            col_w = [PAGE_INNER_WIDTH / max(len(headers), 1)] * len(headers)
        data = [[_cell(h, header_cell, col_w[i]) for i, h in enumerate(headers)]]
        for row in rows:
            data.append([_cell(v, cell, col_w[i]) for i, v in enumerate(row)])
        table = Table(data, hAlign="LEFT", colWidths=col_w, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#a5f3fc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), CELL_PAD_X),
                    ("RIGHTPADDING", (0, 0), (-1, -1), CELL_PAD_X),
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

    # Diario: stacked rows so long notes never collide with mood/appetite.
    story.append(Paragraph("Diario (últimas entradas)", h2))
    if not logs:
        story.append(Paragraph("Sin registros.", body))
    else:
        for idx, entry in enumerate(logs[:15]):
            when = (str(entry.get("logged_at") or ""))[:16] or "—"
            mood = entry.get("mood") or "—"
            appetite = entry.get("appetite") or "—"
            note = entry.get("note") or "—"
            block = [
                [
                    _cell(f"{when}  ·  Ánimo: {mood}  ·  Apetito: {appetite}", header_cell, PAGE_INNER_WIDTH),
                ],
                [
                    _cell(note, cell, PAGE_INNER_WIDTH),
                ],
            ]
            table = Table(block, hAlign="LEFT", colWidths=[PAGE_INNER_WIDTH])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                        ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor("#a5f3fc")),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.3, colors.HexColor("#a5f3fc")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), CELL_PAD_X),
                        ("RIGHTPADDING", (0, 0), (-1, -1), CELL_PAD_X),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(table)
            if idx < min(len(logs), 15) - 1:
                story.append(Spacer(1, 0.2 * cm))

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
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            spaceAfter=2,
        )
        for idx, v in enumerate(vaccines):
            note_html = _force_wrap(
                f"Nota: {v.get('notes') or '—'}",
                17 * cm,
                "Helvetica",
                9,
            )
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
                    Paragraph(note_html, small),
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
