import * as React from "react"

// `value`, once it has stopped changing for `delay` ms (e.g. a search box before it asks the API).
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
