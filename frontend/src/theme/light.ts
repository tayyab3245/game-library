import { embossed } from './effects';

import { Theme } from './index';

const light: Theme = {
  mode: 'light' as const,
  background: '#fafafa',
  primary: '#e60012',
  surface: '#ffffff',
  text: '#141414',
  shadow: 'rgba(0,0,0,0.5)',
  glow: '0 0 8px rgba(255,255,255,0.6)',
  embossed: embossed('rgba(255,255,255,0.6)', 'rgba(0,0,0,0.25)'),
};

export default light;