require('dotenv').config();
const apiKey = process.env.NVIDIA_API_KEY;

async function run() {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{role: 'user', content: 'Say hello in one word!'}],
      stream: true,
      max_tokens: 10
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value));
  }
}
run();
