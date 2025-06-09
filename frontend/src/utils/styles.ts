/* 3DS-style chunky gradient button – matches CommandBar colours */
export const neonBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '12px 28px',
  fontWeight: 700,
  fontSize: 16,
  textTransform: 'uppercase',
  letterSpacing: '.3px',
  color: '#fff',
  border: 'none',
  borderRadius: 14,
  cursor: disabled ? 'default' : 'pointer',
  background:
    'linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%),' +
    'linear-gradient(180deg,#3b404d 0%,#1d1f26 100%)',
  backgroundBlendMode: 'soft-light',
  boxShadow: disabled
    ? 'none'
    : '0 .05em .05em -.01em rgba(5,5,5,1),' +
      '0 .01em .01em -.01em rgba(5,5,5,.5),' +
      '.18em .36em .14em -.03em rgba(5,5,5,.25)',
  filter: disabled ? 'grayscale(1) opacity(.4)' : undefined,
  transition: 'filter .12s, transform .12s',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
});