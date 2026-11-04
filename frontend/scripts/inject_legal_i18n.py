"""Inject legal page translations into es/en/pt locale files."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "i18n" / "locales"


def section(title: str, *paragraphs: str) -> dict:
    return {"title": title, "paragraphs": list(paragraphs)}


LEGAL_ES = {
    "updated": "Última actualización: 4 de noviembre de 2026",
    "contact": "Contacto: hola@profipaws.com",
    "back": "Volver al inicio",
    "footerNav": "Enlaces legales",
    "footerTerms": "Términos",
    "footerPrivacy": "Privacidad",
    "footerCookies": "Cookies",
    "footerNotice": "Aviso legal",
    "footerRefunds": "Reembolsos",
    "cookieBannerTitle": "Cookies técnicas",
    "cookieBannerBody": "Usamos cookies y almacenamiento local esenciales para iniciar sesión, recordar idioma y tema, y mantener tu sesión segura. No usamos cookies publicitarias.",
    "cookieAccept": "Entendido",
    "cookieMore": "Política de cookies",
    "terms": {
        "title": "Términos y condiciones",
        "intro": "Estos términos regulan el uso de Profipaws (web y aplicaciones asociadas). Al crear una cuenta, pagar el acceso o usar la demo, aceptas este documento.",
        "sections": [
            section(
                "1. Qué es Profipaws",
                "Profipaws es un servicio digital para organizar el historial de salud de mascotas: vacunas, peso, calendario, documentos y acceso temporal para veterinarios o familiares.",
                "Profipaws no sustituye la atención veterinaria ni emite diagnósticos médicos. La información la introduces tú o quien autorices; debes contrastarla con un profesional cuando sea necesario.",
            ),
            section(
                "2. Cuenta y acceso",
                "El acceso completo se obtiene con un pago único. También puedes explorar una demo temporal con datos de ejemplo; la demo no es una cuenta personal y puede reiniciarse.",
                "El inicio de sesión se realiza normalmente con Google. Eres responsable de la seguridad de tu cuenta de Google y de la actividad realizada en Profipaws con ella.",
                "Debes proporcionar información veraz y tener capacidad legal para contratar (o la autorización de tu representante legal si aplica).",
            ),
            section(
                "3. Demo",
                "La demo existe solo para probar la app. Los datos de ejemplo pueden borrarse o reiniciarse en cualquier momento. No uses la demo para guardar historial real de tu mascota.",
            ),
            section(
                "4. Pagos",
                "El precio del acceso completo se muestra antes del pago. Los cobros los procesa Stripe. Tras un pago válido, activamos el acceso asociado a tu cuenta.",
                "Salvo lo indicado en la política de reembolsos, el acceso digital se considera prestado al activarse.",
            ),
            section(
                "5. Uso aceptable",
                "No puedes usar Profipaws para actividades ilegales, abusivas, que vulneren derechos de terceros, ni para intentar acceder a datos de otros usuarios sin autorización.",
                "No debes interferir con la seguridad, disponibilidad o integridad del servicio (incluido el scraping abusivo, ingeniería inversa maliciosa o sobrecarga deliberada).",
            ),
            section(
                "6. Contenido y datos de mascotas",
                "Conservas la titularidad de la información que subes. Nos concedes una licencia limitada para alojarla, mostrarla y tratarla solo con el fin de prestar el servicio.",
                "Si compartes una mascota o generas un acceso veterinario temporal, eres responsable de a quién se lo das y de revocarlo cuando proceda.",
            ),
            section(
                "7. Disponibilidad y cambios",
                "Procuramos un servicio estable, pero puede haber interrupciones por mantenimiento, incidencias o causas ajenas. Podemos mejorar o modificar funciones avisando cuando el cambio sea relevante.",
            ),
            section(
                "8. Limitación de responsabilidad",
                "En la medida permitida por la ley, Profipaws no responde de daños indirectos, lucro cesante o decisiones tomadas únicamente a partir de la información guardada en la app.",
                "Nada en estos términos limita derechos imperativos de consumidores cuando resulten de aplicación.",
            ),
            section(
                "9. Cancelación",
                "Puedes dejar de usar el servicio y solicitar el borrado de tu cuenta. Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo el servicio u otros usuarios.",
            ),
            section(
                "10. Ley aplicable",
                "Salvo norma imperativa en contrario, estos términos se interpretan conforme a la legislación española y europea aplicable a consumidores y servicios digitales.",
            ),
        ],
    },
    "privacy": {
        "title": "Política de privacidad",
        "intro": "Esta política explica qué datos personales tratamos en Profipaws, para qué, con quién y qué derechos tienes. El responsable del tratamiento es el titular del servicio Profipaws (contacto abajo).",
        "sections": [
            section(
                "1. Datos que tratamos",
                "Cuenta: dirección de correo, nombre e identificador de Google, y foto de perfil si Google la facilita.",
                "Datos de mascotas y salud animal que introduces (historial, vacunas, peso, archivos, calendario, notas).",
                "Datos técnicos de sesión: tokens de acceso, preferencias de idioma/tema, registros básicos de seguridad y uso del servicio.",
                "Datos de pago: los gestiona Stripe; nosotros recibimos el estado del pago y referencias necesarias para activar el acceso, no el número completo de tu tarjeta.",
            ),
            section(
                "2. Finalidades y base legal",
                "Prestar el servicio y mantener tu cuenta (ejecución del contrato).",
                "Procesar el pago único y prevenir fraude (ejecución del contrato e interés legítimo / obligación legal cuando aplique).",
                "Enviar recordatorios de calendario por email si esa función está activa (ejecución del contrato / interés legítimo en avisarte de eventos que configuraste).",
                "Cumplir obligaciones legales y responder a autoridades cuando proceda.",
            ),
            section(
                "3. Encargados y terceros",
                "Google (inicio de sesión).",
                "Stripe (pagos).",
                "Proveedores de alojamiento (por ejemplo, Railway y Vercel) y, si está configurado, el proveedor de correo para avisos.",
                "Estos proveedores tratan datos según sus propias condiciones y solo en la medida necesaria para el servicio.",
            ),
            section(
                "4. Conservación",
                "Conservamos los datos mientras mantengas la cuenta o sean necesarios para el servicio, reclamaciones o obligaciones legales. La demo puede borrarse o reiniciarse de forma automática.",
                "Puedes solicitar el borrado de la cuenta desde la app; eliminaremos o anonimizaremos los datos personales asociados salvo deber legal de retención.",
            ),
            section(
                "5. Tus derechos",
                "Puedes solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad cuando proceda, y reclamar ante la autoridad de protección de datos competente.",
                "Para ejercer derechos, escríbenos al correo de contacto indicado en esta página.",
            ),
            section(
                "6. Menores",
                "Profipaws no está dirigido a menores de 16 años sin consentimiento de padres o tutores cuando la ley lo exija. Si detectamos una cuenta en esa situación, podremos eliminarla.",
            ),
            section(
                "7. Seguridad y transferencias",
                "Aplicamos medidas razonables de seguridad (cifrado en tránsito, control de acceso). Ningún sistema es 100 % seguro.",
                "Si hay transferencias internacionales (por proveedores cloud), se realizan con las garantías exigidas por la normativa aplicable cuando corresponda.",
            ),
        ],
    },
    "cookies": {
        "title": "Política de cookies",
        "intro": "Esta política describe el uso de cookies y tecnologías similares en Profipaws.",
        "sections": [
            section(
                "1. Qué usamos",
                "Cookies o almacenamiento necesarios para autenticación y sesión (para que puedas permanecer identificado de forma segura).",
                "Preferencias en el dispositivo: idioma y tema (claro/oscuro).",
                "No instalamos cookies de publicidad ni de analítica de marketing de terceros con fines publicitarios.",
            ),
            section(
                "2. Por qué son necesarias",
                "Sin estas tecnologías técnicas no podríamos iniciar sesión, recordar tu idioma/tema ni proteger la sesión. Por eso se consideran esenciales para el servicio.",
            ),
            section(
                "3. Terceros",
                "Al iniciar sesión con Google o pagar con Stripe, esos servicios pueden establecer sus propias cookies según sus políticas. Te recomendamos revisarlas en sus sitios oficiales.",
            ),
            section(
                "4. Cómo gestionarlas",
                "Puedes borrar datos del sitio desde la configuración de tu navegador. Si eliminas almacenamiento local o cookies de sesión, tendrás que volver a iniciar sesión y ajustar preferencias.",
            ),
        ],
    },
    "notice": {
        "title": "Aviso legal",
        "intro": "Información general sobre el titular y las condiciones de uso del sitio web y servicios Profipaws.",
        "sections": [
            section(
                "1. Identificación",
                "Titular del servicio: Profipaws.",
                "Sitio web: https://profipaws.vercel.app",
                "Contacto: hola@profipaws.com",
                "Si necesitas datos identificativos adicionales para una reclamación formal, solicítalos al correo de contacto y te facilitaremos la información disponible del responsable.",
            ),
            section(
                "2. Objeto",
                "El sitio informa sobre Profipaws y permite acceder a la aplicación, la demo y el proceso de pago del acceso completo.",
            ),
            section(
                "3. Propiedad intelectual",
                "Marca, diseño, textos y software de Profipaws están protegidos. No puedes copiarlos, modificarlos ni explotarlos sin autorización, salvo usos permitidos por ley.",
            ),
            section(
                "4. Responsabilidad sobre contenidos",
                "Nos esforzamos por mantener información correcta, pero puede haber errores u omisiones. El historial clínico de cada mascota depende de lo que registre el usuario.",
            ),
            section(
                "5. Enlaces",
                "Podemos enlazar a terceros (Google, Stripe, etc.). No controlamos sus páginas ni sus prácticas; al usarlas aplican sus términos.",
            ),
        ],
    },
    "refunds": {
        "title": "Política de reembolsos",
        "intro": "Profipaws ofrece un acceso digital de pago único. Esta política aclara cuándo puede solicitarse un reembolso.",
        "sections": [
            section(
                "1. Principio general",
                "Tras activar el acceso completo vinculado a tu cuenta, el servicio digital se considera prestado. Por eso los reembolsos no son automáticos.",
            ),
            section(
                "2. Casos en los que ayudamos",
                "Cobro duplicado o error técnico que impida activar el acceso tras un pago correcto.",
                "Imposibilidad grave y continuada de usar el servicio por causa atribuible a Profipaws, si no podemos solucionarlo en un plazo razonable.",
            ),
            section(
                "3. Cómo solicitarlo",
                "Escribe a hola@profipaws.com desde el correo de tu cuenta indicando fecha del pago, correo de Google usado y una breve descripción del problema.",
                "Revisaremos la solicitud y te responderemos con la resolución. Si procede el reembolso, se tramitará a través de Stripe al método de pago original cuando sea posible.",
            ),
            section(
                "4. Demo",
                "La demo es gratuita. No genera cargo ni derecho a reembolso.",
            ),
            section(
                "5. Derechos de consumo",
                "Si eres consumidor y la ley te reconoce un derecho de desistimiento u otra garantía imperativa, ese derecho prevalece sobre esta política en lo que resulte de aplicación.",
            ),
        ],
    },
}

LEGAL_EN = {
    "updated": "Last updated: 4 November 2026",
    "contact": "Contact: hola@profipaws.com",
    "back": "Back to home",
    "footerNav": "Legal links",
    "footerTerms": "Terms",
    "footerPrivacy": "Privacy",
    "footerCookies": "Cookies",
    "footerNotice": "Legal notice",
    "footerRefunds": "Refunds",
    "cookieBannerTitle": "Essential cookies",
    "cookieBannerBody": "We use essential cookies and local storage for sign-in, language and theme preferences, and secure sessions. We do not use advertising cookies.",
    "cookieAccept": "Got it",
    "cookieMore": "Cookie policy",
    "terms": {
        "title": "Terms and conditions",
        "intro": "These terms govern Profipaws (website and related apps). By creating an account, paying for access, or using the demo, you agree to this document.",
        "sections": [
            section(
                "1. What Profipaws is",
                "Profipaws is a digital service to organise pet health records: vaccines, weight, calendar, documents, and temporary access for vets or family.",
                "Profipaws does not replace veterinary care and does not provide medical diagnoses. You (or people you authorise) enter the information; always check with a professional when needed.",
            ),
            section(
                "2. Account and access",
                "Full access is unlocked with a one-time payment. You may also try a temporary demo with sample data; the demo is not a personal account and may reset.",
                "Sign-in usually uses Google. You are responsible for your Google account security and for activity in Profipaws under that account.",
                "You must provide accurate information and have legal capacity to contract (or consent from a legal guardian where required).",
            ),
            section(
                "3. Demo",
                "The demo is only for trying the product. Sample data may be wiped or reset at any time. Do not store real pet records in the demo.",
            ),
            section(
                "4. Payments",
                "The full-access price is shown before checkout. Payments are processed by Stripe. After a valid payment, we activate access on your account.",
                "Except as stated in the refund policy, digital access is considered delivered once activated.",
            ),
            section(
                "5. Acceptable use",
                "You may not use Profipaws for illegal or abusive activity, to infringe others’ rights, or to access other users’ data without authorisation.",
                "You must not interfere with security, availability, or integrity of the service.",
            ),
            section(
                "6. Content and pet data",
                "You keep ownership of content you upload. You grant us a limited licence to host and process it solely to provide the service.",
                "If you share a pet or create temporary vet access, you are responsible for who receives it and for revoking it when appropriate.",
            ),
            section(
                "7. Availability and changes",
                "We aim for a reliable service, but downtime can occur. We may improve or change features and will communicate material changes when appropriate.",
            ),
            section(
                "8. Liability",
                "To the extent allowed by law, Profipaws is not liable for indirect damages, lost profits, or decisions based solely on information stored in the app.",
                "Nothing here limits mandatory consumer rights where they apply.",
            ),
            section(
                "9. Termination",
                "You may stop using the service and request account deletion. We may suspend or close accounts that breach these terms or endanger the service or other users.",
            ),
            section(
                "10. Governing law",
                "Unless mandatory law says otherwise, these terms are interpreted under Spanish and applicable EU rules for consumers and digital services.",
            ),
        ],
    },
    "privacy": {
        "title": "Privacy policy",
        "intro": "This policy explains what personal data Profipaws processes, why, with whom, and your rights. The controller is the Profipaws service operator (contact below).",
        "sections": [
            section(
                "1. Data we process",
                "Account data: email, name, Google ID, and profile photo if Google provides it.",
                "Pet and animal-health data you enter (history, vaccines, weight, files, calendar, notes).",
                "Technical session data: access tokens, language/theme preferences, basic security and service logs.",
                "Payment data: handled by Stripe; we receive payment status and references needed to unlock access, not your full card number.",
            ),
            section(
                "2. Purposes and legal bases",
                "Provide the service and maintain your account (contract).",
                "Process the one-time payment and prevent fraud (contract and legitimate interest / legal obligation where applicable).",
                "Send calendar reminder emails when that feature is enabled (contract / legitimate interest).",
                "Comply with legal obligations and respond to authorities when required.",
            ),
            section(
                "3. Processors and third parties",
                "Google (sign-in).",
                "Stripe (payments).",
                "Hosting providers (such as Railway and Vercel) and, if configured, the email provider for reminders.",
                "They process data under their terms and only as needed for the service.",
            ),
            section(
                "4. Retention",
                "We keep data while your account exists or as needed for the service, claims, or legal duties. Demo data may reset automatically.",
                "You can request account deletion in the app; we delete or anonymise related personal data except where law requires retention.",
            ),
            section(
                "5. Your rights",
                "You may request access, rectification, erasure, restriction, objection, and portability where applicable, and lodge a complaint with a supervisory authority.",
                "To exercise rights, email the contact address on this page.",
            ),
            section(
                "6. Children",
                "Profipaws is not directed at children under 16 without parental consent where required. We may delete accounts that appear to breach this rule.",
            ),
            section(
                "7. Security and transfers",
                "We apply reasonable security measures (encryption in transit, access controls). No system is perfectly secure.",
                "International transfers via cloud providers use safeguards required by applicable law where relevant.",
            ),
        ],
    },
    "cookies": {
        "title": "Cookie policy",
        "intro": "This policy describes cookies and similar technologies used by Profipaws.",
        "sections": [
            section(
                "1. What we use",
                "Cookies or storage needed for authentication and session security.",
                "On-device preferences: language and theme.",
                "We do not set advertising cookies or marketing analytics cookies for ads.",
            ),
            section(
                "2. Why they are necessary",
                "Without these technical technologies we could not sign you in, remember language/theme, or protect your session. They are essential to the service.",
            ),
            section(
                "3. Third parties",
                "Google sign-in and Stripe checkout may set their own cookies under their policies. Please review those on their official sites.",
            ),
            section(
                "4. How to manage them",
                "You can clear site data in your browser settings. Removing local storage or session cookies will require signing in again.",
            ),
        ],
    },
    "notice": {
        "title": "Legal notice",
        "intro": "General information about the operator and use of the Profipaws website and services.",
        "sections": [
            section(
                "1. Identification",
                "Service operator: Profipaws.",
                "Website: https://profipaws.vercel.app",
                "Contact: hola@profipaws.com",
                "If you need further identifying details for a formal claim, email us and we will provide the available controller information.",
            ),
            section(
                "2. Purpose",
                "The site describes Profipaws and provides access to the app, demo, and full-access checkout.",
            ),
            section(
                "3. Intellectual property",
                "Profipaws brand, design, text, and software are protected. You may not copy or exploit them without permission, except as allowed by law.",
            ),
            section(
                "4. Content responsibility",
                "We aim for accurate information, but errors may occur. Each pet’s clinical history depends on what users record.",
            ),
            section(
                "5. Links",
                "We may link to third parties (Google, Stripe, etc.). Their sites and practices are outside our control.",
            ),
        ],
    },
    "refunds": {
        "title": "Refund policy",
        "intro": "Profipaws sells one-time digital access. This policy explains when a refund may be requested.",
        "sections": [
            section(
                "1. General rule",
                "Once full access is activated on your account, the digital service is considered delivered. Refunds are therefore not automatic.",
            ),
            section(
                "2. Cases we will help with",
                "Duplicate charge or a technical error that prevents activation after a valid payment.",
                "Severe ongoing inability to use the service caused by Profipaws, if we cannot fix it within a reasonable time.",
            ),
            section(
                "3. How to request",
                "Email hola@profipaws.com from your account address with payment date, Google email used, and a short description of the issue.",
                "We will review and reply. If a refund is approved, it is processed via Stripe to the original payment method when possible.",
            ),
            section(
                "4. Demo",
                "The demo is free and does not create a charge or refund right.",
            ),
            section(
                "5. Consumer rights",
                "If consumer law gives you a mandatory withdrawal or warranty right, that right prevails over this policy where it applies.",
            ),
        ],
    },
}

LEGAL_PT = {
    "updated": "Última atualização: 4 de novembro de 2026",
    "contact": "Contacto: hola@profipaws.com",
    "back": "Voltar ao início",
    "footerNav": "Ligações legais",
    "footerTerms": "Termos",
    "footerPrivacy": "Privacidade",
    "footerCookies": "Cookies",
    "footerNotice": "Aviso legal",
    "footerRefunds": "Reembolsos",
    "cookieBannerTitle": "Cookies técnicas",
    "cookieBannerBody": "Usamos cookies e armazenamento local essenciais para iniciar sessão, lembrar idioma e tema, e manter a sessão segura. Não usamos cookies publicitárias.",
    "cookieAccept": "Compreendi",
    "cookieMore": "Política de cookies",
    "terms": {
        "title": "Termos e condições",
        "intro": "Estes termos regulam o uso da Profipaws (site e apps associadas). Ao criar conta, pagar o acesso ou usar a demo, aceita este documento.",
        "sections": [
            section(
                "1. O que é a Profipaws",
                "A Profipaws é um serviço digital para organizar o historial de saúde de animais de estimação: vacinas, peso, calendário, documentos e acesso temporário para veterinários ou família.",
                "A Profipaws não substitui cuidados veterinários nem emite diagnósticos. A informação é introduzida por si ou por quem autorizar.",
            ),
            section(
                "2. Conta e acesso",
                "O acesso completo obtém-se com um pagamento único. Também pode explorar uma demo temporária com dados de exemplo; a demo não é uma conta pessoal e pode reiniciar-se.",
                "O início de sessão usa normalmente o Google. É responsável pela segurança da sua conta Google e pela atividade na Profipaws.",
            ),
            section(
                "3. Demo",
                "A demo serve apenas para experimentar o produto. Os dados de exemplo podem ser apagados ou reiniciados. Não guarde historial real na demo.",
            ),
            section(
                "4. Pagamentos",
                "O preço do acesso completo é mostrado antes do pagamento. Os cobranças são processadas pela Stripe. Após um pagamento válido, ativamos o acesso na sua conta.",
            ),
            section(
                "5. Utilização aceitável",
                "Não pode usar a Profipaws para atividades ilegais, abusivas, que violem direitos de terceiros, nem para aceder a dados de outros utilizadores sem autorização.",
            ),
            section(
                "6. Conteúdos e dados",
                "Mantém a titularidade da informação que carrega. Concede-nos uma licença limitada para a alojar e tratar apenas para prestar o serviço.",
            ),
            section(
                "7. Disponibilidade",
                "Procuramos um serviço estável, mas pode haver interrupções. Podemos melhorar ou alterar funções quando for relevante.",
            ),
            section(
                "8. Responsabilidade",
                "Na medida permitida pela lei, a Profipaws não responde por danos indiretos ou decisões tomadas apenas com base na informação guardada na app. Os direitos imperativos dos consumidores prevalecem.",
            ),
            section(
                "9. Cancelamento",
                "Pode deixar de usar o serviço e pedir a eliminação da conta. Podemos suspender contas que violem estes termos.",
            ),
            section(
                "10. Lei aplicável",
                "Salvo norma imperativa em contrário, estes termos interpretam-se segundo a legislação espanhola e europeia aplicável a consumidores e serviços digitais.",
            ),
        ],
    },
    "privacy": {
        "title": "Política de privacidade",
        "intro": "Esta política explica que dados pessoais tratamos na Profipaws, para quê, com quem e que direitos tem. O responsável é o titular do serviço Profipaws (contacto abaixo).",
        "sections": [
            section(
                "1. Dados que tratamos",
                "Conta: email, nome, identificador Google e foto de perfil se o Google a fornecer.",
                "Dados de animais e saúde animal que introduz.",
                "Dados técnicos de sessão e preferências.",
                "Pagamentos: tratados pela Stripe; recebemos o estado do pagamento para ativar o acesso.",
            ),
            section(
                "2. Finalidades",
                "Prestar o serviço, processar o pagamento único, enviar lembretes de calendário quando ativos, e cumprir obrigações legais.",
            ),
            section(
                "3. Terceiros",
                "Google, Stripe, fornecedores de alojamento (p.ex. Railway e Vercel) e, se configurado, o fornecedor de email.",
            ),
            section(
                "4. Conservação e direitos",
                "Conservamos os dados enquanto a conta existir ou for necessário. Pode pedir acesso, retificação, apagamento e outros direitos GDPR/RGPD escrevendo para o contacto desta página.",
            ),
            section(
                "5. Menores e segurança",
                "O serviço não se destina a menores de 16 anos sem consentimento parental quando exigido. Aplicamos medidas razoáveis de segurança.",
            ),
        ],
    },
    "cookies": {
        "title": "Política de cookies",
        "intro": "Esta política descreve o uso de cookies e tecnologias semelhantes na Profipaws.",
        "sections": [
            section(
                "1. O que usamos",
                "Cookies/armazenamento essenciais para autenticação e sessão, e preferências de idioma/tema. Não usamos cookies publicitárias.",
            ),
            section(
                "2. Porque são necessárias",
                "Sem estas tecnologias técnicas não seria possível iniciar sessão nem proteger a sessão de forma adequada.",
            ),
            section(
                "3. Terceiros e gestão",
                "Google e Stripe podem definir cookies próprias. Pode limpar dados do site nas definições do navegador.",
            ),
        ],
    },
    "notice": {
        "title": "Aviso legal",
        "intro": "Informação geral sobre o titular e as condições de uso do site e serviços Profipaws.",
        "sections": [
            section(
                "1. Identificação",
                "Titular do serviço: Profipaws.",
                "Site: https://profipaws.vercel.app",
                "Contacto: hola@profipaws.com",
            ),
            section(
                "2. Objeto e propriedade intelectual",
                "O site apresenta a Profipaws e permite aceder à app, demo e pagamento. Marca, design e software estão protegidos.",
            ),
            section(
                "3. Responsabilidade e ligações",
                "O historial clínico depende do que o utilizador regista. Ligações a terceiros regem-se pelas suas próprias condições.",
            ),
        ],
    },
    "refunds": {
        "title": "Política de reembolsos",
        "intro": "A Profipaws oferece acesso digital de pagamento único. Esta política clarifica quando pode pedir reembolso.",
        "sections": [
            section(
                "1. Regra geral",
                "Após ativar o acesso completo na conta, o serviço digital considera-se prestado. Os reembolsos não são automáticos.",
            ),
            section(
                "2. Casos em que ajudamos",
                "Cobrança duplicada ou erro técnico que impeça a ativação após pagamento válido, ou impossibilidade grave de uso imputável à Profipaws se não for resolvida em prazo razoável.",
            ),
            section(
                "3. Como pedir",
                "Escreva para hola@profipaws.com a partir do email da conta com data do pagamento e descrição do problema.",
            ),
            section(
                "4. Demo e direitos do consumidor",
                "A demo é gratuita. Se a lei de consumo lhe reconhecer direitos imperativos, esses direitos prevalecem.",
            ),
        ],
    },
}


def main() -> None:
    mapping = {"es": LEGAL_ES, "en": LEGAL_EN, "pt": LEGAL_PT}
    for lang, legal in mapping.items():
        path = ROOT / f"{lang}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["legal"] = legal
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("updated", path.name)


if __name__ == "__main__":
    main()
