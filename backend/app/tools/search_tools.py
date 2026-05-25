import os
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from tavily import TavilyClient

from app.core.config import get_settings


class TavilySearchInput(BaseModel):
    """Input schema for TavilySearchTool."""
    query: str = Field(..., description="The search query to look up on the internet.")


class TavilySearchTool(BaseTool):
    name: str = "Tavily Web Search"
    description: str = (
        "A search engine optimized for comprehensive, accurate, and trusted results. "
        "Useful for when you need to answer questions about current events, companies, or fetch live data. "
        "Input should be a search query."
    )
    args_schema: Type[BaseModel] = TavilySearchInput

    def _run(self, query: str) -> str:
        settings = get_settings()
        api_key = settings.tavily_api_key or os.environ.get("TAVILY_API_KEY")
        if not api_key:
            return "Error: TAVILY_API_KEY is not set. Cannot perform web search."
        
        try:
            client = TavilyClient(api_key=api_key)
            response = client.search(query=query, search_depth="basic")
            results = response.get("results", [])
            
            if not results:
                return f"No results found for query: {query}"
                
            formatted_results = "\n\n".join(
                [f"Title: {res.get('title')}\nURL: {res.get('url')}\nContent: {res.get('content')}" for res in results]
            )
            return f"Search Results for '{query}':\n\n{formatted_results}"
        except Exception as e:
            return f"Error executing search: {str(e)}"
