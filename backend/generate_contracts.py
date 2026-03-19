"""
Generate 5 sample contracts as PDFs for the contract-intel tool.
Run with: venv/Scripts/python generate_contracts.py
"""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(OUTPUT_DIR, exist_ok=True)

styles = getSampleStyleSheet()

def make_style(name, parent="Normal", **kwargs):
    s = ParagraphStyle(name, parent=styles[parent], **kwargs)
    return s

TITLE    = make_style("ContractTitle",  fontSize=16, fontName="Helvetica-Bold", spaceAfter=4,  alignment=TA_CENTER)
SUBTITLE = make_style("ContractSub",    fontSize=10, fontName="Helvetica",      spaceAfter=16, alignment=TA_CENTER, textColor=colors.grey)
H1       = make_style("H1",             fontSize=11, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4)
H2       = make_style("H2",             fontSize=10, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=3)
BODY     = make_style("Body",           fontSize=9,  fontName="Helvetica",      spaceAfter=6,  leading=14, alignment=TA_JUSTIFY)
CLAUSE   = make_style("Clause",         fontSize=9,  fontName="Helvetica",      spaceAfter=5,  leading=14, leftIndent=20, alignment=TA_JUSTIFY)
BOLD     = make_style("Bold",           fontSize=9,  fontName="Helvetica-Bold", spaceAfter=4)
META     = make_style("Meta",           fontSize=9,  fontName="Helvetica",      spaceAfter=3,  textColor=colors.HexColor("#444444"))


def build_pdf(filename, elements):
    path = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(
        path,
        pagesize=LETTER,
        leftMargin=1*inch, rightMargin=1*inch,
        topMargin=1*inch,  bottomMargin=1*inch,
    )
    doc.build(elements)
    print(f"  Created: {path}")


def divider():
    return HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=8, spaceBefore=4)


def p(text, style=BODY):
    return Paragraph(text, style)

def sp(n=8):
    return Spacer(1, n)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT 1 — Enterprise Software License Agreement (Salesforce-style CRM)
