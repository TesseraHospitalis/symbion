export async function onRequest(context) {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await request.json()

    const messages = []
    if (body.system) {
      messages.push({ role: 'system', content: body.system })
    }
    if (body.messages) {
      messages.push(...body.messages)
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://symbion.world',
        'X-Title': 'Symbion',
      },
      body: JSON.stringify({
        model: body.model || 'anthropic/claude-sonnet-4-5',
        messages,
        max_tokens: body.max_tokens || 1000,
      }),
    })

    const data = await response.json()

    const converted = {
      content: [
        {
          type: 'text',
          text: data.choices?.[0]?.message?.content || '',
        }
      ],
      model: data.model,
      usage: data.usage,
    }

    return new Response(JSON.stringify(converted), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}