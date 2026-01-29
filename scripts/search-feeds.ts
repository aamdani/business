import 'dotenv/config';

async function searchPerplexity(query: string): Promise<string> {
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
        messages: [{ role: "user", content: query }],
        temperature: 0.3,
      }),
    }
  );

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function main() {
  const query = `I need to scrape changelog pages. For each company below, tell me:

1. The exact URL of their changelog/release notes page
2. Whether the page is static HTML (easy to scrape) or JavaScript-rendered (needs headless browser)
3. What HTML structure they use (e.g., "each release is an <article> with a date in <time>")
4. Any API endpoints they might have that return changelog data as JSON

Companies:
- Anthropic (their API changelog, not the research blog)
- Cursor (their editor changelog)
- Perplexity (their API/product changelog)
- Windsurf/Codeium (their editor changelog)
- Google Gemini (their API changelog)

Be very specific about URLs and HTML structure.`;

  console.log("Searching for changelog page structures...\n");
  const answer = await searchPerplexity(query);
  console.log(answer);
}

main();
