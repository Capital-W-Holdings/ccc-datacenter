/**
 * Skip to main content link for keyboard users
 * Hidden until focused for screen reader accessibility
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}

export default SkipLink
