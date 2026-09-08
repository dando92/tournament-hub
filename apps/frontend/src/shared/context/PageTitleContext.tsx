import { createContext, useContext, useState } from "react";

type PageTitleContextType = {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
};

const PageTitleContext = createContext<PageTitleContextType>({
  pageTitle: null,
  setPageTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext);
}
