// app/api/export-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const maxDuration = 60; // 🚨 Allow Vercel more time to process

export async function POST(req: NextRequest) {
  try {
    const { html, width, height, typeId } = await req.json();

    const pageW = parseInt(width?.replace('px', '') || '1080');
    const pageH = parseInt(height?.replace('px', '') || '1080');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <style>
          body { margin: 0; padding: 0; background: #ffffff; display: flex; justify-content: center; align-items: flex-start; }
          .prose { max-width: none !important; margin: 0 !important; padding: 0 !important; width: 100%; }
          [contenteditable="false"], button, .menu-bar, .toolbar { display: none !important; }

          /* --- TARGETED CARD CSS --- */
          ${typeId === 'social' ? `
            /* 🔒 SOCIAL POST - DO NOT TOUCH */
            [data-type="card"] { 
              display: flex !important; flex-direction: column !important; padding: 0 !important; 
              background: white; overflow: hidden !important; 
              height: ${pageH}px !important; width: ${pageW}px !important; 
            }
            [data-type="columns"] { 
              margin: 0 !important; border: none !important;
              flex: 1 !important; display: flex !important; flex-direction: row !important; 
              align-items: stretch !important; height: 100% !important; gap: 0 !important; width: 100% !important; 
            }
            [data-type="column"]:first-child { flex: 1 !important; padding: 4rem !important; display: flex !important; flex-direction: column !important; justify-content: center !important; }
            [data-type="column"]:not(:first-child) { flex: 1 !important; position: relative !important; min-height: 100% !important; padding: 0 !important; margin: 0 !important; }
            [data-type="column"]:not(:first-child) p, [data-type="column"]:not(:first-child) br { display: none !important; }
            [data-type="column"]:not(:first-child) img { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; margin: 0 !important; border-radius: 0 !important; display: block !important; }
            blockquote { margin-top: 1.5rem !important; border-left: 4px solid #8b5cf6 !important; padding-left: 1.25rem !important; font-style: italic !important; color: #4b5563 !important; font-size: 1.25rem !important; line-height: 1.5 !important; }
          
          ` : typeId === 'landing' ? `
            /* 🚨 LANDING PAGE ALIGNMENT FIXES */
            [data-type="card"] { 
                position: relative !important; height: ${pageH}px !important;
                background-color: #0f172a !important; border-radius: 0 !important; 
                overflow: hidden !important; display: flex !important; flex-direction: column !important;
                padding: 0 !important; width: ${pageW}px !important;
            }
            
            [data-type="card"] > p:first-child, [data-type="card"] > img:first-child {
                position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                margin: 0 !important; z-index: 1 !important;
            }
            [data-type="card"] img { 
                position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; 
                object-fit: cover !important; filter: brightness(0.35) saturate(1.2) !important; 
                border-radius: 0 !important; margin: 0 !important; display: block !important;
            }
            
            [data-type="columns"]:nth-of-type(1) { 
                position: relative !important; z-index: 10 !important; 
                display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important;
                padding: 2.5rem 4rem 0 4rem !important; width: 100% !important; margin: 0 !important; border: none !important;
            }
            [data-type="columns"]:nth-of-type(1) h3 { font-size: 1.75rem !important; font-weight: 800 !important; color: white !important; margin: 0 !important; }
            
            /* 🚨 ALIGNMENT FIX: Preserve spaces in the navbar */
            [data-type="columns"]:nth-of-type(1) p { font-size: 1rem !important; font-weight: 600 !important; color: rgba(255,255,255,0.8) !important; margin: 0 !important; white-space: pre-wrap !important; }
            
            [data-type="columns"]:nth-of-type(2) { 
                position: relative !important; z-index: 10 !important; 
                display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;
                padding: 4rem 2rem 8rem 2rem !important; text-align: center !important; 
                width: 100% !important; flex: 1 !important; margin: 0 !important; border: none !important;
            }
            [data-type="columns"]:nth-of-type(2) code { display: inline-block !important; padding: 0.4rem 1.25rem !important; border-radius: 9999px !important; background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: white !important; font-size: 0.85rem !important; text-transform: uppercase !important; margin-bottom: 1.5rem !important; }
            [data-type="columns"]:nth-of-type(2) h1 { font-size: 4.5rem !important; font-weight: 800 !important; color: white !important; margin: 0 0 1.5rem 0 !important; line-height: 1.1 !important; max-width: 900px !important; text-align: center !important; }
            [data-type="columns"]:nth-of-type(2) p { font-size: 1.35rem !important; color: rgba(255,255,255,0.85) !important; margin: 0 auto 3.5rem auto !important; max-width: 650px !important; line-height: 1.6 !important; text-align: center !important; }
            
            /* 🚨 ALIGNMENT FIX: Center the buttons perfectly and match their heights */
            [data-type="columns"]:nth-of-type(2) p:has(strong) { display: flex !important; flex-direction: row !important; gap: 1.5rem !important; justify-content: center !important; align-items: center !important; margin-bottom: 2rem !important; }
            
            [data-type="columns"]:nth-of-type(2) strong, [data-type="columns"]:nth-of-type(2) em { 
                display: inline-flex !important; align-items: center !important; justify-content: center !important;
                height: 3.5rem !important; padding: 0 2.5rem !important; box-sizing: border-box !important;
                border-radius: 9999px !important; font-size: 1.125rem !important; font-weight: 700 !important; line-height: 1 !important; margin: 0 !important;
            }
            [data-type="columns"]:nth-of-type(2) strong { background-color: white !important; color: #0f172a !important; }
            [data-type="columns"]:nth-of-type(2) em { font-style: normal !important; background-color: transparent !important; color: white !important; border: 2px solid rgba(255,255,255,0.5) !important; }
            
            [data-type="columns"]:nth-of-type(2) s { display: block !important; text-decoration: none !important; font-size: 0.95rem !important; color: rgba(255,255,255,0.5) !important; font-weight: 500 !important; text-align: center !important; margin: 0 auto !important; }
          
          ` : `
            /* 🚨 DOCUMENT PAGE PERFECT EXPORT */
            [data-type="card"] { 
                width: ${pageW}px !important; 
                background: white !important; 
                padding: 4rem 5rem !important; 
                margin: 0 auto 2rem auto !important; 
                border-radius: 1rem !important; 
                border: 1px solid #e5e7eb !important; 
                box-sizing: border-box !important;
            }
            [data-type="columns"] { 
                display: flex !important; flex-direction: row !important; gap: 3rem !important; 
                align-items: center !important; width: 100% !important; margin: 0 !important; border: none !important;
            }
            [data-type="column"] { flex: 1 !important; min-width: 0 !important; }
            [data-type="card"] img { 
                width: 100% !important; height: auto !important; border-radius: 0.75rem !important; 
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) !important; 
                object-fit: cover !important; margin: 0 auto !important; display: block !important;
            }
          `}
        </style>
      </head>
      <body>
        <div id="export-target" class="prose prose-slate">
          ${html}
        </div>
      </body>
      </html>
    `;

    // 🚨 VERCEL SERVERLESS LAUNCH FIX
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: pageW + 100, height: pageH + 100, deviceScaleFactor: 2 });
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 500));

    const element = await page.$('[data-type="card"]');
    if (!element) throw new Error('Could not find the [data-type="card"] element to screenshot.');

    const box = await element.boundingBox();
    console.log(`\n📸 [Backend Export Debug] Element Bounding Box:`, box);
    if (box) {
      console.log(`📏 Expected: ${pageW}x${pageH} | Actual: ${box.width}x${box.height}`);
    }

    const imageBuffer = await element.screenshot({ type: 'png', omitBackground: true });
    await browser.close();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'attachment; filename="export.png"' },
    });
  } catch (error) {
    console.error('PNG generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PNG' }, { status: 500 });
  }
}