'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Trash2, Send, X, Rocket } from 'lucide-react'
import type { Keyword, KeywordCartItem } from '@/lib/types'
import { useKeywordCart, useRemoveFromCart, useClearCart, useSendToLaunchpad } from '@/hooks'

interface KeywordCartProps {
  projectId: string
}

export function KeywordCart({ projectId }: KeywordCartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: cartItems, isLoading } = useKeywordCart(projectId)
  const removeFromCart = useRemoveFromCart()
  const clearCart = useClearCart()
  const sendToLaunchpad = useSendToLaunchpad()

  const handleRemove = async (keywordId: string) => {
    await removeFromCart.mutateAsync({ projectId, keywordId })
  }

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the entire cart?')) {
      await clearCart.mutateAsync(projectId)
    }
  }

  const handleSendToLaunchpad = async () => {
    if (confirm('Send all keywords to Launchpad for content creation?')) {
      const count = await sendToLaunchpad.mutateAsync(projectId)
      alert(`${count} keywords sent to Launchpad!`)
      setIsOpen(false)
    }
  }

  const itemCount = cartItems?.length || 0

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Keyword Cart
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? 'Your cart is empty. Add keywords from the tabs to build your content plan.'
              : `${itemCount} keyword${itemCount === 1 ? '' : 's'} ready for Launchpad`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
              <p>No keywords in cart</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {cartItems?.map((item: KeywordCartItem & { keyword: Keyword }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.keyword.keyword}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {item.keyword.search_volume && (
                          <span>Vol: {item.keyword.search_volume.toLocaleString()}</span>
                        )}
                        {item.keyword.keyword_difficulty && (
                          <span>KD: {item.keyword.keyword_difficulty}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.keyword.source}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(item.keyword_id)}
                      disabled={removeFromCart.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Keywords</span>
                  <span className="font-medium">{itemCount}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClear}
                    disabled={clearCart.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSendToLaunchpad}
                    disabled={sendToLaunchpad.isPending}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Send to Launchpad
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Keywords sent to Launchpad will be available for content generation
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
