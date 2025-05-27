export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (json.status !== 'success') return null;
    return {
      url,
      title: json.data.title,
      description: json.data.description,
      image: json.data.image?.url,
    };
  } catch {
    return null;
  }
} 