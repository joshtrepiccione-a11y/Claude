// Reusable scroll-reveal and transition helpers for Velo pages.
// Velo's $w supports show()/hide() with named effects; we wrap those
// to keep page code readable and consistent.

const DEFAULT_DURATION = 700;

export function reveal($element, { delay = 0, duration = DEFAULT_DURATION, direction = 'up' } = {}) {
    if (!$element) return;
    const effects = { up: 'FloatIn', fade: 'FadeIn', slide: 'SlideIn' };
    const effect = effects[direction] || 'FadeIn';
    const params = { duration, delay, direction: 'bottom' };
    return $element.show(effect, params);
}

// Stagger a sequence of elements (or repeater item-children) by a fixed step.
export function revealSequence($elements, { step = 90, duration = DEFAULT_DURATION } = {}) {
    $elements.forEach(($el, i) => reveal($el, { delay: i * step, duration }));
}

// Simple in-view detector backed by the page's onViewportEnter event.
// Use for sections that should animate the first time they scroll into view.
export function whenInView($element, handler) {
    if (!$element || !$element.onViewportEnter) return;
    let fired = false;
    $element.onViewportEnter(() => {
        if (fired) return;
        fired = true;
        handler();
    });
}

// Fade between two text values on the same element. Useful for animated
// headlines (e.g. cycling priorities).
export async function fadeSwapText($textElement, newValue, duration = 250) {
    await $textElement.hide('FadeOut', { duration });
    $textElement.text = newValue;
    await $textElement.show('FadeIn', { duration });
}
