import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/apropos-theme.css';

const THEME_BOOTSTRAP = `(function(){try{var saved=localStorage.getItem('ai4-theme');document.documentElement.dataset.theme=saved==='light'?'light':'black';}catch(e){document.documentElement.dataset.theme='black';}})();`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#01050D" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
