import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const languageNames: Record<string, string> = {
  en: 'English', nl: 'Dutch', fr: 'French', es: 'Spanish', de: 'German'
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'The AI service is not configured yet. Add OPENAI_API_KEY to .env.local.' }, { status: 503 });
    }

    const form = await request.formData();
    const message = String(form.get('message') || '').trim();
    const language = String(form.get('language') || 'en');
    const file = form.get('file');
    if (!message && !(file instanceof File)) {
      return NextResponse.json({ error: 'Write a question or upload a study file.' }, { status: 400 });
    }

    let documentText = '';
    if (file instanceof File) {
      if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Please keep uploads under 8 MB.' }, { status: 413 });
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const parsed = await pdf(buffer);
        documentText = parsed.text;
      } else if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith('text/')) {
        documentText = buffer.toString('utf8');
      } else {
        return NextResponse.json({ error: 'For this first version, upload a PDF, TXT or MD file.' }, { status: 415 });
      }
      documentText = documentText.slice(0, 24000);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `You are Learnova, a friendly and reliable tutor for secondary-school students. Explain concepts clearly at the student's level, use examples, and encourage learning rather than simply doing all their work. If study material is provided, base your answer on it and say when information is missing. Do not invent facts or claim to have read content that was not provided. Reply in ${languageNames[language] || 'English'}. Keep explanations structured and readable.`;
    const userContent = [message || 'Please help me study this document.', documentText ? `\n\nSTUDY MATERIAL:\n${documentText}` : ''].join('');

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
      temperature: 0.5,
      max_tokens: 1200
    });

    return NextResponse.json({ answer: completion.choices[0]?.message?.content || 'I could not generate an answer. Please try again.' });
  } catch (error) {
    console.error('Learnova API error:', error);
    return NextResponse.json({ error: 'Something went wrong while processing your request. Please try again.' }, { status: 500 });
  }
}
