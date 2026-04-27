// "Store" — campaign merch grid. Backed by the Wix Stores app (recommended)
// or a simple CMS collection if you don't want full e-commerce.
//
// EDITOR SETUP:
//   Option A (Wix Stores): drop in a Product Gallery widget; this file
//     can stay short and just track click events for analytics.
//   Option B (CMS): create a "StoreItems" collection with fields
//     title (Text), price (Text), image (Image), checkoutUrl (Text).
//
//   #storeRepeater   responsive grid of product cards
//      inside each item: #storeImage, #storeTitle, #storePrice, #storeBuyBtn
//   #storeEmpty      shown if no products exist yet

import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { IDS } from 'public/constants.js';
import { reveal } from 'public/animations.js';

const COLLECTION = 'StoreItems';

$w.onReady(async () => {
    const repeater = $w(IDS.store.repeater);
    const empty    = $w(IDS.store.empty);
    if (!repeater) return;

    try {
        const result = await wixData.query(COLLECTION).limit(50).find();
        if (!result.items.length) {
            repeater.hide();
            if (empty) empty.show();
            return;
        }
        if (empty) empty.hide();
        repeater.data = result.items;
        repeater.onItemReady(($item, data) => {
            $item('#storeTitle').text = data.title;
            $item('#storePrice').text = data.price;
            const img = $item('#storeImage');
            if (img && data.image) img.src = data.image;
            const buy = $item('#storeBuyBtn');
            if (buy) {
                buy.label = 'BUY';
                buy.onClick(() => wixLocation.to(data.checkoutUrl));
            }
        });
        reveal(repeater, { direction: 'up' });
    } catch (err) {
        console.error('Store load failed', err);
        repeater.hide();
        if (empty) {
            empty.text = 'The store is temporarily unavailable. Please check back soon.';
            empty.show();
        }
    }
});
