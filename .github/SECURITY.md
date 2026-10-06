# Security policy

## Supported versions

Security fixes go into the newest release line: the npm `latest` tag, or the
`next` tag while the package has no stable 1.0 release yet. Older versions do
not receive fixes; upgrade to the newest release on that line. Before version
1.0, a security fix can use a hard cut when compatibility would keep unsafe
behavior.

## Report a vulnerability

Do not open a public issue. Use
[GitHub private vulnerability reporting](https://github.com/lupinum-dev/nuxt-email/security/advisories/new).
If that channel is not available,
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

Publication uses npm trusted publishing and the protected `npm` GitHub
environment. The publish job only uploads the tarball that `release.yml` packed
earlier; it does not check out the repository, install dependencies or run
repository code.
