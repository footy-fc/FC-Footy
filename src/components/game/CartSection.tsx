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
    <div className="bg-gray-800/70 rounded-lg shadow-lg p-4 border border-gray-700 mt-2">
      <h3 className="text-xl font-bold text-notWhite mb-3 flex justify-between items-center">
        <span>Your Cart</span>
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
                  className="bg-blue-500 text-white p-2 rounded flex items-center justify-between"
                >
                  <span>{squareIndex}</span>
                  <button 
                    onClick={() => removeFromCart(squareIndex)}
                    className="text-white hover:text-red-200"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="text-notWhite">Total:</span>
              <span className="text-limeGreenOpacity font-bold">
                {formatEther(totalPrice)} ETH
              </span>
            </div>
            {usdTotal !== null && (
              <div className="flex justify-end text-xs text-gray-400 mt-1">
                ≈ ${usdTotal.toFixed(2)} USD
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={clearCart}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBuyTickets}
              disabled={isBuying}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                isBuying
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-deepPink text-white hover:bg-fontRed'
              }`}
            >
              {isBuying ? 'Buying...' : 'Buy Squares'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center text-lightPurple py-4">
          <p>Your cart is empty</p>
          <p className="text-sm mt-2">
            🎟️ Pick your squares by tapping any open spot. Each square maps to a final score in the match. Once all 25 are claimed, the board shuffles and locks in — may the goals land in your favor!
          </p>
        </div>
      )}
    </div>
  );
};

export default CartSection; 