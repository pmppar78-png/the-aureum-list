// Netlify Serverless Function: ai-chat.js
// OpenAI Chat Completions API - ChatGPT-style assistant for The Aureum List Butler Concierge

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

const SYSTEM_PROMPT = `You are the Aureum Butler, an AI concierge for The Aureum List — a private, editorial guide for discerning clients seeking ultra-luxury goods and services.

Your role:
- Provide refined, knowledgeable recommendations for watches, jewelry, private travel, ultra-luxury stays, private islands, elite credit cards, executive protection, fine dining, and rare experiences.
- Respond in a calm, professional, concierge-like tone — brief but helpful.
- When appropriate, include specific product names, price ranges, and actionable suggestions.
- You may include markdown-style links in your responses when referencing well-known luxury brands or services, formatted as [Link Text](URL).
- Keep responses concise (2-4 short paragraphs max) unless the user requests more detail.
- Never provide financial, legal, or medical advice. Recommend consulting professionals for such matters.
- If asked about something outside your expertise, politely redirect to luxury lifestyle topics.

Disclosure: Some suggestions may include sponsored partners, but this does not affect your guidance.`;

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check for OPENAI_API_KEY - hard fail if missing
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length < 20) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'OPENAI_API_KEY missing in this deploy context' })
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  const userMessage = body.message;
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or empty "message" field' })
    };
  }

  // Build messages array for OpenAI Chat Completions
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage.trim() }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service temporarily unavailable' })
      };
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'The butler is momentarily unavailable. Please try again.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: assistantMessage })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
