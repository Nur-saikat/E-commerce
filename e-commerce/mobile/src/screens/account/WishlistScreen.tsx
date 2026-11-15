import React from 'react';
import { View } from 'react-native';
import { RequireAuth } from '../../components/RequireAuth';
import { ProductGrid } from '../../components/ProductCard';
import { Button, Page, PageHeader, Spinner } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useWishlist } from '../../state/WishlistContext';
import { spacing } from '../../theme';

export function WishlistScreen() {
  useDocumentTitle('Wishlist');
  return (
    <RequireAuth title="Sign in to view your wishlist" message="Save pieces you love and find them here on any device.">
      <WishlistContent />
    </RequireAuth>
  );
}

function WishlistContent() {
  const router = useRouter();
  const wishlist = useWishlist();
  const cart = useCart();
  const { toast } = useFeedback();
  const products = wishlist.items.map(item => item.product).filter((product): product is NonNullable<typeof product> => Boolean(product));

  const addToCart = async (productId: string) => {
    try {
      await cart.add(productId, 1);
      toast('Added to your bag.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to add this item.', 'error');
    }
  };

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Wishlist"
        subtitle="Saved pieces, ready when you are."
        actions={<Button label="Continue shopping" variant="outline" onPress={() => router.navigate('shop')} />}
      />
      {wishlist.loading && !wishlist.items.length ? (
        <Spinner label="Loading your saved pieces…" />
      ) : (
        <View style={{ gap: spacing.md }}>
          <ProductGrid
            products={products}
            wishedIds={wishlist.ids}
            onToggleWishlist={async product => {
              try {
                await wishlist.toggle(product.id);
                toast('Removed from your wishlist.', 'success');
              } catch (error: any) {
                toast(error?.message ?? 'Unable to update your wishlist.', 'error');
              }
            }}
            onAdd={product => addToCart(product.id)}
            emptyTitle="Your wishlist is empty"
            emptyMessage="Tap the heart on any product to save it for later."
          />
          {!products.length ? (
            <Button label="Explore the collection" onPress={() => router.navigate('shop')} style={{ alignSelf: 'center' }} />
          ) : null}
        </View>
      )}
    </Page>
  );
}
