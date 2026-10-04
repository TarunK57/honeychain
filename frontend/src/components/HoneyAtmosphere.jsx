import React from 'react';

const HoneyAtmosphere = ({ variant = 'public' }) => (
  <div className={`honey-atmosphere honey-atmosphere--${variant}`} aria-hidden="true">
    <svg className="honey-atmosphere-art" viewBox="0 0 900 760" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="honey-flow" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--art-honey-light)" />
          <stop offset="1" stopColor="var(--art-honey)" />
        </linearGradient>
        <linearGradient id="glass-wash" x1=".2" y1="0" x2=".8" y2="1">
          <stop stopColor="white" stopOpacity=".86" />
          <stop offset="1" stopColor="var(--art-glass)" stopOpacity=".48" />
        </linearGradient>
        <clipPath id="jar-clip">
          <path d="M585 226h177c23 0 42 19 42 42v300c0 38-25 63-63 63H606c-38 0-63-25-63-63V268c0-23 19-42 42-42Z" />
        </clipPath>
      </defs>

      <g className="atmosphere-comb" stroke="var(--art-honey)" strokeWidth="2">
        <path d="m149 214 27-16 27 16v31l-27 16-27-16v-31Zm54 93 27-16 27 16v31l-27 16-27-16v-31Zm-108 0 27-16 27 16v31l-27 16-27-16v-31Z" />
        <path d="m760 92 22-13 22 13v25l-22 13-22-13V92Zm44 76 22-13 22 13v25l-22 13-22-13v-25Z" />
      </g>

      <g className="atmosphere-jar">
        <path d="M624 133h100v45c0 18 21 33 42 52l38 41v297c0 43-29 72-72 72H614c-43 0-72-29-72-72V271l38-41c21-19 44-34 44-52v-45Z" fill="url(#glass-wash)" stroke="var(--art-glass-line)" strokeWidth="5" />
        <path d="M612 127h124c8 0 15 7 15 15v20H597v-20c0-8 7-15 15-15Z" fill="var(--art-cap)" stroke="var(--art-glass-line)" strokeWidth="4" />
        <rect x="608" y="180" width="132" height="25" rx="8" fill="var(--art-cap-light)" opacity=".9" />
        <g clipPath="url(#jar-clip)">
          <path className="honey-liquid-wave" d="M535 418c48-34 90 21 136 0 53-23 84 28 137-2v230H535V418Z" fill="url(#honey-flow)" />
          <path className="honey-liquid-highlight" d="M545 438c50-26 80 20 127 0 45-19 81 19 130-2" stroke="var(--art-honey-light)" strokeWidth="7" strokeLinecap="round" />
        </g>
        <path d="M592 280v206" stroke="white" strokeOpacity=".8" strokeWidth="11" strokeLinecap="round" />
        <path d="M778 302v260" stroke="white" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" />
        <rect x="601" y="350" width="145" height="94" rx="18" fill="var(--art-label)" fillOpacity=".94" stroke="var(--art-glass-line)" strokeWidth="2" />
        <path d="m665 371 13-8 13 8v15l-13 8-13-8v-15Z" fill="var(--art-honey)" />
        <path d="M635 410h78" stroke="var(--art-ink)" strokeOpacity=".58" strokeWidth="6" strokeLinecap="round" />
        <path d="M647 425h54" stroke="var(--art-ink)" strokeOpacity=".28" strokeWidth="4" strokeLinecap="round" />
      </g>

      <path className="honey-stream" d="M730 153c0 52 19 58 36 82 19 27-4 45 8 69 7 15 18 20 16 42" stroke="url(#honey-flow)" strokeWidth="19" strokeLinecap="round" />
      <ellipse className="honey-drop" cx="791" cy="363" rx="10" ry="15" fill="var(--art-honey)" />

      <g className="honey-bee" transform="translate(0 0)">
        <ellipse cx="360" cy="194" rx="21" ry="11" fill="var(--art-honey-light)" opacity=".66" transform="rotate(-32 360 194)" />
        <ellipse cx="359" cy="211" rx="22" ry="11" fill="var(--art-honey-light)" opacity=".66" transform="rotate(27 359 211)" />
        <ellipse cx="378" cy="205" rx="24" ry="15" fill="var(--art-honey)" />
        <path d="M373 192v26m11-25v26" stroke="var(--art-ink)" strokeWidth="5" />
        <circle cx="400" cy="203" r="12" fill="var(--art-ink)" />
        <path d="m402 190 8-8m-2 12 10-4" stroke="var(--art-ink)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="404" cy="200" r="2" fill="white" />
      </g>
      <path d="M324 226c-33 25-39 59-17 78 22 19 57 4 74-17" stroke="var(--art-honey)" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" opacity=".75" />
    </svg>
  </div>
);

export default HoneyAtmosphere;
