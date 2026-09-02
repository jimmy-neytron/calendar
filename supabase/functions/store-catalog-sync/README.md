# Store catalog sync

Deploy this function without gateway JWT verification because cron authenticates with a secret; the function still verifies admin JWTs itself.

After changing the function, redeploy it. CORS preflight (`OPTIONS`) is handled by the function, so browser calls through `supabase.functions.invoke` work correctly.

Required secret: `MAGNIT_CRON_SECRET`.

Schedule an HTTP `POST` every 30 minutes with header `x-cron-secret`. Each run selects one due source; successful sources become due in 12 hours. A schedule must actually be configured; this code alone does not create one.

## Update existing installations

1. Apply only the incremental migration `supabase/migrations/20260902190000_store_catalog_verified_prices.sql`. Do not rerun the initial catalog-v2 migration on an existing database.
2. Deploy `store-catalog-sync` with `supabase functions deploy store-catalog-sync --no-verify-jwt`. Deploy the entire directory and the imported `_shared` files, not just `index.ts` pasted into an editor.
3. Redeploy `telegram-daily-digest` using its existing deployment settings, and deploy the frontend.
4. Apply the subsequent migration `supabase/migrations/20260902203000_store_catalog_manual_sync.sql` for independent manual sync. After applying it, redeploy `store-catalog-sync` and the frontend. In Nutrition → Menu cost → Sources, click “Обновить сейчас” for each source; auto updates may stay off.

The existing `enabled` field now controls scheduling only. An explicit sourceId from an authenticated admin triggers manual mode (including when the next run is in the future); cron always respects enabled and next_sync_at. The SQL save function accepts a service-role-only `p_manual` flag, defaulting to false for compatibility. Manual sync never enables auto implicitly. Turning auto off does not invalidate an already verified price; it still expires after 24 hours. Auto-enabled sources from another shop/mode must be switched off before changing shops to avoid background overwrites.

Old imported values/history and ingredient links are retained, but legacy prices are unverified until refreshed. Verified prices expire for calculation after 24 hours. The API response is a snapshot estimate, not a guaranteed checkout price. Conditional promotions, cashback and delivery fees are not subtracted.

## Price source and limits

HTML/JSON-LD can silently return the default store 992301 even with another shopCode in the URL. Prices now come exclusively from `POST https://magnit.ru/webgate/v2/goods/search`, with explicit storeCode, storeType, catalogType and category. Every item's returned context must match. API integer prices are kopecks (all values are divided by 100 exactly once).

Supported URL contexts: shopType=express/dostavka, catalogType=2 (delivery, default for those shop types) or 3 (pickup). Offline catalogs are not silently substituted. Use the same mode when comparing prices in Magnit.

Pages use the website's page size of 36. Fetching stops only at hasMore=false; repetition, API errors, more than 50 pages or a 90-second budget abort before saving. Large sections should be split into subcategories. Saving uses one service-role-only SQL transaction. Missing items lose price confirmation; products/history/ingredient links are never deleted by sync.

Weight-based and unavailable goods have no package price in the estimate. Ambiguous package ranges such as 450–500 g require manual confirmation.

Public-site smoke check on 2026-09-02: Barilla 1000166506, shop 780171, express, catalogType=2 returned 10999 kopecks. A screenshot price of 119.99 must be compared using the same shop, buying mode and time, not hardcoded.
