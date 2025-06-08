
import React from "react";

interface Props {
  canLaunch: boolean;
  emulatorFound: boolean;
  romFound: boolean;
  editEnabled: boolean;
  onLaunch: () => void;
  onEdit: () => void;
}

const ledStyle = (active: boolean): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  margin: '0 3px',
  background: active ? '#29ff9a' : '#ff5555',
  boxShadow: active
    ? '0 0 6px rgba(41,255,154,0.8)'
    : '0 0 6px rgba(255,85,85,0.8)',
});

const CommandDock: React.FC<Props> = ({
  canLaunch,
  emulatorFound,
  romFound,
  editEnabled,
  onLaunch,
  onEdit,
}) => (
    <div
    data-ui="true"
    style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '16px 24px',
      background: '#1e1e24',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 -4px 12px rgba(0,0,0,.4)',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      zIndex: 2000,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button
        style={{
          padding: '12px 32px',
          fontSize: 18,
          borderRadius: 8,
          background: canLaunch ? '#ffbe32' : '#444',
          border: 'none',
          fontWeight: 600,
          color: '#000',
          cursor: canLaunch ? 'pointer' : 'not-allowed',
        }}
        disabled={!canLaunch}
        onClick={onLaunch}
      >
        Launch
      </button>

      {/* LEDs ----------------------------------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={ledStyle(emulatorFound)} title="Emulator status" />
        <div style={ledStyle(romFound)} title="ROM status" />
      </div>
    </div>


    <button
      style={{
    
        background: '#1e1e24',
        color: '#fff',
        border: '1px solid #333',
        fontWeight: 600,
        cursor: editEnabled ? 'pointer' : 'not-allowed',
        boxShadow: '0 4px 14px rgba(0,0,0,.5)',
        opacity: editEnabled ? 1 : 0.4,
      }}
      disabled={!editEnabled}
      onClick={onEdit}
    >
      Edit
    </button>
  </div>
);

export default CommandDock;
