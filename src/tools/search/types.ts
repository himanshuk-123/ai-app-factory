export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface IWebSearchProvider {
  name: string;
  search(query: string, limit?: number): Promise<SearchResultItem[]>;
}
