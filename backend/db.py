"""
backend/db.py
Database connections: Redis (cache) + TimescaleDB (time-series storage)
"""

import os
import redis
import psycopg2
from psycopg2.extras import RealDictCursor

_redis_client = None
_pg_conn = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = redis.from_url(url, decode_responses=True)
    return _redis_client


def get_pg():
    global _pg_conn
    if _pg_conn is None or _pg_conn.closed:
        url = os.getenv("DATABASE_URL", "postgresql://trader:password@localhost:5432/cryptodb")
        _pg_conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
        _pg_conn.autocommit = True
        _init_schema(_pg_conn)
    return _pg_conn


def _init_schema(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

            CREATE TABLE IF NOT EXISTS market_ticks (
                time        TIMESTAMPTZ NOT NULL,
                symbol      TEXT NOT NULL,
                price       DOUBLE PRECISION,
                volume      DOUBLE PRECISION,
                change_pct  DOUBLE PRECISION
            );

            SELECT create_hypertable('market_ticks', 'time', if_not_exists => TRUE);

            CREATE TABLE IF NOT EXISTS bot_trades (
                id          SERIAL PRIMARY KEY,
                time        TIMESTAMPTZ DEFAULT NOW(),
                symbol      TEXT,
                side        TEXT,
                entry_price DOUBLE PRECISION,
                exit_price  DOUBLE PRECISION,
                qty         DOUBLE PRECISION,
                pnl         DOUBLE PRECISION,
                strategy    TEXT,
                mode        TEXT DEFAULT 'paper',
                status      TEXT DEFAULT 'closed'
            );

            CREATE TABLE IF NOT EXISTS bot_config (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
        """)


def save_tick(symbol: str, price: float, volume: float, change_pct: float):
    try:
        conn = get_pg()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO market_ticks (time, symbol, price, volume, change_pct) VALUES (NOW(), %s, %s, %s, %s)",
                (symbol, price, volume, change_pct),
            )
    except Exception as e:
        print(f"[db] save_tick error: {e}")


def save_trade(symbol, side, entry, exit_p, qty, pnl, strategy, mode="paper"):
    try:
        conn = get_pg()
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO bot_trades (symbol, side, entry_price, exit_price, qty, pnl, strategy, mode)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                (symbol, side, entry, exit_p, qty, pnl, strategy, mode),
            )
            return cur.fetchone()["id"]
    except Exception as e:
        print(f"[db] save_trade error: {e}")
        return None


def get_trade_history(limit=50):
    try:
        conn = get_pg()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM bot_trades ORDER BY time DESC LIMIT %s", (limit,)
            )
            return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[db] get_trades error: {e}")
        return []
