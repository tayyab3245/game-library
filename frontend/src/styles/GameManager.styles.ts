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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#1e1e24',
    color: '#fff',
  },
  middle: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
  },
  dateTime: {
    fontSize: 14,
    color: '#fff',
  },
  hours: {
    fontSize: 14,
    color: '#fff',
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
    hoursText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: 400,
    textAlign: 'center',
    margin: '4px 0 0 0',
  },
};
