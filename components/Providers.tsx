"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CompareProvider } from "@/context/CompareContext";
import { SearchProvider } from "@/context/SearchContext";
import { SkinProfileProvider } from "@/context/SkinProfileContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <SearchProvider>
              <SkinProfileProvider>
                <LoyaltyProvider>
                  {children}
                </LoyaltyProvider>
              </SkinProfileProvider>
            </SearchProvider>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