# ─────────────────────────────────────────────────────────────────────────────
def contract_1():
    elems = []
    elems += [
        p("ENTERPRISE SOFTWARE LICENSE AGREEMENT", TITLE),
        p("Between NovaTech Solutions Inc. and Salesbridge CRM Ltd.", SUBTITLE),
        divider(),
        p("<b>Agreement Date:</b> January 15, 2024", META),
        p("<b>Effective Date:</b> February 1, 2024", META),
        p("<b>Renewal Date:</b> January 31, 2025 (auto-renews annually)", META),
        p("<b>Contract Value:</b> SAR 480,000 per annum", META),
        p("<b>Vendor:</b> Salesbridge CRM Ltd., Riyadh, Saudi Arabia", META),
        p("<b>Customer:</b> NovaTech Solutions Inc., Jeddah, Saudi Arabia", META),
        sp(),
        divider(),

        p("1. GRANT OF LICENSE", H1),
        p("1.1 Subject to the terms and conditions of this Agreement, Salesbridge CRM Ltd. "
          "('Licensor') hereby grants to NovaTech Solutions Inc. ('Licensee') a non-exclusive, "
          "non-transferable, non-sublicensable license to use the Salesbridge Enterprise CRM "
          "platform ('Software') solely for the Licensee's internal business operations.", CLAUSE),
        p("1.2 The license is limited to <b>250 named users</b>. Any addition of users beyond "
          "the licensed count requires written approval and additional fees at the then-current "
          "list price, with no volume discount guaranteed.", CLAUSE),
        p("<b>⚠ RISK — Audit Rights (Clause 1.3):</b> Licensor reserves the right to audit "
          "Licensee's usage at any time with 5 business days' notice. Licensee must provide "
          "full access to internal systems, user logs, and deployment records. Failure to comply "
          "within the notice period constitutes a material breach.", CLAUSE),

        p("2. FEES AND PAYMENT TERMS", H1),
        p("2.1 Annual license fee of SAR 480,000 is due within <b>15 days</b> of invoice. "
          "Late payments accrue interest at <b>2% per month</b> (compounded), equivalent to "
          "26.8% per annum.", CLAUSE),
        p("<b>⚠ RISK — Price Escalation (Clause 2.2):</b> Licensor may increase annual fees by "
          "up to <b>15% per renewal year</b> with 60 days' written notice prior to the renewal "
          "date. Licensee's continued use after the renewal date constitutes acceptance of the "
          "new pricing.", CLAUSE),
        p("2.3 All fees are non-refundable. No pro-rata refunds will be issued for early "
          "termination by the Licensee.", CLAUSE),

        p("3. AUTO-RENEWAL AND TERMINATION", H1),
        p("<b>⚠ RISK — Auto-Renewal (Clause 3.1):</b> This Agreement <b>automatically renews</b> "
          "for successive one-year terms unless either party provides written cancellation notice "
          "at least <b>90 days before</b> the renewal date (October 31, 2024 for Year 1). "
          "Failure to provide timely notice binds the Licensee to another full year's fees.", CLAUSE),
        p("3.2 Licensor may terminate this Agreement immediately, without liability, if Licensee "
          "becomes insolvent, undergoes restructuring, or is acquired by a competitor of Licensor "
          "as determined at Licensor's sole discretion.", CLAUSE),
        p("3.3 Upon termination, Licensee must destroy all copies of the Software within 10 "
          "business days and provide written certification. Data export is available for 30 days "
          "post-termination only.", CLAUSE),

        p("4. INTELLECTUAL PROPERTY", H1),
        p("4.1 All intellectual property rights in the Software remain exclusively with Licensor. "
          "No rights are granted by implication, estoppel, or otherwise.", CLAUSE),
        p("<b>⚠ RISK — IP Indemnification Carve-out (Clause 4.2):</b> Licensor's obligation to "
          "indemnify against third-party IP claims is <b>capped at 6 months of fees paid</b> and "
          "excludes claims arising from Licensee modifications, integrations with third-party "
          "systems, or use outside the licensed territory.", CLAUSE),

        p("5. OBLIGATIONS OF LICENSEE", H1),
        p("<b>Obligation (Due: Ongoing):</b> Licensee must maintain a designated 'Software "
          "Administrator' and notify Licensor of any personnel changes within 5 business days.", CLAUSE),
        p("<b>Obligation (Due: February 28, 2024):</b> Licensee must complete onboarding "
          "training for all 250 named users within 30 days of Effective Date.", CLAUSE),
        p("<b>Obligation (Due: July 31, 2024 — Mid-Year Review):</b> Licensee must participate "
          "in a mandatory mid-year usage review and provide utilization data.", CLAUSE),
        p("5.4 Licensee shall not reverse-engineer, decompile, or disassemble the Software, "
          "nor attempt to derive source code through any means.", CLAUSE),

        p("6. LIABILITY LIMITATIONS", H1),
        p("<b>⚠ RISK — Consequential Damages Waiver (Clause 6.1):</b> Under no circumstances "
          "shall Licensor be liable for loss of profits, loss of data, business interruption, "
          "or any indirect or consequential damages, even if advised of the possibility. "
          "Licensor's total aggregate liability is capped at <b>SAR 120,000</b> (3 months' fees) "
          "regardless of the nature of the claim.", CLAUSE),

        p("7. GOVERNING LAW", H1),
        p("This Agreement is governed by the laws of the Kingdom of Saudi Arabia. Disputes "
          "shall be submitted to binding arbitration in Riyadh under SAGIA rules. "
          "Each party waives the right to jury trial.", CLAUSE),

        sp(20),
        divider(),
        p("SIGNATURES", H2),
        p("NovaTech Solutions Inc. — Authorized Signatory: ________________________  Date: ________", BODY),
        p("Salesbridge CRM Ltd. — Authorized Signatory: ____________________________  Date: ________", BODY),
    ]
    build_pdf("01_enterprise_software_license_salesbridge.pdf", elems)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT 2 — Data License Agreement (Market Intelligence Data)
