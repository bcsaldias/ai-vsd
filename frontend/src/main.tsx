import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/barlow-condensed/600.css';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// The app is loaded after the lesson content files are read and checked, so a mistake in one of
// them (see content/README.md) shows on the page, naming the file and field, instead of a blank page.
import('./App')
  .then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) =>
    root.render(
      <main className="content-error" role="alert">
        <h1>A lesson file needs fixing</h1>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
        <p>Fix it in the file named above (see content/README.md), save, and reload this page.</p>
      </main>,
    ),
  );
