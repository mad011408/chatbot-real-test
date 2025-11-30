import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds for fast search

// Fast web search using multiple sources
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const maxResults = parseInt(searchParams.get("maxResults") || "10");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Try multiple search APIs in parallel for fastest results
    // Use Promise.any to get the first successful result for speed
    const searchPromises = [
      searchWithTavily(query, maxResults).catch(() => []),
      searchWithSerper(query, maxResults).catch(() => []),
      searchWithDuckDuckGo(query, maxResults).catch(() => []),
    ];

    // Get first successful result or combine all results
    const searchResults = await Promise.allSettled(searchPromises);
    let results: any[] = [];
    const seenUrls = new Set<string>();

    // Combine results from all sources, deduplicate
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        for (const item of result.value) {
          if (item.url && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            results.push(item);
          }
        }
      }
    }

    // If no results, try DuckDuckGo as final fallback
    if (results.length === 0) {
      results = await searchWithDuckDuckGo(query, maxResults);
    }

    return NextResponse.json({
      query,
      results: results.slice(0, maxResults),
      totalResults: results.length,
    });
  } catch (error: unknown) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}

// Tavily Search - Fast and comprehensive
async function searchWithTavily(query: string, maxResults: number) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Tavily API key not configured");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: true,
    }),
  });

  if (!response.ok) throw new Error("Tavily search failed");
  const data = await response.json();

  return (data.results || []).map((result: any) => ({
    title: result.title || "",
    url: result.url || "",
    content: result.content || "",
    score: result.score || 0,
    source: "tavily",
  }));
}

// Serper API - Google search
async function searchWithSerper(query: string, maxResults: number) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("Serper API key not configured");

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: maxResults,
    }),
  });

  if (!response.ok) throw new Error("Serper search failed");
  const data = await response.json();

  const results = [
      ...(data.organic || []),
      ...(data.answerBox ? [data.answerBox] : []),
    ];

  return results.map((result: any) => ({
    title: result.title || "",
    url: result.link || result.url || "",
    content: result.snippet || result.description || "",
    score: result.position ? 1 / result.position : 0,
    source: "serper",
  }));
}

// DuckDuckGo - Free and fast (no API key needed)
async function searchWithDuckDuckGo(query: string, maxResults: number) {
  try {
    // Use DuckDuckGo Instant Answer API
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) throw new Error("DuckDuckGo search failed");
    const data = await response.json();

    const results = [];
    
    // Add instant answer if available
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || "",
        content: data.AbstractText,
        score: 1.0,
        source: "duckduckgo",
      });
    }

    // Add related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - 1)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text,
            url: topic.FirstURL,
            content: topic.Text,
            score: 0.8,
            source: "duckduckgo",
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    throw error;
  }
}

