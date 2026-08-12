# Security policy

## Supported versions

Lupinum OG provides security fixes for the latest published minor release.
Before version 1.0, a security fix can use a hard cut when compatibility would
keep unsafe behavior.

## Report a vulnerability

Use GitHub private vulnerability reporting. If that channel is not available,
email [info@lupinum.com](mailto:info@lupinum.com).

Do not put an exploit, recipient data, rendered customer email, credential, or
private URL in a public issue.

Include the affected version, Node and Nuxt versions, a minimal reproduction,
the expected impact, and a known mitigation. Lupinum OG will acknowledge a
complete report within five business days.

Treat these defects as security-sensitive:

- Preview data enters a production artifact.
- Server-only templates or renderer code enter a client bundle.
- One render can read data from another render.
- Unsafe markup bypasses the renderer policy.
- A release artifact differs from the approved artifact.

## Publication security

Publication must use npm trusted publishing and a protected GitHub environment.
The OIDC-capable job may publish only a previously certified tarball. It must
not run repository code or install dependencies.
