import { useCallback, useEffect, useState } from "react";

/**
 * Fetch-on-mount with loading and error state.
 *
 * The original components each called `axios.get` inside `useEffect` with no
 * loading or error handling at all, and `UserList`, `TableHasil` and
 * `TableFinal` each fetched the same list independently - three requests for
 * one page. Here the parent fetches once and passes the data down.
 */
export function useResource(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