# ─────────────────────────────────────────────────────────────────────────────
def contract_2():
    elems = []
    elems += [
        p("DATA LICENSE AGREEMENT", TITLE),
        p("Between NovaTech Solutions Inc. and DataNexus Arabia Co.", SUBTITLE),
        divider(),
        p("<b>Agreement Date:</b> March 1, 2024", META),
        p("<b>Effective Date:</b> March 15, 2024", META),
        p("<b>Initial Term:</b> 18 months (expires September 14, 2025)", META),
        p("<b>Renewal Date:</b> September 14, 2025 (auto-renews for 12-month terms)", META),
        p("<b>Contract Value:</b> SAR 220,000 (Year 1) + SAR 165,000 (remaining 6 months Year 2 pro-rata)", META),
        p("<b>Vendor:</b> DataNexus Arabia Co., Dubai, UAE", META),
        p("<b>Customer:</b> NovaTech Solutions Inc., Jeddah, Saudi Arabia", META),
        sp(),
        divider(),

        p("1. LICENSED DATA AND PERMITTED USE", H1),
        p("1.1 DataNexus Arabia Co. ('Licensor') grants NovaTech Solutions Inc. ('Licensee') "
          "a limited, non-exclusive license to access and use the DataNexus GCC Market "
          "Intelligence Dataset ('Licensed Data'), comprising: B2B commercial transaction data, "
          "company firmographics for 2.4 million GCC entities, and sector-level pricing indices.", CLAUSE),
        p("<b>⚠ RISK — Permitted Use Restriction (Clause 1.2):</b> Licensed Data may only be used "
          "for Licensee's <b>internal business intelligence</b> purposes. Licensee is <b>strictly "
          "prohibited</b> from: (a) incorporating data into any product sold to third parties, "
          "(b) sharing data with subsidiaries or affiliates without written consent, "
          "(c) using data to train machine learning models, including internal AI tools. "
          "Violation triggers automatic termination and penalties of SAR 500,000.", CLAUSE),

        p("2. DATA QUALITY AND WARRANTIES", H1),
        p("<b>⚠ RISK — No Accuracy Warranty (Clause 2.1):</b> Licensor provides the Licensed "
          "Data 'AS IS' and makes no representations regarding accuracy, completeness, "
          "timeliness, or fitness for a particular purpose. Licensee assumes all risk associated "
          "with reliance on the data for business decisions.", CLAUSE),
        p("2.2 Licensor commits to refreshing the core dataset no less than quarterly. However, "
          "delays of up to 45 days are permitted without breach. SLA credits are limited to "
          "5% of monthly fees regardless of duration of delay.", CLAUSE),

        p("3. FEES, DELIVERY, AND PAYMENT", H1),
        p("3.1 Fees are payable quarterly in advance. First payment of SAR 55,000 due March 15, 2024.", CLAUSE),
        p("<b>⚠ RISK — Fee Adjustment Clause (Clause 3.2):</b> Licensor reserves the right to "
          "adjust fees upon renewal to reflect data volume growth. If the dataset grows by more "
          "than 10% year-over-year, fees may increase by the same percentage plus 5%, without "
          "a cap, subject to 45 days' notice.", CLAUSE),
        p("3.3 Licensee is responsible for all data egress, API call, and storage costs incurred "
          "on their own infrastructure. Licensor bears no responsibility for third-party platform "
          "fees.", CLAUSE),

        p("4. DATA GOVERNANCE AND COMPLIANCE", H1),
        p("<b>Obligation (Due: April 14, 2024 — within 30 days of Effective Date):</b> "
          "Licensee must appoint a 'Data Steward' and submit their details to Licensor.", CLAUSE),
        p("<b>Obligation (Ongoing — Quarterly):</b> Licensee must submit a Data Usage Report "
          "within 10 days of each quarter end certifying permitted use.", CLAUSE),
        p("<b>Obligation (Due: September 1, 2025 — Pre-Renewal):</b> Licensee must confirm "
          "renewal or cancellation in writing no later than 45 days before expiry.", CLAUSE),
        p("4.4 Licensee must implement ISO 27001-aligned controls to protect Licensed Data and "
          "provide evidence of compliance upon Licensor's request within 15 business days.", CLAUSE),

        p("5. INTELLECTUAL PROPERTY AND CONFIDENTIALITY", H1),
        p("5.1 The Licensed Data is and remains the exclusive property of DataNexus Arabia Co. "
          "Licensee acquires no ownership interest. Derived insights remain licensed, not owned, "
          "by Licensee.", CLAUSE),
        p("<b>⚠ RISK — Derivative Works Ownership (Clause 5.2):</b> Any analytical outputs, "
          "reports, or visualisations produced <b>primarily</b> from the Licensed Data are "
          "subject to Licensor's prior written approval before external publication or "
          "commercial use.", CLAUSE),

        p("6. LIMITATION OF LIABILITY", H1),
        p("Licensor's total liability shall not exceed <b>SAR 50,000</b> or three months' fees, "
          "whichever is lower. Licensor is not liable for business decisions made based on "
          "the Licensed Data.", CLAUSE),

        p("7. CROSS-BORDER DATA TRANSFER", H1),
        p("<b>⚠ RISK — Data Residency (Clause 7.1):</b> Licensed Data may only be stored and "
          "processed within the GCC region. Transfer of data to servers outside the GCC, "
          "including cloud regions in Europe or the US, constitutes a material breach "
          "irrespective of encryption status.", CLAUSE),

        sp(20),
        divider(),
        p("SIGNATURES", H2),
        p("NovaTech Solutions Inc. — Authorized Signatory: ________________________  Date: ________", BODY),
        p("DataNexus Arabia Co. — Authorized Signatory: ___________________________  Date: ________", BODY),
    ]
    build_pdf("02_data_license_datanexus.pdf", elems)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT 3 — Cloud Infrastructure Support Agreement (AWS-style)
