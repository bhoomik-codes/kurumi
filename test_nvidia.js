require('dotenv').config();
const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  console.log("No NVIDIA_API_KEY found in .env");
  process.exit(1);
}

async function run() {
  console.log("Testing /models...");
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    console.log("Models status:", res.status);
    if (!res.ok) {
        console.log("Response:", await res.text());
    } else {
        const data = await res.json();
        console.log(`Found ${data.data?.length} models.`);
    }
  } catch (e) {
    console.error(e);
  }

  console.log("\nTesting /chat/completions (probe)...");
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{role: 'user', content: 'Hello!'}],
        max_tokens: 10
      })
    });
    console.log("Chat status:", res.status);
    if (!res.ok) {
        console.log("Response:", await res.text());
    } else {
        const data = await res.json();
        console.log("Completion response:", JSON.stringify(data.choices[0]));
    }
  } catch(e) {
      console.error(e);
  }
}
run();
