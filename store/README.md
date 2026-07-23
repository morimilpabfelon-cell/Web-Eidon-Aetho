# Eidon-Store

MVP estático de catálogo y pedidos coordinados por WhatsApp. Está alojado dentro de `store/` para funcionar inmediatamente en GitHub Pages y Cloudflare Pages. Más adelante puede trasladarse a un repositorio independiente sin cambiar su estructura interna.

## Estado actual

- catálogo público desde `data/products.json`;
- búsqueda y filtro por categoría;
- carrito local guardado en el navegador;
- código de pedido generado en el cliente;
- resumen copiable;
- apertura de WhatsApp preparada;
- Yape y Plin visibles como decisión pendiente, sin solicitar pagos;
- catálogo vacío para evitar productos, precios o stock inventados.

## Activar productos

Copia la estructura de `data/products.example.json` a `data/products.json`. Solo aparecen objetos con:

```json
{
  "visible": true,
  "available": true
}
```

Campos públicos admitidos:

- `id`: identificador único y estable;
- `title`;
- `description`;
- `category`;
- `price`: precio referencial en soles;
- `image`: ruta local o URL HTTPS autorizada por el proveedor;
- `imageAlt`;
- `sellerName`: nombre visible del responsable de la venta o entrega;
- `providerId`: reservado para automatización futura;
- `available`;
- `visible`;
- `order`.

No guardes comisiones privadas, contratos, teléfonos no públicos ni credenciales en este JSON: todo archivo estático puede ser leído por visitantes.

## Activar WhatsApp

En `data/config.json`:

```json
{
  "ordersEnabled": true,
  "orderRouting": "eidon",
  "eidonWhatsApp": "51999999999"
}
```

Usa código de país y número, sin `+`, espacios ni guiones. Mientras `ordersEnabled` sea `false`, el usuario puede preparar y copiar el pedido, pero no abrir WhatsApp desde el botón.

## Decisión futura: Yape o Plin

Antes de activar pagos debe definirse:

1. quién recibe el dinero;
2. quién confirma el pago real;
3. quién emite comprobante;
4. quién atiende cambios, garantías y devoluciones;
5. cómo se atribuye y liquida la comisión de Eidon-Store.

La interfaz actual no marca ningún pedido como pagado y no acepta capturas como confirmación automática.

## Automatización posterior

Cuando los proveedores entreguen una API, webhook o canal formal de pedidos, se puede reemplazar el enlace directo de WhatsApp por una Function de Cloudflare que registre y distribuya pedidos. El catálogo y el carrito no necesitan reescribirse.
