/** Only the newest request may update a view; invalidation also handles unmount. */
export function createLatestRequest() {
  let generation = 0
  return {
    begin() {
      const current = ++generation
      return () => current === generation
    },
    invalidate() { generation++ },
  }
}
