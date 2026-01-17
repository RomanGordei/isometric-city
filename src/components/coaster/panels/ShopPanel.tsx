import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { CoasterBuildingType } from '@/games/coaster/types';
import { T, useGT } from 'gt-next';

type ShopEntry = {
  id: string;
  name: string;
  type: CoasterBuildingType;
  price: number;
  position: {
    x: number;
    y: number;
  };
};

interface ShopPanelProps {
  shops: ShopEntry[];
  onClose: () => void;
  onPriceChange: (position: { x: number; y: number }, price: number) => void;
}

const PRICE_RANGE = [0, 20];

export default function ShopPanel({ shops, onClose, onPriceChange }: ShopPanelProps) {
  const gt = useGT();
  return (
    <div className="absolute top-20 right-6 z-50 w-96">
      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <T><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Shop Ops</div></T>
            <T><h2 className="text-lg font-semibold">Stall Pricing</h2></T>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><T>Close</T></Button>
        </div>

        <ScrollArea className="h-64 pr-3">
          {shops.length === 0 && (
            <T>
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                No shops built yet. Place a stall to set its pricing.
              </div>
            </T>
          )}
          <div className="space-y-4">
            {shops.map((shop) => (
              <div key={shop.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{shop.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {gt('{shopType} · ({x}, {y})', { shopType: shop.type.replaceAll('_', ' '), x: shop.position.x, y: shop.position.y })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">${shop.price}</div>
                </div>
                <div className="mt-3 space-y-2">
                  <Slider
                    min={PRICE_RANGE[0]}
                    max={PRICE_RANGE[1]}
                    step={1}
                    value={[shop.price]}
                    onValueChange={(value) => onPriceChange(shop.position, value[0] ?? shop.price)}
                  />
                  <div className="text-xs text-muted-foreground">
                    {gt('Adjust pricing between ${minPrice} and ${maxPrice}.', { minPrice: PRICE_RANGE[0], maxPrice: PRICE_RANGE[1] })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
