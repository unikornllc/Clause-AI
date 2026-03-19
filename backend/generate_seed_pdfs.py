"""
Generate PDFs matching the seed contract data in main.py.
Run: venv/Scripts/python generate_seed_pdfs.py
"""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(OUTPUT_DIR, exist_ok=True)

_ss = getSampleStyleSheet()
def S(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=_ss[parent], **kw)

TITLE = S("T",  fontSize=15, fontName="Helvetica-Bold", spaceAfter=2,  alignment=TA_CENTER)
PARTY = S("P",  fontSize=9,  fontName="Helvetica",      spaceAfter=1,  alignment=TA_CENTER, textColor=colors.HexColor("#444"))
DATE  = S("D",  fontSize=8,  fontName="Helvetica",      spaceAfter=14, alignment=TA_CENTER, textColor=colors.grey)
H1    = S("H1", fontSize=10, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=3)
H2    = S("H2", fontSize=9,  fontName="Helvetica-Bold", spaceBefore=8,  spaceAfter=2)
BODY  = S("B",  fontSize=9,  fontName="Helvetica",      spaceAfter=5,  leading=14, alignment=TA_JUSTIFY)
CL    = S("C",  fontSize=9,  fontName="Helvetica",      spaceAfter=4,  leading=14, leftIndent=18, alignment=TA_JUSTIFY)
SIG   = S("SG", fontSize=9,  fontName="Helvetica",      spaceAfter=4)

def HR(): return HRFlowable(width="100%", thickness=0.4, color=colors.lightgrey, spaceAfter=6, spaceBefore=4)
def SP(n=6): return Spacer(1, n)
def p(t, s=BODY): return Paragraph(t, s)

