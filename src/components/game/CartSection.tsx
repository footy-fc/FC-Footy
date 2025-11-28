import React, { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { fetchNativeTokenPrice } from '~/utils/fetchUsdPrice';

interface CartSectionProps {
  cart: number[];
  squarePrice: bigint;
  handleBuyTickets: () => Promise<void>;
  isBuying: boolean;
  removeFromCart: (index: number) => void;  // ✅ Ensure this is in the props
  clearCart: () => void;  // ✅ Ensure this is in the props
}


const CartSection: React.FC<CartSectionProps> = ({
  cart = [],  // ✅ Ensure cart is always an array
  squarePrice,
  handleBuyTickets,
  isBuying,
  removeFromCart,
  clearCart
}) => {
  // Calculate total price safely
  const totalPrice = squarePrice * BigInt(cart.length || 0);  // ✅ Ensure length check

  const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const price = await fetchNativeTokenPrice('base');
        if (!cancelled) setEthUsdPrice(price);
      } catch {
        // ignore pricing failures for affordance
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const totalEth = parseFloat(formatEther(totalPrice || 0n) || '0');
  const usdTotal = ethUsdPrice ? totalEth * ethUsdPrice : null;

  return (
    <div className="bg-midnight/85 rounded-2xl shadow-[0_16px_34px_rgba(0,0,0,0.45)] p-4 border border-brightPink/35 mt-3">
      <h3 className="text-xl font-bold text-white mb-3 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-8 bg-brightPink rounded-full" />
          Your Cart
        </span>
        <span className="text-sm font-normal text-lightPurple">
          {cart.length} {cart.length === 1 ? 'square' : 'squares'}
        </span>
      </h3>
      
      {cart.length > 0 ? (
        <>
          <div className="max-h-40 overflow-y-auto mb-4">
            <div className="grid grid-cols-4 gap-2">
              {cart.map((squareIndex) => (
                <div
                  key={squareIndex}
                  className="bg-brightPink/20 text-white p-2 rounded-lg flex items-center justify-between border border-brightPink/35"
                >
                  <span className="font-semibold">{squareIndex}</span>
                  <button
                    onClick={() => removeFromCart(squareIndex)}
                    className="text-white hover:text-deepPink"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lightPurple uppercase text-xs tracking-wide">Total</span>
              <span className="text-white font-bold text-lg">
                {formatEther(totalPrice)} ETH
              </span>
            </div>
            {usdTotal !== null && (
              <div className="flex justify-end text-xs text-gray-300 mt-1">
                ≈ ${usdTotal.toFixed(2)} USD
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={clearCart}
              className="flex-1 bg-slateViolet text-white py-2 px-4 rounded-full border border-brightPink/35 hover:border-brightPink transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBuyTickets}
              disabled={isBuying}
              className={`flex-1 py-2 px-4 rounded-full transition-colors ${
                isBuying
                  ? 'bg-gray-500 text-gray-200 cursor-not-allowed'
                  : 'bg-brightPink text-white shadow-[0_8px_20px_rgba(231,46,119,0.3)] hover:bg-deepPink'
              }`}
            >
              {isBuying ? 'Buying...' : 'Buy Squares'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center text-lightPurple py-4">
          <p className="font-semibold text-white">Your cart is empty</p>
          <p className="text-sm mt-2">
            🎟️ Pick your squares by tapping any open spot. Each square maps to a final score in the match. Once all 25 are claimed, the board shuffles and locks in — may the goals land in your favor!
          </p>
        </div>
      )}
    </div>
  );
};

export default CartSection; 