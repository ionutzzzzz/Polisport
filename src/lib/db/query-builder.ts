import type Database from "better-sqlite3";

export interface QueryError {
  message: string;
  code?: string;
  details?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueryResult<T = any> {
  data: T;
  count?: number;
  error: QueryError | null;
}

type Filter = {
  col: string;
  op: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val?: any;
};

type Order = {
  col: string;
  dir: "ASC" | "DESC";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class QueryBuilder<T = any> {
  private db: Database.Database;
  private table: string;
  private selectColumns: string = "*";
  private countOption: string | null = null;
  private isHead: boolean = false;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private opType: "select" | "insert" | "update" | "delete" = "select";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dataToInsert: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dataToUpdate: any = null;

  constructor(db: Database.Database, table: string) {
    this.db = db;
    this.table = table;
  }

  select(columns: string = "*", options: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}) {
    this.opType = "select";
    this.selectColumns = columns;
    if (options.count) this.countOption = options.count;
    if (options.head) this.isHead = options.head;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq(col: string, val: any) {
    this.filters.push({ col, op: "=", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  neq(col: string, val: any) {
    this.filters.push({ col, op: "!=", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gt(col: string, val: any) {
    this.filters.push({ col, op: ">", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gte(col: string, val: any) {
    this.filters.push({ col, op: ">=", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lt(col: string, val: any) {
    this.filters.push({ col, op: "<", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lte(col: string, val: any) {
    this.filters.push({ col, op: "<=", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is(col: string, val: any) {
    this.filters.push({ col, op: val === null ? "IS NULL" : "IS", val });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  not(col: string, op: string, val: any) {
    if (op === "is" && val === null) {
      this.filters.push({ col, op: "IS NOT NULL" });
    } else {
      this.filters.push({ col, op: "!=", val });
    }
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  in(col: string, vals: any[]) {
    this.filters.push({ col, op: "IN", val: vals });
    return this;
  }

  order(col: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orders.push({ col, dir: ascending ? "ASC" : "DESC" });
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single(): Promise<QueryResult<T>> {
    this.isSingle = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.resolve(this.execute() as any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(data: any) {
    this.opType = "insert";
    this.dataToInsert = data;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(data: any) {
    this.opType = "update";
    this.dataToUpdate = data;
    return this;
  }

  delete() {
    this.opType = "delete";
    return this;
  }

  then<TResult1 = QueryResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Promise.resolve(this.execute() as any).then(onfulfilled, onrejected);
  }

  private mapError(err: unknown): QueryError {
    const errorObj = err as { code?: string; message?: string };
    const msg = errorObj.message || String(err);
    let code: string | undefined = undefined;

    if (errorObj.code === "SQLITE_CONSTRAINT_UNIQUE" || msg.includes("UNIQUE constraint failed")) {
      code = "23505";
    }

    return {
      message: msg,
      code,
    };
  }

  execute(): QueryResult<T> {
    try {
      if (this.opType === "insert") {
        const rows = Array.isArray(this.dataToInsert) ? this.dataToInsert : [this.dataToInsert];
        if (rows.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { data: [] as any, error: null };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inserted: any[] = [];
        const runTx = this.db.transaction((items) => {
          for (const item of items) {
            const rowWithDefaults = { ...item };
            if (!rowWithDefaults.id) {
              rowWithDefaults.id = crypto.randomUUID();
            }
            const keys = Object.keys(rowWithDefaults);
            const placeholders = keys.map(() => "?").join(", ");
            const sql = `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`;
            this.db.prepare(sql).run(...Object.values(rowWithDefaults));
            inserted.push(rowWithDefaults);
          }
        });

        runTx(rows);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resData = (Array.isArray(this.dataToInsert) ? inserted : inserted[0]) as any;
        return { data: resData, error: null };
      }

      if (this.opType === "update") {
        const whereParts: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any[] = [];

        for (const f of this.filters) {
          if (f.op === "IS NULL" || f.op === "IS NOT NULL") {
            whereParts.push(`${f.col} ${f.op}`);
          } else if (f.op === "IN") {
            if (!Array.isArray(f.val) || f.val.length === 0) {
              whereParts.push("1 = 0");
            } else {
              const ph = f.val.map(() => "?").join(", ");
              whereParts.push(`${f.col} IN (${ph})`);
              params.push(...f.val);
            }
          } else {
            whereParts.push(`${f.col} ${f.op} ?`);
            params.push(f.val);
          }
        }

        const setCols = Object.keys(this.dataToUpdate);
        const setSql = setCols.map((c) => `${c} = ?`).join(", ");
        const updateParams = [...Object.values(this.dataToUpdate), ...params];
        const sql = `UPDATE ${this.table} SET ${setSql} ${whereParts.length ? "WHERE " + whereParts.join(" AND ") : ""}`;

        this.db.prepare(sql).run(...updateParams);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { data: null as any, error: null };
      }

      if (this.opType === "delete") {
        const whereParts: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any[] = [];

        for (const f of this.filters) {
          if (f.op === "IS NULL" || f.op === "IS NOT NULL") {
            whereParts.push(`${f.col} ${f.op}`);
          } else if (f.op === "IN") {
            if (!Array.isArray(f.val) || f.val.length === 0) {
              whereParts.push("1 = 0");
            } else {
              const ph = f.val.map(() => "?").join(", ");
              whereParts.push(`${f.col} IN (${ph})`);
              params.push(...f.val);
            }
          } else {
            whereParts.push(`${f.col} ${f.op} ?`);
            params.push(f.val);
          }
        }

        const sql = `DELETE FROM ${this.table} ${whereParts.length ? "WHERE " + whereParts.join(" AND ") : ""}`;
        this.db.prepare(sql).run(...params);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { data: null as any, error: null };
      }

      // SELECT
      let count: number | undefined = undefined;
      const whereParts: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];

      const hasTeamJoin =
        this.table === "players" &&
        (this.selectColumns.includes("teams") ||
          this.selectColumns.includes("team:") ||
          this.filters.some((f) => f.col.startsWith("teams.")));

      for (const f of this.filters) {
        let col = f.col;
        if (col.startsWith("teams.")) col = col.replace("teams.", "t.");
        else if (!col.includes(".")) col = `m.${col}`;

        if (f.op === "IS NULL" || f.op === "IS NOT NULL") {
          whereParts.push(`${col} ${f.op}`);
        } else if (f.op === "IN") {
          if (!Array.isArray(f.val) || f.val.length === 0) {
            whereParts.push("1 = 0");
          } else {
            const ph = f.val.map(() => "?").join(", ");
            whereParts.push(`${col} IN (${ph})`);
            params.push(...f.val);
          }
        } else {
          whereParts.push(`${col} ${f.op} ?`);
          params.push(f.val);
        }
      }

      let fromClause = `${this.table} m`;
      if (hasTeamJoin) {
        fromClause += " LEFT JOIN teams t ON m.team_id = t.id";
      }

      const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

      if (this.countOption) {
        const countSql = `SELECT count(*) as cnt FROM ${fromClause} ${whereClause}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countRow = this.db.prepare(countSql).get(...params) as any;
        count = countRow ? countRow.cnt : 0;
        if (this.isHead) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { data: null as any, count, error: null };
        }
      }

      let orderClause = "";
      if (this.orders.length) {
        orderClause =
          "ORDER BY " +
          this.orders
            .map((o) => {
              let c = o.col;
              if (c === "teams(name)") c = "t.name";
              else if (!c.includes(".")) c = `m.${c}`;
              return `${c} ${o.dir}`;
            })
            .join(", ");
      }

      let limitClause = "";
      if (this.limitCount !== null) limitClause = `LIMIT ${this.limitCount}`;

      const selectExtra = hasTeamJoin ? ", t.name as _team_name, t.sport_type as _team_sport_type" : "";
      const baseSql = `SELECT m.* ${selectExtra} FROM ${fromClause} ${whereClause} ${orderClause} ${limitClause}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = this.db.prepare(baseSql).all(...params) as any[];

      // Hydrate relationships
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = rows.map((r) => {
        const item = { ...r };
        delete item._team_name;
        delete item._team_sport_type;

        if (this.table === "players") {
          if (hasTeamJoin) {
            const team = { name: r._team_name, sport_type: r._team_sport_type };
            item.team = team;
            item.teams = team;
          }
        }

        if (this.table === "matches") {
          if (this.selectColumns.includes("home_team")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ht = this.db.prepare("SELECT id, name, group_name FROM teams WHERE id = ?").get(r.home_team_id) as any;
            item.home_team = ht || null;
          }
          if (this.selectColumns.includes("away_team")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const at = this.db.prepare("SELECT id, name, group_name FROM teams WHERE id = ?").get(r.away_team_id) as any;
            item.away_team = at || null;
          }
          if (this.selectColumns.includes("match_events")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const events = this.db.prepare("SELECT * FROM match_events WHERE match_id = ?").all(r.id) as any[];
            item.match_events = events.map((e) => {
              const ev = { ...e };
              if (this.selectColumns.includes("player:players") || this.selectColumns.includes("player:players(name")) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pl = this.db.prepare("SELECT name, jersey_number FROM players WHERE id = ?").get(e.player_id) as any;
                ev.player = pl || null;
              }
              if (this.selectColumns.includes("team:teams") || this.selectColumns.includes("team:teams(name")) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tm = this.db.prepare("SELECT name FROM teams WHERE id = ?").get(e.team_id) as any;
                ev.team = tm || null;
              }
              return ev;
            });
          }
        }

        if (this.table === "match_events") {
          if (this.selectColumns.includes("player:players") || this.selectColumns.includes("player:players(name")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pl = this.db.prepare(
              "SELECT p.name, p.jersey_number, t.name as team_name FROM players p LEFT JOIN teams t ON p.team_id = t.id WHERE p.id = ?"
            ).get(r.player_id) as any;
            if (pl) {
              item.player = {
                name: pl.name,
                jersey_number: pl.jersey_number,
                team: { name: pl.team_name },
              };
            }
          }
        }

        return item;
      });

      if (this.isSingle) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { data: (result[0] || null) as any, error: null };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: result as any, count, error: null };
    } catch (err) {
      console.error("[QueryBuilder Error]", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: null as any, error: this.mapError(err) };
    }
  }
}