# ─────────────────────────────────────────────────────────────────────────────
def contract_3():
    elems = []
    elems += [
        p("CLOUD INFRASTRUCTURE SUPPORT AGREEMENT", TITLE),
        p("Between NovaTech Solutions Inc. and CloudArch Gulf W.L.L.", SUBTITLE),
        divider(),
        p("<b>Agreement Date:</b> June 1, 2024", META),
        p("<b>Effective Date:</b> June 15, 2024", META),
        p("<b>Initial Term:</b> 24 months (expires June 14, 2026)", META),
        p("<b>Renewal Date:</b> June 14, 2026 (auto-renews for 12-month terms)", META),
        p("<b>Contract Value:</b> SAR 360,000 per annum (SAR 30,000/month)", META),
        p("<b>Vendor:</b> CloudArch Gulf W.L.L., Manama, Bahrain", META),
        p("<b>Customer:</b> NovaTech Solutions Inc., Jeddah, Saudi Arabia", META),
        sp(),
        divider(),

        p("1. SUPPORT SERVICES SCOPE", H1),
        p("1.1 CloudArch Gulf W.L.L. ('Provider') shall provide cloud infrastructure management, "
          "architecture advisory, 24/7 monitoring, incident response, and cost optimisation "
          "services ('Support Services') for Licensee's AWS and Azure environments.", CLAUSE),
        p("1.2 Support Services are tiered as follows: P1 Critical (response within 15 min / "
          "resolution target 4 hours), P2 High (1 hour / 8 hours), P3 Medium (4 hours / "
          "2 business days), P4 Low (next business day / 5 business days).", CLAUSE),
        p("<b>⚠ RISK — SLA Remedy Cap (Clause 1.3):</b> SLA credits for missed response or "
          "resolution targets are limited to <b>10% of the monthly fee</b> (SAR 3,000) regardless "
          "of the number or severity of incidents. Credits are the sole and exclusive remedy "
          "for SLA failures and do not constitute a right to terminate.", CLAUSE),

        p("2. MINIMUM COMMITMENT AND USAGE", H1),
        p("<b>⚠ RISK — Minimum Spend Commitment (Clause 2.1):</b> Licensee commits to a "
          "<b>minimum monthly spend of SAR 30,000</b> regardless of actual usage or service "
          "utilisation. Unused service hours do not roll over and cannot be credited against "
          "future months.", CLAUSE),
        p("2.2 Provider reserves the right to sub-contract portions of the Support Services "
          "to third-party vendors without prior notification to Licensee. Provider remains "
          "responsible for sub-contractor performance.", CLAUSE),

        p("3. SECURITY AND COMPLIANCE", H1),
        p("<b>Obligation (Due: July 15, 2024 — 30 days post-Effective Date):</b> Licensee must "
          "provide Provider with necessary IAM roles, access credentials, and VPN configuration "
          "to begin monitoring. Delay in access provision does not pause billing.", CLAUSE),
        p("<b>Obligation (Ongoing — Annual):</b> Provider shall conduct an annual security posture "
          "review and deliver findings to Licensee within 10 business days of review completion. "
          "First review due: June 14, 2025.", CLAUSE),
        p("<b>Obligation (Due: December 31, 2024 — Mid-Contract):</b> Licensee must implement "
          "all Priority 1 security recommendations from Provider's initial assessment or formally "
          "accept the residual risk in writing.", CLAUSE),
        p("3.4 Provider shall maintain ISO 27001 and SOC 2 Type II certifications throughout "
          "the term. Failure to maintain certifications for more than 60 consecutive days "
          "triggers Licensee's right to terminate with 30 days' notice.", CLAUSE),

        p("4. FEES, INVOICING, AND ESCALATION", H1),
        p("4.1 Monthly invoices issued on the 1st of each month, due within 20 days. "
          "Late payment triggers suspension of P1/P2 response SLAs after 5 days' notice.", CLAUSE),
        p("<b>⚠ RISK — Annual Price Escalation (Clause 4.2):</b> Fees escalate annually by "
          "the greater of (a) 8% or (b) the Saudi CPI rate. For the second year (June 2025), "
          "this results in a minimum fee of SAR 32,400/month.", CLAUSE),
        p("<b>⚠ RISK — Termination Fee (Clause 4.3):</b> Early termination by Licensee triggers "
          "a penalty equal to <b>50% of remaining contract value</b>. For termination in Month 12, "
          "this equals approximately SAR 180,000.", CLAUSE),

        p("5. CHANGE MANAGEMENT", H1),
        p("5.1 All changes to production environments require a change request submitted at "
          "least 48 hours in advance and approved by Licensee's designated Change Advisory Board "
          "member and Provider's senior architect.", CLAUSE),
        p("5.2 Emergency changes may be executed without pre-approval but require post-change "
          "documentation within 2 business days.", CLAUSE),

        p("6. DISASTER RECOVERY", H1),
        p("<b>⚠ RISK — DR Exclusion (Clause 6.1):</b> Disaster Recovery planning and execution "
          "is <b>excluded</b> from the base Support Services scope. DR services are available "
          "as an add-on at SAR 15,000/month. Provider bears no liability for data loss in "
          "the absence of a DR add-on.", CLAUSE),
        p("6.2 Recovery Time Objective (RTO) and Recovery Point Objective (RPO) commitments "
          "are only applicable when the DR add-on is active.", CLAUSE),

        sp(20),
        divider(),
        p("SIGNATURES", H2),
        p("NovaTech Solutions Inc. — Authorized Signatory: ________________________  Date: ________", BODY),
        p("CloudArch Gulf W.L.L. — Authorized Signatory: __________________________  Date: ________", BODY),
    ]
    build_pdf("03_cloud_support_cloudarch.pdf", elems)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT 4 — Technology Professional Services Agreement
