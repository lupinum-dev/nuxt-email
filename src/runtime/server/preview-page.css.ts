export const PREVIEW_PAGE_CSS: string = `
    :root {
      color-scheme: light;
      --background: oklch(0.975 0 0);
      --surface: oklch(1 0 0);
      --surface-subtle: oklch(0.955 0.008 160);
      --ink: oklch(0.19 0.018 160);
      --muted: oklch(0.44 0.025 160);
      --line: oklch(0.885 0.012 160);
      --line-strong: oklch(0.76 0.025 160);
      --primary: oklch(0.4 0.087 160);
      --primary-hover: oklch(0.34 0.087 160);
      --primary-soft: oklch(0.93 0.035 160);
      --focus: oklch(0.56 0.17 255);
      --danger: oklch(0.49 0.17 28);
      --danger-soft: oklch(0.96 0.025 28);
      --radius: 10px;
      --toolbar-height: 64px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-synthesis: none;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      min-height: 100%;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--ink);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    button,
    select,
    a {
      font: inherit;
    }

    button,
    select {
      color: inherit;
    }

    button:focus-visible,
    select:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }

    button {
      border: 0;
    }

    .shell {
      display: grid;
      grid-template-rows: var(--toolbar-height) minmax(0, 1fr);
      min-height: 100vh;
    }

    .topbar {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 22px;
      background: var(--surface);
      border-bottom: 1px solid var(--line);
    }

    .mark {
      display: grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 8px;
      background: var(--primary);
      color: var(--surface);
      font-weight: 760;
      letter-spacing: -0.02em;
    }

    .product-name {
      margin: 0;
      font-size: 15px;
      font-weight: 720;
      letter-spacing: -0.015em;
    }

    .product-context {
      margin: -2px 0 0;
      color: var(--muted);
      font-size: 12px;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      margin-left: auto;
      color: var(--muted);
      font-size: 12px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      flex: none;
      border-radius: 50%;
      background: var(--primary);
    }

    .status[data-state="loading"] .status-dot {
      animation: breathe 1.2s ease-in-out infinite;
    }

    .status[data-state="error"] {
      color: var(--danger);
    }

    .status[data-state="error"] .status-dot {
      background: var(--danger);
    }

    @keyframes breathe {
      50% { opacity: 0.35; transform: scale(0.78); }
    }

    .workspace {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      min-height: 0;
    }

    .sidebar {
      display: flex;
      min-height: 0;
      flex-direction: column;
      gap: 24px;
      padding: 22px 18px;
      background: var(--surface-subtle);
      border-right: 1px solid var(--line);
    }

    .field-label,
    .section-label {
      display: block;
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }

    .template-select {
      width: 100%;
      height: 38px;
      padding: 0 34px 0 11px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--surface);
      font-weight: 590;
    }

    .template-select:hover:not(:disabled) {
      border-color: var(--primary);
    }

    .template-select:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .fixture-note {
      min-height: 36px;
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 12px;
      text-wrap: pretty;
    }

    .tabs {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tab {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      min-height: 38px;
      padding: 7px 10px;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background-color 160ms ease, color 160ms ease;
    }

    .tab:hover {
      background: oklch(1 0 0 / 0.72);
    }

    .tab[aria-selected="true"] {
      background: var(--primary-soft);
      color: var(--primary-hover);
      font-weight: 680;
    }

    .tab-key {
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10px;
    }

    .sidebar-note {
      margin: auto 0 0;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      text-wrap: pretty;
    }

    .main {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      padding: 18px;
      gap: 12px;
    }

    .viewer-toolbar {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      row-gap: 8px;
    }

    .viewer-title {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .viewer-actions {
      display: flex;
      flex: none;
      gap: 8px;
      margin-left: auto;
    }

    .preview-controls {
      display: flex;
      flex: none;
      align-items: center;
      gap: 8px;
    }

    .preview-controls[hidden] {
      display: none;
    }

    .viewport-toggle {
      display: inline-flex;
      padding: 2px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--surface);
    }

    .segment {
      min-height: 28px;
      padding: 3px 10px;
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      font-size: 12px;
      font-weight: 620;
      font-variant-numeric: tabular-nums;
      transition: background-color 160ms ease, color 160ms ease;
    }

    .segment:hover:not([aria-pressed="true"]) {
      color: var(--ink);
    }

    .segment[aria-pressed="true"] {
      background: var(--primary-soft);
      color: var(--primary-hover);
    }

    .meta-bar {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 12px;
    }

    .subject {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--ink);
      font-size: 13px;
    }

    .subject-label {
      flex: none;
      padding: 2px 7px;
      border-radius: 5px;
      background: var(--primary-soft);
      color: var(--primary-hover);
      font-size: 11px;
      font-weight: 650;
    }

    .subject-value {
      min-width: 0;
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subject[data-state="none"] .subject-label {
      background: var(--surface-subtle);
      color: var(--muted);
    }

    .subject[data-state="none"] .subject-value {
      color: var(--muted);
      font-weight: 500;
      font-style: italic;
    }

    .size-badge {
      display: inline-flex;
      flex: none;
      align-items: center;
      margin: 0 0 0 auto;
      padding: 3px 9px;
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .size-badge[data-level="warn"] {
      border-color: oklch(0.78 0.1 85);
      background: oklch(0.96 0.05 85);
      color: oklch(0.42 0.1 75);
    }

    .size-badge[data-level="over"] {
      border-color: oklch(0.75 0.09 28);
      background: var(--danger-soft);
      color: oklch(0.4 0.13 28);
    }

    .size-badge[hidden] {
      display: none;
    }

    .action {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      justify-content: center;
      padding: 6px 11px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      font-weight: 620;
      text-decoration: none;
      transition: border-color 160ms ease, background-color 160ms ease;
    }

    .action:hover:not(:disabled):not([aria-disabled="true"]) {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .action:active:not(:disabled):not([aria-disabled="true"]) {
      background: oklch(0.9 0.04 160);
    }

    .action:disabled,
    .action[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.52;
    }

    .viewer {
      position: relative;
      display: flex;
      justify-content: center;
      min-width: 0;
      min-height: 460px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-subtle);
    }

    .panel {
      width: 100%;
      height: 100%;
      min-height: inherit;
      border: 0;
    }

    .panel[hidden] {
      display: none;
    }

    iframe.panel {
      display: block;
      background: var(--surface);
    }

    iframe.panel[data-width="600"] {
      width: 600px;
      max-width: 100%;
      border-inline: 1px solid var(--line);
    }

    iframe.panel[data-width="375"] {
      width: 375px;
      max-width: 100%;
      border-inline: 1px solid var(--line);
    }

    iframe.panel[data-width="full"] {
      width: 100%;
    }

    pre.panel {
      margin: 0;
      overflow: auto;
      padding: 22px;
      background: var(--surface);
      color: oklch(0.26 0.03 160);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.65;
      tab-size: 2;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      padding: 28px;
      color: var(--muted);
      text-align: center;
    }

    .empty[hidden] {
      display: none;
    }

    .empty strong {
      display: block;
      margin-bottom: 4px;
      color: var(--ink);
      font-size: 14px;
    }

    .error {
      position: absolute;
      inset: 16px;
      z-index: 1;
      margin: 0;
      overflow: auto;
      padding: 16px;
      border: 1px solid oklch(0.75 0.09 28);
      border-radius: 9px;
      background: var(--danger-soft);
      color: oklch(0.34 0.12 28);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .error[hidden] {
      display: none;
    }

    @media (max-width: 760px) {
      .shell {
        display: block;
      }

      .topbar {
        min-height: var(--toolbar-height);
      }

      .workspace {
        display: block;
      }

      .sidebar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .tabs {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .tab {
        width: auto;
      }

      .tab-key,
      .sidebar-note {
        display: none;
      }

      .main {
        min-height: 640px;
        padding: 14px;
      }
    }

    @media (max-width: 500px) {
      .topbar {
        padding: 0 14px;
      }

      .product-context {
        display: none;
      }

      .status {
        max-width: 42%;
      }

      .sidebar {
        display: flex;
        gap: 14px;
        padding: 16px 14px;
      }

      .viewer-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .viewer-actions {
        width: 100%;
        margin-left: 0;
      }

      .action {
        flex: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
`
