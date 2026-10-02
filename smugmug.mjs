const allowedPaths = [
  '/Idyllwild/Edited/', '/Idyllwild/Drone/Video/',
  '/LateCheckout-05-2026/Favorites/',
  '/Eli---Fur---Le-Youth/Video/Photos-from-folder-favorites/',
  '/Nora-En-Pure-Jul-2024/Favorites/',
];
export function excluded(value) {
  let text;
  try { text = decodeURIComponent(String(value)); } catch { return true; }
  return /night[\s_-]*shift|(?:^|[^a-z])adp(?:[^a-z]|$)|another[\s_-]*day[\s_-]*party/i.test(text);
}
export function approvedURL(value, kind = 'page') {
  try {
    const u = new URL(value);
    const hosts = kind === 'page' ? ['jacksonharris.smugmug.com'] : ['photos.smugmug.com', 'videos.smugmug.com'];
    return u.protocol === 'https:' && hosts.includes(u.hostname) && !u.username && !u.password && !u.search && !u.hash && !excluded(u.pathname) && allowedPaths.some(p => u.pathname.startsWith(p));
  } catch { return false; }
}
export function validateItem(item) {
  if (!/^[A-Za-z0-9]+$/.test(item.id) || !['photo','video'].includes(item.type)) throw new Error('Invalid media identity');
  if (excluded([item.title,item.collection,item.page,item.src,item.poster].join(' '))) throw new Error('Excluded collection');
  if (!approvedURL(item.page) || !approvedURL(item.src,'media') || (item.poster && !approvedURL(item.poster,'media'))) throw new Error('Unapproved media source');
  if (!new URL(item.page).pathname.endsWith(`/i-${item.id}`) || !new URL(item.src).pathname.includes(`/i-${item.id}/`)) throw new Error('Media identity mismatch');
  return item;
}
function sizeEntries(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(v => v && typeof v === 'object' ? (typeof v.Url === 'string' ? [v] : sizeEntries(v)) : []);
}
export function selectSize(details, video) {
  const sizes = sizeEntries(details).filter(s => approvedURL(s.Url,'media') && (video ? /\.mp4$/i.test(s.Url) : /\.(jpg|jpeg|png|webp)$/i.test(s.Url)));
  // Choose a web derivative; never the original media endpoint.
  const web = sizes.filter(s => !/\/O\//.test(s.Url));
  const preferred = web.filter(s => Number(s.Width) <= 1920 && Number(s.Width) >= 800).sort((a,b)=>Number(b.Width)-Number(a.Width));
  return preferred[0] || web.filter(s=>Number(s.Width)>0).sort((a,b)=>Number(a.Width)-Number(b.Width))[0];
}
export function createReader({apiKey, fetcher = fetch}) {
  async function get(uri) {
    if (!/^\/api\/v2\/(?:image|album)\/[A-Za-z0-9!/_-]+$/.test(uri)) throw new Error('Invalid API resource');
    const url = new URL(uri, 'https://api.smugmug.com');
    url.searchParams.set('APIKey',apiKey);
    const response = await fetcher(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
    if ([401,403,404].includes(response.status)) return null;
    if (!response.ok) throw new Error(`SmugMug request failed (${response.status})`);
    const data = await response.json();
    if (!data.Response) throw new Error('Invalid SmugMug response');
    return data.Response;
  }
  return async function refresh(item) {
    validateItem(item);
    const response = await get(`/api/v2/image/${item.id}`);
    if (!response) return null;
    const image = response.Image;
    // Fail closed on hidden, private, moved, or excluded source material.
    if (!image || image.Hidden || !approvedURL(image.WebUri) || excluded(image.Caption||'')) return null;
    const albumUri = image.Uris?.ImageAlbum?.Uri;
    const sizesUri = image.Uris?.ImageSizeDetails?.Uri;
    if (!albumUri || !sizesUri) return null;
    const albumData = await get(albumUri);
    const album = albumData?.Album;
    if (!album || album.External === false || (album.Privacy && album.Privacy !== 'Public') || excluded(`${album.Name} ${album.WebUri}`)) return null;
    if (!approvedURL(`${album.WebUri.replace(/\/$/,'')}/i-${item.id}`)) return null;
    const sizeData = await get(sizesUri);
    if (!sizeData) return null;
    const source = selectSize(sizeData.ImageSizeDetails,item.type==='video');
    const poster = item.type==='video' ? selectSize(sizeData.ImageSizeDetails,false) : null;
    if (!source || (item.type==='video' && !poster)) return null;
    return validateItem({...item,src:source.Url,...(poster?{poster:poster.Url}:{}),page:image.WebUri});
  };
}
export async function refreshPortfolio(seed, reader) {
  const hero = await reader(seed.hero);
  const photos = [];
  const videos = [];
  // Bounded curated list, never a crawl of the full account.
  for (const item of seed.photos) { const updated=await reader(item); if(updated)photos.push(updated); }
  for (const item of seed.videos) { const updated=await reader(item); if(updated)videos.push(updated); }
  return {hero,photos,videos,source:'smugmug-api'};
}
