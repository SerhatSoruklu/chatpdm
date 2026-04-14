# Cookie Policy — Internal Proxy Transport

## Scope — Confirmed cookie handling

- internal proxy cookie transport
- internal proxy set-cookie transport
- product-internal SSR handling

## Data Handling — Internal proxy forwarding

- The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.
- The platform shares upstream `set-cookie` headers with the client response through the SSR layer.
- internal SSR transport only
- not third-party disclosure

## Boundaries — Conditional forwarding

- The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.
- The platform does not allow SSR forwarding of upstream `set-cookie` headers when upstream responses omit them.
