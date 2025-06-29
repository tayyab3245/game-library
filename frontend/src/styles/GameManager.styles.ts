import { CSSProperties } from 'react';
import { Theme } from '../theme';

type StyleMap = { [k: string]: CSSProperties };

export const getStyles = (t: Theme): StyleMap => ({
  container: {
    minHeight: '100vh',
    maxWidth: '100vw',
    margin: 0,
    padding: 0,
    overflowY: 'hidden',
    overflowX: 'hidden',
    /* theme-aware */
    background: t.background,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: '25vh', // was 0; now ends 25% closer to the command bar
    width: '100vw',
    height: '100vh',
    fontFamily: '"Nunito", sans-serif',
  },
  header: {
    position: 'relative',
    minHeight: 120,
    /* a little shorter & centred */
    padding: '20px 32px 32px 32px',
    maxWidth: '800px',          // “medium” width cap
    margin: '0 auto 0',      // centres & drops heade
    borderRadius: '0 0 48px 48px',
     /* same glossy highlight on top, but now derive the ramp from panel* tokens */
     background:
       `linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%),` +
       `linear-gradient(180deg,${t.panelTop} 0%,${t.panelBot} 100%)`,
    backgroundBlendMode: 'soft-light',
    /* reuse the global shadow token so dark & light match */
    boxShadow: t.shadow,
    color: t.text,
    fontFamily: '"Nunito", sans-serif',
  },
    dateTime: {
      position: 'absolute',
      top: 14,
      right: 28,
      fontSize: 14,                         // back to subtle
      fontFamily: '"Nunito", sans-serif',
      color: t.text,
      userSelect: 'none',
    },
      titleWrap: {
        textAlign: 'center',
        fontFamily: '"Press Start 2P", sans-serif',
      },
  middle: {
    /* fill remaining space – centres GameShelf perfectly */
    flex: '1 1 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
  },
  hours: {
    fontSize: 16,
    color: t.text,
    marginTop: 4,
  },
  form: {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '90%',
    maxWidth: '600px',
    padding: '16px 24px',
    borderRadius: 48,
    background:
      'linear-gradient(-35deg,rgba(255,255,255,.07) 0%,transparent 60%),' +
      'linear-gradient(180deg,#3b404d 0%,#1d1f26 100%)',
    backgroundBlendMode: 'soft-light',
    boxShadow:
      'inset 0 1px 2px rgba(255,255,255,0.25),' +
      'inset -.06em -.06em .06em 0 rgba(5,5,5,.25),' +
      '0 .05em .05em -.01em rgba(5,5,5,1),' +
      '0 .01em .01em -.01em rgba(5,5,5,.5),' +
      '.18em .36em .14em -.03em rgba(5,5,5,.25)',
    zIndex: 1000,
    margin: 0,
    transition: 'opacity 0.2s ease-out',
    willChange: 'opacity, transform',
  },
  input: {
    background: '#1e1e24',
    color: t.text,
    padding: '12px 16px',
    borderRadius: 16,
    minWidth: 180,
    border: 'none',
    outline: 'none',
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: '0.5px',
    boxShadow:
      'inset 0 2px 4px rgba(0,0,0,0.2),' +
      '0 1px 1px rgba(255,255,255,0.1)',
  },
  /* new – top-centre game title */
  gameTitle: {
    color: t.text,
    fontSize: 28,
    fontWeight: 900,
    textAlign: 'center',
    margin: '8px 0 0 0',
    fontFamily: '"Nunito", sans-serif',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});
