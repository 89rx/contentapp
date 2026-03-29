import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min'; // CHANGED TO -MIN

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const { html, width, height, typeId } = await req.json();

    if (!html) {
      return NextResponse.json({ error: 'Missing HTML content' }, { status: 400 });
    }

    const pageW = parseInt(width?.replace('px', '') || '1280');
    const pageH = parseInt(height?.replace('px', '') || '750');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <style>
          @page {
            size: ${pageW}px ${typeId === 'document' ? '720px' : `${pageH}px`};
            margin: ${typeId === 'document' ? '80px 100px' : '0px'} !important;
          }

          body { 
            margin: 0; padding: 0; background: #ffffff; 
            -webkit-print-color-adjust: exact; print-color-adjust: exact; 
          }
          
          .prose { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .prose > p:empty { display: none !important; }
          [contenteditable="false"], [role="button"], button, .menu-bar, .toolbar { display: none !important; }

          ${typeId === 'social' ? `
            [data-type="card"] { 
              display: flex !important; flex-direction: column !important; padding: 0 !important; 
              background: white; overflow: hidden !important; 
              height: ${pageH}px !important; width: ${pageW}px !important; 
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
            }
            [data-type="card"]:last-of-type { page-break-after: auto !important; break-after: auto !important; }
            [data-type="columns"] { margin: 0 !important; border: none !important; flex: 1 !important; display: flex !important; flex-direction: row !important; align-items: stretch !important; height: 100% !important; gap: 0 !important; width: 100% !important; }
            [data-type="column"]:first-child { flex: 1 !important; padding: 4rem !important; display: flex !important; flex-direction: column !important; justify-content: center !important; }
            [data-type="column"]:not(:first-child) { flex: 1 !important; position: relative !important; min-height: 100% !important; padding: 0 !important; margin: 0 !important; }
            [data-type="column"]:not(:first-child) p, [data-type="column"]:not(:first-child) br { display: none !important; }
            [data-type="column"]:not(:first-child) img { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; margin: 0 !important; border-radius: 0 !important; display: block !important; }
            blockquote { margin-top: 1.5rem !important; border-left: 4px solid #8b5cf6 !important; padding-left: 1.25rem !important; font-style: italic !important; color: #4b5563 !important; font-size: 1.25rem !important; line-height: 1.5 !important; }
          ` : typeId === 'landing' ? `
            * { page-break-inside: auto !important; page-break-after: auto !important; page-break-before: auto !important; break-inside: auto !important; break-after: auto !important; break-before: auto !important; }
            [data-type="card"] { position: relative !important; height: ${pageH}px !important; background-color: #0f172a !important; border-radius: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; padding: 0 !important; width: ${pageW}px !important; page-break-inside: avoid !important; page-break-after: always !important; break-after: page !important; }
            [data-type="card"]:last-of-type { page-break-after: auto !important; break-after: auto !important; }
            [data-type="card"] > p:first-child, [data-type="card"] > img:first-child { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; margin: 0 !important; z-index: 1 !important; }
            [data-type="card"] img { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; filter: brightness(0.35) saturate(1.2) !important; border-radius: 0 !important; margin: 0 !important; display: block !important; }
            [data-type="columns"]:nth-of-type(1) { position: relative !important; z-index: 10 !important; display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; padding: 2.5rem 4rem 0 4rem !important; width: 100% !important; margin: 0 !important; border: none !important; }
            [data-type="columns"]:nth-of-type(1) h3 { font-size: 1.75rem !important; font-weight: 800 !important; color: white !important; margin: 0 !important; }
            [data-type="columns"]:nth-of-type(1) p { font-size: 1rem !important; font-weight: 600 !important; color: rgba(255,255,255,0.8) !important; margin: 0 !important; white-space: pre-wrap !important; }
            [data-type="columns"]:nth-of-type(2) { position: relative !important; z-index: 10 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; padding: 4rem 2rem 8rem 2rem !important; text-align: center !important; width: 100% !important; flex: 1 !important; margin: 0 !important; border: none !important; }
            [data-type="columns"]:nth-of-type(2) code { display: inline-block !important; padding: 0.4rem 1.25rem !important; border-radius: 9999px !important; background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: white !important; font-size: 0.85rem !important; text-transform: uppercase !important; margin-bottom: 1.5rem !important; }
            [data-type="columns"]:nth-of-type(2) h1 { font-size: 4.5rem !important; font-weight: 800 !important; color: white !important; margin: 0 0 1.5rem 0 !important; line-height: 1.1 !important; max-width: 900px !important; text-align: center !important; }
            [data-type="columns"]:nth-of-type(2) p { font-size: 1.35rem !important; color: rgba(255,255,255,0.85) !important; margin: 0 auto 3.5rem auto !important; max-width: 650px !important; line-height: 1.6 !important; text-align: center !important; }
            [data-type="columns"]:nth-of-type(2) p:has(strong) { display: flex !important; flex-direction: row !important; gap: 1.5rem !important; justify-content: center !important; align-items: center !important; margin-bottom: 2rem !important; }
            [data-type="columns"]:nth-of-type(2) strong, [data-type="columns"]:nth-of-type(2) em { display: inline-flex !important; align-items: center !important; justify-content: center !important; height: 3.5rem !important; padding: 0 2.5rem !important; box-sizing: border-box !important; border-radius: 9999px !important; font-size: 1.125rem !important; font-weight: 700 !important; line-height: 1 !important; margin: 0 !important; }
            [data-type="columns"]:nth-of-type(2) strong { background-color: white !important; color: #0f172a !important; }
            [data-type="columns"]:nth-of-type(2) em { font-style: normal !important; background-color: transparent !important; color: white !important; border: 2px solid rgba(255,255,255,0.5) !important; }
            [data-type="columns"]:nth-of-type(2) s { display: block !important; text-decoration: none !important; font-size: 0.95rem !important; color: rgba(255,255,255,0.5) !important; font-weight: 500 !important; text-align: center !important; margin: 0 auto !important; }
          ` : `
            [data-type="card"] { width: 100% !important; border: none !important; padding: 4rem 5rem !important; margin: 0 auto 2rem auto !important; border-radius: 1rem !important; box-sizing: border-box !important; page-break-after: always; break-after: page; display: block; }
            [data-type="card"]:last-of-type { page-break-after: auto !important; break-after: auto !important; }
            h1, h2, h3, p, li, table, tr { page-break-inside: avoid; break-inside: avoid; }
            [data-type="columns"] { display: flex !important; flex-direction: row !important; gap: 3rem !important; align-items: center !important; width: 100% !important; margin: 0 !important; border: none !important; }
            [data-type="column"] { flex: 1 !important; min-width: 0 !important; }
            [data-type="card"] img { width: 100% !important; height: auto !important; border-radius: 0.75rem !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) !important; object-fit: cover !important; margin: 0 auto !important; display: block !important; }
          `}
        </style>
      </head>
      <body>
        <div class="prose prose-slate">
          ${html}
        </div>
      </body>
      </html>
    `;

    const isLocal = process.env.NODE_ENV === 'development';
    let localExecutablePath;
    if (process.platform === 'win32') {
      localExecutablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'linux') {
      localExecutablePath = '/usr/bin/google-chrome';
    } else {
      localExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    const browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      executablePath: isLocal 
        ? localExecutablePath 
        : await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'),
      headless: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const pdfBuffer = await page.pdf({
      preferCSSPageSize: true, 
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="export.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}