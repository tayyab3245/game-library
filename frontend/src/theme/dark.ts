import { embossed } from './effects';

import { Theme } from './index';

const dark: Theme = {
  mode: 'dark' as const,
  background: '#0f0f0f',
  primary: '#e60012',
  surface: '#1a1a1a',
  text: '#f4f4f4',
  shadow: 'rgba(0,0,0,0.7)',
  glow: '0 0 8px rgba(255,255,255,0.4)',
  embossed: embossed('rgba(255,255,255,0.2)', 'rgba(0,0,0,0.6)'),
  panelTop:  '#2e2e2e',
  panelBot:  '#202020',
  panelEdge: '#141414',
};

export default dark;