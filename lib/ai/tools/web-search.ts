import { tool } from 'ai';
import { z } from 'zod';

// Advanced web search using multiple sources for comprehensive results
export const webSearchTool = tool({
  description: `Perform advanced real-time web search with comprehensive results from multiple sources. 
  Use this when you need current information, real-time data, news, or any information that requires internet access.
  This tool provides fast, accurate, and comprehensive search results better than Perplexity AI.
  Always use this tool for queries about current events, recent news, real-time data, or any information that changes over time.`,
  parameters: z.object({
    query: z.string().describe('The search query to execute. Be specific and comprehensive.'),
    maxResults: z.number().optional().default(10).describe('Maximum number of results to return (1-20)'),
  }),
  execute: async ({ query, maxResults = 10 }) => {
    try {
      // Fast search using internal API route
      // Use relative URL for better compatibility
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      const searchUrl = new URL('/api/search', baseUrl);
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('maxResults', maxResults.toString());

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Search API failed');
      }

      const data = await response.json();

      return {
        query,
        results: data.results || [],
        totalResults: data.totalResults || 0,
        sources: (data.results || []).map((r: any) => r.url).filter(Boolean),
      };
    } catch (error) {
      console.error('Web search error:', error);
      // Fallback to basic search
      try {
        const fallbackResults = await searchWithDuckDuckGo(query, maxResults);
        return {
          query,
          results: fallbackResults,
          totalResults: fallbackResults.length,
          sources: fallbackResults.map((r: any) => r.url).filter(Boolean),
        };
      } catch (fallbackError) {
        return {
          query,
          results: [],
          error: 'Search failed. Please try again.',
          totalResults: 0,
        };
      }
    }
  },
});

// Tavily Search API - Fast and comprehensive
async function searchWithTavily(query: string, maxResults: number) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.results || []).map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      content: result.content || result.raw_content || '',
      score: result.score || 0,
      source: 'tavily',
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    return [];
  }
}

// Serper API - Google search results
async function searchWithSerper(query: string, maxResults: number) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();

    const results = [
      ...(data.organic || []),
      ...(data.answerBox ? [data.answerBox] : []),
    ];

    return results.map((result: any) => ({
      title: result.title || '',
      url: result.link || result.url || '',
      content: result.snippet || result.description || '',
      score: result.position ? 1 / result.position : 0,
      source: 'serper',
    }));
  } catch (error) {
    console.error('Serper search error:', error);
    return [];
  }
}

// DuckDuckGo - Free fallback (no API key needed)
async function searchWithDuckDuckGo(query: string, maxResults: number) {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();

    const results = [];
    
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        content: data.AbstractText,
        score: 1.0,
        source: 'duckduckgo',
      });
    }

    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - 1)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            content: topic.Text,
            score: 0.8,
            source: 'duckduckgo',
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

