# Recursos visuales de los referidos

Los SVG locales de Binance, TradingView y TikTok se usan únicamente como respaldo visual cuando la página se ejecuta sin Cloudflare Pages o cuando una plataforma no entrega metadatos públicos.

En Cloudflare Pages, `functions/api/referral-previews.js` consulta cada enlace de referido permitido y extrae su `og:image` o `twitter:image`. Esa imagen, servida por la propia plataforma o por su CDN, sustituye automáticamente al respaldo local.

Los nombres, logotipos y marcas pertenecen a sus respectivos titulares. Se muestran solo para identificar el destino del enlace de referido; no implican patrocinio, asociación oficial ni propiedad de esas marcas por Eidon Aetho.