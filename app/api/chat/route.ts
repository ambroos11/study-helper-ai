
import OpenAI from 'openai';
import pdf from 'pdf-parse';
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
        { error: 'DeepSeek API key is not configured.' },
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

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const parsed = await pdf(buffer);
        documentText = parsed.text;
      } else if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith('text/')) {
        documentText = buffer.toString('utf8');
      } else {
        return NextResponse.json(
          { error: 'Upload voorlopig een PDF-, TXT- of MD-bestand.' },
          { status: 415 }
        );
      }

      documentText = documentText.slice(0, 24000);
    }

    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });

    const system = `You are Study Helper AI, a friendly and reliable tutor for secondary-school students. Explain concepts clearly at the student's level, use examples, and encourage learning. If study material is provided, base your answer on it and say when information is missing. Do not invent facts. Reply in ${languageNames[language] || 'Dutch'}. Use clear headings and readable formatting.`;

    const userContent = [
      message || 'Help me study this document.',
      documentText ? `\n\nSTUDY MATERIAL:\n${documentText}` : ''
    ].join('');

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const answer = completion.choices[0]?.message?.content;

    return NextResponse.json({
      answer: answer || 'Ik kon geen antwoord maken. Probeer opnieuw.'
    });

  } catch (error) {
    console.error('DeepSeek API error:', error);

    return NextResponse.json(
      { error: 'DeepSeek kon je vraag niet verwerken. Controleer de API-configuratie.' },
      { status: 500 }
    );
  }
}
