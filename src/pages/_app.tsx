import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { trpc } from '../utils/trpc';

import { SearchProvider } from '../contexts/SearchContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <SearchProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </SearchProvider>
    </ThemeProvider>
  );
}

export default trpc.withTRPC(MyApp);