import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('rounded-md bg-linear-to-r from-muted/85 via-muted/50 to-muted/85 app-shimmer', className)}
      {...props}
    />
  )
}

export { Skeleton }
