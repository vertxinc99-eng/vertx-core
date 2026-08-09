# VERTX CORE v6.3 NOVA FLOW AI

- Company/user identity is remembered on the device; no repeated re-entry after the first setup.
- Existing company session is used as a safe fallback when membership refresh temporarily fails, preventing the app from bouncing back to the setup gate.
- Last screen, selected site, and order draft quantities are restored after reload.
- Plan page recolored to the NOVA white/blue system; old dark Pro card styling removed.
- Material favorite star moved to a dedicated top-right button with clear active/inactive states.
- Home and order text contrast strengthened.
- AI drawing preprocessing is parallelized and images are compressed earlier for faster uploads.
- Recent company-specific confirmed AI examples are retrieved through Supabase RLS and supplied as contextual examples to drawing analysis.
- Repeated identical drawing analyses use a 7-day local cache for instant results.
- When an AI-assisted order is finally submitted, the corrected final material list is stored as a new company-specific learning example.
