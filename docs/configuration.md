# Configuration

Everything is optional. For local development, copy [`.env.example`](../.env.example) to `.env`.

| Variable                | Default                                        | Description                                                                                  |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `PROTOCOL_HEADER`       | none                                           | Header your reverse proxy puts the public scheme in, usually `x-forwarded-proto`.            |
| `HOST_HEADER`           | none                                           | Header your reverse proxy puts the public host in, usually `x-forwarded-host`.               |
| `PORT`                  | `3000`                                         | Port the server listens on.                                                                  |
| `HOST`                  | `0.0.0.0`                                      | Address the server binds to.                                                                 |
| `DB_FILE_NAME`          | `data/db.sqlite`                               | Path to the SQLite database.                                                                 |
| `PUID` / `PGID`         | `10001`                                        | Docker only. The uid/gid the server runs as. The data volume is chowned to match on startup. |
| `DISK_STATS_PATH`       | `/System/Volumes/Data` on macOS, `/` elsewhere | Filesystem the disk gauge reports on.                                                        |
| `WEATHER_LAT`           | none                                           | Latitude for the weather. A location picked in Settings takes precedence.                    |
| `WEATHER_LON`           | none                                           | Longitude for the weather. Must be set together with `WEATHER_LAT`.                          |
| `WEATHER_LOCATION_NAME` | `Home`                                         | Label shown for the location set through the variables above.                                |
| `WEATHER_UNITS`         | `celsius`                                      | `celsius` or `fahrenheit`.                                                                   |
| `OIDC_ISSUER`           | none                                           | Issuer URL of your OpenID Connect provider. Setting it turns sign-in on.                     |
| `OIDC_CLIENT_ID`        | none                                           | Client ID. Required with `OIDC_ISSUER`.                                                      |
| `OIDC_CLIENT_SECRET`    | none                                           | Client secret. Required with `OIDC_ISSUER`.                                                  |
| `OIDC_ALLOWED_EMAILS`   | none                                           | Comma-separated emails allowed to sign in. Unset lets in anyone the provider signs in.       |

The app assumes it is served over HTTPS. Without `PROTOCOL_HEADER` it takes the scheme as `https`
and the host from the `Host` header, so forms fail when it is reached over plain HTTP. Put it behind
a reverse proxy and set both headers. Only set them when the proxy is the only way in: a client
reaching the app directly can forge them.
