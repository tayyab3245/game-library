import { CSSProperties } from 'react';

type StyleMap = { [k: string]: CSSProperties };

export const styles: StyleMap = {
  container: {
    minHeight: '100vh',
    maxWidth : '100vw',      // prevent rogue horizontal scroll
    background: '#f2f2f2',
    fontFamily: 'Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 500,
    paddingLeft: 24,
    marginTop: 20,
    marginBottom: 12,
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
  controlRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
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
  divider: {
    height: 1,
    width: '90%',
    background: '#2a2d33',
    alignSelf: 'center',
    marginBottom: 18,
  },
};
