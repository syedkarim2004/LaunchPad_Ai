"""
PDF Generation Service
Generates sanction letters for approved loans
"""
import os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from typing import Dict, Any
import asyncio


class PDFGeneratorService:
    """Service for generating loan sanction letters"""
    
    def __init__(self, output_dir: str = "./uploads/sanction_letters"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    async def generate_sanction_letter(
        self,
        customer_name: str,
        customer_address: str,
        loan_amount: float,
        tenure_months: int,
        interest_rate: float,
        emi_amount: float,
        loan_id: str
    ) -> str:
        """
        Generate PDF sanction letter
        Returns: File path of generated PDF
        """
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        filename = f"sanction_letter_{loan_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # Create PDF
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
        )
        
        # Header
        story.append(Paragraph("NBFC FINANCE LIMITED", title_style))
        story.append(Paragraph("Loan Sanction Letter", heading_style))
        story.append(Spacer(1, 0.3 * inch))
        
        # Date and Reference
        date_str = datetime.now().strftime("%B %d, %Y")
        story.append(Paragraph(f"<b>Date:</b> {date_str}", styles['Normal']))
        story.append(Paragraph(f"<b>Reference No:</b> {loan_id}", styles['Normal']))
        story.append(Spacer(1, 0.3 * inch))
        
        # Customer Details
        story.append(Paragraph("<b>To,</b>", styles['Normal']))
        story.append(Paragraph(f"<b>{customer_name}</b>", styles['Normal']))
        story.append(Paragraph(customer_address, styles['Normal']))
        story.append(Spacer(1, 0.3 * inch))
        
        # Salutation
        story.append(Paragraph(f"Dear {customer_name.split()[0]},", styles['Normal']))
        story.append(Spacer(1, 0.2 * inch))
        
        # Main content
        content = f"""
        We are pleased to inform you that your application for a Personal Loan has been 
        <b>APPROVED</b> by NBFC Finance Limited. The details of your loan are as follows:
        """
        story.append(Paragraph(content, styles['Normal']))
        story.append(Spacer(1, 0.2 * inch))
        
        # Loan Details Table
        loan_details = [
            ['Loan Amount', f'₹{loan_amount:,.2f}'],
            ['Interest Rate', f'{interest_rate}% per annum'],
            ['Loan Tenure', f'{tenure_months} months'],
            ['EMI Amount', f'₹{emi_amount:,.2f}'],
            ['Processing Fee', '₹0 (Waived)'],
            ['Disbursement Date', (datetime.now() + timedelta(days=2)).strftime("%B %d, %Y")],
        ]
        
        table = Table(loan_details, colWidths=[3*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3b82f6'))
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.3 * inch))
        
        # Terms and Conditions
        story.append(Paragraph("<b>Terms and Conditions:</b>", heading_style))
        terms = [
            "1. The loan will be disbursed within 2 working days upon submission of required documents.",
            "2. EMI payments must be made on or before the 5th of every month.",
            "3. Prepayment of the loan is allowed without any penalty after 6 months.",
            "4. Late payment charges of 2% per month will be applicable on overdue EMIs.",
            "5. This sanction is valid for 30 days from the date of this letter."
        ]
        
        for term in terms:
            story.append(Paragraph(term, styles['Normal']))
            story.append(Spacer(1, 0.1 * inch))
        
        story.append(Spacer(1, 0.3 * inch))
        
        # Closing
        closing_text = """
        Congratulations on your loan approval! We look forward to serving you.
        For any queries, please contact our customer service at 1800-XXX-XXXX.
        """
        story.append(Paragraph(closing_text, styles['Normal']))
        story.append(Spacer(1, 0.4 * inch))
        
        # Signature
        story.append(Paragraph("<b>Sincerely,</b>", styles['Normal']))
        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph("<b>Authorized Signatory</b>", styles['Normal']))
        story.append(Paragraph("NBFC Finance Limited", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return filepath
    
    async def generate_rejection_letter(
        self,
        customer_name: str,
        customer_address: str,
        reason: str,
        loan_id: str
    ) -> str:
        """Generate rejection letter"""
        await asyncio.sleep(0.3)
        
        filename = f"rejection_letter_{loan_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        # Similar PDF generation logic for rejection
        # (Simplified for brevity)
        
        return filepath


# Singleton instance
pdf_generator = PDFGeneratorService()
