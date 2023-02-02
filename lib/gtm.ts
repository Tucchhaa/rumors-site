import { useEffect } from 'react';

/**
 * Google tag manager related utility functions
 */

/**
 * @param args - data to feed to dataLayer.push
 */
export function pushToDataLayer(...args: unknown[]) {
  if (typeof window === 'undefined') return; // Skip in SSR

  if (!('dataLayer' in window)) window['dataLayer'] = [];
  window['dataLayer'].push(...args);
}

/**
 * @param trigger - trigger useEffect() after trigger turns truthy
 * @param args - data to send to pushDataLayer on trigger change
 */
export function usePushToDataLayer(trigger: unknown, args: object) {
  const dontTrigger = !trigger;
  useEffect(() => {
    if (dontTrigger) return;
    pushToDataLayer(args);
  }, [dontTrigger, args]);
}
