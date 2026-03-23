import { UserRepository } from "../../domain/interfaces/UserRepository";
import { User } from "../../domain/entities/User";
import { libsqlClient } from "../database/libsql";
import { OAuthProvider } from "@flow-read/shared";

export class LibsqlUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const rs = await libsqlClient.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });

    if (rs.rows.length === 0) return null;
    return this.mapToDomain(rs.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const rs = await libsqlClient.execute({
      sql: "SELECT * FROM users WHERE id = ?",
      args: [id],
    });

    if (rs.rows.length === 0) return null;
    return this.mapToDomain(rs.rows[0]);
  }

  async save(user: User): Promise<void> {
    // Upsert logic for Libsql/SQLite
    await libsqlClient.execute({
      sql: `INSERT INTO users (id, email, name, provider, provider_id, password_hash, avatar_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              name = excluded.name,
              provider = excluded.provider,
              provider_id = excluded.provider_id,
              password_hash = excluded.password_hash,
              avatar_url = excluded.avatar_url,
              updated_at = excluded.updated_at`,
      args: [
        user.id,
        user.email,
        user.name,
        user.provider,
        user.providerId || null,
        user.passwordHash || null,
        user.avatarUrl || null,
        user.updatedAt.toISOString(),
      ],
    });
  }

  private mapToDomain(row: any): User {
    const createdAtStr = row.created_at || row.createdAt;
    const updatedAtStr = row.updated_at || row.updatedAt;

    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
    const updatedAt = updatedAtStr ? new Date(updatedAtStr) : new Date();

    // Ensure we don't have "Invalid Date"
    const validCreatedAt = isNaN(createdAt.getTime()) ? new Date() : createdAt;
    const validUpdatedAt = isNaN(updatedAt.getTime()) ? new Date() : updatedAt;

    return new User(
      row.id as string,
      row.email as string,
      row.name as string,
      row.provider as OAuthProvider | "local",
      row.provider_id as string | undefined,
      row.password_hash as string | undefined,
      row.avatar_url as string | undefined,
      validCreatedAt,
      validUpdatedAt
    );
  }
}