# ─────────────────────────────────────────────────────────────────────────────
def contract_4():
    elems = []
    elems += [
        p("TECHNOLOGY PROFESSIONAL SERVICES AGREEMENT", TITLE),
        p("Between NovaTech Solutions Inc. and Apex Digital Consulting L.L.C.", SUBTITLE),
        divider(),
        p("<b>Agreement Date:</b> August 20, 2024", META),
        p("<b>Effective Date:</b> September 1, 2024", META),
        p("<b>Project Term:</b> 12 months (expires August 31, 2025)", META),
        p("<b>Renewal Date:</b> August 31, 2025 (renewal requires new SOW; no auto-renewal)", META),
        p("<b>Contract Value:</b> SAR 750,000 (fixed fee per Statement of Work)", META),
        p("<b>Milestone Payment Schedule:</b> 25% on signing, 25% M3, 25% M6, 25% on delivery", META),
        p("<b>Vendor:</b> Apex Digital Consulting L.L.C., Riyadh, Saudi Arabia", META),
        p("<b>Customer:</b> NovaTech Solutions Inc., Jeddah, Saudi Arabia", META),
        sp(),
        divider(),

        p("1. SCOPE OF SERVICES", H1),
        p("1.1 Apex Digital Consulting L.L.C. ('Consultant') shall provide technology "
          "transformation services including: API integration architecture, legacy system "
          "migration, custom dashboard development, and staff augmentation (3 FTE equivalent) "
          "as detailed in Statement of Work v1.2 attached hereto.", CLAUSE),
        p("<b>⚠ RISK — Scope Creep (Clause 1.2):</b> Any work outside the defined SOW scope "
          "requires a signed Change Order. However, Consultant may begin out-of-scope work "
          "upon verbal instruction from Licensee's project sponsor and invoice retrospectively "
          "at a blended rate of <b>SAR 850/hour</b>. Licensee must dispute such invoices within "
          "10 business days or they are deemed accepted.", CLAUSE),

        p("2. KEY PERSONNEL AND STAFFING", H1),
        p("<b>⚠ RISK — Key Person Departure (Clause 2.1):</b> Consultant may replace named key "
          "personnel (Lead Architect, Project Manager) with 10 business days' notice. "
          "Replacement personnel must have 'equivalent' experience as determined solely by "
          "Consultant. Licensee has no right of approval.", CLAUSE),
        p("2.2 Consultant reserves the right to reassign up to 30% of staff augmentation FTEs "
          "to other client engagements during any 30-day period, provided minimum deliverable "
          "commitments are met.", CLAUSE),

        p("3. DELIVERABLES AND MILESTONES", H1),
        p("<b>Obligation (Due: November 30, 2024 — Month 3):</b> API Integration Layer v1.0 "
          "deployment to staging environment. Payment of SAR 187,500 due upon acceptance.", CLAUSE),
        p("<b>Obligation (Due: February 28, 2025 — Month 6):</b> Legacy data migration "
          "completion (85% of records validated). Payment of SAR 187,500 due upon acceptance.", CLAUSE),
        p("<b>Obligation (Due: May 31, 2025 — Month 9):</b> Dashboard and reporting suite "
          "go-live in production environment.", CLAUSE),
        p("<b>Obligation (Due: August 31, 2025 — Final):</b> Full handover, documentation, "
          "and 30-day post-go-live support completion.", CLAUSE),
        p("<b>⚠ RISK — Acceptance Deemed Given (Clause 3.5):</b> If Licensee does not formally "
          "accept or reject a deliverable within <b>10 business days</b> of submission, "
          "the deliverable is <b>deemed accepted</b> and the associated milestone payment "
          "becomes due immediately.", CLAUSE),

        p("4. INTELLECTUAL PROPERTY", H1),
        p("<b>⚠ RISK — IP Ownership (Clause 4.1):</b> All custom code, integrations, and "
          "deliverables developed under this Agreement remain the intellectual property of "
          "Consultant until <b>final payment is received in full</b>. Licensee receives a "
          "license to use deliverables during the project, but full ownership transfers only "
          "upon complete payment.", CLAUSE),
        p("4.2 Consultant retains the right to reuse non-custom components, frameworks, "
          "and methodologies developed during this engagement in other client projects.", CLAUSE),
        p("<b>⚠ RISK — Background IP (Clause 4.3):</b> Consultant's pre-existing tools and "
          "frameworks ('Background IP') embedded in deliverables are licensed to Licensee "
          "on a perpetual basis only while the Background IP license fees (SAR 8,000/year) "
          "are maintained post-contract.", CLAUSE),

        p("5. PAYMENT AND DISPUTES", H1),
        p("5.1 Invoices due within 30 days. Disputed amounts must be raised in writing "
          "within 10 days. Undisputed portions must be paid on schedule.", CLAUSE),
        p("<b>⚠ RISK — Interest on Late Payment (Clause 5.2):</b> Late payments accrue interest "
          "at <b>1.5% per month</b> from the due date. In addition, Consultant may suspend "
          "all services after 15 days of non-payment without liability for resulting delays.", CLAUSE),

        p("6. CONFIDENTIALITY", H1),
        p("6.1 Both parties agree to maintain confidentiality of the other's proprietary "
          "information for a period of <b>5 years</b> from the date of disclosure.", CLAUSE),
        p("<b>⚠ RISK — Reference and Case Study Rights (Clause 6.2):</b> Consultant may "
          "reference NovaTech as a client and use project outcomes (excluding financial figures) "
          "as a case study in marketing materials unless Licensee opts out in writing within "
          "30 days of Agreement signing.", CLAUSE),

        p("7. LIABILITY", H1),
        p("Consultant's aggregate liability is capped at <b>SAR 375,000</b> (50% of contract "
          "value). Consultant is not liable for indirect, consequential, or incidental damages "
          "including loss of revenue or data loss resulting from project delays.", CLAUSE),

        sp(20),
        divider(),
        p("SIGNATURES", H2),
        p("NovaTech Solutions Inc. — Authorized Signatory: ________________________  Date: ________", BODY),
        p("Apex Digital Consulting L.L.C. — Authorized Signatory: _________________  Date: ________", BODY),
    ]
    build_pdf("04_tech_services_apex_consulting.pdf", elems)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT 5 — Mutual Non-Disclosure Agreement
