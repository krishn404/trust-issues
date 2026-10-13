import { NextResponse } from "next/server";

const ALBUM_ID = "4wUny4EohC9pntzKRrmY7f";
const ALBUM_URL = `https://open.spotify.com/album/${ALBUM_ID}`;
const EMBED_URL = `${ALBUM_URL.replace("open.spotify.com", "open.spotify.com/embed")}`;

type EmbeddedTrack = {
  name: string;
  duration: number;
  subtitle?: string;
  artists?: Array<{ name: string; uri: string }>;
  trackList?: Array<{ title: string; subtitle?: string; duration: number }>;
  visualIdentity?: { image?: Array<{ url: string; maxWidth: number }> };
};

/** Reads public metadata from Spotify's own embed document; no app credentials are exposed. */
export async function GET() {
  try {
    const [response, albumResponse] = await Promise.all([fetch(EMBED_URL, {
      next: { revalidate: 86_400 },
      headers: { "User-Agent": "Mozilla/5.0" },
    }), fetch(ALBUM_URL, { next: { revalidate: 86_400 }, headers: { "User-Agent": "Mozilla/5.0" } })]);
    if (!response.ok) throw new Error(`Spotify returned ${response.status}`);

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) throw new Error("Spotify track metadata was not found");

    const payload = JSON.parse(match[1]) as { props?: { pageProps?: { state?: { data?: { entity?: EmbeddedTrack } } } } };
    const track = payload.props?.pageProps?.state?.data?.entity;
    const firstTrack = track?.trackList?.[0];
    const title = firstTrack?.title ?? track?.name;
    const duration = firstTrack?.duration ?? track?.duration;
    const artists = track?.artists?.map(({ name, uri }) => ({ name, url: uri.replace("spotify:artist:", "https://open.spotify.com/artist/") }))
      ?? (track?.subtitle ? [{ name: track.subtitle, url: "" }] : []);
    if (albumResponse.ok && artists[0]) {
      const albumHtml = await albumResponse.text();
      const artistId = albumHtml.match(/https:\/\/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/)?.[1];
      if (artistId) artists[0].url = `https://open.spotify.com/artist/${artistId}`;
    }
    if (!title || !artists.length || !duration) throw new Error("Spotify returned incomplete album metadata");

    const coverArt = track?.visualIdentity?.image?.sort((a, b) => b.maxWidth - a.maxWidth)[0]?.url;
    return NextResponse.json({
      title,
      duration: duration / 1000,
      coverArt,
      artists,
    }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ error: "Spotify metadata is currently unavailable" }, { status: 502 });
  }
}
