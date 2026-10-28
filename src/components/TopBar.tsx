import { ThemeToggle } from '../ui/theme'
import { ProductMark } from './ProductMark'

export const PRODUCT_NAME = 'Gerenciador de Projetos'

export function TopBar({ userLabel, onSignOut }: { userLabel: string; onSignOut: () => void }) {
  return (
    <div className="border-b border-border">
      <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-3 px-6 max-sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-ink">
          <ProductMark />
          <span className="truncate text-sm font-medium">{PRODUCT_NAME}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {userLabel && (
            <span className="ml-2 max-w-[16rem] truncate text-sm text-muted max-sm:hidden" title={userLabel}>
              {userLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-9 items-center rounded-control px-2 text-sm font-medium text-ink transition-colors hover:bg-active max-sm:h-11 max-sm:px-3"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
