import { CSSProperties } from 'react';

type StyleMap = { [k: string]: CSSProperties };

export const styles: StyleMap = {
  container: {
    minHeight: '100vh',
    overflowY: 'hidden',
    maxWidth : '100vw',      
    overflowX: 'hidden',
    background: '#222222',
    fontFamily: 'Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 100, // space for bottom dock
  },
  header: {
    position: 'relative',
    padding: '12px 24px 32px 24px',
    background: '#1e1e24',
    color: '#fff',
  },
    dateTime: {
    position: 'absolute',
    top: 12,
    right: 24,
    fontSize: 14,
    color: '#fff',
  },
  titleWrap: {
    textAlign: 'center',
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
    color: '#ccc',
    marginTop: 4,
  },
  form: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  input: {
    background: '#1e1e24',
    color: '#fff',
    padding: 12,
    borderRadius: 10,
    minWidth: 180,
    border: 'none',
    outline: 'none',
  },
  /* new – top-centre game title */
    gameTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 600,
    textAlign: 'center',
    margin: '8px 0 0 0',
  },
};
