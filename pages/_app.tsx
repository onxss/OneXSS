import type { AppProps } from 'next/app'
import { ConfigProvider, theme } from 'antd';
import React from 'react';
import { Database } from '@cloudflare/d1';
import { KVNamespace } from '@cloudflare/workers-types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB: Database;
      JSKV: KVNamespace;
    }
  }
}
export interface Env {
  DB: Database;
  JSKV: KVNamespace;
}

export default function App({ Component, pageProps }: AppProps) {
  return <><ConfigProvider theme={{algorithm: theme.defaultAlgorithm,}} ><Component {...pageProps} /></ConfigProvider></>
}

