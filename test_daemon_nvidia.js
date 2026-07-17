require('dotenv').config();
const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  console.log("No NVIDIA_API_KEY found in .env");
  process.exit(1);
}

async function run() {
  const daemonUrl = `http://${process.env.KURUMI_DAEMON_HOST || '127.0.0.1'}:${process.env.KURUMI_DAEMON_PORT || '47392'}`;

  const res = await fetch(`${daemonUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'nvidia',
      model: 'meta/llama-3.1-8b-instruct',
      messages: [{role: 'user', content: 'Say hello in two words!'}],
      apiKey: apiKey,
      options: { max_tokens: 10 }
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    console.log("CHUNK REC:", chunk);
    result += chunk;
  }
  
  console.log("DONE");
}
run();
