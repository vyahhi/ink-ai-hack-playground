// Palette menu overlay component
//
// Displays palette options when a rectangle+X gesture is detected.
// Follows the same pattern as DisambiguationMenu.

import React, { useCallback, useEffect, useRef } from 'react';
import type { PaletteIntent, PaletteAction } from './PaletteIntent';
import type { Offset } from '../types';

export interface PaletteMenuProps {
  intent: PaletteIntent | null;
  onAction: (action: PaletteAction, entryId?: string) => void;
  canvasToScreen: (point: Offset) => Offset;
}

const MENU_OFFSET_Y = -60;

export function PaletteMenu({
  intent,
  onAction,
  canvasToScreen,
}: PaletteMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!intent) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onAction('dismiss');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onAction('dismiss');
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [intent, onAction]);

  const handleSelectEntry = useCallback((e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    onAction('select', entryId);
  }, [onAction]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction('dismiss');
  }, [onAction]);

  if (!intent || intent.entries.length === 0) {
    return null;
  }

  const anchorScreen = canvasToScreen(intent.anchorPoint);
  const menuX = anchorScreen.x;
  const menuY = anchorScreen.y + MENU_OFFSET_Y;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: menuX,
        top: menuY,
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            color: '#666',
            borderBottom: '1px solid #e0e0e0',
            width: '100%',
            textAlign: 'center',
            backgroundColor: '#f8f8f8',
          }}
        >
          Create element...
        </div>

        {/* Entry buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {intent.entries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index > 0 && (
                <div style={{ width: '1px', backgroundColor: '#e0e0e0' }} />
              )}
              <button
                onClick={(e) => handleSelectEntry(e, entry.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#333',
                  gap: '4px',
                  transition: 'background-color 0.15s',
                  minWidth: '56px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={entry.label}
              >
                <PaletteIcon icon={entry.icon} />
                <span style={{ fontSize: '10px' }}>{entry.label}</span>
              </button>
            </React.Fragment>
          ))}
          {/* Dismiss button */}
          <div style={{ width: '1px', backgroundColor: '#e0e0e0' }} />
          <button
            onClick={handleDismiss}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#999',
              gap: '4px',
              transition: 'background-color 0.15s',
              minWidth: '48px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Cancel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span style={{ fontSize: '10px' }}>Cancel</span>
          </button>
        </div>
      </div>

      {/* Tooltip arrow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '-8px',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white',
          filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1))',
        }}
      />
    </div>
  );
}

function PaletteIcon({ icon }: { icon: string }) {
  const size = 20;
  const strokeWidth = 1.5;
  const color = 'currentColor';

  switch (icon) {
    case 'camera':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case 'gallery':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case 'aiSketch':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'minesweeper':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="3" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="3" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="21" y2="12" />
          <line x1="5.6" y1="5.6" x2="8.5" y2="8.5" />
          <line x1="15.5" y1="15.5" x2="18.4" y2="18.4" />
          <line x1="5.6" y1="18.4" x2="8.5" y2="15.5" />
          <line x1="15.5" y1="8.5" x2="18.4" y2="5.6" />
        </svg>
      );
    case 'bridges':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <circle cx="5" cy="5" r="3" />
          <circle cx="19" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <line x1="8" y1="5" x2="16" y2="5" />
          <line x1="5" y1="8" x2="5" y2="16" />
          <line x1="19" y1="8" x2="19" y2="16" />
        </svg>
      );
    case 'sudoku':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <rect x="2" y="2" width="20" height="20" rx="1" />
          <line x1="2" y1="8.7" x2="22" y2="8.7" />
          <line x1="2" y1="15.3" x2="22" y2="15.3" />
          <line x1="8.7" y1="2" x2="8.7" y2="22" />
          <line x1="15.3" y1="2" x2="15.3" y2="22" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
}

export default PaletteMenu;
