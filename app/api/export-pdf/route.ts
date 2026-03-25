import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: 'Missing HTML content' }, { status: 400 });
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <style>
          /* 1. Hardware Margins: This guarantees text NEVER touches the physical edge */
          @page {
            size: 1280px 720px;
            margin: 80px 100px !important; /* 🚨 The untouchable safe zone */
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .prose {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Cleans up invisible TipTap elements to prevent blank pages */
          .prose > p:empty {
            display: none !important;
          }

          /* 2. The Card Container */
          [data-type="card"] {
            width: 100%;
            min-height: 100%; /* Fills the printable area */
            height: auto; /* Allows expanding to a new slide if text is massive */
            box-sizing: border-box;
            background: white;
            
            /* 🚨 FIX: Standard block layout so long text flows naturally down, not out the top */
            display: block;
            
            page-break-after: always;
            break-after: page;
          }

          /* Remove the page break on the very last card to stop blank trailing pages */
          [data-type="card"]:last-of-type,
          [data-type="card"]:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* 3. Explicit Table Borders */
          table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
          th, td { border: 1px solid #d1d5db !important; padding: 0.75rem; text-align: left; color: #1f2937; }
          th { background-color: #f3f4f6 !important; font-weight: 600; color: #111827; }

          /* Prevent weird element splitting between pages */
          h1, h2, h3, p, li, table, tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Hide editor artifacts (Ask AI buttons, etc) */
          .group .absolute, .group .opacity-0, .group-hover\\:opacity-100,
          [contenteditable="false"], [role="button"], button, .menu-bar, .toolbar {
            display: none !important;
          }

          /* Premium Typography */
          .prose h1 { font-size: 3.5rem; line-height: 1.1; margin-bottom: 1.5rem; color: #111827; font-weight: 800; }
          .prose h2 { font-size: 2.25rem; margin-top: 0; margin-bottom: 1rem; color: #1f2937; font-weight: 700; }
          .prose p, .prose li { font-size: 1.25rem; line-height: 1.7; color: #4b5563; }
          
          /* Auto-sizing for images */
          .prose img { 
            border-radius: 1rem; 
            max-height: 400px; 
            object-fit: cover; 
            width: 100%; 
            margin: 1.5rem 0; 
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); 
          }
          
          [data-type="columns"] { display: flex; gap: 4rem; align-items: flex-start; width: 100%; }
          [data-type="column"] { flex: 1; min-width: 0; }
        </style>
      </head>
      <body>
        <div class="prose prose-slate">
          ${html}
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      preferCSSPageSize: true, 
      printBackground: true,
      // 🚨 Notice we removed margin here entirely, we let the @page rule handle it flawlessly!
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presentation.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}