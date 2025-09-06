// frontend/src/icons/exerciseIcons.jsx
import React from "react";

/*
  Simple, consistent flat SVG icons for home exercises.
  Keys match EXERCISE_SLUGS slugs used in App.jsx.
  They are intentionally schematic (friendly, minimal).
*/

const IconWrapper = ({ children, width = 84, height = 64, style }) => (
  <svg width={width} height={height} viewBox="0 0 84 64" xmlns="http://www.w3.org/2000/svg" style={style} aria-hidden>
    <rect width="84" height="64" rx="8" fill="#061725" />
    <g transform="translate(10,8)" fill="none" stroke="#9be7ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  </svg>
);

export const exerciseIcons = {
  "squats": (props) => (
    <IconWrapper {...props}>
      <circle cx="10" cy="10" r="4" fill="#9be7ff" stroke="none" />
      <path d="M5 20 C10 14, 18 14, 22 20" />
      <path d="M10 14 L10 24" />
      <path d="M20 14 L20 24" />
    </IconWrapper>
  ),

  "push-ups": (props) => (
    <IconWrapper {...props}>
      <circle cx="12" cy="8" r="3.5" fill="#9be7ff" stroke="none" />
      <path d="M4 18 H28" />
      <path d="M6 18 L8 12" />
      <path d="M26 18 L24 12" />
    </IconWrapper>
  ),

  "jumping-jacks": (props) => (
    <IconWrapper {...props}>
      <circle cx="12" cy="8" r="3" fill="#9be7ff" />
      <path d="M12 11 L12 24" />
      <path d="M6 18 L18 18" />
      <path d="M4 14 L8 20" />
      <path d="M20 14 L16 20" />
    </IconWrapper>
  ),

  "plank": (props) => (
    <IconWrapper {...props}>
      <rect x="2" y="18" width="28" height="6" rx="2" fill="#123b46" />
      <circle cx="8" cy="12" r="3.5" fill="#9be7ff" />
      <path d="M8 15 L8 18" stroke="#9be7ff" />
    </IconWrapper>
  ),

  "high-knees": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="9" r="3" fill="#9be7ff" />
      <path d="M8 12 L8 22" />
      <path d="M8 22 L4 26" />
      <path d="M16 14 L16 22" />
      <path d="M16 22 L20 26" />
    </IconWrapper>
  ),

  "mountain-climbers": (props) => (
    <IconWrapper {...props}>
      <circle cx="7" cy="9" r="3" fill="#9be7ff" />
      <path d="M4 20 L26 16 L18 26" />
      <path d="M12 16 L10 24" />
    </IconWrapper>
  ),

  "lunges": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="10" r="3" fill="#9be7ff" />
      <path d="M8 14 L8 24" />
      <path d="M8 24 L14 24" />
      <path d="M18 18 L18 26" />
    </IconWrapper>
  ),

  "arm-circles": (props) => (
    <IconWrapper {...props}>
      <circle cx="10" cy="10" r="3.5" fill="#9be7ff" />
      <path d="M2 10 A8 8 0 0 1 22 10" stroke="#7c3aed" />
    </IconWrapper>
  ),

  "hamstring-stretch": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="10" r="3" fill="#9be7ff" />
      <path d="M8 13 L18 22" />
      <path d="M18 22 L22 22" />
    </IconWrapper>
  ),

  "worlds-greatest-stretch": (props) => (
    <IconWrapper {...props}>
      <circle cx="10" cy="9" r="3.5" fill="#9be7ff" />
      <path d="M10 13 L18 18" />
      <path d="M6 20 L18 20" />
    </IconWrapper>
  ),

  // Extra moves (regular/intense/hardcore)
  "burpees": (props) => (
    <IconWrapper {...props}>
      <circle cx="7" cy="8" r="3" fill="#9be7ff" />
      <path d="M4 20 L10 14 L20 14" />
      <path d="M12 14 L12 24" />
    </IconWrapper>
  ),

  "glute-bridge": (props) => (
    <IconWrapper {...props}>
      <circle cx="10" cy="12" r="3" fill="#9be7ff" />
      <path d="M4 22 L20 22" />
      <path d="M10 15 L10 22" />
    </IconWrapper>
  ),

  "bicycle-crunches": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="8" r="3" fill="#9be7ff" />
      <path d="M6 18 L20 10" />
      <path d="M14 18 L8 10" />
    </IconWrapper>
  ),

  "tricep-dips": (props) => (
    <IconWrapper {...props}>
      <circle cx="7" cy="9" r="3" fill="#9be7ff" />
      <rect x="4" y="18" width="14" height="4" rx="2" fill="#123b46" />
      <path d="M8 12 L8 18" />
    </IconWrapper>
  ),

  "wall-sit": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="8" r="3" fill="#9be7ff" />
      <path d="M8 12 L8 22" />
      <rect x="16" y="12" width="4" height="12" rx="1" fill="#123b46" />
    </IconWrapper>
  ),

  "side-plank": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="8" r="3" fill="#9be7ff" />
      <path d="M4 20 L20 12" />
      <path d="M6 20 L6 24" />
    </IconWrapper>
  ),

  "superman-hold": (props) => (
    <IconWrapper {...props}>
      <circle cx="12" cy="8" r="3" fill="#9be7ff" />
      <path d="M6 18 L18 18" />
      <path d="M6 18 L4 24" />
      <path d="M18 18 L20 24" />
    </IconWrapper>
  ),

  "calf-raises": (props) => (
    <IconWrapper {...props}>
      <circle cx="8" cy="9" r="3" fill="#9be7ff" />
      <path d="M8 14 L8 22" />
      <path d="M6 22 L10 22" />
    </IconWrapper>
  )
};

// Export default mapping
export default exerciseIcons;
