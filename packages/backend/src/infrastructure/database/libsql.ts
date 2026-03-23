import { createClient } from "@libsql/client";
import { config } from "../../config/config";

export const libsqlClient = createClient({
  url: config.db.url,
  authToken: config.db.authToken,
});
