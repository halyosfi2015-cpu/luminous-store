"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CompareProvider } from "@/context/CompareContext";
import { SearchProvider } from "@/context/SearchContext";
import { SkinProfileProvider } from "@/context/SkinProfileContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";
import { ConsentProvider } from "@/src/lib/analytics/ConsentProvider";
import ConsentBanner from "@/components/analytics/ConsentBanner";
import PageViewTracker from "@/components/analytics/PageViewTracker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <SearchProvider>
              <SkinProfileProvider>
                <LoyaltyProvider>
                  <ConsentProvider>
                    <Suspense fallback={null}>
                      <PageViewTracker />
                    </Suspense>
                    {children}
                    <ConsentBanner />
                  </ConsentProvider>
                </LoyaltyProvider>
              </SkinProfileProvider>
            </SearchProvider>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
