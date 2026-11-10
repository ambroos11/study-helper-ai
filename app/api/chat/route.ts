
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const languageNames: Record<string, string> = {
  en: 'English',
  nl: 'Dutch',
  fr: 'French',
  es: 'Spanish',
  de: 'German'
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API-key ontbreekt in Cloudflare.' },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const message = String(form.get('message') || '').trim();
    const language = String(form.get('language') || 'nl');
    const file = form.get('file');

    if (!message && !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Schrijf een vraag of upload studiemateriaal.' },
        { status: 400 }
      );
    }

    let documentText = '';

    if (file instanceof File) {
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Bestanden mogen maximaal 8 MB groot zijn.' },
          { status: 413 }
        );
      }

      if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      ) {
        return NextResponse.json(
          { error: 'PDF-ondersteuning wordt bijgewerkt. Gebruik voorlopig TXT of MD.' },
          { status: 415 }
        );
      } else if (
        /\.(txt|md)$/i.test(file.name) ||
        file.type.startsWith('text/')
      ) {
        documentText = await file.text();
      } else {
        return NextResponse.json(
          { error: 'Upload voorlopig een TXT- of MD-bestand.' },
          { status: 415 }
        );
      }

      documentText = documentText.slice(0, 24000);
    }

    const system = `You are Study Helper AI, a friendly and reliable tutor for secondary-school students. Explain concepts clearly at the student's level, use examples and encourage learning. Base answers on provided study material when available. Do not invent facts. Reply in ${languageNames[language] || 'Dutch'}. Use clear headings and readable formatting.`;

    const userContent = [
      message || 'Help me study this document.',
      documentText ? `\n\nSTUDY MATERIAL:\n${documentText}` : ''
    ].join('');

    const response = await fetch(
      'https://api.deepseek.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      }
    );

    const result: any = await response.json();

    if (!response.ok) {
      console.error('DEEPSEEK_API_ERROR', response.status, {
        message: result?.error?.message,
        type: result?.error?.type
      });

      return NextResponse.json(
        {
          error: 'DeepSeek kon je vraag niet verwerken.',
          details: result?.error?.message || 'Onbekende API-fout.'
        },
        { status: 502 }
      );
    }

    const answer = result.choices?.[0]?.message?.content;

    return NextResponse.json({
      answer: answer || 'Geen antwoord ontvangen.'
    });

  } catch (error: any) {
    console.error('DEEPSEEK_CONNECTION_ERROR', error?.message);

    return NextResponse.json(
      {
        error: 'Verbindingsfout met DeepSeek. Probeer opnieuw.'
      },
      { status: 500 }
    );
  }
}