def build(filename, elems):
    path = os.path.join(OUTPUT_DIR, filename)
    SimpleDocTemplate(path, pagesize=LETTER,
                      leftMargin=inch, rightMargin=inch,
                      topMargin=inch,  bottomMargin=inch).build(elems)
    print(f"  created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 1. SALESFORCE ENTERPRISE LICENSE
# ─────────────────────────────────────────────────────────────────────────────
def salesforce():
    e = [
        p("ENTERPRISE SOFTWARE LICENSE AGREEMENT", TITLE),
        p("Acme Corp  \u00b7  Salesforce Inc.", PARTY),
        p("Effective: May 22, 2024  \u00b7  Expiration: May 22, 2026  \u00b7  Value: $180,000 / year", DATE),
        HR(),
        p("""<b>Recitals.</b> Salesforce Inc. (\u201cLicensor\u201d) and Acme Corp (\u201cCustomer\u201d)
           enter into this Enterprise License Agreement as of May 22, 2024 governing Customer\u2019s
           access to the Salesforce CRM platform."""),

        p("\u00a7 1 \u2014 Definitions", H1),
        p("""\u201cPlatform\u201d means the Salesforce Customer 360 suite, including Sales Cloud,
           Service Cloud, and all standard APIs, as described in the applicable Order Form.""", CL),
        p("""\u201cOrder Form\u201d means the document executed by both parties setting out the
           licensed edition, number of seats, and annual fees, incorporated herein by reference.""", CL),

        p("\u00a7 2 \u2014 License Grant", H1),
        p("""Subject to this Agreement and payment of all fees, Licensor grants Customer a
           non-exclusive, non-transferable license to access and use the Platform solely for
           Customer\u2019s internal business operations.""", CL),
        p("""License is limited to the number of named users set out in the Order Form.
           Customer shall not allow unlicensed users to access the Platform.""", CL),

        p("\u00a7 3 \u2014 Fees", H1),
        p("Customer shall pay <b>$180,000 per annum</b>, invoiced annually in advance, net 30 days.", CL),

        p("\u00a7 4 \u2014 Professional Services", H1),
        p("""Salesforce will provide up to 40 hours of onboarding advisory services at no
           additional charge during the first 90 days of the Effective Date.""", CL),

        p("\u00a7 5 \u2014 Fee Adjustments", H1),
        p("5.1 Licensor reserves the right to adjust pricing at each Renewal Term.", CL),
        p("""<b>5.3</b> Licensor may increase annual subscription fees by up to <b>seven percent
           (7%)</b> per year with <b>sixty (60) days\u2019 written notice</b> prior to the
           commencement of the applicable Renewal Term. Customer\u2019s continued use of the
           Platform following the price adjustment notice period shall constitute acceptance of the
           revised fees. No consent or counter-notice from Customer is required for the price
           adjustment to take effect.""", CL),

        p("\u00a7 6 \u2014 Data Processing", H1),
        p("""Each party shall comply with applicable data protection laws, including GDPR and CCPA.
           Salesforce acts as data processor for Customer data stored in the Platform. The Data
           Processing Addendum attached as Exhibit A governs such processing.""", CL),

        p("\u00a7 7 \u2014 Confidentiality", H1),
        p("""Each party shall keep confidential all non-public information of the other and shall
           not disclose it without prior written consent. Obligations survive termination for
           five (5) years.""", CL),

        p("\u00a7 8 \u2014 Intellectual Property", H1),
        p("Licensor retains all right, title, and interest in the Platform.", CL),
        p("""Customer grants Licensor a limited license to use Customer Data solely to provide
           the Platform services and generate aggregated, anonymised product analytics.""", CL),

        p("\u00a7 9 \u2014 Warranties", H1),
        p("""Licensor warrants that the Platform will perform materially in accordance with
           Documentation during the Term. Customer\u2019s sole remedy is re-performance or a
           pro-rata credit.""", CL),

        p("\u00a7 10 \u2014 Availability SLA", H1),
        p("""Licensor commits to 99.9% monthly uptime. Downtime credits are available at 10% of
           monthly fee per hour of excess downtime, capped at one month\u2019s fees.""", CL),

        p("\u00a7 11 \u2014 Indemnification", H1),
        p("""11.1 Licensor shall defend and indemnify Customer against third-party claims alleging
           that the Platform infringes any patent, copyright, or trade secret.""", CL),
        p("""<b>11.2</b> Each party (<b>\u201cIndemnifying Party\u201d</b>) shall defend, indemnify,
           and hold harmless the other party (<b>\u201cIndemnified Party\u201d</b>) and its officers,
           directors, and employees from and against any third-party claims, damages, liabilities,
           costs, and expenses (including reasonable attorneys\u2019 fees) arising out of or relating
           to any allegation of infringement of a third party\u2019s intellectual property rights by
           the Indemnifying Party. The scope of this mutual indemnification obligation is broad and
           may expose the Indemnified Party to legal costs in connection with third-party IP claims
           initiated against the Indemnifying Party.""", CL),

        p("\u00a7 12 \u2014 Limitation of Liability", H1),
        p("""<b>12.1</b> Except for indemnification obligations and wilful misconduct, each party\u2019s
           total aggregate liability shall not exceed <b>the total fees paid or payable by Customer
           in the twelve (12) months immediately preceding the event giving rise to the claim</b>
           (approximately $180,000). Neither party shall be liable for indirect, incidental,
           consequential, special, or punitive damages, including loss of profits or revenue.""", CL),

        p("\u00a7 13 \u2014 Security", H1),
        p("""Salesforce maintains ISO 27001 and SOC 2 Type II certifications and performs annual
           third-party penetration tests. Certifications available under NDA upon request.""", CL),

        p("\u00a7 14 \u2014 Term and Renewal", H1),
        p("""14.1 <b>Initial Term.</b> This Agreement commences May 22, 2024 and expires
           <b>May 22, 2026</b> (the \u201cExpiration Date\u201d).""", CL),
        p("""<b>14.1 Auto-Renewal.</b> Unless either party delivers written notice of non-renewal
           no later than <b>ninety (90) days prior to the Expiration Date</b>
           (i.e., by <b>February 21, 2026</b>), this Agreement shall automatically renew for a
           successive term of <b>two (2) years</b> at then-current pricing. Failure to provide
           timely written cancellation notice shall bind Customer to the full renewal term.
           <b>This cancellation window expired on February 21, 2026.</b>""", CL),

        p("\u00a7 15 \u2014 Termination for Cause", H1),
        p("""Either party may terminate immediately upon written notice if the other party
           materially breaches and fails to cure within 30 days of notice.""", CL),

        p("\u00a7 16 \u2014 Obligations", H1),
        p("""<b>16.1 User Access Reconciliation (Quarterly).</b> Customer shall submit a quarterly
           reconciliation of all active Platform users versus licensed seats, due by the last
           business day of each calendar quarter. Next due: <b>April 30, 2026</b>. Team: IT.""", CL),
        p("""<b>16.2 Renewal Decision (Overdue).</b> Customer was required to provide written
           notice of non-renewal to Procurement by <b>February 21, 2026</b>.
           <b>This deadline has passed \u2014 escalation required.</b> Team: Procurement.""", CL),

        p("\u00a7 17 \u2014 Governing Law", H1),
        p("""Governed by the laws of the State of California, USA. Disputes submitted to binding
           arbitration in San Francisco, California.""", CL),

        SP(20), HR(),
        p("SIGNATURES", H2),
        p("Acme Corp \u2014 Authorised Signatory: _______________________  Date: ________", SIG),
        p("Salesforce Inc. \u2014 Authorised Signatory: __________________  Date: ________", SIG),
    ]
    build("seed_salesforce_enterprise_license.pdf", e)


# ─────────────────────────────────────────────────────────────────────────────
# 2. ZETACO DATA LICENSE
# ─────────────────────────────────────────────────────────────────────────────
def zetaco():
    e = [
        p("DATA LICENSE AGREEMENT", TITLE),
        p("Acme Corp  \u00b7  ZetaCo Ltd", PARTY),
        p("Effective: June 12, 2024  \u00b7  Expiration: April 10, 2026  \u00b7  Value: $22,000 / year", DATE),
        HR(),
        p("""<b>Recitals.</b> ZetaCo Ltd (\u201cLicensor\u201d) and Acme Corp (\u201cLicensee\u201d)
           enter into this Data License Agreement as of June 12, 2024 to govern Licensee\u2019s
           access to ZetaCo\u2019s proprietary market data feed."""),

        p("\u00a7 1 \u2014 Licensed Data", H1),
        p("""Licensor grants Licensee a non-exclusive, non-transferable right to access the
           ZetaCo Market Intelligence Data Feed (the \u201cLicensed Data\u201d) for internal
           business intelligence purposes only.""", CL),
        p("""Licensee may not sublicense, resell, or redistribute the Licensed Data or any
           derived products to third parties without prior written consent.""", CL),

        p("\u00a7 2 \u2014 Permitted Use", H1),
        p("""Licensed Data may be used solely for Licensee\u2019s internal research and analytics.
           External publication, commercialisation, or transfer to affiliates requires separate
           written approval.""", CL),

        p("\u00a7 3 \u2014 Fees and Payment", H1),
        p("""Annual fee of <b>$22,000</b> payable quarterly in advance. First instalment due
           June 12, 2024.""", CL),

        p("\u00a7 4 \u2014 Fee Adjustments", H1),
        p("""<b>4.2</b> Licensor may adjust the annual license fee at any Renewal Term by up to
           <b>fifteen percent (15%)</b> with written notice delivered no less than <b>thirty (30)
           calendar days</b> prior to commencement of the Renewal Term. No consent or counter-notice
           from Licensee is required for the adjustment to take effect.""", CL),

        p("\u00a7 5 \u2014 Data Quality", H1),
        p("""Licensor makes no representation or warranty regarding the accuracy, completeness, or
           timeliness of the Licensed Data. The data is provided \u201cas is\u201d. Licensee assumes
           all risk associated with reliance on the data.""", CL),

        p("\u00a7 6 \u2014 Confidentiality", H1),
        p("""Licensee shall treat the Licensed Data as confidential and shall implement commercially
           reasonable security controls to prevent unauthorised access.""", CL),

        p("\u00a7 7 \u2014 Intellectual Property", H1),
        p("""7.1 All right, title, and interest in the Licensed Data remain exclusively with
           Licensor. No ownership rights are transferred to Licensee.""", CL),
        p("""<b>7.3</b> Any analytical outputs, derivative models, scoring engines, algorithms,
           machine learning models, or other works developed by Licensee that are <b>derived from,
           trained on, or primarily based upon the Licensed Data</b> (\u201cDerivative Works\u201d)
           shall be the <b>exclusive property of Licensor</b>. Licensee hereby assigns all right,
           title, and interest in such Derivative Works to Licensor. This obligation applies even
           where the Derivative Work was built entirely using Licensee\u2019s own resources,
           personnel, and infrastructure.""", CL),

        p("\u00a7 8 \u2014 Term", H1),
        p("""This Agreement commences June 12, 2024 and expires <b>April 10, 2026</b>.""", CL),

        p("\u00a7 9 \u2014 Audit Rights", H1),
        p("""<b>9.1</b> Licensor may, upon <b>five (5) business days\u2019</b> written notice,
           audit Licensee\u2019s usage logs, data access records, and security controls to verify
           compliance, no more than once per calendar year.""", CL),

        p("\u00a7 10 \u2014 Obligations", H1),
        p("""<b>10.1 Quarterly Usage Report (Overdue).</b> Licensee shall deliver a data usage
           compliance report within 10 days of each quarter end. The Q4 report was due
           <b>January 10, 2026</b> \u2014 <b>this obligation is now overdue</b>. Team: Operations.""", CL),
        p("""<b>10.2 Security Incident Notification (Event-Based).</b> Licensee must notify
           Licensor within <b>72 hours</b> of any actual or suspected security incident involving
           the Licensed Data. Team: IT.""", CL),

        p("\u00a7 11 \u2014 Liability", H1),
        p("""Each party\u2019s total liability is capped at fees paid in the prior six months.
           Neither party is liable for indirect or consequential damages.""", CL),

        p("\u00a7 12 \u2014 Term &amp; Renewal", H1),
        p("""<b>12.1</b> Unless Licensee delivers written notice of non-renewal no later than
           <b>ninety (90) days prior to the Expiration Date</b> (i.e., by <b>January 10, 2026</b>),
           this Agreement shall <b>automatically renew</b> for an additional term of <b>two (2)
           years</b>. The 90-day cancellation window expired on January 10, 2026.
           Auto-renewal takes effect April 10, 2026.""", CL),

        p("\u00a7 13 \u2014 Governing Law", H1),
        p("Governed by the laws of England and Wales. Disputes resolved in the courts of England.", CL),

        SP(20), HR(),
        p("SIGNATURES", H2),
        p("Acme Corp \u2014 Authorised Signatory: _______________________  Date: ________", SIG),
        p("ZetaCo Ltd \u2014 Authorised Signatory: _____________________  Date: ________", SIG),
    ]
    build("seed_zetaco_data_license.pdf", e)


# ─────────────────────────────────────────────────────────────────────────────
# 3. AWS ENTERPRISE SUPPORT
# ─────────────────────────────────────────────────────────────────────────────
def aws():
    e = [
        p("ENTERPRISE SUPPORT AGREEMENT", TITLE),
        p("Acme Corp  \u00b7  Amazon Web Services, Inc.", PARTY),
        p("Effective: August 10, 2024  \u00b7  Expiration: August 10, 2026  \u00b7  Value: $96,000 / year", DATE),
        HR(),
        p("""<b>Recitals.</b> Amazon Web Services, Inc. (\u201cAWS\u201d) and Acme Corp
           (\u201cCustomer\u201d) enter into this Enterprise Support Agreement as of August 10,
           2024 governing AWS\u2019s provision of Enterprise Support services."""),

        p("\u00a7 1 \u2014 Support Services", H1),
        p("""AWS will provide Enterprise Support including: a dedicated Technical Account Manager,
           architectural guidance, 24/7 access to senior cloud support engineers, and
           Well-Architected Review sessions.""", CL),

        p("\u00a7 2 \u2014 Fees", H1),
        p("""Annual support fee: <b>$96,000</b> ($8,000/month), invoiced monthly, due within
           30 days of invoice. Fees may be adjusted at renewal with 60 days\u2019 notice.""", CL),

        p("\u00a7 3 \u2014 Customer Responsibilities", H1),
        p("""Customer shall designate a primary technical contact and maintain up-to-date access
           credentials for the AWS Support portal.""", CL),
        p("""Customer shall implement AWS security recommendations flagged as Critical or High
           within 30 days of receipt.""", CL),

        p("\u00a7 4 \u2014 Compliance Submissions", H1),
        p("""<b>4.1 Annual Penetration Test Certification (Overdue).</b> Customer shall submit
           evidence of an annual penetration test performed by an approved third party to the
           AWS Security team. Due: <b>January 31, 2026</b>.
           <b>This obligation is now overdue.</b> Team: IT.""", CL),
        p("""<b>4.2 SOC 2 Type II Report Submission.</b> Customer shall upload its current SOC 2
           Type II report to the AWS compliance portal annually. Due: <b>May 15, 2026</b>.
           Team: IT.""", CL),

        p("\u00a7 5 \u2014 Service Level Agreement", H1),
        p("""Response time commitments: P1 Critical \u2014 15 minutes; P2 High \u2014 1 hour;
           P3 Medium \u2014 4 business hours; P4 Low \u2014 next business day.""", CL),
        p("""<b>5.1 SLA Remedies \u2014 Service Credits Only.</b> In the event AWS fails to meet
           the response time commitments set out above, Customer\u2019s <b>sole and exclusive
           remedy</b> shall be service credits equal to <b>ten percent (10%) of the applicable
           monthly support fee</b> per incident, up to a maximum of <b>thirty percent (30%) of
           the monthly fee</b> in any given month. <b>No cash compensation shall be payable</b>
           for any SLA failure, regardless of severity or duration. Failure to meet SLA targets
           does not give rise to any right to terminate this Agreement.""", CL),

        p("\u00a7 6 \u2014 Acceptable Use", H1),
        p("""Customer\u2019s use of AWS services is subject to the AWS Acceptable Use Policy
           (\u201cAUP\u201d) as updated from time to time. AWS will provide 30 days\u2019 notice
           of material AUP changes.""", CL),

        p("\u00a7 7 \u2014 Intellectual Property", H1),
        p("""All AWS proprietary tools, documentation, and methodologies remain the exclusive
           property of AWS. Customer retains ownership of all Customer Data and workloads.""", CL),

        p("\u00a7 8 \u2014 Indemnification", H1),
        p("""8.1 AWS will defend Customer against third-party claims that AWS\u2019s proprietary
           services infringe any copyright or patent.""", CL),
        p("""<b>8.2 Customer Indemnification of AWS.</b> Customer shall defend, indemnify, and
           hold harmless AWS and its affiliates, officers, directors, and employees from and
           against any third-party claims, actions, demands, losses, liabilities, costs, and
           expenses (including reasonable legal fees) arising out of or relating to: (a) Customer\u2019s
           use of AWS services in violation of this Agreement or applicable law; (b) Customer\u2019s
           <b>misconfiguration of AWS infrastructure</b>; (c) Customer Data; or (d) Customer\u2019s
           breach of any representation or warranty herein.""", CL),

        p("\u00a7 9 \u2014 Limitation of Liability", H1),
        p("""Each party\u2019s aggregate liability is limited to fees paid in the 12 months prior
           to the claim. Neither party is liable for indirect or consequential damages.""", CL),

        p("\u00a7 10 \u2014 Security", H1),
        p("""AWS maintains SOC 1, SOC 2, ISO 27001, and PCI DSS certifications. Compliance
           reports available in the AWS Artifact portal.""", CL),

        p("\u00a7 11 \u2014 Confidentiality", H1),
        p("""Both parties agree to maintain the confidentiality of the other\u2019s non-public
           information and to use it solely in connection with this Agreement.""", CL),

        p("\u00a7 12 \u2014 Term and Renewal", H1),
        p("12.1 Initial Term: <b>August 10, 2024 \u2013 August 10, 2026</b>.", CL),
        p("""12.2 Automatically renews for successive one-year terms unless either party provides
           written cancellation notice at least <b>sixty (60) days prior to expiration</b>
           (i.e., by June 11, 2026 for Year 2).""", CL),

        p("\u00a7 13 \u2014 Termination", H1),
        p("""13.1 Either party may terminate for material breach on 30 days\u2019 written notice
           with opportunity to cure.""", CL),
        p("""<b>14.3 Termination for Cause (AWS).</b> AWS may terminate this Agreement
           <b>immediately and without notice</b> in the event Customer violates the Acceptable
           Use Policy. AWS reserves the right to update the AUP with 30 days\u2019 written notice.
           Termination under this clause shall not entitle Customer to any refund of prepaid
           fees.""", CL),

        p("\u00a7 14 \u2014 Governing Law", H1),
        p("""Governed by the laws of the State of Washington, USA. Disputes resolved in King
           County, Washington courts.""", CL),

        SP(20), HR(),
        p("SIGNATURES", H2),
        p("Acme Corp \u2014 Authorised Signatory: _______________________  Date: ________", SIG),
        p("Amazon Web Services, Inc. \u2014 Authorised Signatory: _______  Date: ________", SIG),
    ]
    build("seed_aws_enterprise_support.pdf", e)


# ─────────────────────────────────────────────────────────────────────────────
# 4. BETATECH SERVICES MSA
# ─────────────────────────────────────────────────────────────────────────────
def betatech():
    e = [
        p("MASTER SERVICES AGREEMENT", TITLE),
        p("Acme Corp  \u00b7  BetaTech GmbH", PARTY),
        p("Effective: April 5, 2025  \u00b7  Expiration: April 5, 2026  \u00b7  Value: $45,000  \u00b7  No auto-renewal", DATE),
        HR(),
        p("""<b>Recitals.</b> BetaTech GmbH (\u201cService Provider\u201d) and Acme Corp
           (\u201cClient\u201d) enter into this Master Services Agreement as of April 5, 2025
           governing software development services. This Agreement does not auto-renew; renewal
           requires a new statement of work."""),

        p("\u00a7 1 \u2014 Scope of Services", H1),
        p("""Service Provider will provide software development, integration, and technical
           advisory services as described in each Statement of Work (\u201cSOW\u201d) executed
           under this MSA.""", CL),

        p("\u00a7 2 \u2014 Fees", H1),
        p("""Total fixed fee for the initial term: <b>$45,000</b>, payable per the milestone
           schedule in the applicable SOW. Expenses reimbursed at cost with prior written
           approval.""", CL),

        p("\u00a7 3 \u2014 Obligations", H1),
        p("""<b>3.1 Quarterly Service Review.</b> Client and Service Provider shall hold a
           quarterly review meeting to assess project progress. Next due: <b>March 31, 2026</b>.
           Team: Procurement.""", CL),
        p("""<b>3.2 Renewal Decision Deadline.</b> This Agreement does not auto-renew. Client
           must decide whether to renew by executing a new SOW before <b>March 26, 2026</b>.
           If no new SOW is signed before April 5, 2026, all services will lapse.
           Team: Procurement.""", CL),

        p("\u00a7 4 \u2014 Personnel", H1),
        p("""Service Provider shall assign qualified personnel to each SOW. Key Personnel named
           in the SOW shall not be replaced without Client\u2019s prior written consent.""", CL),

        p("\u00a7 5 \u2014 Deliverables and Acceptance", H1),
        p("""Deliverables are accepted when Client provides written sign-off or, if Client does
           not respond within 10 business days of submission, deemed accepted.""", CL),

        p("\u00a7 6 \u2014 Intellectual Property (absent)", H1),
        p("""<b>6. Work Product.</b> Service Provider acknowledges Client\u2019s interest in the
           deliverables but <b>no explicit assignment</b> of intellectual property rights from
           Service Provider to Client is set out in this Agreement. The parties agree to negotiate
           IP ownership in each SOW. In the absence of SOW-specific IP terms, ownership of work
           product shall be determined by applicable German law (Urheberrechtsgesetz), under which
           software may remain with the creator unless explicitly assigned.""", CL),

        p("\u00a7 7 \u2014 Confidentiality", H1),
        p("""Both parties shall keep the other\u2019s confidential information strictly confidential
           for the term plus three years.""", CL),

        p("\u00a7 8 \u2014 Warranties", H1),
        p("""Service Provider warrants that services will be performed in a professional and
           workmanlike manner consistent with industry standards.""", CL),

        p("\u00a7 9 \u2014 Data Protection", H1),
        p("""Service Provider shall comply with the EU General Data Protection Regulation.
           A Data Processing Agreement shall be executed prior to processing any Client
           personal data.""", CL),

        p("\u00a7 10 \u2014 Insurance", H1),
        p("""Service Provider shall maintain professional indemnity insurance of at least
           \u20ac500,000 and provide evidence upon request.""", CL),

        p("\u00a7 11 \u2014 Limitation of Liability", H1),
        p("""<b>11.2</b> Service Provider\u2019s total aggregate liability to Client, whether in
           contract, tort, or otherwise, shall not exceed <b>one hundred thousand US dollars
           ($100,000)</b>, regardless of the nature of the claim, the number of claims, or
           whether Service Provider was advised of the possibility of such loss.""", CL),
        p("""Neither party shall be liable for indirect, special, incidental, punitive, or
           consequential damages, including loss of data, revenue, or profits.""", CL),

        p("\u00a7 12 \u2014 Termination", H1),
        p("""12.1 Either party may terminate for material breach with 30 days\u2019 written
           notice and opportunity to cure.""", CL),
        p("""<b>13.2 Termination for Convenience.</b> Service Provider may terminate this
           Agreement or any active SOW <b>for any reason or no reason</b> upon <b>thirty (30)
           calendar days\u2019</b> written notice to Client. Service Provider shall be entitled
           to payment for work performed to the termination date only. Client shall have no claim
           against Service Provider for losses arising from the abandonment of in-progress
           deliverables.""", CL),

        p("\u00a7 13 \u2014 Governing Law", H1),
        p("Governed by the laws of Germany. Disputes submitted to the courts of Munich.", CL),

        SP(20), HR(),
        p("SIGNATURES", H2),
        p("Acme Corp \u2014 Authorised Signatory: _______________________  Date: ________", SIG),
        p("BetaTech GmbH \u2014 Authorised Signatory: __________________  Date: ________", SIG),
    ]
    build("seed_betatech_services_msa.pdf", e)


# ─────────────────────────────────────────────────────────────────────────────
# 5. ACME–PINNACLE NDA
# ─────────────────────────────────────────────────────────────────────────────
def pinnacle_nda():
    e = [
        p("MUTUAL NON-DISCLOSURE AGREEMENT", TITLE),
        p("Acme Corp  \u00b7  Pinnacle Ventures", PARTY),
        p("Effective: December 1, 2025  \u00b7  Expiration: December 1, 2026  \u00b7  Confidentiality survives 3 years from each disclosure", DATE),
        HR(),
        p("""<b>Recitals.</b> Acme Corp and Pinnacle Ventures (each a \u201cParty\u201d) enter
           into this Mutual Non-Disclosure Agreement as of December 1, 2025 in connection with
           the Parties\u2019 evaluation of a potential business partnership."""),

        p("\u00a7 1 \u2014 Purpose", H1),
        p("""The Parties wish to explore a potential commercial partnership. In furtherance of
           these discussions, each Party may disclose certain confidential and proprietary
           information to the other.""", CL),

        p("\u00a7 2 \u2014 Definition of Confidential Information", H1),
        p("""\u201cConfidential Information\u201d means any non-public information disclosed by
           one Party (\u201cDisclosing Party\u201d) to the other (\u201cReceiving Party\u201d),
           whether in written, oral, electronic, or visual form, that is designated as confidential
           or that a reasonable person would understand to be confidential given the nature of the
           information and circumstances of disclosure.""", CL),
        p("""Confidential Information includes, without limitation: business strategies, financial
           data, product roadmaps, customer lists, pricing information, source code, and
           partnership terms.""", CL),

        p("\u00a7 3 \u2014 Obligations of Receiving Party", H1),
        p("""Receiving Party shall: (a) use Confidential Information solely for the Purpose;
           (b) protect it with the same degree of care as its own confidential information
           (minimum: reasonable care); (c) disclose it only to employees and advisors with a need
           to know who are bound by equivalent obligations.""", CL),

        p("\u00a7 4 \u2014 Exclusions", H1),
        p("""Confidentiality obligations do not apply to information that: (a) is or becomes
           publicly known through no fault of Receiving Party; (b) was known prior to disclosure;
           (c) is independently developed; or (d) is required to be disclosed by law.""", CL),

        p("\u00a7 5 \u2014 No Licence", H1),
        p("""Nothing in this Agreement grants any licence or right to use the other\u2019s
           Confidential Information except as expressly permitted herein.""", CL),

        p("\u00a7 6 \u2014 Return of Information", H1),
        p("""Upon request or termination, Receiving Party shall promptly return or certifiably
           destroy all Confidential Information and certify such destruction in writing within
           10 business days.""", CL),

        p("\u00a7 7 \u2014 Term and Survival", H1),
        p("""This Agreement is effective from December 1, 2025 and expires December 1, 2026.
           It does not auto-renew.""", CL),
        p("""Confidentiality obligations survive expiration for a period of <b>three (3) years
           from the date of each disclosure</b> of Confidential Information, regardless of the
           expiration of this Agreement.""", CL),

        p("\u00a7 8 \u2014 Non-Solicitation", H1),
        p("""<b>8.</b> For a period of <b>twelve (12) months</b> following termination or
           expiration, neither Party shall directly or indirectly solicit, recruit, or hire any
           employee of the other Party who was involved in the activities governed by this
           Agreement, without prior written consent. This restriction applies to all forms of
           solicitation, including through recruitment agencies, LinkedIn, or professional
           networks.""", CL),

        p("\u00a7 9 \u2014 Obligations", H1),
        p("""<b>9.1 Annual Staff Confidentiality Reminder (Annual).</b> Acme Corp shall, on an
           annual basis, remind all staff who received Pinnacle Ventures\u2019 Confidential
           Information of their ongoing obligations under this Agreement.
           Next due: <b>June 1, 2026</b>. Team: Legal.""", CL),

        p("\u00a7 10 \u2014 Disclaimer", H1),
        p("""All Confidential Information is provided \u201cas is\u201d. Disclosing Party makes
           no representation or warranty as to its accuracy or completeness.""", CL),

        p("\u00a7 11 \u2014 Remedies", H1),
        p("""Both Parties acknowledge that breach would cause irreparable harm for which monetary
           damages would be an inadequate remedy. Each Party shall be entitled to seek injunctive
           relief, specific performance, and all other equitable remedies in any competent
           jurisdiction, without the need to post bond or security.
           <b>There is no cap on liability</b> for unauthorised disclosure \u2014 full damages
           and injunctive relief are available. This is standard for an NDA.""", CL),

        p("\u00a7 12 \u2014 General", H1),
        p("""This Agreement constitutes the entire agreement between the Parties with respect to
           its subject matter. No amendment is effective unless in writing and signed by both
           Parties.""", CL),

        p("\u00a7 13 \u2014 Governing Law", H1),
        p("""Governed by the laws of the State of New York, USA. Disputes resolved in the courts
           of New York County, New York.""", CL),

        SP(20), HR(),
        p("SIGNATURES", H2),
        p("Acme Corp \u2014 Authorised Signatory: _______________________  Date: ________", SIG),
        p("Pinnacle Ventures \u2014 Authorised Signatory: _______________  Date: ________", SIG),
    ]
    build("seed_acme_pinnacle_nda.pdf", e)


if __name__ == "__main__":
    print("Generating seed contract PDFs...\n")
    salesforce()
    zetaco()
    aws()
    betatech()
    pinnacle_nda()
    print(f"\nAll 5 PDFs saved to: {OUTPUT_DIR}")
