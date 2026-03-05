export interface DiscoveryBook {
  source: string;
  title: string;
  author: string;
  language: string;
  year?: string;
  link: string;
  cover_url?: string;
}

export interface IDiscoveryRepository {
  search(query: string): Promise<DiscoveryBook[]>;
  downloadAndFormat(url: string): Promise<any>;
}
