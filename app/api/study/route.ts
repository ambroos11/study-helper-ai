import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
const languageNames: Record<string, string> = { nl: 'Dutch', en: 'English', fr: 'French' };

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI is nog niet ingesteld. Voeg OPENAI_API_KEY toe aan de serveromgeving.' }, { status: 503 });
    }
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const language = languageNames[String(body.language || 'nl')] || 'Dutch';
    if (body.action !== 'flashcards') return NextResponse.json({ error: 'Deze actie wordt nog niet ondersteund.' }, { status: 400 });
    if (text.length < 30) return NextResponse.json({ error: 'Voeg meer cursusmateriaal toe (minstens 30 tekens).' }, { status: 400 });
    if (text.length > 18000) return NextResponse.json({ error: 'De tekst is te lang. Gebruik maximaal 18.000 tekens.' }, { status: 413 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: `You are Learnova, a careful study-material assistant for secondary-school students. Create 8 to 15 concise flashcards based only on the provided study material. Reply in ${language}. Return valid JSON with this exact shape: {"title":"short set title","subject":"school subject","cards":[{"term":"short question or key term","definition":"clear concise answer"}]}. Do not add facts not supported by the material. Avoid duplicate cards. Use simple student-friendly language.` },
        { role: 'user', content: `Create flashcards from this material:\n\n${text}` }
      ]
    });
    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const cards = Array.isArray(parsed.cards) ? parsed.cards.slice(0, 20).map((card: any) => ({ term: String(card.term || '').slice(0, 220), definition: String(card.definition || '').slice(0, 600) })).filter((card: any) => card.term && card.definition) : [];
    if (!cards.length) return NextResponse.json({ error: 'Er konden geen flashcards uit deze tekst worden gemaakt.' }, { status: 422 });
    return NextResponse.json({ title: String(parsed.title || 'Nieuwe leerbundel').slice(0, 100), subject: String(parsed.subject || 'Algemeen').slice(0, 60), cards });
  } catch (error) {
    console.error('Learnova study generation error:', error);
    return NextResponse.json({ error: 'De AI kon geen flashcards maken. Probeer het opnieuw.' }, { status: 500 });
  }
}