# ─────────────────────────────────────────────────────────────────────────────
def contract_5():
    elems = []
    elems += [
        p("MUTUAL NON-DISCLOSURE AGREEMENT", TITLE),
        p("Between NovaTech Solutions Inc. and Meridian Payments Technologies S.A.S.", SUBTITLE),
        divider(),
        p("<b>Agreement Date:</b> October 10, 2024", META),
        p("<b>Effective Date:</b> October 10, 2024", META),
        p("<b>Term:</b> 3 years (expires October 9, 2027)", META),
        p("<b>Confidentiality Survival:</b> 5 years from date of each disclosure", META),
        p("<b>Purpose:</b> Evaluation of potential commercial partnership and API integration", META),
        p("<b>Party A:</b> NovaTech Solutions Inc., Jeddah, Saudi Arabia", META),
        p("<b>Party B:</b> Meridian Payments Technologies S.A.S., Paris, France", META),
        sp(),
        divider(),

        p("1. DEFINITION OF CONFIDENTIAL INFORMATION", H1),
        p("1.1 'Confidential Information' means any non-public information disclosed by one "
          "party ('Disclosing Party') to the other ('Receiving Party'), whether in written, "
          "oral, electronic, or other form, that is designated as confidential or that "
          "reasonably should be understood to be confidential given the nature of the "
          "information and circumstances of disclosure.", CLAUSE),
        p("<b>⚠ RISK — Broad Definition (Clause 1.2):</b> Confidential Information explicitly "
          "includes: product roadmaps, customer lists, pricing models, source code, API "
          "specifications, financial projections, partnership discussions, and any information "
          "shared in joint meetings. The burden of proof that information is <b>not</b> "
          "confidential rests with the Receiving Party.", CLAUSE),
        p("1.3 The following are excluded: (a) information independently developed without "
          "use of Confidential Information; (b) information in the public domain through no "
          "fault of Receiving Party; (c) information received from a third party without "
          "restriction. Exclusions must be documented with evidence.", CLAUSE),

        p("2. OBLIGATIONS OF RECEIVING PARTY", H1),
        p("2.1 Receiving Party shall: (a) use Confidential Information solely for the Purpose; "
          "(b) protect it with at least the same degree of care as its own confidential "
          "information (minimum: reasonable care); (c) limit access to employees with a "
          "need to know who are bound by equivalent confidentiality obligations.", CLAUSE),
        p("<b>⚠ RISK — Notification Obligation (Clause 2.2):</b> Receiving Party must notify "
          "Disclosing Party of any suspected or actual breach of confidentiality within "
          "<b>24 hours</b> of becoming aware. Failure to notify within this window is itself "
          "a separate material breach, independent of the underlying disclosure breach.", CLAUSE),
        p("<b>⚠ RISK — No Reverse Engineering (Clause 2.3):</b> Receiving Party shall not "
          "reverse-engineer, decompile, or use Confidential Information to develop competing "
          "products or services for a period of <b>2 years after termination</b> of this "
          "Agreement, extending beyond the Agreement term.", CLAUSE),

        p("3. PERMITTED DISCLOSURES", H1),
        p("3.1 Disclosure is permitted to professional advisors (legal, financial) bound by "
          "professional secrecy, or pursuant to a court order, provided Disclosing Party "
          "is given maximum practicable advance notice and opportunity to seek a protective "
          "order.", CLAUSE),
        p("<b>⚠ RISK — Affiliate Disclosure Restriction (Clause 3.2):</b> Disclosure to "
          "affiliates or group companies requires Disclosing Party's <b>prior written consent</b> "
          "in each instance. Blanket approvals are not permitted. This applies even to wholly "
          "owned subsidiaries.", CLAUSE),

        p("4. SPECIFIC OBLIGATIONS AND MILESTONES", H1),
        p("<b>Obligation (Due: November 10, 2024 — within 30 days):</b> Both parties must "
          "exchange and sign a Schedule of Initial Disclosures, cataloguing all materials "
          "shared in the pre-NDA exploratory discussions.", CLAUSE),
        p("<b>Obligation (Due: April 10, 2025 — 6-Month Review):</b> Parties shall meet to "
          "assess whether the commercial partnership evaluation is proceeding and whether "
          "the Agreement's scope remains appropriate.", CLAUSE),
        p("<b>Obligation (Due: October 9, 2026 — Mid-Term):</b> Parties must confirm in writing "
          "whether the Agreement should be extended, modified, or allowed to expire at term end.", CLAUSE),
        p("<b>Obligation (Ongoing):</b> Receiving Party must maintain a log of all individuals "
          "who accessed Confidential Information and provide it to Disclosing Party upon "
          "request within 5 business days.", CLAUSE),

        p("5. RETURN OR DESTRUCTION OF INFORMATION", H1),
        p("<b>⚠ RISK — Retention Obligation (Clause 5.1):</b> Upon written request or "
          "termination, Receiving Party must return or certifiably destroy all Confidential "
          "Information within <b>10 business days</b>. Backup copies retained for IT disaster "
          "recovery purposes are permitted but must be quarantined and remain subject to "
          "this Agreement indefinitely.", CLAUSE),
        p("5.2 Electronic deletion must comply with NIST 800-88 standards or equivalent. "
          "Receiving Party must provide a written certificate of destruction.", CLAUSE),

        p("6. REMEDIES AND ENFORCEMENT", H1),
        p("<b>⚠ RISK — Injunctive Relief (Clause 6.1):</b> Parties acknowledge that breach "
          "of this Agreement would cause irreparable harm for which monetary damages would "
          "be an inadequate remedy. Each party consents to the granting of injunctive or "
          "other equitable relief in any competent jurisdiction without the requirement to "
          "post bond or security.", CLAUSE),
        p("<b>⚠ RISK — Liquidated Damages (Clause 6.2):</b> In addition to injunctive relief, "
          "any breach entitles the Disclosing Party to liquidated damages of <b>SAR 1,000,000</b> "
          "per incident of unauthorised disclosure, which the parties agree is a reasonable "
          "pre-estimate of harm and not a penalty.", CLAUSE),

        p("7. CROSS-BORDER COMPLIANCE", H1),
        p("7.1 NovaTech acknowledges that information shared by Meridian may be subject to "
          "French data protection law (GDPR) and EU export control regulations. NovaTech "
          "must not transfer such information to jurisdictions subject to EU sanctions.", CLAUSE),
        p("<b>⚠ RISK — Dual Jurisdiction Compliance (Clause 7.2):</b> Both parties must comply "
          "with applicable data protection laws in their respective jurisdictions (Saudi PDPL "
          "and EU GDPR). In case of conflict between the two regimes, the more restrictive "
          "obligation applies, at Disclosing Party's election.", CLAUSE),

        p("8. TERM AND SURVIVAL", H1),
        p("8.1 This Agreement is effective for 3 years. Confidentiality obligations survive "
          "termination for 5 years from each individual disclosure date, meaning obligations "
          "for disclosures made in October 2027 survive until October 2032.", CLAUSE),
        p("8.2 The non-compete obligation in Clause 2.3 survives termination for 2 years.", CLAUSE),

        p("9. GOVERNING LAW AND DISPUTE RESOLUTION", H1),
        p("9.1 This Agreement is governed by the laws of the Kingdom of Saudi Arabia. "
          "Disputes shall be resolved by ICC arbitration in Riyadh, conducted in English. "
          "Emergency arbitration provisions are available for injunctive relief.", CLAUSE),
        p("9.2 For matters involving French law obligations, the parties consent to the "
          "non-exclusive jurisdiction of Paris Commercial Court for interim measures.", CLAUSE),

        sp(20),
        divider(),
        p("SIGNATURES", H2),
        p("NovaTech Solutions Inc. — Authorized Signatory: ________________________  Date: ________", BODY),
        p("Meridian Payments Technologies S.A.S. — Authorized Signatory: __________  Date: ________", BODY),
    ]
    build_pdf("05_nda_meridian_payments.pdf", elems)


if __name__ == "__main__":
    print("Generating contracts...")
    contract_1()
    contract_2()
    contract_3()
    contract_4()
    contract_5()
    print(f"\nAll 5 contracts saved to: {OUTPUT_DIR}")
