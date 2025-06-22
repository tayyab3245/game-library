export const ADD_MARKER = "__ADD__";
export const FULL_W_3DS = 3236;   // total pixel width of your 3DS scan
export const FULL_H_3DS = 1360;   // total pixel height of your 3DS scan
export const BACK_3DS   = 1508;   // back cover width in px (3DS)
export const SPINE_3DS  = 120;    // spine width in px (3DS)
export const FRONT_3DS  = 1608;   // front cover width in px (3DS)

export const HEIGHT_RATIO_3DS = 0.73;

export const WIDTH_FACTOR  = 0.50;
export const DEPTH_FACTOR  = WIDTH_FACTOR;
export const PANEL_RATIO   = 4.875 / 5.875;

export const OVERSCROLL_DAMP = 0.15;          

export const LAYOUT = {
  1: { scale: 0.90, gapX: 0.05, gapY: 0.05,  padTop: 0.5, padBottom: 0.05, padLeft: 0.15, padRight: 0.15 },
  2: { scale: 0.90, gapX: 0.05, gapY: 0.05, padTop: 0.3, padBottom: 0.1, padLeft: 0.15, padRight: 0.15 },
} as const;