import useAsset from "ultra/hooks/use-asset.js";
import { ErrorBoundary } from "https://esm.sh/*react-error-boundary@4.0.11";
// Twind
import { TwindStyleTag, tw } from "@/twind/twind.tsx";
import { ImportMapScript } from "ultra/lib/react/client.js";
import { queryClient } from "@/react-query/query-client.ts";

import { dehydrate } from "@tanstack/react-query";
import Layout from "./pages/Layout.tsx";
import { Routing } from "./routing.tsx";
import { Suspense } from "react";

const logError = (error: Error, info: { componentStack: string }) => {
  console.log(error, info);
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Ultra</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="shortcut icon" href={useAsset("/favicon.ico")} />
        <link rel="stylesheet" href={useAsset("/style.css")} />
        <ImportMapScript />
        <script
          dangerouslySetInnerHTML={{
            __html: "window.__REACT_QUERY_DEHYDRATED_STATE = " +
            JSON.stringify(dehydrate(queryClient))
          }}
        ></script>
      </head>
      <body>
        <ErrorBoundary
          fallback={<div>Something went wrong</div>}
          onError={logError}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <Layout>
              <Routing />
            </Layout>
          </Suspense>
        </ErrorBoundary>
        <TwindStyleTag />
      </body>
    </html>
  );
};
