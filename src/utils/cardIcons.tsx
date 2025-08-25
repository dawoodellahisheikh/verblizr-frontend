// src/utils/cardIcons.tsx
import * as React from 'react';
import Svg, {Path, Rect, Circle, G} from 'react-native-svg';

type IconProps = { width?: number; height?: number; style?: any };

// ---- VISA ----
export const VisaIcon: React.FC<IconProps> = ({width = 36, height = 24, style}) => (
  <Svg width={width} height={height} viewBox="0 0 36 24" style={style}>
    <Rect x="0" y="0" width="36" height="24" rx="4" fill="#1A1F71" />
    {/* super-simplified VISA wordmark */}
    <Path
      d="M6.5 15.5l1.3-7h2.2l-1.3 7H6.5zm6.6 0l.9-5.1h2.1l-.9 5.1h-2.1zm-1.1-7h2.1l-.3 1.7h-2.1l.3-1.7zm9.5 7c-.6 0-1.1-.1-1.5-.3-.4-.2-.7-.6-.8-1.1-.1-.5-.1-1 .1-1.4.2-.5.6-.9 1.2-1.2.6-.3 1.5-.5 2.7-.5h1.1l.1-.5c.1-.3 0-.5-.1-.7-.2-.2-.6-.3-1.2-.3-.7 0-1.4.1-2.1.3l.3-1.7c.8-.2 1.6-.3 2.4-.3 1.2 0 2.1.2 2.7.7.6.4.8 1.1.7 1.9l-.6 3.4h-2.1l.1-.6h-.1c-.6.5-1.4.8-2.3.8zm.8-1.7c.4 0 .8-.1 1.2-.3.4-.2.7-.5.8-.9h-1c-.7 0-1.1.1-1.4.3-.3.2-.4.4-.4.7 0 .1 0 .2.1.3.1.1.3.2.7.2z"
      fill="#fff"
      opacity="0.95"
    />
  </Svg>
);

// ---- MASTERCARD ----
export const MasterCardIcon: React.FC<IconProps> = ({width = 36, height = 24, style}) => (
  <Svg width={width} height={height} viewBox="0 0 36 24" style={style}>
    <Rect x="0" y="0" width="36" height="24" rx="4" fill="#000" />
    <G transform="translate(8,4)">
      <Circle cx="8" cy="8" r="6.8" fill="#EB001B" />
      <Circle cx="12" cy="8" r="6.8" fill="#F79E1B" />
      <Path d="M10 1.2a6.8 6.8 0 0 1 0 13.6a6.8 6.8 0 0 1 0-13.6z" fill="#FF5F00" />
    </G>
  </Svg>
);

// ---- AMERICAN EXPRESS (simplified) ----
export const AmexIcon: React.FC<IconProps> = ({width = 36, height = 24, style}) => (
  <Svg width={width} height={height} viewBox="0 0 36 24" style={style}>
    <Rect x="0" y="0" width="36" height="24" rx="4" fill="#2E77BB" />
    <Path
      d="M7 16l2.1-8h3.2l2 8h-2.2l-.3-1.4H9.5L9.2 16H7zm3.1-3h1.9l-.6-2.8h-.7L10.1 13zM16 8h6.6l-.4 1.8H18l-.2 1.2h3.6l-.3 1.7H17l-.2 1.2h4.2L20.4 16H14l2-8zM24 8h5.2c1.5 0 2.4.8 2.1 2l-.2 1c-.2.9-.8 1.5-1.7 1.6v.1c.7.2 1 .7.8 1.5L30 16h-2.3l.3-1.5c.1-.6-.2-.9-.9-.9h-2l-.5 2.4H22l2-8zm3.9 3.1c.6 0 1-.3 1.1-.8l.1-.6c.1-.5-.2-.8-.8-.8h-2l-.5 2.2H27.9z"
      fill="#fff"
      opacity="0.95"
    />
  </Svg>
);

// ---- DEFAULT / UNKNOWN ----
export const DefaultCardIcon: React.FC<IconProps> = ({width = 36, height = 24, style}) => (
  <Svg width={width} height={height} viewBox="0 0 36 24" style={style}>
    <Rect x="0" y="0" width="36" height="24" rx="4" fill="#111827" />
    <Rect x="4" y="7" width="28" height="3" rx="1.5" fill="#6B7280" />
    <Rect x="6" y="13" width="12" height="3" rx="1.5" fill="#9CA3AF" />
  </Svg>
);

// ---- Mapper ----
/** Normalizes a brand string like "Visa", "master_card", "AMEX" → "visa" | "mastercard" | "amex" */
const normalizeBrand = (brand: string) =>
  brand?.toLowerCase().replace(/[\s_-]+/g, '');

export function getCardIcon(brand?: string): React.FC<IconProps> {
  switch (normalizeBrand(brand || '')) {
    case 'visa':
      return VisaIcon;
    case 'mastercard':
      return MasterCardIcon;
    case 'amex':
    case 'americanexpress':
      return AmexIcon;
    default:
      return DefaultCardIcon;
  }
}