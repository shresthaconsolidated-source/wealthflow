import { useEffect, useState } from 'react';

// Matches Tailwind's `lg` breakpoint so JS-side layout switches stay in sync
// with the `lg:` utility classes.
const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches
    );

    useEffect(() => {
        const mql = window.matchMedia(DESKTOP_QUERY);
        // Setting the same boolean is a no-op in React, so the resize fallback
        // costs nothing — it just covers environments where the media query
        // 'change' event doesn't fire (some embedded/emulated webviews).
        const sync = () => setIsDesktop(mql.matches);
        sync();
        mql.addEventListener('change', sync);
        window.addEventListener('resize', sync);
        return () => {
            mql.removeEventListener('change', sync);
            window.removeEventListener('resize', sync);
        };
    }, []);

    return isDesktop;
}
