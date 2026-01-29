import 'dotenv/config';

async function askPerplexity(prompt: string) {
  const response = await fetch(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    }
  );

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

async function main() {
  const question = `I'm using the Perplexity API to search for official announcements. I found:

1. With search_domain_filter: ["anthropic.com"] I get 9 great results from anthropic.com/news
2. With search_domain_filter: ["openai.com"] I only get 1 result from community.openai.com forum

Why does the API find good results for some domains but not others? Is it a crawling/indexing issue? 

And why do I get 0 results when I use multiple domains like ["anthropic.com", "openai.com"] together? Does search_domain_filter do AND instead of OR?`;

  const answer = await askPerplexity(question);
  console.log(answer);
}

main();
