export default function MedIconBadge({
  tags,
  tag,
  name,
  type = 'shield',
  color,
  size = 44,
  borderRadius = 12
}) {
  // Kumpulkan semua tag ke dalam list normalisasi (lowercase)
  let tagList = [];
  if (Array.isArray(tags)) {
    tagList = tags.map(t => String(t || '').trim().toLowerCase());
  } else if (typeof tags === 'string' && tags.trim()) {
    tagList = [tags.trim().toLowerCase()];
  }
  if (tag && typeof tag === 'string') {
    tagList.push(tag.trim().toLowerCase());
  }

  // Nama obat sebagai fallback jika tags belum terpasang
  const nameLower = String(name || '').toLowerCase();

  // Pemetaan logo gambar berdasarkan tags dari folder TA_PPB/Gambar tags:
  // - Important  -> /Gambar tags/important.png
  // - Energy     -> /Gambar tags/energy.jpg
  // - Vitamins   -> /Gambar tags/vitamin.jpg
  // - Supplements-> /Gambar tags/Supplements.jpg
  let imgSrc = null;
  let imgAlt = 'Medicine logo';

  const hasTag = (query) => tagList.some(t => t.includes(query));

  if (hasTag('important') || nameLower.includes('selen')) {
    imgSrc = '/Gambar tags/important.png';
    imgAlt = 'Important';
  } else if (hasTag('energy') || nameLower.includes('ginseng')) {
    imgSrc = '/Gambar tags/energy.jpg';
    imgAlt = 'Energy';
  } else if (hasTag('vitamin') || nameLower.includes('b12')) {
    imgSrc = '/Gambar tags/vitamin.jpg';
    imgAlt = 'Vitamins';
  } else if (hasTag('supplement') || nameLower.includes('omega')) {
    imgSrc = '/Gambar tags/Supplements.jpg';
    imgAlt = 'Supplements';
  }

  if (imgSrc) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${borderRadius}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: '#f1f5f9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.06)'
        }}
        title={`Tag: ${imgAlt}`}
      >
        <img
          src={imgSrc}
          alt={imgAlt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Fallback standar: Shield dengan checklist (sesuai tema default PilMate)
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: '#e2e7ef',
        color: '#2b3b4f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    </div>
  );
}
